import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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
                // Reload the file just in case content changed (optional, but consistent with previous behavior)
                // await existingPanel._loadFile(fileUri); 
                // Actually, duplicate load might be redundant if it's already open, but let's just reveal for now.
                // If user wants to reload, they can close and open, or we can force reload.
                // For now, let's just reveal to avoid flickering.
                return;
            }
        }

        // Create a new panel
        const panel = vscode.window.createWebviewPanel(
            MolstarViewerPanel.viewType,
            fileUri ? `Mol* - ${path.basename(fileUri.fsPath)}` : 'Mol* Viewer',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'dist', 'viewer'),
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
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
    public static async revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, fileUriString?: string): Promise<void> {
        let fileUri: vscode.Uri | undefined;
        if (fileUriString) {
            fileUri = vscode.Uri.parse(fileUriString);
        }

        const viewerPanel = new MolstarViewerPanel(panel, extensionUri, fileUri);

        if (fileUri) {
            MolstarViewerPanel._panels.set(fileUri.toString(), viewerPanel);
            // Reload the file to restore the structure
            await viewerPanel._loadFile(fileUri);
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
     * Load a molecular structure file
     */
    private async _loadFile(fileUri: vscode.Uri): Promise<void> {
        try {
            const data = await fs.promises.readFile(fileUri.fsPath, 'utf-8');
            const filename = path.basename(fileUri.fsPath);
            const ext = path.extname(fileUri.fsPath).toLowerCase();

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
     * Handle messages from the webview
     */
    private _handleMessage(message: { type: string;[key: string]: unknown }): void {
        switch (message.type) {
            case 'ready':
                console.log('Mol* viewer webview is ready');
                this._isWebviewReady = true;

                // Load pending structure if any
                if (this._pendingStructure) {
                    this._panel.webview.postMessage({
                        type: 'loadStructure',
                        ...this._pendingStructure
                    });
                    this._pendingStructure = undefined;
                }
                break;

            case 'structureLoaded':
                console.log(`Structure loaded: ${message.filename}`);
                break;

            case 'error':
                vscode.window.showErrorMessage(`Mol* Viewer Error: ${message.message}`);
                break;
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

    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: { fileUri?: string } | unknown): Promise<void> {
        // Reconfigure webview options for the restored panel
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'dist', 'viewer'),
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };

        // Extract fileUri from persisted state
        const fileUriString = (state as { fileUri?: string })?.fileUri;
        await MolstarViewerPanel.revive(webviewPanel, this._extensionUri, fileUriString);
    }
}
