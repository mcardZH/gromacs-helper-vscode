/**
 * Streaming reader for GROMACS TRR trajectory files
 * 
 * Based on the TRR format specification:
 * https://github.com/gromacs/gromacs/blob/master/src/gromacs/fileio/trrio.cpp
 */
import { StreamingReader, FrameIndex, FrameData } from '../stream-reader';

/**
 * TRR-specific streaming reader
 */
export class TrrStreamReader extends StreamingReader {
    /**
     * Build frame index by scanning the entire file
     */
    protected async buildIndex(): Promise<void> {
        this.frameIndex = [];
        let offset = 0;
        // File size is now the buffer length
        const fileSize = this.fileBuffer!.length;

        while (offset < fileSize) {
            try {
                // Read TRR frame header
                const header = await this.readTrrFrameHeader(offset);

                this.frameIndex.push({
                    frameNumber: this.frameIndex.length,
                    offset: offset,
                    size: header.frameSize,
                    time: header.time,
                    atomCount: header.natoms
                });

                offset += header.frameSize;
            } catch (error) {
                // End of file or corrupted frame
                break;
            }
        }
    }

    /**
     * Read TRR frame header to extract metadata
     */
    private async readTrrFrameHeader(offset: number): Promise<{
        frameSize: number;
        time: number;
        natoms: number;
        floatSize: number;
        versionSize: number;
        boxSize: number;
        virSize: number;
        presSize: number;
        coordSize: number;
        velocitySize: number;
        forceSize: number;
    }> {
        // Read enough bytes for the header
        const headerBuffer = await this.readBytes(offset, 100);
        const dv = new DataView(headerBuffer.buffer, headerBuffer.byteOffset);

        let headerOffset = 0;

        // Skip magic number and first float
        headerOffset += 8;

        const versionSize = dv.getInt32(headerOffset);
        headerOffset += 4;
        headerOffset += versionSize;

        // Read sizes
        const irSize = dv.getInt32(headerOffset);
        const eSize = dv.getInt32(headerOffset + 4);
        const boxSize = dv.getInt32(headerOffset + 8);
        const virSize = dv.getInt32(headerOffset + 12);
        const presSize = dv.getInt32(headerOffset + 16);
        const topSize = dv.getInt32(headerOffset + 20);
        const symSize = dv.getInt32(headerOffset + 24);
        const coordSize = dv.getInt32(headerOffset + 28);
        const velocitySize = dv.getInt32(headerOffset + 32);
        const forceSize = dv.getInt32(headerOffset + 36);
        const natoms = dv.getInt32(headerOffset + 40);
        // const step = dv.getInt32(headerOffset + 44);
        // const nre = dv.getInt32(headerOffset + 48);
        headerOffset += 52;

        const floatSize = boxSize / 9;

        // Read time
        let time: number;
        if (floatSize === 8) {
            time = dv.getFloat64(headerOffset);
        } else {
            time = dv.getFloat32(headerOffset);
        }

        // Calculate total frame size
        const frameSize =
            8 + // magic + first float
            4 + versionSize + // version
            52 + // sizes and metadata
            2 * floatSize + // time + lambda
            boxSize + virSize + presSize +
            coordSize + velocitySize + forceSize;

        return {
            frameSize,
            time,
            natoms,
            floatSize,
            versionSize,
            boxSize,
            virSize,
            presSize,
            coordSize,
            velocitySize,
            forceSize
        };
    }

    /**
     * Read and parse a single frame
     */
    protected async readFrame(index: FrameIndex): Promise<FrameData> {
        const buffer = await this.readBytes(index.offset, index.size);
        return this.parseTrrFrame(buffer, index.frameNumber);
    }

    /**
     * Parse TRR frame data from buffer
     * This is adapted from the existing parser but works on a single frame
     */
    private parseTrrFrame(buffer: Buffer, frameNumber: number): FrameData {
        const dv = new DataView(buffer.buffer, buffer.byteOffset);
        let offset = 0;

        // Skip magic number and first float
        offset += 8;

        const versionSize = dv.getInt32(offset);
        offset += 4;
        offset += versionSize;

        // Read sizes
        const boxSize = dv.getInt32(offset + 8);
        const virSize = dv.getInt32(offset + 12);
        const presSize = dv.getInt32(offset + 16);
        const coordSize = dv.getInt32(offset + 28);
        const velocitySize = dv.getInt32(offset + 32);
        const forceSize = dv.getInt32(offset + 36);
        const natoms = dv.getInt32(offset + 40);
        offset += 52;

        const floatSize = boxSize / 9;
        const natoms3 = natoms * 3;

        // Read time
        let time: number;
        if (floatSize === 8) {
            time = dv.getFloat64(offset);
        } else {
            time = dv.getFloat32(offset);
        }
        offset += 2 * floatSize; // time + lambda

        // Read box
        const box = new Float32Array(9);
        if (boxSize) {
            if (floatSize === 8) {
                for (let i = 0; i < 9; ++i) {
                    box[i] = dv.getFloat64(offset) * 10; // Convert to Angstroms
                    offset += 8;
                }
            } else {
                for (let i = 0; i < 9; ++i) {
                    box[i] = dv.getFloat32(offset) * 10; // Convert to Angstroms
                    offset += 4;
                }
            }
        }

        // Skip vir and pres
        offset += virSize;
        offset += presSize;

        // Read coordinates
        const x = new Float32Array(natoms);
        const y = new Float32Array(natoms);
        const z = new Float32Array(natoms);

        if (coordSize) {
            if (floatSize === 8) {
                for (let i = 0; i < natoms; ++i) {
                    x[i] = dv.getFloat64(offset) * 10; // Convert to Angstroms
                    y[i] = dv.getFloat64(offset + 8) * 10;
                    z[i] = dv.getFloat64(offset + 16) * 10;
                    offset += 24;
                }
            } else {
                // Handle byte swapping for float32
                const tmp = new Uint32Array(buffer.buffer, buffer.byteOffset + offset, natoms3);
                for (let i = 0; i < natoms3; ++i) {
                    const value = tmp[i];
                    tmp[i] = (((value & 0xFF) << 24) | ((value & 0xFF00) << 8) |
                        ((value >> 8) & 0xFF00) | ((value >> 24) & 0xFF));
                }
                const frameCoords = new Float32Array(buffer.buffer, buffer.byteOffset + offset, natoms3);
                for (let i = 0; i < natoms; ++i) {
                    x[i] = frameCoords[i * 3] * 10; // Convert to Angstroms
                    y[i] = frameCoords[i * 3 + 1] * 10;
                    z[i] = frameCoords[i * 3 + 2] * 10;
                }
            }
        }

        return {
            frameNumber,
            count: natoms,
            x,
            y,
            z,
            box,
            time
        };
    }
}
