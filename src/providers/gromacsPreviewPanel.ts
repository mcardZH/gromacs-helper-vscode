import * as vscode from 'vscode';
import * as path from 'path';
import {
  GromacsFileInfo,
  XtcFileInfo,
  TrrFileInfo,
  EdrFileInfo,
  TprFileInfo,
  EnergyTermStats,
  detectFormat,
} from '../parsers/gromacsFileTypes';
import { parseXtc } from '../parsers/xtc';
import { parseTrr } from '../parsers/trr';
import { parseEdr, parseEdrNames } from '../parsers/edr';
import { parseTpr } from '../parsers/tpr';

/**
 * Single panel for inspecting GROMACS binary files (.xtc, .trr, .edr, .tpr).
 * Singleton — switching files reuses the same panel.
 */
export class GromacsPreviewPanel {
  public static currentPanel: GromacsPreviewPanel | undefined;
  public static readonly viewType = 'gromacs-helper.binaryPreview';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _disposables: vscode.Disposable[] = [];
  private _isWebviewReady = false;
  private _pendingInfo: GromacsFileInfo | undefined;
  // Messages posted before the webview is ready (e.g. progress
  // events fired during the parse that runs in parallel with the
  // webview's initial load). We replay them once `ready` arrives.
  private readonly _pendingMessages: unknown[] = [];

  public static async createOrShow(extensionUri: vscode.Uri, targetUri: vscode.Uri): Promise<void> {
    const format = detectFormat(targetUri);
    if (!format) {
      void vscode.window.showErrorMessage(
        `Cannot preview "${path.basename(targetUri.fsPath)}": unsupported format (expected .xtc/.trr/.edr/.tpr)`
      );
      return;
    }

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (GromacsPreviewPanel.currentPanel) {
      GromacsPreviewPanel.currentPanel._panel.reveal(column);
      await GromacsPreviewPanel.currentPanel._updateContent(targetUri);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      GromacsPreviewPanel.viewType,
      `${path.basename(targetUri.fsPath)} — Preview`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    GromacsPreviewPanel.currentPanel = new GromacsPreviewPanel(panel, extensionUri);

    // Show loading HTML immediately, then parse + update
    panel.webview.html = GromacsPreviewPanel._buildLoadingHtml(path.basename(targetUri.fsPath));
    await GromacsPreviewPanel.currentPanel._updateContent(targetUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): void {
    GromacsPreviewPanel.currentPanel = new GromacsPreviewPanel(panel, extensionUri);
  }

  /**
   * Create or update a preview using an externally-provided webview panel
   * (e.g. from a CustomEditorProvider). Unlike createOrShow, this does NOT
   * maintain a singleton — each call creates a new instance tied to the
   * given panel, so multiple files can be open simultaneously in separate
   * editor tabs.
   */
  public static async createWithPanel(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    targetUri: vscode.Uri,
  ): Promise<void> {
    console.log('[GromacsPreviewPanel] createWithPanel called for:', targetUri.fsPath);
    const format = detectFormat(targetUri);
    if (!format) {
      panel.webview.html = GromacsPreviewPanel._buildErrorHtml(
        path.basename(targetUri.fsPath),
        `Unsupported format (expected .xtc/.trr/.edr/.tpr)`,
      );
      return;
    }

    const instance = new GromacsPreviewPanel(panel, extensionUri);
    panel.webview.html = GromacsPreviewPanel._buildLoadingHtml(path.basename(targetUri.fsPath));
    await instance._updateContent(targetUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: { type: string; [k: string]: unknown }) => {
        console.log('[GromacsPreviewPanel] Received message from webview:', message.type);
        switch (message.type) {
          case 'ready':
            console.log('[GromacsPreviewPanel] Webview ready, draining', this._pendingMessages.length, 'queued messages');
            this._isWebviewReady = true;
            // Drain any messages that were queued before the webview
            // finished loading. This happens when the EDR parse's
            // streaming chunks start firing before the webview's JS
            // listener has been attached.
            while (this._pendingMessages.length > 0) {
              this._panel.webview.postMessage(this._pendingMessages.shift());
            }
            if (this._pendingInfo) {
              this._panel.webview.postMessage({
                type: 'loadInfo',
                info: this._pendingInfo,
              });
            }
            break;
          case 'openInMolstar':
            if (this._pendingInfo) {
              void vscode.commands.executeCommand(
                'gromacs-helper.openMolstarViewer',
                vscode.Uri.file(this._pendingInfo.filePath)
              );
            }
            break;
          case 'copyAsJson':
            if (this._pendingInfo) {
              void vscode.env.clipboard.writeText(JSON.stringify(this._pendingInfo, null, 2));
              void vscode.window.showInformationMessage(
                `Copied ${this._pendingInfo.format.toUpperCase()} info as JSON`
              );
            }
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose(): void {
    GromacsPreviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  private async _updateContent(uri: vscode.Uri): Promise<void> {
    console.log('[GromacsPreviewPanel] _updateContent called for:', uri.fsPath);
    const fmt = detectFormat(uri);
    // Show the loading HTML first so the user has immediate feedback
    // and the webview can display a progress bar while we read the
    // file. (For EDR this is replaced quickly by the skeleton once
    // the names block is parsed.)
    this._panel.webview.html = GromacsPreviewPanel._buildLoadingHtml(
      path.basename(uri.fsPath),
    );
    this._isWebviewReady = false;
    try {
      if (fmt === 'edr') {
        console.log('[GromacsPreviewPanel] Calling _updateEdrContent');
        await this._updateEdrContent(uri);
        return;
      }
      const info = await this._parseFile(uri);
      this._pendingInfo = info;
      this._panel.title = `${path.basename(uri.fsPath)} — Preview`;
      this._panel.webview.html = GromacsPreviewPanel._buildHtml(info, this._panel.webview, this._extensionUri);
      this._isWebviewReady = false;
    } catch (err) {
      console.error('[GromacsPreviewPanel] Error in _updateContent:', err);
      void vscode.window.showErrorMessage(
        `Failed to parse ${path.basename(uri.fsPath)}: ${err}`
      );
      this._panel.webview.html = GromacsPreviewPanel._buildErrorHtml(
        path.basename(uri.fsPath),
        String(err)
      );
    }
  }

  /**
   * EDR uses a two-phase render: the names block is read synchronously
   * (fast) and used to render the energy-terms table skeleton; then the
   * frame walk runs in the background and posts incremental progress
   * and per-term stats updates to the webview.
   */
  private async _updateEdrContent(uri: vscode.Uri): Promise<void> {
    console.log('[GromacsPreviewPanel] _updateEdrContent start');
    // Phase 1: read the names block + tail probe. < 50 ms even for
    // multi-GB EDRs — we get the full term list AND a best-effort
    // tEnd/dt/frameCount from the last two frames in the file, so the
    // skeleton shows the complete simulation time range immediately.
    const names = await parseEdrNames(uri);
    console.log('[GromacsPreviewPanel] parseEdrNames done, termCount:', names.termNames.length);
    const skeleton: EdrFileInfo = {
      format: 'edr',
      filename: uri.fsPath.split('/').pop() || uri.fsPath,
      filePath: uri.fsPath,
      fileSize: names.fileSize,
      magic: -55555,
      magicDisplay: '-55555',
      encoding: 'XDR',
      endianness: 'big-endian',
      version: names.version,
      // These three are derived from the tail probe (last two frames
      // in the file) so the skeleton has a complete time range even
      // before the streaming walk finishes.
      frameCount: names.frameCount,
      termCount: names.termNames.length,
      termNames: names.termNames,
      termStats: [],
      timeOffset: names.tStart,
      deltaTime: names.deltaTime,
    };
    this._pendingInfo = skeleton;
    this._panel.title = `${path.basename(uri.fsPath)} — Preview`;
    // Reset ready flag BEFORE setting HTML to avoid race condition
    this._isWebviewReady = false;
    this._pendingMessages.length = 0; // Clear any stale messages from previous file
    console.log('[GromacsPreviewPanel] Setting skeleton HTML...');
    this._panel.webview.html = GromacsPreviewPanel._buildHtml(skeleton, this._panel.webview, this._extensionUri);
    console.log('[GromacsPreviewPanel] Skeleton HTML set, starting full parse');

    // Phase 2: walk the frames. Fire-and-forget — the parser posts
    // progress + stats updates to the webview as it goes. We catch
    // errors so they surface via showErrorMessage.
    this._parseFile(uri)
      .then((info: GromacsFileInfo) => {
        console.log('[GromacsPreviewPanel] Full parse done');
        if (info.format !== 'edr') {
          return;
        }
        const full: EdrFileInfo = info;
        this._pendingInfo = full;
        // Notify the webview that the parse is done so it can hide
        // the progress bar and update the final frame count.
        const durationNs = full.frameCount > 1
          ? (full.frameCount - 1) * full.deltaTime / 1000
          : 0;
        console.log('[GromacsPreviewPanel] Sending edrDone:', {
          frameCount: full.frameCount,
          durationNs,
          timeStart: full.timeOffset,
          timeEnd: full.timeOffset + (full.frameCount - 1) * full.deltaTime,
          dt: full.deltaTime,
        });
        this._postMessage({
          type: 'edrDone',
          frameCount: full.frameCount,
          durationNs,
          timeStart: full.timeOffset,
          timeEnd: full.timeOffset + (full.frameCount - 1) * full.deltaTime,
          dt: full.deltaTime,
        });
      })
      .catch((err) => {
        console.error('[GromacsPreviewPanel] Error in full parse:', err);
        void vscode.window.showErrorMessage(
          `Failed to parse ${path.basename(uri.fsPath)}: ${err}`
        );
        this._panel.webview.html = GromacsPreviewPanel._buildErrorHtml(
          path.basename(uri.fsPath),
          String(err)
        );
      });
  }

  private async _parseFile(uri: vscode.Uri): Promise<GromacsFileInfo> {
    const fmt = detectFormat(uri);
    switch (fmt) {
      case 'xtc':
        return parseXtc(uri, {
          onProgress: (p) => this._postProgress(p),
        });
      case 'trr':
        return parseTrr(uri, (p) => this._postProgress(p));
      case 'edr':
        // The two-phase flow is orchestrated by _updateEdrContent.
        return parseEdr(uri, {
          onProgress: (p) => this._postProgress(p),
          onStatsUpdate: (stats, context) => this._postEdrStats(stats, context),
        });
      case 'tpr':
        return parseTpr(uri);
      default:
        throw new Error(`Unsupported format: ${fmt}`);
    }
  }

  private _postProgress(p: { bytesRead: number; totalBytes: number; framesParsed: number }): void {
    this._postMessage({
      type: 'progress',
      bytesRead: p.bytesRead,
      totalBytes: p.totalBytes,
      framesParsed: p.framesParsed,
    });
  }

  private _postEdrStats(stats: EnergyTermStats[], context: { currentFrameCount: number; currentTimeEnd: number; deltaTime: number }): void {
    console.log('[GromacsPreviewPanel] _postEdrStats called, stats.length:', stats.length, 'currentFrameCount:', context.currentFrameCount);
    this._postMessage({
      type: 'edrStatsUpdate',
      stats,
      currentFrameCount: context.currentFrameCount,
      currentTimeEnd: context.currentTimeEnd,
      deltaTime: context.deltaTime,
    });
  }

  private _postMessage(msg: unknown): void {
    const msgType = (msg as any).type;
    console.log('[GromacsPreviewPanel] _postMessage:', msgType, 'ready:', this._isWebviewReady);
    if (!this._isWebviewReady) {
      // Buffer messages that arrive before the webview is ready so
      // they can be replayed once `ready` arrives. Without this, an
      // EDR parse that completes before the webview's JS listener is
      // attached would silently drop all progress + stats updates.
      this._pendingMessages.push(msg);
      console.log('[GromacsPreviewPanel] Queued message, pending count:', this._pendingMessages.length);
      return;
    }
    // Drain any queued messages first so order is preserved.
    while (this._pendingMessages.length > 0) {
      this._panel.webview.postMessage(this._pendingMessages.shift());
    }
    this._panel.webview.postMessage(msg);
    console.log('[GromacsPreviewPanel] Message sent to webview');
  }

  // ───────────────────────────────────────────────────────────────────────
  //  HTML generation — one entry point per format, dispatched below
  // ───────────────────────────────────────────────────────────────────────

  private static _buildHtml(info: GromacsFileInfo, webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const commonHead = _commonHead(webview, extensionUri);
    const commonBodyOpen = _commonBodyOpen(info);

    let specificBody: string;
    let specificScript = '';

    switch (info.format) {
      case 'xtc':
      case 'trr':
        specificBody = _buildTrajectoryBody(info);
        specificScript = _trajectoryScript();
        break;
      case 'edr':
        specificBody = _buildEdrBody(info);
        specificScript = _edrScript();
        break;
      case 'tpr':
        specificBody = _buildTprBody(info);
        specificScript = _tprScript();
        break;
    }

    const actionsHtml = _buildActions(info);
    return `<!DOCTYPE html>
<html lang="en">
<head>${commonHead}</head>
<body>
${commonBodyOpen}
${specificBody}
${actionsHtml}
<script>
(function() {
  console.log('[Webview] Script executing');
  const vscode = acquireVsCodeApi();
  console.log('[Webview] Sending ready message');
  vscode.postMessage({ type: 'ready' });
  console.log('[Webview] Ready message sent');
})();
${specificScript}
</script>
</body>
</html>`;
  }

  private static _buildLoadingHtml(filename: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Parsing ${filename}…</title>
<style>
  body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); }
  .progress-block { margin: 14px 0; }
  .progress-text { display: flex; justify-content: space-between; font-size: 0.85em; margin-bottom: 6px; color: var(--vscode-descriptionForeground); }
  .progress-track { background: var(--vscode-editorWidget-background); border-radius: 3px; overflow: hidden; height: 6px; }
  .progress-bar { background: var(--vscode-progressBar-background); height: 100%; width: 0%; transition: width 0.15s ease-out; }
  .progress-bar.indeterminate {
    width: 30%;
    animation: indet 1.2s ease-in-out infinite;
  }
  @keyframes indet {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
</style>
</head>
<body>
  <h2>Parsing ${filename}…</h2>
  <p id="loading-status">Reading file structure…</p>
  <div class="progress-block">
    <div class="progress-text">
      <span id="loading-label"></span>
      <span id="loading-pct"></span>
    </div>
    <div class="progress-track"><div id="loading-bar" class="progress-bar indeterminate"></div></div>
  </div>
  <script>
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        const bar = document.getElementById('loading-bar');
        const pct = document.getElementById('loading-pct');
        const lbl = document.getElementById('loading-label');
        if (bar) {
          bar.classList.remove('indeterminate');
          const p = msg.totalBytes > 0 ? Math.min(100, (msg.bytesRead / msg.totalBytes) * 100) : 0;
          bar.style.width = p.toFixed(1) + '%';
        }
        if (pct) pct.textContent = msg.totalBytes > 0
          ? ((msg.bytesRead / msg.totalBytes) * 100).toFixed(1) + '%'
          : '';
        if (lbl) lbl.textContent = (msg.framesParsed || 0).toLocaleString() + ' frames read';
      }
    });
  </script>
</body>
</html>`;
  }

  private static _buildErrorHtml(filename: string, errorMsg: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Error</title></head>
<body style="font-family:var(--vscode-font-family);padding:20px;color:var(--vscode-errorForeground);">
  <h2>Failed to preview ${filename}</h2>
  <pre>${errorMsg}</pre>
</body>
</html>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  HTML fragment builders — kept module-local for readability
// ─────────────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  if (n < 1024 * 1024 * 1024) {
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function _commonHead(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const chartJsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'chart.umd.js')
  );
  return `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GROMACS Helper — Preview</title>
<script src="${chartJsUri}"></script>
<style>
:root {
  --text: var(--vscode-foreground, #cccccc);
  --muted: var(--vscode-descriptionForeground, #999);
  --border: var(--vscode-panel-border, #2d2d30);
  --card-bg: var(--vscode-editorWidget-background, #252526);
  --accent: var(--vscode-textLink-foreground, #007acc);
  --error: var(--vscode-errorForeground, #f48771);
}
* { box-sizing: border-box; }
body {
  font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  margin: 0;
  padding: 16px 20px 40px;
  background: var(--vscode-editor-background);
  color: var(--text);
  font-size: var(--vscode-font-size, 13px);
  line-height: 1.5;
}
.container { max-width: 1100px; margin: 0 auto; }
h1 { font-size: 1.2em; margin: 0 0 4px; }
h2 { font-size: 1em; margin: 20px 0 8px; color: var(--accent); }
.subtitle { color: var(--muted); font-size: 0.9em; margin-bottom: 18px; }
.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 14px;
}
.card-header { font-weight: 600; margin-bottom: 10px; font-size: 0.95em; }
.kv-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 18px;
  row-gap: 4px;
  font-size: 0.9em;
}
.kv-grid dt { color: var(--muted); }
.kv-grid dd { margin: 0; font-variant-numeric: tabular-nums; }
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.summary-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 14px;
}
.summary-label { color: var(--muted); font-size: 0.78em; text-transform: uppercase; letter-spacing: 0.04em; }
.summary-value { font-size: 1.4em; font-weight: 600; margin-top: 2px; font-variant-numeric: tabular-nums; }
.summary-sub { color: var(--muted); font-size: 0.85em; margin-top: 2px; }
.progress-block { margin: 0 0 14px; padding: 10px 14px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; }
.progress-text { display: flex; justify-content: space-between; font-size: 0.85em; margin-bottom: 6px; color: var(--muted); }
.progress-track { background: var(--vscode-editorWidget-background); border-radius: 3px; overflow: hidden; height: 6px; }
.progress-bar { background: var(--vscode-progressBar-background, var(--accent)); height: 100%; width: 0%; transition: width 0.15s ease-out; }
.actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.btn {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  padding: 6px 14px;
  font-size: 0.9em;
  cursor: pointer;
  font-family: inherit;
}
.btn:hover { background: var(--vscode-button-hoverBackground); }
.btn-secondary {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}
.btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
table { width: 100%; border-collapse: collapse; font-size: 0.88em; }
th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border); }
th { background: var(--vscode-editorWidget-background); position: sticky; top: 0; color: var(--muted); font-weight: 500; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.04em; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
.table-wrapper { max-height: 420px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; }
.filter-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.filter-row .hint { color: var(--muted); font-size: 0.8em; }
#termTable tbody tr[data-term-index] { cursor: pointer; }
#termTable tbody tr[data-term-index]:hover { background: var(--vscode-list-hoverBackground); }
.modal { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal[hidden] { display: none; }
.modal-content { background: var(--vscode-editor-background); border: 1px solid var(--border); border-radius: 8px; width: min(720px, 92vw); max-height: 80vh; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); }
.modal-header h3 { margin: 0; font-size: 1em; }
.modal-close { background: none; border: none; color: var(--vscode-foreground); font-size: 1.4em; line-height: 1; cursor: pointer; padding: 0 6px; }
.modal-body { padding: 16px; min-height: 320px; }
.modal-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-top: 1px solid var(--border); }
.modal-footer .muted { color: var(--muted); font-size: 0.85em; }
.filter-row input {
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, transparent);
  border-radius: 3px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: 0.9em;
  flex: 1;
  max-width: 320px;
}
.section-block {
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 10px;
  overflow: hidden;
}
.section-toggle {
  width: 100%;
  background: var(--card-bg);
  border: none;
  color: var(--text);
  text-align: left;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
}
.section-toggle::before {
  content: '▸';
  display: inline-block;
  width: 14px;
  color: var(--muted);
  transition: transform 0.15s;
}
.section-block.open .section-toggle::before {
  transform: rotate(90deg);
}
.section-body {
  display: none;
  padding: 10px 16px 14px;
  background: var(--vscode-editor-background);
}
.section-block.open .section-body { display: block; }
.sparkline-cell { width: 90px; padding: 2px 6px; }
.sparkline-cell canvas { display: block; }
</style>`;
}

function _commonBodyOpen(info: GromacsFileInfo): string {
  const formatLabel = _formatLabel(info);
  return `<div class="container">
  <h1>${escapeHtml(info.filename)}</h1>
  <div class="subtitle">${formatLabel} · ${formatBytes(info.fileSize)} · ${info.encoding} · ${info.endianness}</div>`;
}

function _formatLabel(info: GromacsFileInfo): string {
  switch (info.format) {
    case 'xtc':
      return 'XTC (Compressed Trajectory)';
    case 'trr':
      return 'TRR (Trajectory)';
    case 'edr':
      return 'EDR (GROMACS Energy File)';
    case 'tpr':
      return 'TPR (Topology / Run Parameters)';
  }
}

function _buildActions(info: GromacsFileInfo): string {
  // No action buttons for now - they were not functional
  return `</div>`;
}

function _binaryMetadataCard(info: GromacsFileInfo, extra: string): string {
  return `<div class="card">
  <div class="card-header">Binary Metadata</div>
  <dl class="kv-grid">
    <dt>Magic number</dt><dd><code>${escapeHtml(info.magicDisplay)}</code></dd>
    <dt>Encoding</dt><dd>${info.encoding}</dd>
    <dt>Endianness</dt><dd>${info.endianness}</dd>
    ${info.version ? `<dt>Version</dt><dd>${escapeHtml(info.version)}</dd>` : ''}
    ${extra}
  </dl>
</div>`;
}

// ─── XTC / TRR shared body ──────────────────────────────────────────────
function _buildTrajectoryBody(info: XtcFileInfo | TrrFileInfo): string {
  const durationNs = ((info.times[info.times.length - 1] ?? 0) - info.timeOffset) / 1000;
  const summaryCards = `
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Frames</div>
      <div class="summary-value">${info.frameCount.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Atoms</div>
      <div class="summary-value">${info.atomCount.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Duration</div>
      <div class="summary-value">${durationNs.toFixed(3)} ns</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Time Step</div>
      <div class="summary-value">${info.deltaTime} ps</div>
    </div>
  </div>`;

  const trajTime = `
  <div class="card">
    <div class="card-header">Time Range</div>
    <dl class="kv-grid">
      <dt>Start time</dt><dd>${info.timeOffset.toFixed(3)} ps</dd>
      <dt>End time</dt><dd>${(info.times[info.times.length - 1] ?? 0).toFixed(3)} ps</dd>
      <dt>Δt</dt><dd>${info.deltaTime.toFixed(3)} ps</dd>
      <dt>Frames</dt><dd>${info.frameCount.toLocaleString()}</dd>
    </dl>
  </div>`;

  let extraMeta = '';
  if (info.format === 'xtc') {
    extraMeta = `<dt>Precision</dt><dd>${info.precision} nm</dd>
                 <dt>Header size</dt><dd>${info.headerSize} bytes</dd>`;
  } else {
    extraMeta = `<dt>Precision</dt><dd>${info.precision}</dd>
                 <dt>Has velocities</dt><dd>${info.hasVelocities ? 'yes' : 'no'}</dd>
                 <dt>Has forces</dt><dd>${info.hasForces ? 'yes' : 'no'}</dd>
                 <dt>Header size</dt><dd>${info.headerSize} bytes</dd>`;
  }

  const meta = _binaryMetadataCard(info, extraMeta);

  return summaryCards + trajTime + meta;
}

function _trajectoryScript(): string {
  return `
function openInMolstar() {
  vscode.postMessage({ type: 'openInMolstar' });
}
function copyAsJson() {
  vscode.postMessage({ type: 'copyAsJson' });
}`;
}

// ─── EDR body ───────────────────────────────────────────────────────────
function _buildEdrBody(info: EdrFileInfo): string {
  // For EDR the parse is streamed: the names block arrives first
  // (fast, < 8 KB), then frames are walked in chunks. The initial
  // render therefore shows the term list with placeholder stat cells
  // ("—") that are filled in by `edrStatsUpdate` postMessages as the
  // frame walk progresses.
  const summaryCards = `
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Frames</div>
      <div class="summary-value" id="edr-frame-count">${info.frameCount.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Energy Terms</div>
      <div class="summary-value">${info.termCount}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Duration</div>
      <div class="summary-value" id="edr-duration">${
        info.frameCount > 1 ? ((info.frameCount - 1) * info.deltaTime / 1000).toFixed(3) + ' ns' : '—'
      }</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Time Step</div>
      <div class="summary-value">${info.deltaTime} ps</div>
    </div>
  </div>
  <div id="edr-progress" class="progress-block" hidden>
    <div class="progress-text">
      <span id="edr-progress-label">Reading frames…</span>
      <span id="edr-progress-pct">0%</span>
    </div>
    <div class="progress-track"><div id="edr-progress-bar" class="progress-bar"></div></div>
  </div>`;

  const extraMeta = `<dt>Frame time Δ</dt><dd>${info.deltaTime} ps</dd>`;
  const meta = _binaryMetadataCard(info, extraMeta);

  // Build table rows. Each term gets a placeholder stat cell that
  // will be filled in once we have data for that term.
  const rows = info.termNames
    .map((name, i) => {
      return `<tr data-term="${escapeAttr(name)}" data-term-index="${i}">
        <td>${escapeHtml(name)}</td>
        <td class="num" id="edr-min-${i}">—</td>
        <td class="num" id="edr-max-${i}">—</td>
        <td class="num" id="edr-mean-${i}">—</td>
        <td class="num" id="edr-std-${i}">—</td>
        <td id="edr-unit-${i}">—</td>
        <td class="sparkline-cell"><canvas id="spark-${i}" width="90" height="20"></canvas></td>
      </tr>`;
    })
    .join('');

  const table = `
  <div class="card">
    <div class="card-header">Energy Terms (${info.termCount})</div>
    <div class="filter-row">
      <input type="text" id="termFilter" placeholder="Filter terms…" />
      <span class="hint">Click a term name to see the full time series.</span>
    </div>
    <div class="table-wrapper">
      <table id="termTable">
        <thead>
          <tr>
            <th>Term</th>
            <th class="num">Min</th>
            <th class="num">Max</th>
            <th class="num">Mean</th>
            <th class="num">Std</th>
            <th>Unit</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>

  <div id="edr-plot-modal" class="modal" hidden>
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="edr-plot-title">Term</h3>
        <button id="edr-plot-close" class="modal-close" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <canvas id="edr-plot-canvas" height="320"></canvas>
      </div>
      <div class="modal-footer">
        <span id="edr-plot-stats" class="muted"></span>
        <button id="edr-plot-csv" class="btn btn-secondary">Copy as CSV</button>
      </div>
    </div>
  </div>`;

  return summaryCards + meta + table;
}

function _edrScript(): string {
  return `
// EDR doesn't have an "Open in Mol* Viewer" entry — the button is
// hidden by _buildActions for edr files. We still wire up
// copyAsJson since the panel renders the "Copy as JSON" button for
// every format.
function copyAsJson() { vscode.postMessage({ type: 'copyAsJson' }); }

// EDR time range — used to label the modal's x-axis with time
// instead of raw sample index. Populated by bootstrapTimeRange()
// and updated when edrDone arrives.
const edrTimeRange = { start: 0, end: 0, dt: 0 };

const charts = [];           // one Chart per term (small sparkline)
let fullChart = null;        // the chart shown in the modal
let fullChartTermIdx = -1;   // index of the term currently shown

// Use the VS Code charts-blue for the sparkline color; fall back gracefully.
function getLineColor() {
  const root = getComputedStyle(document.documentElement);
  return root.getPropertyValue('--vscode-charts-blue').trim() ||
         root.getPropertyValue('--vscode-textLink-foreground').trim() ||
         '#007acc';
}

// Pre-create one Chart per term; data starts empty and is filled in
// (and Chart updated) as edrStatsUpdate messages arrive. For files
// with hundreds of terms (residue-level EDRs) creating a Chart.js
// instance per row is too expensive — we skip sparklines above
// MAX_SPARKLINE_TERMS and rely on the modal for full time-series
// exploration.
const MAX_SPARKLINE_TERMS = 100;

function initSparklines(count) {
  if (count > MAX_SPARKLINE_TERMS) {
    // Hide the trend column by removing the canvas cells.
    document.querySelectorAll('#termTable tbody tr').forEach((row) => {
      const cell = row.querySelector('.sparkline-cell');
      if (cell) cell.textContent = '(click row)';
    });
    return;
  }
  const color = getLineColor();
  for (let i = 0; i < count; i++) {
    const canvas = document.getElementById('spark-' + i);
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{ data: [], borderColor: color, borderWidth: 1, pointRadius: 0, tension: 0 }]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
    charts.push(chart);
  }
}

// Latest stats per term, kept around so we can build the full plot
// when the user clicks a term name.
const latestStats = [];

function updateTermRow(i, stat) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('edr-min-' + i, Number.isFinite(stat.min) ? stat.min.toFixed(3) : '—');
  set('edr-max-' + i, Number.isFinite(stat.max) ? stat.max.toFixed(3) : '—');
  set('edr-mean-' + i, Number.isFinite(stat.mean) ? stat.mean.toFixed(3) : '—');
  set('edr-std-' + i, Number.isFinite(stat.std) ? stat.std.toFixed(3) : '—');
  set('edr-unit-' + i, stat.unit || '—');
  // Update the corresponding sparkline chart in place.
  const chart = charts[i];
  if (chart) {
    const data = stat.sparkline || [];
    chart.data.labels = data.map((_, j) => j);
    chart.data.datasets[0].data = data;
    chart.update('none');
  }
  latestStats[i] = stat;
  // If this is the term currently shown in the modal, refresh the
  // full plot too so the user sees the live data.
  if (fullChart && fullChartTermIdx === i) {
    showFullPlot(i, stat);
  }
}

// Filter input — keeps working even as rows are populated.
document.getElementById('termFilter')?.addEventListener('input', (e) => {
  const q = (e.target.value || '').toLowerCase();
  document.querySelectorAll('#termTable tbody tr').forEach((row) => {
    const term = (row.getAttribute('data-term') || '').toLowerCase();
    row.style.display = term.includes(q) ? '' : 'none';
  });
});

// Click-to-expand: open the modal with a full Chart.js line plot
// of the clicked term's time series. The full plot is built from
// the most recent sparkline (downsampled to 64 points) and stays
// in sync with the streamed updates until closed.
function showFullPlot(i, stat) {
  const modal = document.getElementById('edr-plot-modal');
  const canvas = document.getElementById('edr-plot-canvas');
  const title = document.getElementById('edr-plot-title');
  const stats = document.getElementById('edr-plot-stats');
  if (!modal || !canvas || !title || !stats) return;
  // If we don't have stats yet for this term, show a "loading" modal
  // that will refresh automatically on the next edrStatsUpdate.
  if (!stat || !stat.sparkline || stat.sparkline.length === 0) {
    fullChartTermIdx = i;
    if (title) {
      const termName = document.querySelector('#termTable tr[data-term-index="' + i + '"]')
        ?.getAttribute('data-term') || ('Term ' + i);
      title.textContent = termName + ' — loading…';
    }
    if (stats) stats.textContent = 'waiting for first stats update…';
    modal.hidden = false;
    return;
  }
  const data = stat.sparkline;
  if (title) title.textContent = stat.name + (stat.unit ? ' (' + stat.unit + ')' : '');
  if (stats) {
    stats.textContent =
      'min ' + stat.min.toFixed(3) +
      '   max ' + stat.max.toFixed(3) +
      '   mean ' + stat.mean.toFixed(3) +
      '   std ' + stat.std.toFixed(3) +
      '   n=' + data.length + ' samples';
  }
  if (fullChart) {
    fullChart.destroy();
    fullChart = null;
  }
  const color = getLineColor();
  const dataMin = stat && Number.isFinite(stat.min) ? stat.min : 0;
  const dataMax = stat && Number.isFinite(stat.max) ? stat.max : 0;
  const range = dataMax - dataMin || Math.max(1, Math.abs(dataMax) || 1);
  const pad = range * 0.05;
  const xTitle = 'time (ps)';
  // Generate {x, y} data points with explicit X coordinates
  const timeSpan = edrTimeRange.end - edrTimeRange.start;
  const chartData = data.map((y, j) => {
    const x = edrTimeRange.start + (j / (data.length - 1)) * timeSpan;
    return { x, y };
  });
  fullChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      datasets: [{
        data: chartData,
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: {
          type: 'linear',
          display: true,
          title: { display: true, text: xTitle }
        },
        y: {
          display: true,
          title: { display: true, text: stat.unit || '' },
          suggestedMin: dataMin - pad,
          suggestedMax: dataMax + pad,
        }
      }
    }
  });
  modal.hidden = false;
  fullChartTermIdx = i;
}

function hideFullPlot() {
  const modal = document.getElementById('edr-plot-modal');
  if (modal) modal.hidden = true;
  if (fullChart) {
    fullChart.destroy();
    fullChart = null;
  }
  fullChartTermIdx = -1;
}

// Term row click → open modal with full plot.
document.querySelectorAll('#termTable tbody tr[data-term-index]')
  .forEach((row) => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.getAttribute('data-term-index') || '-1', 10);
      if (idx >= 0 && latestStats[idx]) {
        showFullPlot(idx, latestStats[idx]);
      }
    });
  });

// Modal close button
document.getElementById('edr-plot-close')?.addEventListener('click', hideFullPlot);

// CSV export
document.getElementById('edr-plot-csv')?.addEventListener('click', () => {
  if (fullChartTermIdx < 0 || !latestStats[fullChartTermIdx]) return;
  const stat = latestStats[fullChartTermIdx];
  const lines = ['time (ps),' + (stat.name || 'value')];
  const timeSpan = edrTimeRange.end - edrTimeRange.start;
  stat.sparkline.forEach((v, j) => {
    const t = (edrTimeRange.start + (j / (stat.sparkline.length - 1)) * timeSpan).toFixed(3);
    lines.push(t + ',' + v);
  });
  navigator.clipboard.writeText(lines.join('\\n'))
    .then(() => { /* best-effort; we don't surface UI feedback */ })
    .catch(() => {});
});

// Show the progress block as soon as we know we're parsing.
const progressBlock = document.getElementById('edr-progress');
const progressBar = document.getElementById('edr-progress-bar');
const progressPct = document.getElementById('edr-progress-pct');
const progressLabel = document.getElementById('edr-progress-label');

// Populate the time range from the skeleton's known metadata so the
// modal plot's x-axis can show time (ps) labels right away. The
// duration is parsed from the edr-duration summary card.
(function bootstrapTimeRange() {
  const durEl = document.getElementById('edr-duration');
  const fcEl = document.getElementById('edr-frame-count');
  if (durEl && fcEl) {
    const txt = durEl.textContent || '';
    const m = txt.match(/([\\d.]+)\\s*ns/);
    const frames = parseInt((fcEl.textContent || '0').replace(/,/g, ''), 10);
    if (m) {
      const durationNs = parseFloat(m[1]);
      edrTimeRange.end = durationNs * 1000; // ns → ps
      edrTimeRange.start = 0;
      if (frames > 1) edrTimeRange.dt = edrTimeRange.end / (frames - 1);
    }
  }
})();

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg.type === 'progress' && progressBlock) {
    const pct = msg.totalBytes > 0 ? Math.min(100, (msg.bytesRead / msg.totalBytes) * 100) : 0;
    progressBlock.hidden = false;
    progressBar.style.width = pct.toFixed(1) + '%';
    progressPct.textContent = pct.toFixed(1) + '%';
    progressLabel.textContent =
      'Reading frames… ' + (msg.framesParsed || 0).toLocaleString() + ' frames';
  } else if (msg.type === 'edrStatsUpdate' && msg.stats) {
    msg.stats.forEach((s, i) => updateTermRow(i, s));
    // Update the time range dynamically as we parse more frames
    if (typeof msg.currentTimeEnd === 'number' && typeof msg.deltaTime === 'number' && msg.deltaTime > 0) {
      edrTimeRange.start = 0;
      edrTimeRange.end = msg.currentTimeEnd;
      edrTimeRange.dt = msg.deltaTime;
      // If the modal is currently showing a term, refresh its x-axis to show the updated range
      if (fullChart && fullChartTermIdx >= 0) {
        const stat = latestStats[fullChartTermIdx];
        if (stat) showFullPlot(fullChartTermIdx, stat);
      }
    }
  } else if (msg.type === 'edrDone') {
    if (progressBlock) progressBlock.hidden = true;
    // Update the duration / frame count from the final result.
    if (typeof msg.frameCount === 'number') {
      const fc = document.getElementById('edr-frame-count');
      if (fc) fc.textContent = msg.frameCount.toLocaleString();
    }
    if (typeof msg.durationNs === 'number') {
      const dur = document.getElementById('edr-duration');
      if (dur) dur.textContent = msg.durationNs.toFixed(3) + ' ns';
    }
    // Update the time range with the actual values from the parser.
    if (typeof msg.timeStart === 'number' && typeof msg.timeEnd === 'number' && typeof msg.dt === 'number') {
      edrTimeRange.start = msg.timeStart;
      edrTimeRange.end = msg.timeEnd;
      edrTimeRange.dt = msg.dt;
      console.log('[Webview] edrTimeRange updated:', edrTimeRange);
      // If the modal is currently showing a term, refresh its x-axis.
      if (fullChart && fullChartTermIdx >= 0) {
        const stat = latestStats[fullChartTermIdx];
        if (stat) showFullPlot(fullChartTermIdx, stat);
      }
    }
  }
});

// Bootstrap: count rows and create one Chart per row.
const termRows = document.querySelectorAll('#termTable tbody tr').length;
initSparklines(termRows);
`;
}

// ─── TPR body ───────────────────────────────────────────────────────────
function _buildTprBody(info: TprFileInfo): string {
  // Only show topology cards if we have valid counts (> 0)
  const topologyCards: string[] = [];

  // Always show Atoms
  topologyCards.push(`
    <div class="summary-card">
      <div class="summary-label">Atoms</div>
      <div class="summary-value">${info.atomCount.toLocaleString()}</div>
    </div>`);

  // Only show if > 0
  if (info.moleculeCount > 0) {
    topologyCards.push(`
    <div class="summary-card">
      <div class="summary-label">Molecules</div>
      <div class="summary-value">${info.moleculeCount}</div>
    </div>`);
  }

  if (info.residueTypeCount > 0) {
    topologyCards.push(`
    <div class="summary-card">
      <div class="summary-label">Residue Types</div>
      <div class="summary-value">${info.residueTypeCount}</div>
    </div>`);
  }

  if (info.atomTypeCount > 0) {
    topologyCards.push(`
    <div class="summary-card">
      <div class="summary-label">Atom Types</div>
      <div class="summary-value">${info.atomTypeCount}</div>
    </div>`);
  }

  const summaryCards = `
  <div class="summary-grid">
    ${topologyCards.join('')}
  </div>`;

  const simParams = `
  <div class="card">
    <div class="card-header">Simulation</div>
    <dl class="kv-grid">
      <dt>Integrator</dt><dd><code>${escapeHtml(info.integrator)}</code></dd>
      <dt>nsteps</dt><dd>${info.nsteps.toLocaleString()}</dd>
      <dt>dt</dt><dd>${info.dt} ps</dd>
      <dt>Total time</dt><dd>${info.totalTimeNs.toFixed(3)} ns</dd>
    </dl>
  </div>`;

  const extraMeta = `<dt>GROMACS version</dt><dd>${escapeHtml(info.gromacsVersion)}</dd>
                     <dt>Precision</dt><dd>${info.precision}</dd>`;
  const meta = _binaryMetadataCard(info, extraMeta);

  // Sections (collapsible)
  const sectionsHtml = info.sections
    .map(
      (s, i) => `
  <div class="section-block${i === 0 ? ' open' : ''}">
    <button class="section-toggle" data-section="${i}">${escapeHtml(s.title)}</button>
    <div class="section-body">
      <dl class="kv-grid">
        ${s.entries.map((e) => `<dt>${escapeHtml(e.key)}</dt><dd>${escapeHtml(e.value)}</dd>`).join('')}
      </dl>
    </div>
  </div>`
    )
    .join('');

  return summaryCards + simParams + meta + `<h2>Parameter Sections</h2>${sectionsHtml}`;
}

function _tprScript(): string {
  return `
function openInMolstar() {
  vscode.postMessage({ type: 'openInMolstar' });
}
function copyAsJson() { vscode.postMessage({ type: 'copyAsJson' }); }

document.querySelectorAll('.section-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.parentElement?.classList.toggle('open');
  });
});
`;
}

// ─── HTML escaping helpers ──────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
