import * as vscode from 'vscode';
import { PackmolPreviewProvider } from './packmolPreviewProvider';

/**
 * Packmol 预览面板管理器
 */
export class PackmolPreviewPanel {
  public static currentPanel: PackmolPreviewPanel | undefined;
  public static readonly viewType = 'gromacs-helper.packmolPreview';
  
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _currentProvider?: PackmolPreviewProvider;
  private _isWebviewReady = false;
  
  public static async createOrShow(extensionUri: vscode.Uri, packmolUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    
    // 如果已经有面板，显示它
    if (PackmolPreviewPanel.currentPanel) {
      PackmolPreviewPanel.currentPanel._panel.reveal(column);
      await PackmolPreviewPanel.currentPanel._updateContent(packmolUri);
      return;
    }
    
    // 创建新面板
    const panel = vscode.window.createWebviewPanel(
      PackmolPreviewPanel.viewType,
      'Packmol 3D Preview',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'out', 'compiled')
        ]
      }
    );
    
    PackmolPreviewPanel.currentPanel = new PackmolPreviewPanel(panel, extensionUri);
    await PackmolPreviewPanel.currentPanel._updateContent(packmolUri);
  }
  
  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    PackmolPreviewPanel.currentPanel = new PackmolPreviewPanel(panel, extensionUri);
  }
  
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    
    // 监听面板关闭
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    
    // 处理来自 webview 的消息
    this._panel.webview.onDidReceiveMessage(
      message => {
        console.log('📨 Panel received message from webview:', message);
        
        switch (message.type) {
          case 'ready':
            console.log('🟢 Panel webview is ready!');
            this._isWebviewReady = true;
            // webview 准备就绪，如果有 provider 和数据，立即发送
            if (this._currentProvider && (this._currentProvider as any)._currentInput) {
              console.log('📤 Sending data to panel webview immediately');
              this._sendDataToWebview();
            }
            break;
          case 'test':
            console.log('🧪 Test message received from panel webview:', message.message);
            break;
          case 'alert':
            vscode.window.showErrorMessage(message.text);
            break;
          case 'error':
            console.error('❌ Panel webview error:', message.message);
            vscode.window.showErrorMessage(`Webview error: ${message.message}`);
            break;
          default:
            console.log('❓ Unknown message type from panel webview:', message.type);
        }
      },
      null,
      this._disposables
    );
  }
  
  public dispose() {
    PackmolPreviewPanel.currentPanel = undefined;
    
    // 清理资源
    this._panel.dispose();
    
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
  
  private async _updateContent(packmolUri: vscode.Uri) {
    try {
      const provider = new PackmolPreviewProvider(this._extensionUri);
      this._currentProvider = provider;
      
      // 这里我们需要模拟 WebviewView 的接口
      const mockWebviewView = {
        webview: this._panel.webview,
        show: (preserveFocus?: boolean) => {
          this._panel.reveal(undefined, preserveFocus);
        }
      };
      
      // 使用 provider 的 HTML
      this._panel.webview.html = (provider as any)._getHtmlForWebview(this._panel.webview);
      
      // 临时设置 provider 的 view
      (provider as any)._view = mockWebviewView;
      
      // 预览文件
      await provider.previewPackmolFile(packmolUri);
      
      // 如果 webview 已经准备好，立即发送数据
      if (this._isWebviewReady) {
        console.log('📤 Webview already ready, sending data immediately');
        this._sendDataToWebview();
      }
      
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to preview Packmol file: ${error}`);
    }
  }
  
  /**
   * 发送数据到 webview
   */
  private _sendDataToWebview() {
    if (!this._currentProvider || !this._isWebviewReady) {
      console.log('❌ Cannot send data: provider or webview not ready');
      return;
    }
    
    const currentInput = (this._currentProvider as any)._currentInput;
    if (!currentInput) {
      console.log('❌ No current input data to send');
      return;
    }
    
    const data = {
      type: 'update',
      input: currentInput,
      structureData: {}
    };
    
    console.log('📤 Panel sending data to webview:', data);
    try {
      this._panel.webview.postMessage(data);
      console.log('✅ Data sent successfully to panel webview');
    } catch (error) {
      console.error('❌ Error sending data to panel webview:', error);
      vscode.window.showErrorMessage(`Failed to send data to webview: ${error}`);
    }
  }
}
