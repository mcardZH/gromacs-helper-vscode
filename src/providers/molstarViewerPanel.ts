import * as vscode from 'vscode';
import * as path from 'path';
import { StreamingTrajectoryProvider } from '../util/stream_provider';

/**
 * Mol* Viewer Panel Manager
 * 
 * Manages the webview panel for the Mol* molecular viewer.
 */
export class MolstarViewerPanel {
    // private static currentPanel: MolstarViewerPanel | undefined; // Removed singleton
    private static readonly _panels: Map<string, MolstarViewerPanel> = new Map();
    public static readonly viewType = 'gromacs-helper.molstarViewer';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _resourceUri?: vscode.Uri; // Keep track of the file this panel is for
    private _disposables: vscode.Disposable[] = [];
    private _isWebviewReady = false;
    private _pendingStructure: { data: string; format: string; filename: string; fileUri: string } | undefined;
    private _pendingTrajectory: {
        topologyUrl: string;
        topologyFormat: string;
        topologyFilename: string;
        topologyFileUri: string;  // Original file URI for serialization
        coordinatesUrl: string;
        coordinatesFormat: string;
        coordinatesFilename: string;
        fileUri: string;
    } | undefined;
    private _pendingStreamingTrajectory: {
        topologyUrl: string;
        topologyFormat: string;
        topologyFilename: string;
        topologyFileUri: string;
        topologyFilePath: string;
        coordinatesFilename: string;
        fileUri: string;
        filePath: string;
        frameCount: number;
        duration: number;
    } | undefined;

    // Streaming trajectory provider (for on-demand frame loading)
    private _streamingProvider: StreamingTrajectoryProvider | undefined;

    // Trajectory file extensions
    private static readonly _trajectoryExtensions = ['.xtc', '.trr'];
    // Topology/coordinate file extensions for trajectory loading
    private static readonly _topologyExtensions = ['.gro', '.pdb'];

    /**
     * Create or show the Mol* viewer panel
     */
    public static async createOrShow(extensionUri: vscode.Uri, fileUri?: vscode.Uri): Promise<void> {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we have a fileUri, check if a panel already exists for it
        if (fileUri) {
            const existingPanel = MolstarViewerPanel._panels.get(fileUri.toString());
            if (existingPanel) {
                existingPanel._panel.reveal(column);
                return;
            }
        }

        // Build localResourceRoots including file directory if provided
        const localResourceRoots: vscode.Uri[] = [
            vscode.Uri.joinPath(extensionUri, 'dist', 'viewer'),
            vscode.Uri.joinPath(extensionUri, 'media')
        ];

        // Add file's parent directory to allow webview access to files
        // Use vscode.Uri.joinPath to preserve URI scheme for remote files
        if (fileUri) {
            const fileDir = vscode.Uri.joinPath(fileUri, '..');
            localResourceRoots.push(fileDir);
        }

        // Create a new panel
        // NOTE: retainContextWhenHidden is set to false to enable panel serialization
        // When true, the webview content is retained in memory and serializer is NOT called on restart
        const panel = vscode.window.createWebviewPanel(
            MolstarViewerPanel.viewType,
            fileUri ? `Mol* - ${path.basename(fileUri.fsPath)}` : 'Mol* Viewer',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots
            }
        );

        const viewerPanel = new MolstarViewerPanel(panel, extensionUri, fileUri);

        if (fileUri) {
            MolstarViewerPanel._panels.set(fileUri.toString(), viewerPanel);
            await viewerPanel._loadFile(fileUri);
        } else {
            // Should we track panels without fileUri? maybe by a unique key or just don't track?
            // If they are not tracked, they can't be found again by createOrShow, which is fine for "untitled" or generic usage.
            // But we need to make sure they are disposed correctly.
        }
    }

    /**
     * Revive a panel from serialization
     */
    /**
     * Helper function to reconstruct URI from file path, preserving remote URI scheme
     * 
     * When extension runs on remote, file paths need to be converted to remote URIs
     * with the correct scheme (e.g., vscode-remote://ssh-remote+host/path)
     */
    private static _reconstructUriFromPath(filePath: string, referenceUri?: vscode.Uri): vscode.Uri {
        // Try to use workspace folder URI scheme if available (most reliable for remote)
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceFolder = vscode.workspace.workspaceFolders[0];
            const workspaceScheme = workspaceFolder.uri.scheme;
            const workspaceAuthority = workspaceFolder.uri.authority;
            
            // If workspace is remote, use its scheme and authority
            if (workspaceScheme !== 'file') {
                // For remote URIs, the path should be absolute
                // Format: scheme://authority/path
                return vscode.Uri.parse(`${workspaceScheme}://${workspaceAuthority}${filePath}`);
            }
        }
        
        // If we have a reference URI with remote scheme, use it
        if (referenceUri && referenceUri.scheme !== 'file') {
            return vscode.Uri.parse(`${referenceUri.scheme}://${referenceUri.authority}${filePath}`);
        }
        
        // Fallback to local file URI
        return vscode.Uri.file(filePath);
    }

    public static async revive(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        fileUriString?: string,
        topologyFileUriString?: string,
        isTrajectory?: boolean,
        isStreamingTrajectory?: boolean,
        filePath?: string,
        topologyFilePath?: string
    ): Promise<void> {
        let fileUri: vscode.Uri | undefined;
        let topologyUri: vscode.Uri | undefined;
        console.log('[Revive] Reviving panel with:', {
            fileUriString,
            topologyFileUriString,
            filePath,
            topologyFilePath
        });
        // Parse URIs from strings (these preserve the original URI scheme)
        // Priority: Use saved URI strings first, as they contain the correct scheme
        if (fileUriString) {
            fileUri = vscode.Uri.parse(fileUriString);
            console.log('[Revive] Parsed fileUri from string:', {
                fileUriString,
                parsedUri: fileUri.toString(),
                scheme: fileUri.scheme,
                authority: fileUri.authority,
                path: fileUri.path
            });
        }
        
        if (topologyFileUriString) {
            topologyUri = vscode.Uri.parse(topologyFileUriString);
            console.log('[Revive] Parsed topologyUri from string:', {
                topologyFileUriString,
                parsedUri: topologyUri.toString(),
                scheme: topologyUri.scheme,
                authority: topologyUri.authority,
                path: topologyUri.path
            });
        }

        // Get workspace folder info for URI reconstruction if needed
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceScheme = workspaceFolders && workspaceFolders.length > 0 
            ? workspaceFolders[0].uri.scheme 
            : 'file';
        const isRemote = workspaceScheme !== 'file';

        // For streaming trajectories, reconstruct URIs from file paths if needed
        // This is important for remote connections where file paths need correct URI scheme
        if (isStreamingTrajectory) {
            // Check if we need to reconstruct trajectory URI
            if (!fileUri && filePath) {
                // No URI string saved, reconstruct from file path using workspace scheme
                fileUri = MolstarViewerPanel._reconstructUriFromPath(filePath, 
                    workspaceFolders ? workspaceFolders[0].uri : undefined);
                console.log('[Revive] Reconstructed trajectory URI from path (no URI string):', {
                    filePath,
                    reconstructedUri: fileUri.toString(),
                    scheme: fileUri.scheme,
                    isRemote
                });
            } else if (fileUri && filePath && fileUri.scheme === 'file' && isRemote) {
                // Saved URI is local but we're in remote, reconstruct with remote scheme
                fileUri = MolstarViewerPanel._reconstructUriFromPath(filePath, 
                    workspaceFolders![0].uri);
                console.log('[Revive] Reconstructed trajectory URI for remote (was local):', {
                    originalPath: filePath,
                    reconstructedUri: fileUri.toString(),
                    scheme: fileUri.scheme
                });
            }

            // Check if we need to reconstruct topology URI
            if (!topologyUri && topologyFilePath) {
                // No URI string saved, reconstruct from file path
                topologyUri = MolstarViewerPanel._reconstructUriFromPath(topologyFilePath, 
                    fileUri || (workspaceFolders ? workspaceFolders[0].uri : undefined));
                console.log('[Revive] Reconstructed topology URI from path (no URI string):', {
                    topologyFilePath,
                    reconstructedUri: topologyUri.toString(),
                    scheme: topologyUri.scheme,
                    isRemote
                });
            } else if (topologyUri && topologyFilePath && topologyUri.scheme === 'file' && isRemote) {
                // Saved URI is local but we're in remote, reconstruct with remote scheme
                topologyUri = MolstarViewerPanel._reconstructUriFromPath(topologyFilePath, 
                    workspaceFolders![0].uri);
                console.log('[Revive] Reconstructed topology URI for remote (was local):', {
                    originalPath: topologyFilePath,
                    reconstructedUri: topologyUri.toString(),
                    scheme: topologyUri.scheme
                });
            }
        }

        // Update webview options to include file directories for trajectory files
        if (fileUri) {
            const localResourceRoots: vscode.Uri[] = [
                vscode.Uri.joinPath(extensionUri, 'dist', 'viewer'),
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.joinPath(fileUri, '..')  // Use joinPath to preserve URI scheme
            ];

            // Add topology directory if different
            if (topologyUri) {
                const topologyDirUri = vscode.Uri.joinPath(topologyUri, '..');
                // Check if directory is already in the list by comparing URI strings
                if (!localResourceRoots.some(r => r.toString() === topologyDirUri.toString())) {
                    localResourceRoots.push(topologyDirUri);
                }
            }

            panel.webview.options = {
                enableScripts: true,
                localResourceRoots
            };
        }

        const viewerPanel = new MolstarViewerPanel(panel, extensionUri, fileUri);

        if (fileUri) {
            MolstarViewerPanel._panels.set(fileUri.toString(), viewerPanel);

            // For streaming trajectories, use reconstructed URIs for proper restoration
            if (isStreamingTrajectory && topologyUri) {
                console.log('[Revive] Loading streaming trajectory with URIs:', {
                    trajectoryUri: fileUri.toString(),
                    topologyUri: topologyUri.toString()
                });
                await viewerPanel._loadStreamingTrajectory(fileUri, topologyUri);
            } else if (isTrajectory && topologyUri) {
                // For regular trajectories, use saved topology file
                await viewerPanel._loadTrajectoryWithTopology(fileUri, topologyUri);
            } else if (fileUri) {
                // Reload the file to restore the structure
                await viewerPanel._loadFile(fileUri);
            }
        } else {
            console.log('[Revive] No fileUri provided - creating empty panel');
            // Panel is created but no file will be loaded
            // User can manually load a file if needed
        }
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, resourceUri?: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._resourceUri = resourceUri;

        // Set the webview HTML content
        this._panel.webview.html = this._getHtmlForWebview();

        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            null,
            this._disposables
        );
    }

    // Note: state is now set directly in webview when loadStructure is received

    /**
     * Dispose the panel
     */
    public dispose(): void {
        // MolstarViewerPanel.currentPanel = undefined; // Removed singleton

        if (this._resourceUri) {
            MolstarViewerPanel._panels.delete(this._resourceUri.toString());
        }

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    /**
     * Check if a file is a trajectory file
     */
    private _isTrajectoryFile(ext: string): boolean {
        return MolstarViewerPanel._trajectoryExtensions.includes(ext);
    }

    /**
     * Load a molecular structure file
     */
    private async _loadFile(fileUri: vscode.Uri): Promise<void> {
        try {
            const filename = path.basename(fileUri.fsPath);
            const ext = path.extname(fileUri.fsPath).toLowerCase();

            // Check if this is a trajectory file
            if (this._isTrajectoryFile(ext)) {
                await this._loadTrajectoryFile(fileUri);
                return;
            }

            // Use vscode.workspace.fs API for remote file support
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            const data = Buffer.from(fileData).toString('utf-8');

            // Determine format from extension
            const formatMap: { [key: string]: string } = {
                '.pdb': 'pdb',
                '.gro': 'gro',
                '.mol': 'mol',
                '.mol2': 'mol2',
                '.sdf': 'sdf',
                '.cif': 'mmcif',
                '.mmcif': 'mmcif'
            };

            const format = formatMap[ext];
            if (!format) {
                vscode.window.showErrorMessage(`Unsupported file format: ${ext}`);
                return;
            }

            // Store pending structure if webview isn't ready
            if (!this._isWebviewReady) {
                this._pendingStructure = { data, format, filename, fileUri: fileUri.toString() };
                return;
            }

            // Send to webview (include fileUri for state persistence)
            this._panel.webview.postMessage({
                type: 'loadStructure',
                data,
                format,
                filename,
                fileUri: fileUri.toString()
            });

            // Update panel title
            this._panel.title = `Mol* - ${filename}`;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to load file: ${message}`);
        }
    }

    /**
     * Load a trajectory file with topology selection
     */
    private async _loadTrajectoryFile(trajectoryUri: vscode.Uri): Promise<void> {
        try {
            const trajectoryFilename = path.basename(trajectoryUri.fsPath);
            const trajectoryExt = path.extname(trajectoryUri.fsPath).toLowerCase();
            // Use vscode.Uri.joinPath to get parent directory URI, preserving the URI scheme (works for remote)
            const trajectoryDirUri = vscode.Uri.joinPath(trajectoryUri, '..');

            // Check file size using vscode.workspace.fs API
            const stats = await vscode.workspace.fs.stat(trajectoryUri);
            const fileSizeMB = stats.size / (1024 * 1024);
            const useStreaming = fileSizeMB > 50;

            // Ask user to select a topology file
            // Use trajectoryDirUri to preserve remote URI scheme (e.g., vscode-remote://ssh-remote+...)
            const topologyUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                defaultUri: trajectoryDirUri,
                filters: {
                    'Topology Files': ['gro', 'pdb'],
                    'All Files': ['*']
                },
                title: 'Select Topology/Coordinate File for Trajectory'
            });

            if (!topologyUri || topologyUri.length === 0) {
                vscode.window.showWarningMessage('Trajectory loading cancelled: No topology file selected');
                return;
            }

            const selectedTopologyUri = topologyUri[0];
            const topologyFilename = path.basename(selectedTopologyUri.fsPath);
            const topologyExt = path.extname(selectedTopologyUri.fsPath).toLowerCase();

            // Validate topology file format
            const topologyFormatMap: { [key: string]: string } = {
                '.pdb': 'pdb',
                '.gro': 'gro'
            };

            const topologyFormat = topologyFormatMap[topologyExt];
            if (!topologyFormat) {
                vscode.window.showErrorMessage(`Unsupported topology format: ${topologyExt}. Please select a .gro or .pdb file.`);
                return;
            }

            // If file is large, ask user whether to use streaming
            if (useStreaming) {
                const choice = await vscode.window.showInformationMessage(
                    `Trajectory file is ${fileSizeMB.toFixed(1)} MB. Use streaming mode for better performance?`,
                    { modal: true },
                    'Use Streaming (Recommended)',
                    'Load Normally'
                );

                if (choice === 'Use Streaming (Recommended)') {
                    // Use streaming trajectory loader
                    await this._loadStreamingTrajectory(trajectoryUri, selectedTopologyUri);
                    return;
                } else if (choice === undefined) {
                    // User cancelled
                    return;
                }
                // Otherwise, continue with normal loading
            }

            // Determine coordinates format
            const coordinatesFormatMap: { [key: string]: string } = {
                '.xtc': 'xtc',
                '.trr': 'trr'
            };

            const coordinatesFormat = coordinatesFormatMap[trajectoryExt];
            if (!coordinatesFormat) {
                vscode.window.showErrorMessage(`Unsupported trajectory format: ${trajectoryExt}`);
                return;
            }

            // Need to add topology directory to webview options if different from trajectory directory
            const topologyDir = path.dirname(selectedTopologyUri.fsPath);
            // if (topologyDir !== trajectoryDir) {
            //     // Update webview options to include topology directory
            //     // NOTE: webview.options is readonly after creation, so we need to ensure
            //     // the user selects files from accessible directories
            //     // For now, we'll read the topology file directly as it's text-based
            // }

            // Convert file URIs to webview URIs for URL-based loading
            const topologyWebviewUri = this._panel.webview.asWebviewUri(selectedTopologyUri).toString();
            const coordinatesWebviewUri = this._panel.webview.asWebviewUri(trajectoryUri).toString();

            // Store pending trajectory if webview isn't ready
            if (!this._isWebviewReady) {
                this._pendingTrajectory = {
                    topologyUrl: topologyWebviewUri,
                    topologyFormat,
                    topologyFilename,
                    topologyFileUri: selectedTopologyUri.toString(),
                    coordinatesUrl: coordinatesWebviewUri,
                    coordinatesFormat,
                    coordinatesFilename: trajectoryFilename,
                    fileUri: trajectoryUri.toString()
                };
                return;
            }

            // Send to webview using URL-based loading
            this._panel.webview.postMessage({
                type: 'loadTrajectory',
                topologyUrl: topologyWebviewUri,
                topologyFormat,
                topologyFilename,
                topologyFileUri: selectedTopologyUri.toString(),
                coordinatesUrl: coordinatesWebviewUri,
                coordinatesFormat,
                coordinatesFilename: trajectoryFilename,
                fileUri: trajectoryUri.toString()
            });

            // Update panel title
            this._panel.title = `Mol* - ${trajectoryFilename}`;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to load trajectory: ${message}`);
        }
    }

    /**
     * Load a trajectory file with a known topology file (for deserialization)
     * This bypasses the file picker dialog since we already know the topology file.
     */
    private async _loadTrajectoryWithTopology(trajectoryUri: vscode.Uri, topologyUri: vscode.Uri): Promise<void> {
        try {
            const trajectoryFilename = path.basename(trajectoryUri.fsPath);
            const trajectoryExt = path.extname(trajectoryUri.fsPath).toLowerCase();
            const topologyFilename = path.basename(topologyUri.fsPath);
            const topologyExt = path.extname(topologyUri.fsPath).toLowerCase();

            // Check file size using vscode.workspace.fs API
            const stats = await vscode.workspace.fs.stat(trajectoryUri);
            const fileSizeMB = stats.size / (1024 * 1024);
            const useStreaming = fileSizeMB > 50;

            // Validate topology file format
            const topologyFormatMap: { [key: string]: string } = {
                '.pdb': 'pdb',
                '.gro': 'gro'
            };

            const topologyFormat = topologyFormatMap[topologyExt];
            if (!topologyFormat) {
                vscode.window.showErrorMessage(`Unsupported topology format: ${topologyExt}`);
                return;
            }

            // If file is large, ask user whether to use streaming
            if (useStreaming) {
                const choice = await vscode.window.showInformationMessage(
                    `Trajectory file is ${fileSizeMB.toFixed(1)} MB. Use streaming mode for better performance?`,
                    { modal: true },
                    'Use Streaming (Recommended)',
                    'Load Normally'
                );

                if (choice === 'Use Streaming (Recommended)') {
                    // Use streaming trajectory loader
                    await this._loadStreamingTrajectory(trajectoryUri, topologyUri);
                    return;
                } else if (choice === undefined) {
                    // User cancelled
                    return;
                }
                // Otherwise, continue with normal loading
            }

            // Determine coordinates format
            const coordinatesFormatMap: { [key: string]: string } = {
                '.xtc': 'xtc',
                '.trr': 'trr'
            };

            const coordinatesFormat = coordinatesFormatMap[trajectoryExt];
            if (!coordinatesFormat) {
                vscode.window.showErrorMessage(`Unsupported trajectory format: ${trajectoryExt}`);
                return;
            }

            // Convert file URIs to webview URIs for URL-based loading
            const topologyWebviewUri = this._panel.webview.asWebviewUri(topologyUri).toString();
            const coordinatesWebviewUri = this._panel.webview.asWebviewUri(trajectoryUri).toString();

            // Store pending trajectory if webview isn't ready
            if (!this._isWebviewReady) {
                this._pendingTrajectory = {
                    topologyUrl: topologyWebviewUri,
                    topologyFormat,
                    topologyFilename,
                    topologyFileUri: topologyUri.toString(),
                    coordinatesUrl: coordinatesWebviewUri,
                    coordinatesFormat,
                    coordinatesFilename: trajectoryFilename,
                    fileUri: trajectoryUri.toString()
                };
                return;
            }

            // Send to webview using URL-based loading
            this._panel.webview.postMessage({
                type: 'loadTrajectory',
                topologyUrl: topologyWebviewUri,
                topologyFormat,
                topologyFilename,
                topologyFileUri: topologyUri.toString(),
                coordinatesUrl: coordinatesWebviewUri,
                coordinatesFormat,
                coordinatesFilename: trajectoryFilename,
                fileUri: trajectoryUri.toString()
            });

            // Update panel title
            this._panel.title = `Mol* - ${trajectoryFilename}`;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to load trajectory: ${message}`);
        }
    }

    /**
     * Load a streaming trajectory file (alternative to full trajectory loading)
     */
    private async _loadStreamingTrajectory(trajectoryUri: vscode.Uri, topologyUri: vscode.Uri): Promise<void> {
        console.log('[StreamingTrajectory] Starting streaming trajectory load');
        console.log('[StreamingTrajectory] Topology:', topologyUri.fsPath);
        console.log('[StreamingTrajectory] Trajectory:', trajectoryUri.fsPath);

        try {
            const trajectoryFilename = path.basename(trajectoryUri.fsPath);
            const topologyFilename = path.basename(topologyUri.fsPath);
            const topologyExt = path.extname(topologyUri.fsPath).toLowerCase();

            // Validate topology file format
            const topologyFormatMap: { [key: string]: string } = {
                '.pdb': 'pdb',
                '.gro': 'gro'
            };

            const topologyFormat = topologyFormatMap[topologyExt];
            if (!topologyFormat) {
                vscode.window.showErrorMessage(`Unsupported topology format: ${topologyExt}`);
                return;
            }

            // Initialize streaming provider with URIs (not file paths)
            console.log('[StreamingTrajectory] Initializing StreamingTrajectoryProvider...');
            this._streamingProvider = new StreamingTrajectoryProvider(
                topologyUri.toString(),
                trajectoryUri.toString()
            );

            await this._streamingProvider.initialize();
            console.log('[StreamingTrajectory] Provider initialized successfully');

            // Get trajectory info
            const info = await this._streamingProvider.getInfo();
            console.log('[StreamingTrajectory] Trajectory info:', {
                frameCount: info.frameCount,
                atomCount: info.atomCount,
                deltaTime: info.deltaTime
            });

            // Convert topology file URI to webview URI
            const topologyWebviewUri = this._panel.webview.asWebviewUri(topologyUri).toString();

            // Prepare message data
            const messageData = {
                type: 'loadStreamingTrajectory',
                topologyUrl: topologyWebviewUri,
                topologyFormat,
                topologyFilename,
                topologyFileUri: topologyUri.toString(),
                topologyFilePath: topologyUri.fsPath,  // Real file system path for restoration
                coordinatesFilename: trajectoryFilename,
                fileUri: trajectoryUri.toString(),
                filePath: trajectoryUri.fsPath,  // Real file system path for restoration
                frameCount: info.frameCount,
                duration: info.deltaTime * info.frameCount
            };

            // Store or send message to webview
            if (!this._isWebviewReady) {
                // Store pending streaming trajectory to send when webview is ready
                console.log('[StreamingTrajectory] Webview not ready, storing pending streaming trajectory');
                this._pendingStreamingTrajectory = messageData;
                return;
            }

            console.log('[StreamingTrajectory] Sending loadStreamingTrajectory message to webview');
            console.log('[StreamingTrajectory] Message data:', {
                type: messageData.type,
                topologyUrl: messageData.topologyUrl,
                topologyFormat: messageData.topologyFormat,
                frameCount: messageData.frameCount,
                duration: messageData.duration
            });
            this._panel.webview.postMessage(messageData);
            console.log('[StreamingTrajectory] Message sent to webview');

            // Update panel title
            this._panel.title = `Mol* - ${trajectoryFilename} (Streaming)`;
            console.log('[StreamingTrajectory] Streaming trajectory setup complete');

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to load streaming trajectory: ${message}`);
        }
    }

    /**
     * Handle messages from the webview
     */
    private _handleMessage(message: { type: string;[key: string]: unknown }): void {
        switch (message.type) {
            case 'ready':
                console.log('Mol* viewer webview is ready');
                this._isWebviewReady = true;

                // Check if webview sent persisted state for restoration
                if (message.state) {
                    const webviewState = message.state as {
                        fileUri?: string;
                        filePath?: string;
                        topologyFileUri?: string;
                        topologyFilePath?: string;
                        isTrajectory?: boolean;
                        isStreamingTrajectory?: boolean;
                    };
                    console.log('[Ready] Webview sent persisted state:', webviewState);
                    
                    // If we have state but no pending loads, this is a restoration scenario
                    // We need to restore the content based on the state
                    if (webviewState.fileUri && !this._pendingStructure && !this._pendingTrajectory && !this._pendingStreamingTrajectory) {
                        console.log('[Ready] Restoring panel from webview state');
                        // The state restoration should have been handled in deserializeWebviewPanel
                        // But if it wasn't, we can try to restore here
                        // Note: This is a fallback - the primary restoration should happen in deserializeWebviewPanel
                    }
                }

                // Load pending structure if any
                if (this._pendingStructure) {
                    this._panel.webview.postMessage({
                        type: 'loadStructure',
                        ...this._pendingStructure
                    });
                    this._pendingStructure = undefined;
                }

                // Load pending trajectory if any
                if (this._pendingTrajectory) {
                    this._panel.webview.postMessage({
                        type: 'loadTrajectory',
                        topologyUrl: this._pendingTrajectory.topologyUrl,
                        topologyFormat: this._pendingTrajectory.topologyFormat,
                        topologyFilename: this._pendingTrajectory.topologyFilename,
                        topologyFileUri: this._pendingTrajectory.topologyFileUri,
                        coordinatesUrl: this._pendingTrajectory.coordinatesUrl,
                        coordinatesFormat: this._pendingTrajectory.coordinatesFormat,
                        coordinatesFilename: this._pendingTrajectory.coordinatesFilename,
                        fileUri: this._pendingTrajectory.fileUri
                    });
                    this._pendingTrajectory = undefined;
                }

                // Load pending streaming trajectory if any
                if (this._pendingStreamingTrajectory) {
                    console.log('[StreamingTrajectory] Sending pending streaming trajectory to webview');
                    this._panel.webview.postMessage(this._pendingStreamingTrajectory);
                    this._pendingStreamingTrajectory = undefined;
                }
                break;

            case 'structureLoaded':
                console.log(`Structure loaded: ${message.filename}`);
                break;

            case 'trajectoryLoaded':
                console.log(`Trajectory loaded: ${message.filename}`);
                break;

            case 'streamingTrajectoryLoaded':
                console.log(`Streaming trajectory loaded: ${message.filename}`);
                break;

            case 'requestFrame':
                this._handleFrameRequest(message as { type: string; frameIndex: unknown; requestId: unknown });
                break;

            case 'error':
                vscode.window.showErrorMessage(`Mol* Viewer Error: ${message.message}`);
                break;
        }
    }

    /**
     * Handle frame request from streaming trajectory
     */
    private async _handleFrameRequest(message: {
        type: string;
        frameIndex: unknown;
        requestId: unknown;
    }): Promise<void> {
        const frameIndex = message.frameIndex as number;
        const requestId = message.requestId as string;

        console.log(`[FrameRequest] Received request for frame ${frameIndex}, requestId: ${requestId}`);

        try {
            if (!this._streamingProvider) {
                throw new Error('Streaming provider not initialized');
            }

            // Get frame data from streaming provider
            const startTime = Date.now();
            const frameData = await this._streamingProvider.getFrame(frameIndex);
            const elapsed = Date.now() - startTime;

            console.log(`[FrameRequest] Frame ${frameIndex} fetched in ${elapsed}ms, atoms: ${frameData.count}`);

            // Send frame data back to webview
            this._panel.webview.postMessage({
                type: 'frameResponse',
                requestId,
                frameData: {
                    frameNumber: frameData.frameNumber,
                    count: frameData.count,
                    x: Array.from(frameData.x),  // Convert Float32Array to regular array for JSON
                    y: Array.from(frameData.y),
                    z: Array.from(frameData.z),
                    box: Array.from(frameData.box),
                    time: frameData.time
                }
            });
            console.log(`[FrameRequest] Response sent for frame ${frameIndex}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[FrameRequest] Error fetching frame ${frameIndex}:`, errorMessage);

            // Send error response
            this._panel.webview.postMessage({
                type: 'frameResponse',
                requestId,
                error: errorMessage
            });
        }
    }

    /**
     * Generate the HTML content for the webview
     */
    private _getHtmlForWebview(): string {
        const webview = this._panel.webview;

        // Get URIs for resources
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'viewer', 'molstar-viewer.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'viewer', 'molstar.css')
        );

        // Generate nonce for security
        const nonce = this._getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-eval'; img-src ${webview.cspSource} data: blob:; font-src ${webview.cspSource} data:; worker-src ${webview.cspSource} blob:; connect-src ${webview.cspSource} https: data: blob:;">
  <title>Mol* Viewer</title>
  <link rel="stylesheet" href="${styleUri}">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #1e1e1e;
    }
    #molstar-container {
      width: 100%;
      height: 100%;
    }
    .msp-plugin {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="molstar-container"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Generate a random nonce for CSP
     */
    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}

/**
 * Webview panel serializer for restoring panels on reload
 */
export class MolstarViewerSerializer implements vscode.WebviewPanelSerializer {
    constructor(private readonly _extensionUri: vscode.Uri) { }

    async deserializeWebviewPanel(
        webviewPanel: vscode.WebviewPanel,
        state: unknown
    ): Promise<void> {
        console.log('[Serializer] deserializeWebviewPanel called');
        console.log('[Serializer] State parameter:', state);
        
        // Reconfigure webview options for the restored panel
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'dist', 'viewer'),
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };

        // The state parameter contains the state saved via webview.setState()
        // According to VS Code docs, this is the persisted state from the webview
        const webviewState = state as {
            fileUri?: string;
            filePath?: string;
            topologyFileUri?: string;
            topologyFilePath?: string;
            isTrajectory?: boolean;
            isStreamingTrajectory?: boolean;
        } | undefined;

        console.log('[Serializer] Parsed webview state:', webviewState);

        // The state parameter is the primary source of persisted state
        // It contains the state saved via webview.setState() in the webview content
        const actualState = webviewState;

        if (actualState) {
            const fileUriString = actualState.fileUri;
            const filePath = actualState.filePath;
            const topologyFileUriString = actualState.topologyFileUri;
            const topologyFilePath = actualState.topologyFilePath;
            const isTrajectory = actualState.isTrajectory;
            const isStreamingTrajectory = actualState.isStreamingTrajectory;

            console.log('[Serializer] Calling revive with state:', {
                fileUriString,
                topologyFileUriString,
                filePath,
                topologyFilePath,
                isTrajectory,
                isStreamingTrajectory
            });

            await MolstarViewerPanel.revive(
                webviewPanel,
                this._extensionUri,
                fileUriString,
                topologyFileUriString,
                isTrajectory,
                isStreamingTrajectory,
                filePath,
                topologyFilePath
            );
        } else {
            console.log('[Serializer] No state available - creating empty panel');
            // Create panel without state - user will need to reload manually
            // Use revive with undefined parameters to create an empty panel
            await MolstarViewerPanel.revive(
                webviewPanel,
                this._extensionUri,
                undefined,
                undefined,
                false,
                false,
                undefined,
                undefined
            );
        }
    }
}
