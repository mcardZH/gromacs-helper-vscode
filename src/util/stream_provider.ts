// 流式轨迹提供者
import * as path from 'path';
import * as vscode from 'vscode';
import { TrrStreamReader } from './trr/stream-reader';
import { XtcStreamReader } from './xtc/stream-reader';
import { StreamingReader, TrajectoryInfo, FrameData } from './stream-reader';

export class StreamingTrajectoryProvider {

    private topologyFileUri: string;
    private coordinatesFileUri: string;
    private reader: StreamingReader | null = null;
    private fileType: 'trr' | 'xtc' | null = null;

    /**
     * Constructor for StreamingTrajectoryProvider
     * 
     * @param topologyFileUri - URI string or vscode.Uri for topology file (e.g., .gro, .pdb)
     * @param coordinatesFileUri - URI string or vscode.Uri for trajectory file (e.g., .xtc, .trr)
     */
    constructor(topologyFileUri: string | vscode.Uri, coordinatesFileUri: string | vscode.Uri) {
        // Convert to string if vscode.Uri is provided
        this.topologyFileUri = typeof topologyFileUri === 'string' 
            ? topologyFileUri 
            : topologyFileUri.toString();
        this.coordinatesFileUri = typeof coordinatesFileUri === 'string'
            ? coordinatesFileUri
            : coordinatesFileUri.toString();

        // Determine file type from extension
        // Parse URI to get path for extension detection
        const coordinatesUri = typeof coordinatesFileUri === 'string'
            ? vscode.Uri.parse(coordinatesFileUri)
            : coordinatesFileUri;
        const ext = path.extname(coordinatesUri.fsPath || coordinatesUri.path).toLowerCase();
        
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
        // Pass URI string to reader (it will parse it internally)
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
