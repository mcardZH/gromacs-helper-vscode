/**
 * Streaming Trajectory Implementation for Mol*
 * 
 * This class implements the Mol* Trajectory interface to provide on-demand
 * frame loading via postMessage communication with the extension host.
 */
import { Model, Trajectory, TrajectoryFrameType } from "molstar/lib/mol-model/structure";
import { Task } from "molstar/lib/mol-task";
import { UUID } from "molstar/lib/mol-util";
import { Vec3 } from "molstar/lib/mol-math/linear-algebra";
import { ModelSymmetry } from "molstar/lib/mol-model-formats/structure/property/symmetry";
import { CustomProperties } from "molstar/lib/mol-model/custom-property";
import { PluginStateObject as SO, PluginStateTransform } from "molstar/lib/mol-plugin-state/objects";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition";

/**
 * Global VS Code API reference for use in StateTransformer
 * Set by loadStreamingTrajectory before creating the trajectory
 */
let globalVsCodeApi: VsCodeApi | null = null;

export function setGlobalVsCodeApi(api: VsCodeApi): void {
    globalVsCodeApi = api;
}

export function getGlobalVsCodeApi(): VsCodeApi | null {
    return globalVsCodeApi;
}

/**
 * Frame data structure from streaming reader
 */
export interface StreamingFrameData {
    frameNumber: number;
    count: number;
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    box: Float32Array;  // 9 floats: cell matrix
    time: number;
}

/**
 * postMessage protocol for requesting frames
 */
export interface FrameRequest {
    type: 'requestFrame';
    frameIndex: number;
    requestId: string;
}

export interface FrameResponse {
    type: 'frameResponse';
    requestId: string;
    frameData: StreamingFrameData;
    error?: string;
}

/**
 * VS Code API interface
 */
interface VsCodeApi {
    postMessage(message: unknown): void;
}

/**
 * Streaming Trajectory that loads frames on-demand from extension host
 */
export class StreamingTrajectory implements Trajectory {
    duration: number;
    frameCount: number;
    representative: Model;

    private vscode: VsCodeApi;
    private pendingRequests: Map<string, {
        resolve: (frameData: StreamingFrameData) => void;
        reject: (error: Error) => void;
    }> = new Map();

    constructor(
        frameCount: number,
        duration: number,
        representative: Model,
        vscode: VsCodeApi
    ) {
        this.frameCount = frameCount;
        this.duration = duration;
        this.representative = representative;
        this.vscode = vscode;

        // Setup message listener for frame responses
        window.addEventListener('message', this.handleFrameResponse.bind(this));
    }

    /**
     * Handle frame response from extension host
     */
    private handleFrameResponse(event: MessageEvent): void {
        const message = event.data as FrameResponse;

        if (message.type === 'frameResponse') {
            console.log(`[StreamingTrajectory] Received frame response for request ID: ${message.requestId}`);
            const pending = this.pendingRequests.get(message.requestId);
            if (pending) {
                if (message.error) {
                    console.error(`[StreamingTrajectory] Frame request error:`, message.error);
                    pending.reject(new Error(message.error));
                } else {
                    console.log(`[StreamingTrajectory] Frame data delivered successfully`);
                    pending.resolve(message.frameData);
                }
                this.pendingRequests.delete(message.requestId);
            }
        }
    }

    /**
     * Request a frame from extension host
     */
    private async requestFrame(frameIndex: number): Promise<StreamingFrameData> {
        console.log(`[StreamingTrajectory] Requesting frame ${frameIndex} from host...`);

        return new Promise((resolve, reject) => {
            const requestId = UUID.create22();

            this.pendingRequests.set(requestId, { resolve, reject });

            const request: FrameRequest = {
                type: 'requestFrame',
                frameIndex,
                requestId
            };

            this.vscode.postMessage(request);
            console.log(`[StreamingTrajectory] Frame request sent with ID: ${requestId}`);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Frame request timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Get a frame at specified index (implements Trajectory interface)
     */
    getFrameAtIndex(frameIndex: number, type?: TrajectoryFrameType): Task<Model> | Model {
        return Task.create<Model>('Get Streaming Frame', async (ctx) => {
            try {
                // Request frame data from extension host
                const frameData = await this.requestFrame(frameIndex);

                // Verify atom count matches
                const atomCount = this.representative.atomicHierarchy.atoms._rowCount;
                if (frameData.count !== atomCount) {
                    throw new Error(
                        `Frame element count mismatch: expected ${atomCount}, got ${frameData.count}`
                    );
                }

                // Create new Model by copying representative and replacing coordinates
                const newModel = this.createModelFromFrame(frameData);

                return newModel;
            } catch (error) {
                throw error instanceof Error ? error : new Error(String(error));
            }
        });
    }

    /**
     * Create a Model from frame data
     * Based on Mol* _trajectoryFromModelAndCoordinates logic
     */
    private createModelFromFrame(frameData: StreamingFrameData): Model {
        const model = this.representative;

        // Create atomic conformation with new coordinates
        const atomicConformation = this.getAtomicConformationFromFrame(model, frameData);

        // Create new Model with same topology but new coordinates
        const newModel: Model = {
            ...model,
            id: UUID.create22(),
            modelNum: frameData.frameNumber,
            atomicConformation,
            customProperties: new CustomProperties(),
            _staticPropertyData: Object.create(null),
            _dynamicPropertyData: Object.create(null)
        };

        // Set cell/symmetry if box info exists
        if (frameData.box && frameData.box.length === 9) {
            const cell = this.createCellFromBox(frameData.box);
            if (cell) {
                const symmetry = ModelSymmetry.fromCell(cell.size, cell.anglesInRadians);
                ModelSymmetry.Provider.set(newModel, symmetry);
            }
        }

        return newModel;
    }

    /**
     * Create atomic conformation from frame data
     */
    private getAtomicConformationFromFrame(
        model: Model,
        frameData: StreamingFrameData
    ): Model['atomicConformation'] {
        const { atomicConformation } = model;
        const { x, y, z } = frameData;

        return {
            ...atomicConformation,
            id: UUID.create22(),
            x,
            y,
            z,
            // Keep other properties from template
            atomId: atomicConformation.atomId,
            occupancy: atomicConformation.occupancy,
            B_iso_or_equiv: atomicConformation.B_iso_or_equiv,
            xyzDefined: atomicConformation.xyzDefined ?? true
        };
    }

    /**
     * Create cell from box matrix (9 floats)
     */
    private createCellFromBox(box: Float32Array): {
        size: Vec3;
        anglesInRadians: Vec3
    } | null {
        // Box matrix: [xx, xy, xz, yx, yy, yz, zx, zy, zz]
        // Extract cell vectors
        const a = Vec3.create(box[0], box[3], box[6]);
        const b = Vec3.create(box[1], box[4], box[7]);
        const c = Vec3.create(box[2], box[5], box[8]);

        // Calculate lengths
        const size = Vec3.create(
            Vec3.magnitude(a),
            Vec3.magnitude(b),
            Vec3.magnitude(c)
        );

        // Calculate angles
        const alpha = Math.acos(Vec3.dot(b, c) / (size[1] * size[2]));
        const beta = Math.acos(Vec3.dot(a, c) / (size[0] * size[2]));
        const gamma = Math.acos(Vec3.dot(a, b) / (size[0] * size[1]));

        const anglesInRadians = Vec3.create(alpha, beta, gamma);

        return { size, anglesInRadians };
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.pendingRequests.clear();
    }
}

/**
 * StateTransformer to create streaming trajectory from a model/topology
 * 
 * This follows the Mol* pattern for registering trajectories in the state tree,
 * ensuring proper dependency tracking and UI integration.
 */
export const StreamingTrajectoryFromTopology = PluginStateTransform.BuiltIn({
    name: 'streaming-trajectory-from-topology',
    display: {
        name: 'Streaming Trajectory',
        description: 'Create streaming trajectory from topology model'
    },
    from: SO.Root,
    to: SO.Molecule.Trajectory,
    params: {
        modelRef: PD.Text('', { isHidden: true }),
        frameCount: PD.Numeric(1, { min: 1 }),
        duration: PD.Numeric(0, { min: 0 }),
    }
})({
    apply({ params, dependencies }) {
        return Task.create('Create Streaming Trajectory', async ctx => {
            // Get the model from dependencies
            const modelStateObject = dependencies?.[params.modelRef];
            if (!modelStateObject) {
                throw new Error('Model dependency not found');
            }

            // dependencies[ref] is a StateObject, access .data directly
            const model = modelStateObject.data as Model;
            if (!model) {
                throw new Error('Model data not available');
            }

            // Get the global VS Code API
            const vscodeApi = getGlobalVsCodeApi();
            if (!vscodeApi) {
                throw new Error('VS Code API not set. Call setGlobalVsCodeApi before creating trajectory.');
            }

            // Create the streaming trajectory
            const streamingTrajectory = new StreamingTrajectory(
                params.frameCount,
                params.duration,
                model,
                vscodeApi
            );

            // Return wrapped StateObject
            return new SO.Molecule.Trajectory(streamingTrajectory, {
                label: 'Streaming Trajectory',
                description: `${params.frameCount} frames`
            });
        });
    }
});