/**
 * Custom Viewport Component
 * 
 * Replaces mol*'s DefaultViewport to include custom trajectory controls.
 */

import * as React from 'react';
import { PluginUIComponent } from 'molstar/lib/mol-plugin-ui/base';
import { Viewport, ViewportControls } from 'molstar/lib/mol-plugin-ui/viewport';
import { BackgroundTaskProgress } from 'molstar/lib/mol-plugin-ui/task';
import { Toasts } from 'molstar/lib/mol-plugin-ui/toast';
import { 
    AnimationViewportControls, 
    StateSnapshotViewportControls, 
    SelectionViewportControls, 
    LociLabels, 
    ViewportSnapshotDescription 
} from 'molstar/lib/mol-plugin-ui/controls';
import { CustomTrajectoryControls } from './CustomTrajectoryControls';

export class CustomViewport extends PluginUIComponent {
    render() {
        const VPControls = this.plugin.spec.components?.viewport?.controls || ViewportControls;
        const SVPControls = this.plugin.spec.components?.selectionTools?.controls || SelectionViewportControls;
        const SnapshotDescription = this.plugin.spec.components?.viewport?.snapshotDescription || ViewportSnapshotDescription;

        return <>
            <Viewport />
            <div className='msp-viewport-top-left-controls'>
                <AnimationViewportControls />
                {/* Use custom trajectory controls instead of default TrajectoryViewportControls */}
                <CustomTrajectoryControls />
                <StateSnapshotViewportControls />
                <SnapshotDescription />
            </div>
            <SVPControls />
            <VPControls />
            <BackgroundTaskProgress />
            <div className='msp-highlight-toast-wrapper'>
                <LociLabels />
                <Toasts />
            </div>
        </>;
    }
}
