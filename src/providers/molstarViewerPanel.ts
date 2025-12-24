import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Mol* Viewer Panel Manager
 * 
 * Manages the webview panel for the Mol* molecular viewer.
 */
export class MolstarViewerPanel {
    public static currentPanel: MolstarViewerPanel | undefined;
    public static readonly viewType = 'gromacs-helper.molstarViewer';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _isWebviewReady = false;
    private _pendingStructure: { data: string; format: string; filename: string } | undefined;

    /**
     * Create or show the Mol* viewer panel
     */
    public static async createOrShow(extensionUri: vscode.Uri, fileUri?: vscode.Uri): Promise<void> {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, reveal it
        if (MolstarViewerPanel.currentPanel) {
            MolstarViewerPanel.currentPanel._panel.reveal(column);
            if (fileUri) {
                await MolstarViewerPanel.currentPanel._loadFile(fileUri);
            }
            return;
        }

        // Create a new panel
        const panel = vscode.window.createWebviewPanel(
            MolstarViewerPanel.viewType,
            'Mol* Viewer',
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

        MolstarViewerPanel.currentPanel = new MolstarViewerPanel(panel, extensionUri);

        if (fileUri) {
            await MolstarViewerPanel.currentPanel._loadFile(fileUri);
        }
    }

    /**
     * Revive a panel from serialization
     */
    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): void {
        MolstarViewerPanel.currentPanel = new MolstarViewerPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

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

    /**
     * Dispose the panel
     */
    public dispose(): void {
        MolstarViewerPanel.currentPanel = undefined;

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
                this._pendingStructure = { data, format, filename };
                return;
            }

            // Send to webview
            this._panel.webview.postMessage({
                type: 'loadStructure',
                data,
                format,
                filename
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

    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, _state: unknown): Promise<void> {
        // Reconfigure webview options for the restored panel
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'dist', 'viewer'),
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };

        MolstarViewerPanel.revive(webviewPanel, this._extensionUri);
    }
}
