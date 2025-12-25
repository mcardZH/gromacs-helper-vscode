// 流式轨迹提供者
import * as path from 'path';
import { TrrStreamReader } from './trr/stream-reader';
import { XtcStreamReader } from './xtc/stream-reader';
import { StreamingReader, TrajectoryInfo, FrameData } from './stream-reader';

export class StreamingTrajectoryProvider {

    private topologyFileUri: string;
    private coordinatesFileUri: string;
    private reader: StreamingReader | null = null;
    private fileType: 'trr' | 'xtc' | null = null;

    constructor(topologyFileUri: string, coordinatesFileUri: string) {
        this.topologyFileUri = topologyFileUri;
        this.coordinatesFileUri = coordinatesFileUri;

        // Determine file type from extension
        const ext = path.extname(coordinatesFileUri).toLowerCase();
        if (ext === '.trr') {
            this.fileType = 'trr';
        } else if (ext === '.xtc') {
            this.fileType = 'xtc';
        } else {
            throw new Error(`Unsupported trajectory format: ${ext}`);
        }
    }

    /**
     * Initialize the streaming reader
     */
    async initialize(): Promise<void> {
        if (this.reader) {
            return;
        }

        // Create appropriate reader based on file type
        if (this.fileType === 'trr') {
            this.reader = new TrrStreamReader(this.coordinatesFileUri);
        } else if (this.fileType === 'xtc') {
            this.reader = new XtcStreamReader(this.coordinatesFileUri);
        } else {
            throw new Error('File type not set');
        }

        await this.reader.initialize();
    }

    /**
     * Get trajectory information (frame count, time info, etc.)
     */
    async getInfo(): Promise<TrajectoryInfo> {
        if (!this.reader) {
            await this.initialize();
        }
        return this.reader!.getInfo();
    }

    /**
     * Get a single frame by index
     */
    async getFrame(frameIndex: number): Promise<FrameData> {
        if (!this.reader) {
            await this.initialize();
        }
        return this.reader!.getFrame(frameIndex);
    }

    /**
     * Get multiple frames in batch (for efficient postMessage communication)
     */
    async getFrames(frameIndices: number[]): Promise<FrameData[]> {
        if (!this.reader) {
            await this.initialize();
        }
        return this.reader!.getFrames(frameIndices);
    }

    /**
     * Get a range of consecutive frames
     */
    async getFrameRange(start: number, end: number): Promise<FrameData[]> {
        if (!this.reader) {
            await this.initialize();
        }
        return this.reader!.getFrameRange(start, end);
    }

    /**
     * Get topology file URI
     */
    getTopologyUri(): string {
        return this.topologyFileUri;
    }

    /**
     * Get coordinates file URI
     */
    getCoordinatesUri(): string {
        return this.coordinatesFileUri;
    }

    /**
     * Close the provider and release resources
     */
    async close(): Promise<void> {
        if (this.reader) {
            await this.reader.close();
            this.reader = null;
        }
    }
}
