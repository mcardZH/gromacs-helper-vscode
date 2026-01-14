/**
 * Base streaming reader for trajectory files
 * 
 * Uses vscode.workspace.fs API for remote file support (SSH, etc.)
 */
import * as vscode from 'vscode';
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
 * 
 * Uses vscode.workspace.fs API to read files, which supports remote file systems.
 * Files are read into memory for random access, as vscode.workspace.fs doesn't support
 * partial reads or file handles.
 */
export abstract class StreamingReader {
    protected fileUri: vscode.Uri;
    protected frameIndex: FrameIndex[] = [];
    protected cache: LRUCache<number, FrameData>;
    protected fileBuffer: Buffer | null = null;
    protected isIndexed: boolean = false;

    constructor(fileUri: string | vscode.Uri, cacheSize: number = 100) {
        // Accept either URI string or vscode.Uri object
        if (typeof fileUri === 'string') {
            this.fileUri = vscode.Uri.parse(fileUri);
        } else {
            this.fileUri = fileUri;
        }
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
     * 
     * Reads the entire file into memory using vscode.workspace.fs API.
     * This is necessary because vscode.workspace.fs doesn't support partial reads.
     */
    async initialize(): Promise<void> {
        if (this.isIndexed) {
            return;
        }

        // Read entire file into memory using vscode.workspace.fs API
        // This supports remote file systems (SSH, etc.) without downloading
        const fileData = await vscode.workspace.fs.readFile(this.fileUri);
        this.fileBuffer = Buffer.from(fileData);
        
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
     * Read bytes from file buffer at specified offset
     * 
     * Since we've loaded the entire file into memory, we can do random access
     * reads directly from the buffer.
     */
    protected async readBytes(offset: number, length: number): Promise<Buffer> {
        if (!this.fileBuffer) {
            throw new Error('File not loaded. Call initialize() first.');
        }

        if (offset + length > this.fileBuffer.length) {
            throw new Error(`Read beyond end of file: offset=${offset}, length=${length}, fileSize=${this.fileBuffer.length}`);
        }

        // Return a slice of the buffer (this creates a new Buffer view, not a copy)
        return this.fileBuffer.subarray(offset, offset + length);
    }

    /**
     * Close the reader and clear cache
     * 
     * Releases the file buffer from memory.
     */
    async close(): Promise<void> {
        this.fileBuffer = null;
        this.cache.clear();
        this.isIndexed = false;
        this.frameIndex = [];
    }
}
