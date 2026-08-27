import * as vscode from 'vscode';
import * as path from 'path';
import { detectFormat } from '../parsers/gromacsFileTypes';
import { GromacsPreviewPanel } from './gromacsPreviewPanel';

/**
 * CustomReadonlyEditorProvider that opens `.xtc` / `.trr` / `.edr` /
 * `.tpr` files directly in a VS Code editor tab. Registered as
 * `viewType = 'gromacs-helper.binaryPreview'` in `package.json`'s
 * `contributes.customEditors` with `priority: 'default'`, so VS Code
 * uses us automatically when the user double-clicks one of these
 * files. They can still "Reopen With → Text Editor" to fall back.
 *
 * We use `CustomReadonlyEditorProvider` (not `CustomTextEditorProvider`)
 * because these are large binary files — VS Code must not load them
 * as text in memory. We also avoid `CustomEditorProvider` since we
 * don't need save / edit / backup / dirty tracking.
 *
 * `openCustomDocument` only creates a lightweight document handle
 * (uri + format) — the heavy parsing happens in `resolveCustomEditor`
 * where we delegate to `GromacsPreviewPanel.createWithPanel`.
 */
class GromacsBinaryDocument implements vscode.CustomDocument {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly format: 'xtc' | 'trr' | 'edr' | 'tpr',
  ) {}
  dispose(): void {
    // No-op: the document holds no resources beyond its URI.
  }
}

export class GromacsBinaryEditorProvider
  implements vscode.CustomReadonlyEditorProvider<GromacsBinaryDocument> {

  constructor(private readonly extensionUri: vscode.Uri) {}

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Promise<GromacsBinaryDocument> {
    const format = detectFormat(uri);
    if (!format) {
      throw new Error(
        `Not a GROMACS binary file: ${path.basename(uri.fsPath)} ` +
        `(expected .xtc / .trr / .edr / .tpr)`,
      );
    }
    return new GromacsBinaryDocument(uri, format);
  }

  async resolveCustomEditor(
    document: GromacsBinaryDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    // Set up webview options
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };

    // Delegate to GromacsPreviewPanel to render the full preview HTML
    await GromacsPreviewPanel.createWithPanel(
      webviewPanel,
      this.extensionUri,
      document.uri,
    );
  }
}
