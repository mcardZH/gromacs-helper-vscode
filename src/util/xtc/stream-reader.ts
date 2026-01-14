/**
 * Streaming reader for GROMACS XTC trajectory files
 * 
 * Based on the XTC format specification:
 * https://github.com/gromacs/gromacs/blob/master/src/gromacs/fileio/xtcio.cpp
 * https://github.com/gromacs/gromacs/blob/master/src/gromacs/fileio/libxdrf.cpp
 */
import { StreamingReader, FrameIndex, FrameData } from '../stream-reader';

// Magic integers table for XTC compression
const MagicInts = new Uint32Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 10, 12, 16, 20, 25, 32, 40, 50, 64,
    80, 101, 128, 161, 203, 256, 322, 406, 512, 645, 812, 1024, 1290,
    1625, 2048, 2580, 3250, 4096, 5060, 6501, 8192, 10321, 13003,
    16384, 20642, 26007, 32768, 41285, 52015, 65536, 82570, 104031,
    131072, 165140, 208063, 262144, 330280, 416127, 524287, 660561,
    832255, 1048576, 1321122, 1664510, 2097152, 2642245, 3329021,
    4194304, 5284491, 6658042, 8388607, 10568983, 13316085, 16777216
]);

const FirstIdx = 9;

/**
 * XTC-specific streaming reader
 */
export class XtcStreamReader extends StreamingReader {
    /**
     * Build frame index by scanning the entire file
     */
    protected async buildIndex(): Promise<void> {
        this.frameIndex = [];
        let offset = 0;
        // Get file size from file handle
        const stats = await this.fileHandle!.stat();
        const fileSize = stats.size;

        while (offset < fileSize) {
            try {
                // Read XTC frame header
                const header = await this.readXtcFrameHeader(offset);

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
     * Read XTC frame header to extract metadata
     */
    private async readXtcFrameHeader(offset: number): Promise<{
        frameSize: number;
        time: number;
        natoms: number;
    }> {
        // XTC frame header structure:
        // - magic (4 bytes)
        // - natoms (4 bytes)
        // - step (4 bytes) 
        // - time (4 bytes, float)
        // - box (9 * 4 = 36 bytes)
        // Total basic header: 52 bytes

        const basicHeaderSize = 52;
        // Read enough to get the compression metadata too
        const headerBuffer = await this.readBytes(offset, basicHeaderSize + 40);
        const dv = new DataView(headerBuffer.buffer, headerBuffer.byteOffset);

        // Magic number should be 1995 (XTC magic)
        const magic = dv.getInt32(0, false);  // Big endian
        if (magic !== 1995) {
            throw new Error(`Invalid XTC magic number: ${magic} at offset ${offset}`);
        }

        const natoms = dv.getInt32(4, false);  // Big endian
        // const step = dv.getInt32(8, false);
        const time = dv.getFloat32(12, false);  // Big endian

        let frameSize = basicHeaderSize;

        if (natoms <= 9) {
            // No compression - coordinates stored as floats
            // For small molecules: size + coords
            frameSize += 4 + (natoms * 3 * 4);
        } else {
            // Compressed - need to read compressed data size
            // After basic header: lsize (4) + precision (4) + minmax (24) + smallidx (4) + compressed_size (4) + data
            const lsize = dv.getInt32(basicHeaderSize, false);  // This is natoms for compressed
            const precision = dv.getFloat32(basicHeaderSize + 4, false);
            // minmax: 6 ints (24 bytes) starting at basicHeaderSize + 8
            // smallidx: at basicHeaderSize + 32
            // compressed_size: at basicHeaderSize + 36
            const compressedSize = dv.getInt32(basicHeaderSize + 36, false);

            // Frame size = basic header + lsize(4) + precision(4) + minmax(24) + smallidx(4) + compressed_size_field(4) + actual_compressed_data
            // The compressed data is padded to 4-byte boundary
            const paddedCompressedSize = Math.ceil(compressedSize / 4) * 4;
            frameSize = basicHeaderSize + 4 + 4 + 24 + 4 + 4 + paddedCompressedSize;
        }

        return {
            frameSize,
            time,
            natoms
        };
    }

    /**
     * Read and parse a single frame
     */
    protected async readFrame(index: FrameIndex): Promise<FrameData> {
        const buffer = await this.readBytes(index.offset, index.size);
        return this.parseXtcFrame(buffer, index.frameNumber);
    }

    /**
     * Parse XTC frame data from buffer
     * This is adapted from the existing parser but works on a single frame
     */
    private parseXtcFrame(buffer: Buffer, frameNumber: number): FrameData {
        const dv = new DataView(buffer.buffer, buffer.byteOffset);
        let offset = 0;

        // XTC uses big endian
        // Skip magic number
        offset += 4;
        const natoms = dv.getInt32(offset, false);  // Big endian
        offset += 4;
        // Skip step
        offset += 4;
        const time = dv.getFloat32(offset, false);  // Big endian
        offset += 4;

        // Read box
        const box = new Float32Array(9);
        for (let i = 0; i < 9; ++i) {
            box[i] = dv.getFloat32(offset, false) * 10; // Convert to Angstroms, big endian
            offset += 4;
        }

        let frameCoords: { x: Float32Array; y: Float32Array; z: Float32Array };

        if (natoms <= 9) {
            // No compression
            frameCoords = { x: new Float32Array(natoms), y: new Float32Array(natoms), z: new Float32Array(natoms) };
            offset += 4; // Skip size field
            for (let i = 0; i < natoms; ++i) {
                frameCoords.x[i] = dv.getFloat32(offset, false);      // Big endian
                frameCoords.y[i] = dv.getFloat32(offset + 4, false);  // Big endian
                frameCoords.z[i] = dv.getFloat32(offset + 8, false);  // Big endian
                offset += 12;
            }
        } else {
            // Compressed - use the decompression logic
            frameCoords = this.decompressXtcCoords(buffer, offset, natoms);
        }

        // Convert to Angstroms
        for (let i = 0; i < natoms; i++) {
            frameCoords.x[i] *= 10;
            frameCoords.y[i] *= 10;
            frameCoords.z[i] *= 10;
        }

        return {
            frameNumber,
            count: natoms,
            x: frameCoords.x,
            y: frameCoords.y,
            z: frameCoords.z,
            box,
            time
        };
    }

    /**
     * Decompress XTC coordinates
     * This is the complex decompression algorithm from the original parser
     */
    private decompressXtcCoords(
        buffer: Buffer,
        startOffset: number,
        natoms: number
    ): { x: Float32Array; y: Float32Array; z: Float32Array } {
        const dv = new DataView(buffer.buffer, buffer.byteOffset);
        const data = new Uint8Array(buffer.buffer, buffer.byteOffset);
        let offset = startOffset;

        // Decoder state buffer
        const decoderBuf = new ArrayBuffer(8 * 3);
        const buf = new Int32Array(decoderBuf);
        const uint32view = new Uint32Array(decoderBuf);

        const minMaxInt = [0, 0, 0, 0, 0, 0];
        const sizeint = [0, 0, 0];
        const bitsizeint = [0, 0, 0];
        const sizesmall = [0, 0, 0];
        const thiscoord = [0, 0, 0];
        const prevcoord = [0, 0, 0];

        const frameCoords = {
            x: new Float32Array(natoms),
            y: new Float32Array(natoms),
            z: new Float32Array(natoms)
        };

        let lfp = 0;

        buf[0] = buf[1] = buf[2] = 0;

        // XTC uses big endian
        const lsize = dv.getInt32(offset, false);
        offset += 4;
        const precision = dv.getFloat32(offset, false);
        offset += 4;

        minMaxInt[0] = dv.getInt32(offset, false);
        minMaxInt[1] = dv.getInt32(offset + 4, false);
        minMaxInt[2] = dv.getInt32(offset + 8, false);
        minMaxInt[3] = dv.getInt32(offset + 12, false);
        minMaxInt[4] = dv.getInt32(offset + 16, false);
        minMaxInt[5] = dv.getInt32(offset + 20, false);

        sizeint[0] = minMaxInt[3] - minMaxInt[0] + 1;
        sizeint[1] = minMaxInt[4] - minMaxInt[1] + 1;
        sizeint[2] = minMaxInt[5] - minMaxInt[2] + 1;
        offset += 24;

        let bitsize: number;
        if ((sizeint[0] | sizeint[1] | sizeint[2]) > 0xffffff) {
            bitsizeint[0] = this.sizeOfInt(sizeint[0]);
            bitsizeint[1] = this.sizeOfInt(sizeint[1]);
            bitsizeint[2] = this.sizeOfInt(sizeint[2]);
            bitsize = 0;
        } else {
            bitsize = this.sizeOfInts(3, sizeint);
        }

        let smallidx = dv.getInt32(offset, false);
        offset += 4;
        let tmpIdx = smallidx - 1;
        tmpIdx = (FirstIdx > tmpIdx) ? FirstIdx : tmpIdx;
        let smaller = (MagicInts[tmpIdx] / 2) | 0;
        let smallnum = (MagicInts[smallidx] / 2) | 0;
        sizesmall[0] = sizesmall[1] = sizesmall[2] = MagicInts[smallidx];

        const adz = Math.ceil(dv.getInt32(offset, false) / 4) * 4;
        offset += 4;

        const invPrecision = 1.0 / precision;
        let run = 0;
        let i = 0;

        thiscoord[0] = thiscoord[1] = thiscoord[2] = 0;

        while (i < lsize) {
            if (bitsize === 0) {
                thiscoord[0] = this.decodeBits(data, offset, bitsizeint[0], buf, uint32view);
                thiscoord[1] = this.decodeBits(data, offset, bitsizeint[1], buf, uint32view);
                thiscoord[2] = this.decodeBits(data, offset, bitsizeint[2], buf, uint32view);
            } else {
                this.decodeInts(data, offset, bitsize, sizeint, thiscoord, buf, uint32view);
            }

            i++;
            thiscoord[0] += minMaxInt[0];
            thiscoord[1] += minMaxInt[1];
            thiscoord[2] += minMaxInt[2];

            prevcoord[0] = thiscoord[0];
            prevcoord[1] = thiscoord[1];
            prevcoord[2] = thiscoord[2];

            const flag = this.decodeBits(data, offset, 1, buf, uint32view);
            let isSmaller = 0;
            if (flag === 1) {
                run = this.decodeBits(data, offset, 5, buf, uint32view);
                isSmaller = run % 3;
                run -= isSmaller;
                isSmaller--;
            }

            if (run > 0) {
                thiscoord[0] = thiscoord[1] = thiscoord[2] = 0;
                for (let k = 0; k < run; k += 3) {
                    this.decodeInts(data, offset, smallidx, sizesmall, thiscoord, buf, uint32view);
                    i++;
                    thiscoord[0] += prevcoord[0] - smallnum;
                    thiscoord[1] += prevcoord[1] - smallnum;
                    thiscoord[2] += prevcoord[2] - smallnum;

                    if (k === 0) {
                        let tmpSwap = thiscoord[0];
                        thiscoord[0] = prevcoord[0];
                        prevcoord[0] = tmpSwap;
                        tmpSwap = thiscoord[1];
                        thiscoord[1] = prevcoord[1];
                        prevcoord[1] = tmpSwap;
                        tmpSwap = thiscoord[2];
                        thiscoord[2] = prevcoord[2];
                        prevcoord[2] = tmpSwap;
                        frameCoords.x[lfp] = prevcoord[0] * invPrecision;
                        frameCoords.y[lfp] = prevcoord[1] * invPrecision;
                        frameCoords.z[lfp] = prevcoord[2] * invPrecision;
                        lfp++;
                    } else {
                        prevcoord[0] = thiscoord[0];
                        prevcoord[1] = thiscoord[1];
                        prevcoord[2] = thiscoord[2];
                    }
                    frameCoords.x[lfp] = thiscoord[0] * invPrecision;
                    frameCoords.y[lfp] = thiscoord[1] * invPrecision;
                    frameCoords.z[lfp] = thiscoord[2] * invPrecision;
                    lfp++;
                }
            } else {
                frameCoords.x[lfp] = thiscoord[0] * invPrecision;
                frameCoords.y[lfp] = thiscoord[1] * invPrecision;
                frameCoords.z[lfp] = thiscoord[2] * invPrecision;
                lfp++;
            }

            smallidx += isSmaller;
            if (isSmaller < 0) {
                smallnum = smaller;
                if (smallidx > FirstIdx) {
                    smaller = (MagicInts[smallidx - 1] / 2) | 0;
                } else {
                    smaller = 0;
                }
            } else if (isSmaller > 0) {
                smaller = smallnum;
                smallnum = (MagicInts[smallidx] / 2) | 0;
            }
            sizesmall[0] = sizesmall[1] = sizesmall[2] = MagicInts[smallidx];

            if (sizesmall[0] === 0 || sizesmall[1] === 0 || sizesmall[2] === 0) {
                throw new Error('(xdrfile error) Undefined error.');
            }
        }

        return frameCoords;
    }

    // Decompression helper functions
    private sizeOfInt(size: number): number {
        let num = 1;
        let numOfBits = 0;
        while (size >= num && numOfBits < 32) {
            numOfBits++;
            num <<= 1;
        }
        return numOfBits;
    }

    private readonly _tmpBytes = new Uint8Array(32);

    private sizeOfInts(numOfInts: number, sizes: number[]): number {
        let numOfBytes = 1;
        let numOfBits = 0;
        this._tmpBytes[0] = 1;

        for (let i = 0; i < numOfInts; i++) {
            let bytecnt;
            let tmp = 0;
            for (bytecnt = 0; bytecnt < numOfBytes; bytecnt++) {
                tmp += this._tmpBytes[bytecnt] * sizes[i];
                this._tmpBytes[bytecnt] = tmp & 0xff;
                tmp >>= 8;
            }
            while (tmp !== 0) {
                this._tmpBytes[bytecnt++] = tmp & 0xff;
                tmp >>= 8;
            }
            numOfBytes = bytecnt;
        }

        let num = 1;
        numOfBytes--;
        while (this._tmpBytes[numOfBytes] >= num) {
            numOfBits++;
            num *= 2;
        }
        return numOfBits + numOfBytes * 8;
    }

    private decodeBits(
        cbuf: Uint8Array,
        offset: number,
        numOfBits: number,
        buf: Int32Array,
        uint32view: Uint32Array
    ): number {
        const mask = (1 << numOfBits) - 1;
        let lastBB0 = uint32view[1];
        let lastBB1 = uint32view[2];
        let cnt = buf[0];
        let num = 0;
        let numOfBitsRemaining = numOfBits;

        while (numOfBitsRemaining >= 8) {
            lastBB1 = (lastBB1 << 8) | cbuf[offset + cnt++];
            num |= (lastBB1 >> lastBB0) << (numOfBitsRemaining - 8);
            numOfBitsRemaining -= 8;
        }

        if (numOfBitsRemaining > 0) {
            if (lastBB0 < numOfBitsRemaining) {
                lastBB0 += 8;
                lastBB1 = (lastBB1 << 8) | cbuf[offset + cnt++];
            }
            lastBB0 -= numOfBitsRemaining;
            num |= (lastBB1 >> lastBB0) & ((1 << numOfBitsRemaining) - 1);
        }

        num &= mask;
        buf[0] = cnt;
        buf[1] = lastBB0;
        buf[2] = lastBB1;

        return num;
    }

    private decodeByte(
        cbuf: Uint8Array,
        offset: number,
        buf: Int32Array,
        uint32view: Uint32Array
    ): number {
        let lastBB1 = uint32view[2];
        const cnt = buf[0];
        lastBB1 = (lastBB1 << 8) | cbuf[offset + cnt];
        buf[0] = cnt + 1;
        buf[2] = lastBB1;
        return (lastBB1 >> uint32view[1]) & 0xff;
    }

    private readonly intBytes = new Int32Array(32);

    private decodeInts(
        cbuf: Uint8Array,
        offset: number,
        numOfBits: number,
        sizes: number[],
        nums: number[],
        buf: Int32Array,
        uint32view: Uint32Array
    ): void {
        let numOfBitsRemaining = numOfBits;
        let numOfBytes = 0;

        this.intBytes.fill(0, 0, 4);

        while (numOfBitsRemaining > 8) {
            this.intBytes[numOfBytes++] = this.decodeByte(cbuf, offset, buf, uint32view);
            numOfBitsRemaining -= 8;
        }

        if (numOfBitsRemaining > 0) {
            this.intBytes[numOfBytes++] = this.decodeBits(cbuf, offset, numOfBitsRemaining, buf, uint32view);
        }

        for (let i = 2; i > 0; i--) {
            let num = 0;
            const s = sizes[i];
            for (let j = numOfBytes - 1; j >= 0; j--) {
                num = (num << 8) | this.intBytes[j];
                const t = (num / s) | 0;
                this.intBytes[j] = t;
                num = num - t * s;
            }
            nums[i] = num;
        }
        nums[0] = this.intBytes[0] | (this.intBytes[1] << 8) | (this.intBytes[2] << 16) | (this.intBytes[3] << 24);
    }
}
