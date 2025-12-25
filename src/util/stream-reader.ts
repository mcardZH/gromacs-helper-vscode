/**
 * Base streaming reader for trajectory files
 */
import * as fs from 'fs';
import { LRUCache } from './lru-cache';

/**
 * Frame index entry containing metadata for efficient seeking
 */
export interface FrameIndex {
    /** Frame number (0-indexed) */
    frameNumber: number;
    /** Byte offset in file where frame starts */
    offset: number;
    /** Size of frame in bytes */
    size: number;
    /** Time value for this frame */
    time: number;
    /** Number of atoms in this frame */
    atomCount: number;
}

/**
 * Parsed frame data
 */
export interface FrameData {
    /** Frame number */
    frameNumber: number;
    /** Atom count */
    count: number;
    /** X coordinates in Angstroms */
    x: Float32Array;
    /** Y coordinates in Angstroms */
    y: Float32Array;
    /** Z coordinates in Angstroms */
    z: Float32Array;
    /** Box dimensions (9 floats: xx, xy, xz, yx, yy, yz, zx, zy, zz) */
    box: Float32Array;
    /** Time value */
    time: number;
}

/**
 * Trajectory file metadata
 */
export interface TrajectoryInfo {
    /** Total number of frames */
    frameCount: number;
    /** Number of atoms per frame */
    atomCount: number;
    /** Time offset (first frame time) */
    timeOffset: number;
    /** Time step between frames */
    deltaTime: number;
    /** All frame times */
    times: number[];
}

/**
 * Base class for streaming trajectory readers
 */
export abstract class StreamingReader {
    protected filePath: string;
    protected frameIndex: FrameIndex[] = [];
    protected cache: LRUCache<number, FrameData>;
    protected fileHandle: fs.promises.FileHandle | null = null;
    protected isIndexed: boolean = false;

    constructor(filePath: string, cacheSize: number = 100) {
        this.filePath = filePath;
        this.cache = new LRUCache(cacheSize);
    }

    /**
     * Build frame index by scanning the file
     */
    protected abstract buildIndex(): Promise<void>;

    /**
     * Read and parse a single frame from file
     */
    protected abstract readFrame(index: FrameIndex): Promise<FrameData>;

    /**
     * Initialize the reader and build frame index
     */
    async initialize(): Promise<void> {
        if (this.isIndexed) {
            return;
        }

        this.fileHandle = await fs.promises.open(this.filePath, 'r');
        await this.buildIndex();
        this.isIndexed = true;
    }

    /**
     * Get trajectory metadata
     */
    async getInfo(): Promise<TrajectoryInfo> {
        if (!this.isIndexed) {
            await this.initialize();
        }

        if (this.frameIndex.length === 0) {
            throw new Error('No frames found in trajectory file');
        }

        const times = this.frameIndex.map(f => f.time);
        const timeOffset = times.length > 0 ? times[0] : 0;

        // Calculate deltaTime with validation
        let deltaTime = 0;
        if (times.length > 1) {
            deltaTime = times[1] - times[0];
            // Validate deltaTime - if garbage, try to calculate from full range
            if (!Number.isFinite(deltaTime) || Math.abs(deltaTime) > 1e10) {
                const totalTime = times[times.length - 1] - times[0];
                if (Number.isFinite(totalTime) && totalTime >= 0) {
                    deltaTime = totalTime / (times.length - 1);
                } else {
                    deltaTime = 1; // Default to 1 ps
                }
            }
        }

        return {
            frameCount: this.frameIndex.length,
            atomCount: this.frameIndex[0].atomCount,
            timeOffset,
            deltaTime,
            times
        };
    }

    /**
     * Get a single frame (with caching)
     */
    async getFrame(frameNumber: number): Promise<FrameData> {
        if (!this.isIndexed) {
            await this.initialize();
        }

        if (frameNumber < 0 || frameNumber >= this.frameIndex.length) {
            throw new Error(`Frame ${frameNumber} out of range [0, ${this.frameIndex.length - 1}]`);
        }

        // Check cache first
        const cached = this.cache.get(frameNumber);
        if (cached) {
            return cached;
        }

        // Read from file
        const index = this.frameIndex[frameNumber];
        const frameData = await this.readFrame(index);

        // Cache the result
        this.cache.set(frameNumber, frameData);

        return frameData;
    }

    /**
     * Get multiple frames in batch (for efficient postMessage communication)
     */
    async getFrames(frameNumbers: number[]): Promise<FrameData[]> {
        const frames: FrameData[] = [];

        for (const frameNumber of frameNumbers) {
            const frame = await this.getFrame(frameNumber);
            frames.push(frame);
        }

        return frames;
    }

    /**
     * Get a range of consecutive frames
     */
    async getFrameRange(start: number, end: number): Promise<FrameData[]> {
        const frameNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        return this.getFrames(frameNumbers);
    }

    /**
     * Read bytes from file at specified offset
     */
    protected async readBytes(offset: number, length: number): Promise<Buffer> {
        if (!this.fileHandle) {
            throw new Error('File not open');
        }

        const buffer = Buffer.allocUnsafe(length);
        await this.fileHandle.read(buffer, 0, length, offset);
        return buffer;
    }

    /**
     * Close the file handle and clear cache
     */
    async close(): Promise<void> {
        if (this.fileHandle) {
            await this.fileHandle.close();
            this.fileHandle = null;
        }
        this.cache.clear();
        this.isIndexed = false;
        this.frameIndex = [];
    }
}
