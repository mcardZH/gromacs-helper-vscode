/**
 * Mol* Viewer Entry Point for VS Code Webview
 * 
 * This file initializes the Mol* viewer with React UI and handles
 * communication with the VS Code extension.
 */

import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';

import 'molstar/lib/mol-plugin-ui/skin/light.scss';

// Declare VS Code API
declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// Global plugin instance
let plugin: PluginUIContext | undefined;

/**
 * Initialize the Mol* viewer
 */
async function initViewer(): Promise<PluginUIContext> {
    const container = document.getElementById('molstar-container');
    if (!container) {
        throw new Error('Mol* container element not found');
    }

    const spec: PluginUISpec = {
        ...DefaultPluginUISpec(),
        config: [
            [PluginConfig.VolumeStreaming.Enabled, false],
        ],
        layout: {
            initial: {
                isExpanded: false,
                showControls: true,
                controlsDisplay: 'reactive',
            }
        },
        canvas3d: {
            renderer: {
                // Disable VR since VS Code webviews don't support WebXR
            },
            camera: {
                // Default camera settings
            }
        }
    };

    // Disable XR before creating plugin since VS Code webviews don't support WebXR
    // Use Object.defineProperty to override the read-only property
    try {
        if (typeof navigator !== 'undefined' && 'xr' in navigator) {
            Object.defineProperty(navigator, 'xr', {
                value: undefined,
                writable: true,
                configurable: true
            });
        }
    } catch {
        // Ignore if we can't override - mol* will handle the XR check gracefully
    }

    plugin = await createPluginUI({
        target: container,
        spec,
        render: renderReact18
    });

    return plugin;
}

/**
 * Load a structure from data string
 */
async function loadStructure(data: string, format: 'pdb' | 'gro' | 'mol' | 'mol2' | 'sdf' | 'mmcif', filename: string): Promise<void> {
    if (!plugin) {
        throw new Error('Plugin not initialized');
    }

    // Clear existing structures
    await plugin.clear();

    // Load the structure from raw data
    const dataObj = await plugin.builders.data.rawData({
        data,
        label: filename
    });

    // Parse the trajectory
    const trajectory = await plugin.builders.structure.parseTrajectory(dataObj, format);

    // Apply default preset
    await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');
}

/**
 * Handle messages from VS Code extension
 */
function handleMessage(event: MessageEvent): void {
    const message = event.data;

    switch (message.type) {
        case 'loadStructure': {
            // Map incoming format to mol* format
            let molstarFormat = message.format as 'pdb' | 'gro' | 'mol' | 'mol2' | 'sdf' | 'mmcif';
            if (message.format === 'cif') {
                molstarFormat = 'mmcif';
            }

            // Persist state immediately for panel serialization
            if (message.fileUri) {
                vscode.setState({ fileUri: message.fileUri });
            }

            loadStructure(message.data, molstarFormat, message.filename)
                .then(() => {
                    vscode.postMessage({ type: 'structureLoaded', filename: message.filename });
                })
                .catch((error: Error) => {
                    vscode.postMessage({ type: 'error', message: error.message });
                });
            break;
        }

        case 'clear':
            plugin?.clear();
            break;
    }
}

/**
 * Main initialization
 */
async function main(): Promise<void> {
    try {
        await initViewer();

        // Listen for messages from VS Code
        window.addEventListener('message', handleMessage);

        // Notify VS Code that we're ready
        vscode.postMessage({ type: 'ready' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.postMessage({ type: 'error', message: errorMessage });
    }
}

// Start the viewer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
