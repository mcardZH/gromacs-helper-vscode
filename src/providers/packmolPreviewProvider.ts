import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PackmolStructureParser, PackmolInput, PackmolStructure, PdbAtom } from './packmolStructureParser';

/**
 * Packmol 预览配置接口
 */
interface PackmolPreviewSettings {
  geometrySegments: number;
  structureOpacity: number;
  constraintOpacity: number;
  backgroundColor: string;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  colorTheme: string;
}

/**
 * Packmol 3D 预览提供者
 */
export class PackmolPreviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'gromacs-helper.packmolPreview';
  
  private _view?: vscode.WebviewView;
  private _currentInput?: PackmolInput;
  private _structureData: Map<string, PdbAtom[]> = new Map();
  private _isWebviewReady = false;
  private _pendingData?: any;
  
  constructor(private readonly _extensionUri: vscode.Uri) {}
  
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    
    webviewView.webview.onDidReceiveMessage(data => {
      console.log('📨 Extension received message from webview:', data);
      
      switch (data.type) {
        case 'test':
          console.log('🧪 Test message received from webview:', data.message);
          break;
        case 'ready':
          console.log('🟢 Webview is ready!');
          this._isWebviewReady = true;
          // 如果有待发送的数据，现在发送
          if (this._pendingData) {
            console.log('📤 Sending pending data to webview:', this._pendingData);
            this._view?.webview.postMessage(this._pendingData);
            this._pendingData = undefined;
            console.log('✅ Pending data sent successfully');
          } else if (this._currentInput) {
            console.log('🔄 No pending data, triggering update with current input');
            this._updatePreview();
          } else {
            console.log('ℹ️ Webview ready but no data to send');
          }
          break;
        case 'toggleStructure':
          console.log('🔄 Toggling structure:', data.structureId, 'visible:', data.visible);
          this._handleToggleStructure(data.structureId, data.visible);
          break;
        case 'resetCamera':
          console.log('📷 Resetting camera');
          this._handleResetCamera();
          break;
        case 'updateSettings':
          console.log('⚙️ Updating settings:', data.settings);
          this._handleUpdateSettings(data.settings);
          break;
        case 'error':
          console.error('❌ Webview error:', data.message);
          vscode.window.showErrorMessage(`Webview error: ${data.message}`);
          break;
        default:
          console.log('❓ Unknown message type from webview:', data.type);
      }
    });
  }
  
  private _currentPackmolUri?: vscode.Uri;

  /**
   * 预览 Packmol 文件
   */
  public async previewPackmolFile(uri: vscode.Uri): Promise<void> {
    try {
      console.log('Starting Packmol preview for:', uri.fsPath);
      
      // 保存当前的 Packmol URI
      this._currentPackmolUri = uri;
      
      // 解析 Packmol 输入文件
      this._currentInput = await PackmolStructureParser.parsePackmolInput(uri);
      console.log('Parsed Packmol input:', this._currentInput);
      
      // 不需要加载具体的结构文件，只显示空间占据
      // await this._loadStructureFiles(uri);
      
      // 更新预览
      if (this._view) {
        this._updatePreview();
      }
      
      // 显示预览面板
      if (this._view) {
        this._view.show?.(true);
      }
      
    } catch (error) {
      console.error('Error previewing Packmol file:', error);
      vscode.window.showErrorMessage(`Failed to preview Packmol file: ${error}`);
    }
  }
  
  /**
   * 加载所有结构文件
   */
  private async _loadStructureFiles(packmolUri: vscode.Uri): Promise<void> {
    if (!this._currentInput) {
      return;
    }
    
    this._structureData.clear();
    
    for (const structure of this._currentInput.structures) {
      try {
        const structureUri = await PackmolStructureParser.getStructureFilePath(packmolUri, structure.filename);
        if (structureUri) {
          const atoms = await PackmolStructureParser.parsePdbFile(structureUri);
          this._structureData.set(structure.id, atoms);
        } else {
          console.warn(`Structure file not found: ${structure.filename}`);
        }
      } catch (error) {
        console.error(`Error loading structure ${structure.filename}:`, error);
      }
    }
  }
  
  /**
   * 更新预览
   */
  private async _updatePreview(): Promise<void> {
    console.log('🔄 === _updatePreview START ===');
    console.log('View exists:', !!this._view);
    console.log('Current input exists:', !!this._currentInput);
    console.log('Current Packmol URI exists:', !!this._currentPackmolUri);
    console.log('Webview ready:', this._isWebviewReady);
    
    if (!this._view || !this._currentInput || !this._currentPackmolUri) {
      console.log('❌ Missing view, input, or URI, aborting update');
      return;
    }

    try {
      // 生成包含多球拟合数据的场景数据
      console.log('🎬 Generating scene data with multisphere fitting...');
      const sceneData = await this._generateSceneData(this._currentInput, this._currentPackmolUri);
      
      // 确保数据可以正确序列化 - 深度克隆所有数据
      const serializedStructures = sceneData.structures.map((structure: any) => {
        const serialized: any = {
          id: structure.id,
          filename: structure.filename,
          number: structure.number,
          constraints: structure.constraints || [],
          visualInfo: structure.visualInfo ? {
            type: structure.visualInfo.type,
            atomCount: structure.visualInfo.atomCount
          } : undefined
        };
        
        // 如果有多球几何体数据，确保正确序列化
        if (structure.visualInfo && structure.visualInfo.geometry && 
            structure.visualInfo.geometry.type === 'multi_sphere') {
          serialized.visualInfo.geometry = {
            type: 'multi_sphere',
            spheres: structure.visualInfo.geometry.spheres.map((sphere: any) => ({
              center: Array.isArray(sphere.center) ? [...sphere.center] : sphere.center,
              radius: sphere.radius
            }))
          };
          console.log(`🔮 Serializing multisphere for ${structure.id}: ${structure.visualInfo.geometry.spheres.length} spheres`);
        }
        
        return serialized;
      });
      
      const data = {
        type: 'update',
        input: {
          config: this._currentInput.config,
          structures: serializedStructures
        },
        sceneData: {
          structures: serializedStructures,
          globalBounds: sceneData.globalBounds
        },
        structureData: {},
        settings: this._getCurrentSettings()
      };
      
      console.log('📦 Prepared serialized data for webview');
      console.log('Input structures count:', data.input.structures?.length || 0);
      console.log('Multisphere structures:', data.input.structures?.filter((s: any) => 
        s.visualInfo && s.visualInfo.geometry && s.visualInfo.geometry.type === 'multi_sphere').length || 0);
      
      // 验证多球数据的序列化
      const multisphereStructures = data.input.structures.filter((s: any) => 
        s.visualInfo && s.visualInfo.geometry && s.visualInfo.geometry.type === 'multi_sphere');
      multisphereStructures.forEach((structure: any, i: number) => {
        console.log(`🔮 Multisphere ${i + 1} (${structure.id}): ${structure.visualInfo.geometry.spheres.length} spheres`);
        structure.visualInfo.geometry.spheres.forEach((sphere: any, j: number) => {
          console.log(`  Sphere ${j + 1}: center=[${sphere.center.join(', ')}], radius=${sphere.radius}`);
        });
      });
      
      if (this._isWebviewReady) {
        console.log('📤 Sending serialized data to webview immediately');
        try {
          this._view.webview.postMessage(data);
          console.log('✅ Serialized data sent successfully');
        } catch (error) {
          console.error('❌ Error sending serialized data to webview:', error);
          vscode.window.showErrorMessage(`Failed to send data to webview: ${error}`);
        }
      } else {
        console.log('⏳ Webview not ready, storing serialized data for later');
        this._pendingData = data;
        // 强制显示视图以触发初始化
        console.log('📺 Forcing view to show');
        this._view.show?.(true);
      }
    } catch (error) {
      console.error('❌ Error generating scene data:', error);
      vscode.window.showErrorMessage(`Failed to generate scene data: ${error}`);
    }
    
    console.log('🔄 === _updatePreview END ===');
  }
  
  /**
   * 生成场景数据，包括多球拟合
   */
  private async _generateSceneData(input: PackmolInput, packmolUri: vscode.Uri): Promise<any> {
    console.log('🎬 === _generateSceneData START ===');
    console.log('Packmol URI:', packmolUri.fsPath);
    console.log('Input structures:', input.structures.length);
    
    try {
      // 使用 PackmolStructureParser 生成场景数据
      const sceneData = await PackmolStructureParser.generateSceneData(input, packmolUri);
      console.log('Generated scene data with', sceneData.structures.length, 'structures');
      
      // 检查多球结构
      const multisphereStructures = sceneData.structures.filter(s => 
        s.visualInfo && s.visualInfo.geometry && s.visualInfo.geometry.type === 'multi_sphere');
      console.log('✅ Multisphere structures found:', multisphereStructures.length);
      
      multisphereStructures.forEach((structure, i) => {
        const sphereCount = structure.visualInfo.geometry?.spheres?.length || 0;
        console.log(`🔮 Multisphere structure ${i + 1}: ${structure.filename} with ${sphereCount} spheres`);
        if (structure.visualInfo.geometry?.spheres) {
          structure.visualInfo.geometry.spheres.forEach((sphere, j) => {
            console.log(`  Sphere ${j + 1}: center=(${sphere.center.join(', ')}), radius=${sphere.radius}`);
          });
        }
      });
      
      // 直接返回包含 visualInfo 的结构数据
      return {
        structures: input.structures, // 使用原始结构，其中已包含 visualInfo
        globalBounds: sceneData.globalBounds
      };
      
    } catch (error) {
      console.error('❌ Error in _generateSceneData:', error);
      // 返回基本场景数据
      return {
        structures: input.structures.map(s => ({ 
          ...s, 
          visualInfo: s.visualInfo || { 
            type: s.number === 1 ? 'single_molecule' : 'multiple_molecules' 
          } 
        })),
        globalBounds: { min: [-50, -50, -50], max: [50, 50, 50] }
      };
    } finally {
      console.log('🎬 === _generateSceneData END ===');
    }
  }
  
  /**
   * 处理结构显示/隐藏切换
   */
  private _handleToggleStructure(structureId: string, visible: boolean): void {
    if (!this._view) {
      return;
    }
    
    this._view.webview.postMessage({
      type: 'toggleStructure',
      structureId,
      visible
    });
  }
  
  /**
   * 处理相机重置
   */
  private _handleResetCamera(): void {
    if (!this._view) {
      return;
    }
    
    this._view.webview.postMessage({
      type: 'resetCamera'
    });
  }

  /**
   * 处理设置更新
   */
  private async _handleUpdateSettings(settings: Partial<PackmolPreviewSettings>): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('gromacsHelper.packmolPreview');
      
      // 更新每个配置项
      for (const [key, value] of Object.entries(settings)) {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }
      
      console.log('✅ Settings updated successfully');
    } catch (error) {
      console.error('❌ Failed to update settings:', error);
      vscode.window.showErrorMessage(`Failed to update settings: ${error}`);
    }
  }

  /**
   * 读取当前配置
   */
  private _getCurrentSettings(): PackmolPreviewSettings {
    const config = vscode.workspace.getConfiguration('gromacsHelper.packmolPreview');
    
    return {
      geometrySegments: config.get<number>('geometrySegments', 16),
      structureOpacity: config.get<number>('structureOpacity', 0.6),
      constraintOpacity: config.get<number>('constraintOpacity', 0.3),
      backgroundColor: config.get<string>('backgroundColor', '#1e1e1e'),
      ambientLightIntensity: config.get<number>('ambientLightIntensity', 0.6),
      directionalLightIntensity: config.get<number>('directionalLightIntensity', 0.8),
      colorTheme: config.get<string>('colorTheme', 'default')
    };
  }
  
  /**
   * 生成 Webview HTML
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    try {
      // 构造 HTML 文件路径 - 使用同步方式
      const htmlFilePath = path.join(this._extensionUri.fsPath, 'media', 'packmol_preview.html');
      
      // 读取 HTML 文件内容 - 使用同步读取
      const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
      
      // Three.js CDN URLs
      const threeJsUri = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
      const orbitControlsUri = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js';
      
      // 替换模板变量
      let processedContent = htmlContent.replace(/\$\{threeJsUri\}/g, threeJsUri);
      processedContent = processedContent.replace(/\$\{orbitControlsUri\}/g, orbitControlsUri);
      
      return processedContent;
    } catch (error) {
      console.error('Error loading HTML template:', error);
      // 提供一个基本的错误回退页面
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Packmol Preview Error</title>
            <style>
              body { 
                font-family: system-ui; 
                padding: 20px; 
                background: #1e1e1e; 
                color: #cccccc; 
              }
              .error { 
                color: #ff6b6b; 
                border: 1px solid #ff6b6b; 
                padding: 10px; 
                border-radius: 5px; 
              }
            </style>
          </head>
          <body>
            <div class="error">
              <h3>Error Loading Packmol Preview</h3>
              <p>Failed to load the HTML template: ${error}</p>
              <p>Please check the extension installation.</p>
            </div>
          </body>
        </html>
      `;
    }
  }
}
