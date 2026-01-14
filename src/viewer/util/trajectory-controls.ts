/**
 * Trajectory Control Utilities
 * 
 * Provides functions to query and control trajectory playback in Mol* viewer.
 */

import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms';
import { PluginStateObject as PSO } from 'molstar/lib/mol-plugin-state/objects';
import { StateTransformer } from 'molstar/lib/mol-state';
import { ModelFromTrajectory } from 'molstar/lib/mol-plugin-state/transforms/model';

/**
 * Trajectory information
 */
export interface TrajectoryInfo {
    currentFrame: number;
    totalFrames: number;
    hasTrajectory: boolean;
}

/**
 * Trajectory control functions
 */
export namespace TrajectoryControls {
    /**
     * Get current trajectory information
     * 
     * @param plugin - Mol* plugin context
     * @returns Trajectory info including current frame, total frames, and whether a trajectory is loaded
     */
    export function getTrajectoryInfo(plugin: PluginUIContext): TrajectoryInfo {
        const state = plugin.state.data;
        
        // Find all Model nodes that were created from trajectory
        const models = state.selectQ(q => q.ofTransformer(StateTransforms.Model.ModelFromTrajectory));

        if (models.length === 0) {
            return { currentFrame: 0, totalFrames: 0, hasTrajectory: false };
        }

        // Get the first model (in most cases there's only one trajectory)
        const model = models[0];
        if (!model.sourceRef) {
            return { currentFrame: 0, totalFrames: 0, hasTrajectory: false };
        }

        // Get the parent trajectory object
        const parentCell = state.cells.get(model.sourceRef);
        const parent = parentCell?.obj as PSO.Molecule.Trajectory | undefined;
        
        if (!parent || parent.data.frameCount <= 1) {
            return { currentFrame: 0, totalFrames: 0, hasTrajectory: false };
        }

        // Get current frame index from model parameters
        const params = model.transform.params as StateTransformer.Params<ModelFromTrajectory>;
        const currentFrame = params?.modelIndex ?? 0;
        const totalFrames = parent.data.frameCount;

        return { currentFrame, totalFrames, hasTrajectory: true };
    }

    /**
     * Jump to a specific frame in the trajectory
     * 
     * @param plugin - Mol* plugin context
     * @param frameIndex - Target frame index (0-based)
     */
    export async function jumpToFrame(plugin: PluginUIContext, frameIndex: number): Promise<void> {
        const state = plugin.state.data;
        const models = state.selectQ(q => q.ofTransformer(StateTransforms.Model.ModelFromTrajectory));

        if (models.length === 0) return;

        const update = state.build();

        for (const model of models) {
            if (!model.sourceRef) continue;
            
            const parentCell = state.cells.get(model.sourceRef);
            const parent = parentCell?.obj as PSO.Molecule.Trajectory | undefined;
            if (!parent) continue;

            // Clamp frame index to valid range
            const clampedIndex = Math.max(0, Math.min(frameIndex, parent.data.frameCount - 1));
            
            // Update model to display the specified frame
            update.to(model).update({ modelIndex: clampedIndex });
        }

        await update.commit();
    }

    /**
     * Check if there is a valid trajectory loaded
     * 
     * @param plugin - Mol* plugin context
     * @returns true if a trajectory with multiple frames is loaded
     */
    export function hasTrajectory(plugin: PluginUIContext): boolean {
        return getTrajectoryInfo(plugin).hasTrajectory;
    }
}
