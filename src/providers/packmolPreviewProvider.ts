import * as vscode from 'vscode';
import { PackmolStructureParser, PackmolInput, PackmolStructure, PdbAtom } from './packmolStructureParser';

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
        structureData: {}
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
   * 生成 Webview HTML
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Three.js CDN
    const threeJsUri = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    const orbitControlsUri = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js';
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Packmol 3D Preview</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                background: #1e1e1e;
                color: #cccccc;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                overflow: hidden;
            }
            
            #container {
                position: relative;
                width: 100vw;
                height: 100vh;
            }
            
            #canvas-container {
                width: 100%;
                height: 100%;
            }
            
            #controls {
                position: absolute;
                top: 10px;
                left: 10px;
                z-index: 100;
                background: rgba(30, 30, 30, 0.9);
                padding: 10px;
                border-radius: 5px;
                max-width: 250px;
                max-height: calc(100vh - 40px);
                overflow-y: auto;
            }
            
            .control-group {
                margin-bottom: 15px;
            }
            
            .control-group h3 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #ffffff;
                border-bottom: 1px solid #444;
                padding-bottom: 4px;
            }
            
            .structure-item {
                display: flex;
                align-items: center;
                margin-bottom: 5px;
                font-size: 12px;
                padding: 2px 0;
            }
            
            .structure-checkbox {
                margin-right: 8px;
                flex-shrink: 0;
            }
            
            .structure-info {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .structure-count {
                color: #888;
                margin-left: 5px;
            }
            
            .structure-color-picker {
                width: 20px;
                height: 20px;
                border: 1px solid #555;
                border-radius: 3px;
                cursor: pointer;
                margin-left: 8px;
                flex-shrink: 0;
            }
            
            .structure-color-picker::-webkit-color-swatch {
                border: none;
                border-radius: 2px;
            }
            
            .structure-color-picker::-webkit-color-swatch-wrapper {
                padding: 0;
            }
            
            .button {
                background: #0066cc;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                margin: 2px;
            }
            
            .button:hover {
                background: #0052a3;
            }
            
            .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #cccccc;
                font-size: 16px;
            }
            
            .error {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #ff6b6b;
                font-size: 14px;
                text-align: center;
                max-width: 300px;
            }
            
            #info {
                position: absolute;
                bottom: 10px;
                left: 10px;
                background: rgba(30, 30, 30, 0.9);
                padding: 8px;
                border-radius: 3px;
                font-size: 11px;
                color: #aaa;
            }
            
            .surface-slider-container {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 2px 0;
            }
            
            .surface-slider {
                width: 100px;
                height: 18px;
                background: #444;
                border-radius: 9px;
                outline: none;
                cursor: pointer;
            }
            
            .surface-slider::-webkit-slider-thumb {
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #0066cc;
                cursor: pointer;
                border: 2px solid #ffffff;
            }
            
            .surface-slider::-webkit-slider-thumb:hover {
                background: #0052a3;
            }
            
            .surface-slider::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #0066cc;
                cursor: pointer;
                border: 2px solid #ffffff;
            }
        </style>
    </head>
    <body>
        <div id="container">
            <div id="canvas-container"></div>
            
            <div id="controls">
                <div class="control-group">
                    <h3>View Controls</h3>
                    <button class="button" onclick="resetCamera()">Reset Camera</button>
                    <button class="button" onclick="toggleWireframe()">Toggle Wireframe</button>
                    <button class="button" onclick="toggleMultisphere()">Toggle Multisphere</button>
                    <button class="button" onclick="randomizeColors()">Random Colors</button>
                    <button class="button" onclick="resetColors()">Reset Colors</button>
                </div>
                
                <div class="control-group">
                    <h3>Structures & Constraints</h3>
                    <div id="structure-list"></div>
                </div>
                
                <div class="control-group">
                    <h3>Statistics</h3>
                    <div id="constraint-list"></div>
                </div>
            </div>
            
            <div id="info">
                Mouse: Left=Rotate, Right=Pan, Wheel=Zoom
            </div>
            
            <div id="loading" class="loading">Loading...</div>
        </div>
        
        <script>
            console.log('🚀 Webview script starting...');
            
            // 全局变量
            let scene, camera, renderer, controls;
            let structureGroups = new Map();
            let constraintGroups = new Map();
            let currentData = null;
            let wireframeMode = false;
            let isThreeJSReady = false;
            let initializationAttempts = 0;
            const MAX_INIT_ATTEMPTS = 20;
            // 存储表面约束的大小参数
            let surfaceConstraintSizes = new Map();
            
            // VS Code API
            let vscode;
            try {
                vscode = acquireVsCodeApi();
                console.log('✅ VS Code API acquired successfully');
            } catch (error) {
                console.error('❌ Failed to acquire VS Code API:', error);
                document.getElementById('loading').innerHTML = 'Error: Cannot acquire VS Code API';
            }
            
            // 立即尝试发送一个测试消息来验证连接
            function testVSCodeConnection() {
                console.log('🧪 Testing VS Code connection...');
                if (vscode) {
                    try {
                        vscode.postMessage({ type: 'test', message: 'Webview loaded' });
                        console.log('✅ Test message sent successfully');
                    } catch (error) {
                        console.error('❌ Failed to send test message:', error);
                    }
                }
            }
            
            // 在没有 Three.js 的情况下也要发送 ready 消息
            function sendReadyMessage() {
                console.log('📤 Sending ready message to VS Code...');
                if (vscode) {
                    try {
                        vscode.postMessage({ type: 'ready' });
                        console.log('✅ Ready message sent successfully');
                        document.getElementById('loading').innerHTML = 'Ready! Waiting for data...';
                    } catch (error) {
                        console.error('❌ Failed to send ready message:', error);
                        document.getElementById('loading').innerHTML = 'Error sending ready message';
                    }
                } else {
                    console.error('❌ Cannot send ready message - vscode API not available');
                    document.getElementById('loading').innerHTML = 'Error: VS Code API not available';
                }
            }
            
            // 检查 Three.js 是否加载
            function checkThreeJS() {
                initializationAttempts++;
                console.log(\`🔍 Checking Three.js (attempt \${initializationAttempts}/\${MAX_INIT_ATTEMPTS})...\`);
                
                if (typeof THREE !== 'undefined') {
                    console.log('✅ Three.js loaded successfully');
                    initThreeJS();
                } else if (initializationAttempts < MAX_INIT_ATTEMPTS) {
                    console.log('⏳ Three.js not yet loaded, retrying in 200ms...');
                    setTimeout(checkThreeJS, 200);
                } else {
                    console.error('❌ Three.js failed to load after maximum attempts');
                    document.getElementById('loading').innerHTML = 'Error: Three.js failed to load. Using fallback mode.';
                    // 即使 Three.js 失败，也要发送 ready 消息
                    sendReadyMessage();
                }
            }
            
            // 初始化 Three.js 场景
            function initThreeJS() {
                console.log('🎨 Initializing Three.js...');
                const container = document.getElementById('canvas-container');
                
                if (!container) {
                    console.error('❌ Canvas container not found');
                    document.getElementById('loading').innerHTML = 'Error: Canvas container not found';
                    return;
                }
                
                try {
                    // 场景
                    scene = new THREE.Scene();
                    scene.background = new THREE.Color(0x1e1e1e);
                    console.log('✅ Scene created');
                    
                    // 相机
                    const aspect = container.clientWidth / container.clientHeight || 1;
                    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
                    camera.position.set(50, 50, 50);
                    camera.lookAt(0, 0, 0);
                    console.log('✅ Camera created');
                    
                    // 渲染器
                    renderer = new THREE.WebGLRenderer({ antialias: true });
                    renderer.setSize(container.clientWidth || 400, container.clientHeight || 300);
                    renderer.shadowMap.enabled = true;
                    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                    container.appendChild(renderer.domElement);
                    console.log('✅ Renderer created and added to DOM');
                    
                    // 控制器 (简化版本，不依赖 OrbitControls)
                    setupSimpleControls();
                    console.log('✅ Controls setup complete');
                    
                    // 光照
                    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
                    scene.add(ambientLight);
                    
                    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                    directionalLight.position.set(100, 100, 50);
                    directionalLight.castShadow = true;
                    directionalLight.shadow.mapSize.width = 2048;
                    directionalLight.shadow.mapSize.height = 2048;
                    scene.add(directionalLight);
                    console.log('✅ Lights added');
                    
                    // 坐标轴
                    const axesHelper = new THREE.AxesHelper(10);
                    scene.add(axesHelper);
                    
                    // 渲染循环
                    animate();
                    console.log('✅ Animation loop started');
                    
                    // 窗口调整
                    window.addEventListener('resize', onWindowResize);
                    console.log('✅ Resize listener added');
                    
                    // 标记为准备就绪
                    isThreeJSReady = true;
                    console.log('🎉 Three.js initialization complete!');
                    
                    // 发送准备就绪消息
                    sendReadyMessage();
                    
                    // 隐藏加载指示器
                    document.getElementById('loading').style.display = 'none';
                    
                } catch (error) {
                    console.error('❌ Error initializing Three.js:', error);
                    document.getElementById('loading').innerHTML = 'Error initializing 3D scene: ' + error.message;
                    // 即使初始化失败，也要发送 ready 消息
                    sendReadyMessage();
                }
            }
            
            // 简单的鼠标控制
            function setupSimpleControls() {
                let isMouseDown = false;
                let mouseButton = -1;
                let mouseX = 0, mouseY = 0;
                
                renderer.domElement.addEventListener('mousedown', (event) => {
                    isMouseDown = true;
                    mouseButton = event.button;
                    mouseX = event.clientX;
                    mouseY = event.clientY;
                });
                
                renderer.domElement.addEventListener('mouseup', () => {
                    isMouseDown = false;
                });
                
                renderer.domElement.addEventListener('mousemove', (event) => {
                    if (!isMouseDown) return;
                    
                    const deltaX = event.clientX - mouseX;
                    const deltaY = event.clientY - mouseY;
                    
                    if (mouseButton === 0) { // 左键旋转
                        const spherical = new THREE.Spherical();
                        spherical.setFromVector3(camera.position);
                        spherical.theta -= deltaX * 0.01;
                        spherical.phi += deltaY * 0.01;
                        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
                        camera.position.setFromSpherical(spherical);
                        camera.lookAt(0, 0, 0);
                    } else if (mouseButton === 2) { // 右键平移
                        const panSpeed = 0.1;
                        camera.position.x += deltaX * panSpeed;
                        camera.position.y -= deltaY * panSpeed;
                    }
                    
                    mouseX = event.clientX;
                    mouseY = event.clientY;
                });
                
                renderer.domElement.addEventListener('wheel', (event) => {
                    const zoomSpeed = 0.1;
                    const direction = camera.position.clone().normalize();
                    if (event.deltaY > 0) {
                        camera.position.add(direction.multiplyScalar(zoomSpeed * camera.position.length()));
                    } else {
                        camera.position.sub(direction.multiplyScalar(zoomSpeed * camera.position.length()));
                    }
                });
                
                renderer.domElement.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                });
            }
            
            // 窗口大小调整
            function onWindowResize() {
                const container = document.getElementById('canvas-container');
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(container.clientWidth, container.clientHeight);
            }
            
            // 动画循环
            function animate() {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            }
            
            // 更新数据
            function updateData(data) {
                console.log('🔄 === updateData START ===');
                console.log('Input data:', data);
                console.log('Three.js ready:', isThreeJSReady);
                console.log('Scene exists:', !!scene);
                console.log('Camera exists:', !!camera);
                
                if (!isThreeJSReady) {
                    console.error('❌ Three.js not ready for updateData');
                    alert('Three.js 未准备好，无法更新数据');
                    return;
                }
                
                try {
                    currentData = data;
                         // 清除现有的结构
                console.log('🧹 Clearing existing structures...');
                console.log('Structure groups count:', structureGroups.size);
                console.log('Constraint groups count:', constraintGroups.size);
                
                structureGroups.forEach(group => {
                    console.log('Removing group:', group.name);
                    scene.remove(group);
                });
                structureGroups.clear();
                constraintGroups.clear(); // 约束现在是结构的子对象，会随结构一起删除
                    
                    // 创建结构
                    if (data.input && data.input.structures) {
                        console.log('🏗️ Creating structures for:', data.input.structures.length, 'structures');
                        
                        // 检查多球数据
                        const multisphereStructures = data.input.structures.filter(s => 
                            s.visualInfo && s.visualInfo.geometry && s.visualInfo.geometry.type === 'multi_sphere'
                        );
                        console.log('🔮 Found', multisphereStructures.length, 'structures with multisphere geometry');
                        
                        multisphereStructures.forEach((structure, i) => {
                            const sphereCount = structure.visualInfo.geometry.spheres?.length || 0;
                            console.log('🔮 Multisphere structure', i + 1, ':', structure.filename, 'with', sphereCount, 'spheres');
                            if (structure.visualInfo.geometry.spheres) {
                                structure.visualInfo.geometry.spheres.forEach((sphere, j) => {
                                    console.log('  Sphere', j + 1, ':', sphere.center, 'radius=', sphere.radius);
                                });
                            }
                        });
                        
                        data.input.structures.forEach((structure, index) => {
                            console.log('📦 Creating structure ' + index + ':', structure.filename, 'number=' + structure.number);
                            
                            // 详细检查结构的可视化信息
                            if (structure.visualInfo) {
                                console.log('  📊 VisualInfo type:', structure.visualInfo.type);
                                if (structure.visualInfo.geometry) {
                                    console.log('  🔮 Geometry type:', structure.visualInfo.geometry.type);
                                    if (structure.visualInfo.geometry.type === 'multi_sphere') {
                                        console.log('  🎯 MULTISPHERE DETECTED! Spheres:', structure.visualInfo.geometry.spheres?.length || 0);
                                    }
                                }
                            } else {
                                console.warn('  ❌ No visualInfo found for structure:', structure.filename);
                            }
                            
                            try {
                                createStructureVisualization(structure);
                                console.log('✅ Structure ' + index + ' created successfully');
                            } catch (structError) {
                                console.error('❌ Error creating structure ' + index + ':', structError);
                            }
                        });
                    } else {
                        console.warn('⚠️ No structures found in data');
                        console.log('Data.input:', data.input);
                    }
                    
                    // 更新控制面板
                    console.log('🎛️ Updating control panel...');
                    updateControlPanel();
                    
                    // 调整相机位置
                    console.log('📷 Fitting camera to scene...');
                    fitCameraToScene();
                    
                    console.log('✅ === updateData COMPLETE ===');
                    alert('数据更新完成！结构数量: ' + (data.input?.structures?.length || 0));
                    
                } catch (error) {
                    console.error('❌ === updateData ERROR ===');
                    console.error('Error details:', error);
                    alert('updateData 出错: ' + error.message);
                }
            }
            
            // 创建多球拟合可视化
            function createMultisphereVisualization(structure, group) {
                console.log('Creating multisphere visualization for:', structure.id);
                
                // 检查是否有多球几何体数据
                if (structure.visualInfo && structure.visualInfo.geometry && 
                    structure.visualInfo.geometry.type === 'multi_sphere' && 
                    structure.visualInfo.geometry.spheres) {
                    
                    const spheres = structure.visualInfo.geometry.spheres;
                    console.log('Creating ' + spheres.length + ' spheres for structure:', structure.id);
                    
                    const structureColor = getStructureColor(structure.id);
                    
                    // 创建每个球体
                    spheres.forEach((sphere, index) => {
                        const sphereGeometry = new THREE.SphereGeometry(sphere.radius, 24, 24);
                        
                        // 为不同的球体使用略微不同的颜色
                        const color = new THREE.Color(structureColor);
                        const hsl = {};
                        color.getHSL(hsl);
                        
                        // 调整色调和饱和度来区分不同的球体
                        hsl.h = (hsl.h + index * 0.1) % 1.0;
                        hsl.s = Math.min(1.0, hsl.s + index * 0.05);
                        color.setHSL(hsl.h, hsl.s, hsl.l);
                        
                        const sphereMaterial = new THREE.MeshLambertMaterial({
                            color: color,
                            transparent: true,
                            opacity: 0.6,
                            wireframe: false
                        });
                        
                        const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
                        sphereMesh.position.set(sphere.center[0], sphere.center[1], sphere.center[2]);
                        sphereMesh.name = structure.id + '_multisphere_' + index;
                        
                        // 添加球体边框（线框）
                        const wireframeGeometry = new THREE.SphereGeometry(sphere.radius, 16, 16);
                        const wireframeMaterial = new THREE.MeshBasicMaterial({
                            color: structureColor,
                            wireframe: true,
                            transparent: true,
                            opacity: 0.4
                        });
                        const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
                        wireframeMesh.position.set(sphere.center[0], sphere.center[1], sphere.center[2]);
                        wireframeMesh.name = structure.id + '_multisphere_wireframe_' + index;
                        
                        group.add(sphereMesh);
                        group.add(wireframeMesh);
                        
                        console.log('Added sphere ' + index + ': center=(' + sphere.center.join(', ') + '), radius=' + sphere.radius.toFixed(2));
                    });
                    
                    // 添加连接线来显示球体之间的关系
                    if (spheres.length > 1) {
                        createSphereBonds(spheres, group, structureColor);
                    }
                    
                    // 添加质心标记
                    const centroid = calculateSphereCentroid(spheres);
                    const centroidGeometry = new THREE.SphereGeometry(0.8, 8, 8);
                    const centroidMaterial = new THREE.MeshBasicMaterial({
                        color: structureColor,
                        transparent: true,
                        opacity: 0.9
                    });
                    const centroidMesh = new THREE.Mesh(centroidGeometry, centroidMaterial);
                    centroidMesh.position.set(centroid[0], centroid[1], centroid[2]);
                    centroidMesh.name = structure.id + '_centroid';
                    group.add(centroidMesh);
                    
                    console.log('Multisphere visualization created with ' + spheres.length + ' spheres');
                    return true;
                }
                
                return false;
            }
            
            // 创建球体之间的连接线
            function createSphereBonds(spheres, group, color) {
                const bondMaterial = new THREE.LineBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.3,
                    linewidth: 2
                });
                
                // 连接相近的球体
                for (let i = 0; i < spheres.length; i++) {
                    for (let j = i + 1; j < spheres.length; j++) {
                        const sphere1 = spheres[i];
                        const sphere2 = spheres[j];
                        
                        // 计算球体中心之间的距离
                        const distance = Math.sqrt(
                            Math.pow(sphere1.center[0] - sphere2.center[0], 2) +
                            Math.pow(sphere1.center[1] - sphere2.center[1], 2) +
                            Math.pow(sphere1.center[2] - sphere2.center[2], 2)
                        );
                        
                        // 如果距离小于两个球体半径之和的1.5倍，则连接它们
                        const maxBondDistance = (sphere1.radius + sphere2.radius) * 1.5;
                        if (distance <= maxBondDistance) {
                            const bondGeometry = new THREE.BufferGeometry().setFromPoints([
                                new THREE.Vector3(sphere1.center[0], sphere1.center[1], sphere1.center[2]),
                                new THREE.Vector3(sphere2.center[0], sphere2.center[1], sphere2.center[2])
                            ]);
                            
                            const bondLine = new THREE.Line(bondGeometry, bondMaterial);
                            bondLine.name = 'bond_' + i + '_' + j;
                            group.add(bondLine);
                        }
                    }
                }
            }
            
            // 计算多球质心
            function calculateSphereCentroid(spheres) {
                const totalVolume = spheres.reduce((sum, sphere) => 
                    sum + (4/3) * Math.PI * Math.pow(sphere.radius, 3), 0);
                
                let weightedX = 0, weightedY = 0, weightedZ = 0;
                
                spheres.forEach(sphere => {
                    const volume = (4/3) * Math.PI * Math.pow(sphere.radius, 3);
                    const weight = volume / totalVolume;
                    
                    weightedX += sphere.center[0] * weight;
                    weightedY += sphere.center[1] * weight;
                    weightedZ += sphere.center[2] * weight;
                });
                
                return [weightedX, weightedY, weightedZ];
            }
            
            // 创建结构可视化（支持多球拟合）
            function createStructureVisualization(structure) {
                console.log('🎨 === createStructureVisualization START ===');
                console.log('Structure ID:', structure.id);
                console.log('Structure filename:', structure.filename);
                console.log('Structure number:', structure.number);
                console.log('Has visualInfo:', !!structure.visualInfo);
                
                if (structure.visualInfo) {
                    console.log('VisualInfo type:', structure.visualInfo.type);
                    console.log('Has geometry:', !!structure.visualInfo.geometry);
                    if (structure.visualInfo.geometry) {
                        console.log('Geometry type:', structure.visualInfo.geometry.type);
                        if (structure.visualInfo.geometry.type === 'multi_sphere') {
                            console.log('🔮 MULTISPHERE GEOMETRY FOUND!');
                            console.log('Number of spheres:', structure.visualInfo.geometry.spheres?.length || 0);
                        }
                    }
                }
                
                try {
                    const group = new THREE.Group();
                    group.name = structure.id;
                    console.log('✅ Created group for structure:', structure.id);
                    
                    // 检查是否为单分子结构且有多球拟合数据
                    const isMultisphereStructure = structure.number === 1 && 
                        structure.visualInfo && 
                        structure.visualInfo.geometry && 
                        structure.visualInfo.geometry.type === 'multi_sphere';
                    
                    console.log('Is multisphere structure:', isMultisphereStructure);
                    
                    if (isMultisphereStructure) {
                        console.log('🔮 Creating multisphere representation for single molecule:', structure.id);
                        
                        // 创建多球拟合可视化
                        const multisphereCreated = createMultisphereVisualization(structure, group);
                        
                        if (multisphereCreated) {
                            console.log('✅ Multisphere representation created successfully');
                        } else {
                            console.warn('❌ Failed to create multisphere representation, falling back to default');
                        }
                    } else {
                        console.log('📦 Not a multisphere structure, using default visualization');
                    }
                    
                    // 处理约束（如果有）
                    if (structure.constraints && structure.constraints.length > 0) {
                        console.log('Processing', structure.constraints.length, 'constraints for structure:', structure.id);
                        
                        // 基于约束创建可视化，并添加到结构组中
                        structure.constraints.forEach((constraint, index) => {
                            console.log(\`Creating constraint \${index}:\`, constraint);
                            const constraintMesh = createConstraintVisualization(constraint, structure.id + '_constraint_' + index);
                            if (constraintMesh) {
                                console.log('Successfully created constraint mesh');
                                constraintGroups.set(structure.id + '_constraint_' + index, constraintMesh);
                                group.add(constraintMesh); // 添加到结构组而不是场景
                            } else {
                                console.warn('Failed to create constraint mesh');
                            }
                        });
                        
                    } else {
                        console.log('No constraints found, structure will be represented by constraints only');
                    }
                    
                    // 添加到场景
                    structureGroups.set(structure.id, group);
                    scene.add(group);
                    
                    console.log('Successfully created and added structure group:', structure.id);
                    console.log('Current scene children count:', scene.children.length);
                    
                } catch (error) {
                    console.error('Error in createStructureVisualization:', error);
                }
            }
            
            
            // 创建约束可视化
            function createConstraintVisualization(constraint, id) {
                console.log('Creating constraint visualization:', constraint, id);
                const geometry = getConstraintGeometry(constraint.geometry, id);
                if (!geometry) {
                    console.log('No geometry created for constraint');
                    return null;
                }
                
                // 从 id 中提取结构 ID (格式: structureId_constraint_index)
                const structureId = id.split('_constraint_')[0];
                const structureColor = getStructureColor(structureId);
                
                // 根据约束类型调整颜色
                let constraintColor = structureColor;
                if (constraint.type === 'outside') {
                    // outside 约束使用稍微偏红的结构颜色
                    const color = new THREE.Color(structureColor);
                    color.r = Math.min(1.0, color.r + 0.2);
                    constraintColor = color.getHex();
                } else {
                    // inside 约束使用稍微偏绿的结构颜色
                    const color = new THREE.Color(structureColor);
                    color.g = Math.min(1.0, color.g + 0.2);
                    constraintColor = color.getHex();
                }
                
                const material = new THREE.MeshLambertMaterial({
                    color: constraintColor,
                    transparent: true,
                    opacity: 0.3,
                    wireframe: true
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.name = id;
                
                console.log('Created constraint mesh with color:', constraintColor.toString(16));
                return mesh;
            }
            
            // 计算场景的合理大小，用于确定表面约束的默认大小
            function calculateSceneSize() {
                if (!currentData || !currentData.input || !currentData.input.structures) {
                    return 50; // 默认大小
                }
                
                let maxSize = 0;
                currentData.input.structures.forEach(structure => {
                    if (structure.constraints) {
                        structure.constraints.forEach(constraint => {
                            switch (constraint.geometry.type) {
                                case 'sphere':
                                    if (constraint.geometry.parameters.length >= 4) {
                                        const radius = constraint.geometry.parameters[3];
                                        maxSize = Math.max(maxSize, radius * 2);
                                    }
                                    break;
                                case 'box':
                                    if (constraint.geometry.parameters.length >= 6) {
                                        const [x1, y1, z1, x2, y2, z2] = constraint.geometry.parameters;
                                        const size = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), Math.abs(z2 - z1));
                                        maxSize = Math.max(maxSize, size);
                                    }
                                    break;
                                case 'cube':
                                    if (constraint.geometry.parameters.length >= 4) {
                                        const size = constraint.geometry.parameters[3];
                                        maxSize = Math.max(maxSize, size);
                                    }
                                    break;
                                case 'cylinder':
                                    if (constraint.geometry.parameters.length >= 7) {
                                        const [x1, y1, z1, x2, y2, z2, radius] = constraint.geometry.parameters;
                                        const height = Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2);
                                        maxSize = Math.max(maxSize, Math.max(radius * 2, height));
                                    }
                                    break;
                            }
                        });
                    }
                });
                
                // 如果没有找到其他约束，使用默认值，否则使用找到的最大尺寸的1.5倍作为表面大小
                return maxSize > 0 ? maxSize * 1.5 : 50;
            }

            // 获取表面约束的大小
            function getSurfaceConstraintSize(constraintId) {
                if (surfaceConstraintSizes.has(constraintId)) {
                    return surfaceConstraintSizes.get(constraintId);
                }
                
                // 首次访问时，设置基于场景的合理默认值
                const defaultSize = calculateSceneSize();
                surfaceConstraintSizes.set(constraintId, defaultSize);
                return defaultSize;
            }

            // 设置表面约束的大小
            function setSurfaceConstraintSize(constraintId, size) {
                surfaceConstraintSizes.set(constraintId, size);
                
                // 重新创建该约束的几何体
                const constraintMesh = constraintGroups.get(constraintId);
                if (constraintMesh) {
                    // 获取约束数据
                    const parts = constraintId.split('_constraint_');
                    const structureId = parts[0];
                    const constraintIndex = parseInt(parts[1]);
                    
                    const structure = currentData.input.structures.find(s => s.id === structureId);
                    if (structure && structure.constraints && structure.constraints[constraintIndex]) {
                        const constraint = structure.constraints[constraintIndex];
                        const newGeometry = getConstraintGeometry(constraint.geometry, constraintId);
                        
                        if (newGeometry) {
                            constraintMesh.geometry.dispose(); // 清理旧几何体
                            constraintMesh.geometry = newGeometry;
                        }
                    }
                }
            }

            // 获取约束几何体
            function getConstraintGeometry(geometry, constraintId = null) {
                console.log('Getting constraint geometry:', geometry);
                switch (geometry.type) {
                    case 'sphere':
                        if (geometry.parameters.length >= 4) {
                            const [x, y, z, radius] = geometry.parameters;
                            console.log(\`Creating sphere at (\${x}, \${y}, \${z}) with radius \${radius}\`);
                            const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
                            sphereGeometry.translate(x, y, z);
                            return sphereGeometry;
                        }
                        break;
                    case 'box':
                        if (geometry.parameters.length >= 6) {
                            const [x1, y1, z1, x2, y2, z2] = geometry.parameters;
                            const width = Math.abs(x2 - x1);
                            const height = Math.abs(y2 - y1);
                            const depth = Math.abs(z2 - z1);
                            console.log(\`Creating box from (\${x1}, \${y1}, \${z1}) to (\${x2}, \${y2}, \${z2})\`);
                            const boxGeometry = new THREE.BoxGeometry(width, height, depth);
                            boxGeometry.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
                            return boxGeometry;
                        }
                        break;
                    case 'cube':
                        // outside cube xmin ymin zmin d
                        if (geometry.parameters.length >= 4) {
                            const [xmin, ymin, zmin, d] = geometry.parameters;
                            console.log(\`Creating cube at (\${xmin}, \${ymin}, \${zmin}) with size \${d}\`);
                            const cubeGeometry = new THREE.BoxGeometry(d, d, d);
                            cubeGeometry.translate(xmin + d/2, ymin + d/2, zmin + d/2);
                            return cubeGeometry;
                        }
                        break;
                    case 'cylinder':
                        if (geometry.parameters.length >= 8) {
                            const [a1, b1, c1, a2, b2, c2, d, l] = geometry.parameters;
                            
                            // a1,b1,c1 是起点，a2,b2,c2 是方向向量，d 是半径，l 是长度
                            console.log(\`Creating cylinder from (\${a1}, \${b1}, \${c1}) direction (\${a2}, \${b2}, \${c2}) radius \${d} length \${l}\`);
                            
                            // 标准化方向向量
                            const dirLength = Math.sqrt(a2*a2 + b2*b2 + c2*c2);
                            if (dirLength === 0) {
                                console.warn('Cylinder direction vector is zero');
                                break;
                            }
                            const dirX = a2 / dirLength;
                            const dirY = b2 / dirLength;
                            const dirZ = c2 / dirLength;
                            
                            // 创建圆柱体几何
                            const cylinderGeometry = new THREE.CylinderGeometry(d, d, l, 32);
                            
                            // Three.js 默认圆柱体沿 Y 轴，需要旋转到正确方向
                            // 计算从 Y 轴到目标方向的旋转
                            const yAxis = new THREE.Vector3(0, 1, 0);
                            const targetDir = new THREE.Vector3(dirX, dirY, dirZ);
                            const quaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, targetDir);
                            cylinderGeometry.applyQuaternion(quaternion);
                            
                            // 移动到正确位置（圆柱体中心）
                            const centerX = a1 + (dirX * l / 2);
                            const centerY = b1 + (dirY * l / 2);
                            const centerZ = c1 + (dirZ * l / 2);
                            cylinderGeometry.translate(centerX, centerY, centerZ);
                            
                            return cylinderGeometry;
                        }
                        break;
                    case 'plane':
                        // above/below plane a b c d (ax + by + cz - d = 0)
                        if (geometry.parameters.length >= 4) {
                            const [a, b, c, d] = geometry.parameters;
                            console.log(\`Creating plane with equation \${a}x + \${b}y + \${c}z - \${d} = 0\`);
                            
                            // 使用可调节的平面大小
                            const planeSize = constraintId ? getSurfaceConstraintSize(constraintId) : 50;
                            const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize, 10, 10);
                            
                            // 计算平面的法向量
                            const normal = new THREE.Vector3(a, b, c).normalize();
                            
                            // 计算平面上的一个点
                            let point = new THREE.Vector3();
                            if (Math.abs(c) > 0.1) {
                                point.set(0, 0, d / c);
                            } else if (Math.abs(b) > 0.1) {
                                point.set(0, d / b, 0);
                            } else if (Math.abs(a) > 0.1) {
                                point.set(d / a, 0, 0);
                            }
                            
                            // 将平面移动到正确位置并定向
                            planeGeometry.translate(point.x, point.y, point.z);
                            planeGeometry.lookAt(normal);
                            
                            return planeGeometry;
                        }
                        break;
                    case 'ellipsoid':
                        // 椭球体 (目前用球体近似，可以后续改进为真正的椭球体)
                        if (geometry.parameters.length >= 7) {
                            const [x, y, z, a, b, c, d] = geometry.parameters;
                            console.log(\`Creating ellipsoid at (\${x}, \${y}, \${z}) with semi-axes (\${a/d}, \${b/d}, \${c/d})\`);
                            
                            // 创建单位球体然后缩放
                            const ellipsoidGeometry = new THREE.SphereGeometry(1, 32, 32);
                            ellipsoidGeometry.scale(a/d, b/d, c/d);
                            ellipsoidGeometry.translate(x, y, z);
                            return ellipsoidGeometry;
                        }
                        break;
                    case 'xygauss':
                        // over/below xygauss a1 b1 a2 b2 c h
                        // 高斯表面: h * exp(-((x-a1)²/(2a2²) + (y-b1)²/(2b2²))) - (z-c) = 0
                        if (geometry.parameters.length >= 6) {
                            const [a1, b1, a2, b2, c, h] = geometry.parameters;
                            console.log(\`Creating xygauss surface at (\${a1}, \${b1}) with parameters a2=\${a2}, b2=\${b2}, c=\${c}, h=\${h}\`);
                            
                            // 使用可调节的表面范围大小
                            const surfaceSize = constraintId ? getSurfaceConstraintSize(constraintId) : Math.max(a2, b2) * 3;
                            const resolution = 32;
                            const range = surfaceSize / 2;
                            const positions = [];
                            const indices = [];
                            
                            for (let i = 0; i <= resolution; i++) {
                                for (let j = 0; j <= resolution; j++) {
                                    const x = a1 + (i / resolution - 0.5) * range * 2;
                                    const y = b1 + (j / resolution - 0.5) * range * 2;
                                    const z = c + h * Math.exp(-((x - a1) ** 2) / (2 * a2 ** 2) - ((y - b1) ** 2) / (2 * b2 ** 2));
                                    
                                    positions.push(x, y, z);
                                }
                            }
                            
                            // 创建索引
                            for (let i = 0; i < resolution; i++) {
                                for (let j = 0; j < resolution; j++) {
                                    const a = i * (resolution + 1) + j;
                                    const b = a + resolution + 1;
                                    
                                    indices.push(a, b, a + 1);
                                    indices.push(b, b + 1, a + 1);
                                }
                            }
                            
                            const gaussGeometry = new THREE.BufferGeometry();
                            gaussGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                            gaussGeometry.setIndex(indices);
                            gaussGeometry.computeVertexNormals();
                            
                            return gaussGeometry;
                        }
                        break;
                }
                console.log('Could not create geometry for:', geometry);
                return null;
            }
            
            // 更新控制面板
            function updateControlPanel() {
                const structureList = document.getElementById('structure-list');
                const constraintList = document.getElementById('constraint-list');
                
                structureList.innerHTML = '';
                constraintList.innerHTML = '';
                
                if (!currentData || !currentData.input) return;
                
                // 结构列表（包含约束的层次结构）
                currentData.input.structures.forEach(structure => {
                    // 创建结构容器
                    const structureContainer = document.createElement('div');
                    structureContainer.className = 'structure-container';
                    structureContainer.style.marginBottom = '10px';
                    structureContainer.style.border = '1px solid #444';
                    structureContainer.style.borderRadius = '4px';
                    structureContainer.style.padding = '8px';
                    
                    // 创建结构主项
                    const structureItem = document.createElement('div');
                    structureItem.className = 'structure-item';
                    structureItem.style.fontWeight = 'bold';
                    structureItem.style.marginBottom = '5px';
                    
                    const structureCheckbox = document.createElement('input');
                    structureCheckbox.type = 'checkbox';
                    structureCheckbox.className = 'structure-checkbox';
                    structureCheckbox.checked = true;
                    structureCheckbox.addEventListener('change', () => {
                        toggleStructureVisibility(structure.id, structureCheckbox.checked);
                        // 同时切换所有子约束的可见性
                        const constraintCheckboxes = structureContainer.querySelectorAll('.constraint-checkbox');
                        constraintCheckboxes.forEach(cb => {
                            cb.checked = structureCheckbox.checked;
                            const constraintId = cb.getAttribute('data-constraint-id');
                            if (constraintId) {
                                toggleConstraintVisibility(constraintId, structureCheckbox.checked);
                            }
                        });
                    });
                    
                    const structureInfo = document.createElement('div');
                    structureInfo.className = 'structure-info';
                    structureInfo.style.display = 'flex';
                    structureInfo.style.alignItems = 'center';
                    structureInfo.style.flex = '1';
                    
                    const structureLabel = document.createElement('span');
                    
                    // 构建结构标签文本
                    let labelText = '📦 ' + structure.filename + '<span class="structure-count">(' + structure.number + ')</span>';
                    
                    // 如果是单分子且有多球拟合数据，添加球体信息
                    if (structure.number === 1 && structure.visualInfo && 
                        structure.visualInfo.geometry && 
                        structure.visualInfo.geometry.type === 'multi_sphere' &&
                        structure.visualInfo.geometry.spheres) {
                        
                        const sphereCount = structure.visualInfo.geometry.spheres.length;
                        labelText += '<br><span style="font-size: 10px; color: #88c999;">🔮 ' + sphereCount + ' spheres fitted</span>';
                    }
                    
                    structureLabel.innerHTML = labelText;
                    structureLabel.style.flex = '1';
                    
                    // 添加颜色选择器
                    const colorPicker = document.createElement('input');
                    colorPicker.type = 'color';
                    colorPicker.className = 'structure-color-picker';
                    colorPicker.style.width = '20px';
                    colorPicker.style.height = '20px';
                    colorPicker.style.border = 'none';
                    colorPicker.style.borderRadius = '3px';
                    colorPicker.style.cursor = 'pointer';
                    colorPicker.style.marginLeft = '8px';
                    
                    // 设置当前颜色
                    const currentColor = getStructureColor(structure.id);
                    colorPicker.value = '#' + currentColor.toString(16).padStart(6, '0');
                    
                    colorPicker.addEventListener('change', (event) => {
                        const newColor = parseInt(event.target.value.slice(1), 16);
                        setStructureColor(structure.id, newColor);
                    });
                    
                    structureInfo.appendChild(structureLabel);
                    structureInfo.appendChild(colorPicker);
                    
                    structureItem.appendChild(structureCheckbox);
                    structureItem.appendChild(structureInfo);
                    structureContainer.appendChild(structureItem);
                    
                    // 添加多球拟合信息（如果有）
                    if (structure.number === 1 && structure.visualInfo && 
                        structure.visualInfo.geometry && 
                        structure.visualInfo.geometry.type === 'multi_sphere' &&
                        structure.visualInfo.geometry.spheres) {
                        
                        const multisphereInfo = document.createElement('div');
                        multisphereInfo.style.marginLeft = '20px';
                        multisphereInfo.style.borderLeft = '2px solid #88c999';
                        multisphereInfo.style.paddingLeft = '8px';
                        multisphereInfo.style.marginTop = '5px';
                        multisphereInfo.style.marginBottom = '5px';
                        
                        const spheres = structure.visualInfo.geometry.spheres;
                        
                        // 多球拟合总览
                        const multisphereHeader = document.createElement('div');
                        multisphereHeader.style.fontSize = '11px';
                        multisphereHeader.style.color = '#88c999';
                        multisphereHeader.style.fontWeight = 'bold';
                        multisphereHeader.style.marginBottom = '3px';
                        multisphereHeader.textContent = '🔮 Multi-sphere Fitting (' + spheres.length + ' spheres)';
                        multisphereInfo.appendChild(multisphereHeader);
                        
                        // 计算总体积
                        const totalVolume = spheres.reduce((sum, sphere) => 
                            sum + (4/3) * Math.PI * Math.pow(sphere.radius, 3), 0);
                        
                        // 平均半径
                        const avgRadius = spheres.reduce((sum, sphere) => sum + sphere.radius, 0) / spheres.length;
                        
                        // 显示统计信息
                        const statsDiv = document.createElement('div');
                        statsDiv.style.fontSize = '10px';
                        statsDiv.style.color = '#aaa';
                        statsDiv.style.marginBottom = '3px';
                        statsDiv.textContent = 'Volume: ' + totalVolume.toFixed(1) + ' Å³, Avg radius: ' + avgRadius.toFixed(1) + ' Å';
                        multisphereInfo.appendChild(statsDiv);
                        
                        // 显示每个球体（最多显示前5个）
                        const maxDisplaySpheres = Math.min(5, spheres.length);
                        for (let i = 0; i < maxDisplaySpheres; i++) {
                            const sphere = spheres[i];
                            const sphereItem = document.createElement('div');
                            sphereItem.style.fontSize = '9px';
                            sphereItem.style.color = '#999';
                            sphereItem.style.marginLeft = '10px';
                            sphereItem.style.marginBottom = '1px';
                            
                            const centerStr = sphere.center.map(c => c.toFixed(1)).join(', ');
                            sphereItem.textContent = '• Sphere ' + (i + 1) + ': (' + centerStr + ') r=' + sphere.radius.toFixed(1);
                            multisphereInfo.appendChild(sphereItem);
                        }
                        
                        // 如果有更多球体，显示省略信息
                        if (spheres.length > maxDisplaySpheres) {
                            const moreInfo = document.createElement('div');
                            moreInfo.style.fontSize = '9px';
                            moreInfo.style.color = '#777';
                            moreInfo.style.marginLeft = '10px';
                            moreInfo.style.fontStyle = 'italic';
                            moreInfo.textContent = '... and ' + (spheres.length - maxDisplaySpheres) + ' more spheres';
                            multisphereInfo.appendChild(moreInfo);
                        }
                        
                        structureContainer.appendChild(multisphereInfo);
                    }
                    
                    // 添加约束子项
                    if (structure.constraints && structure.constraints.length > 0) {
                        const constraintsSublist = document.createElement('div');
                        constraintsSublist.style.marginLeft = '20px';
                        constraintsSublist.style.borderLeft = '2px solid #666';
                        constraintsSublist.style.paddingLeft = '8px';
                        
                        structure.constraints.forEach((constraint, index) => {
                            const constraintItem = document.createElement('div');
                            constraintItem.className = 'structure-item constraint-item';
                            constraintItem.style.fontSize = '11px';
                            constraintItem.style.color = '#bbb';
                            constraintItem.style.marginBottom = '3px';
                            
                            const constraintCheckbox = document.createElement('input');
                            constraintCheckbox.type = 'checkbox';
                            constraintCheckbox.className = 'structure-checkbox constraint-checkbox';
                            constraintCheckbox.checked = true;
                            const constraintId = structure.id + '_constraint_' + index;
                            constraintCheckbox.setAttribute('data-constraint-id', constraintId);
                            constraintCheckbox.addEventListener('change', () => {
                                toggleConstraintVisibility(constraintId, constraintCheckbox.checked);
                                // 检查是否所有约束都被取消选中，如果是，则取消选中结构
                                const allConstraintCheckboxes = constraintsSublist.querySelectorAll('.constraint-checkbox');
                                const anyChecked = Array.from(allConstraintCheckboxes).some(cb => cb.checked);
                                structureCheckbox.checked = anyChecked;
                                toggleStructureVisibility(structure.id, anyChecked);
                            });
                            
                            const constraintInfo = document.createElement('div');
                            constraintInfo.className = 'structure-info';
                            
                            // 更详细的约束信息
                            let constraintText = \`🔧 \${constraint.type} \${constraint.geometry.type}\`;
                            if (constraint.geometry.parameters) {
                                switch (constraint.geometry.type) {
                                    case 'sphere':
                                        if (constraint.geometry.parameters.length >= 4) {
                                            const [x, y, z, r] = constraint.geometry.parameters;
                                            constraintText += \` (r=\${r.toFixed(1)})\`;
                                        }
                                        break;
                                    case 'box':
                                        if (constraint.geometry.parameters.length >= 6) {
                                            const [x1, y1, z1, x2, y2, z2] = constraint.geometry.parameters;
                                            const w = Math.abs(x2 - x1);
                                            const h = Math.abs(y2 - y1);
                                            const d = Math.abs(z2 - z1);
                                            constraintText += \` (\${w.toFixed(1)}×\${h.toFixed(1)}×\${d.toFixed(1)})\`;
                                        }
                                        break;
                                    case 'cube':
                                        if (constraint.geometry.parameters.length >= 4) {
                                            const d = constraint.geometry.parameters[3];
                                            constraintText += \` (size=\${d.toFixed(1)})\`;
                                        }
                                        break;
                                    case 'cylinder':
                                        if (constraint.geometry.parameters.length >= 7) {
                                            const r = constraint.geometry.parameters[6];
                                            constraintText += \` (r=\${r.toFixed(1)})\`;
                                        }
                                        break;
                                    case 'plane':
                                        if (constraint.geometry.parameters.length >= 4) {
                                            const [a, b, c, d] = constraint.geometry.parameters;
                                            constraintText += \` (\${a.toFixed(1)}x+\${b.toFixed(1)}y+\${c.toFixed(1)}z=\${d.toFixed(1)})\`;
                                        }
                                        break;
                                    case 'ellipsoid':
                                        if (constraint.geometry.parameters.length >= 6) {
                                            const [x, y, z, a, b, c] = constraint.geometry.parameters;
                                            constraintText += \` (a=\${a.toFixed(1)}, b=\${b.toFixed(1)}, c=\${c.toFixed(1)})\`;
                                        }
                                        break;
                                    case 'xygauss':
                                        if (constraint.geometry.parameters.length >= 6) {
                                            const [a1, b1, a2, b2, c, h] = constraint.geometry.parameters;
                                            constraintText += \` (σx=\${a2.toFixed(1)}, σy=\${b2.toFixed(1)}, h=\${h.toFixed(1)})\`;
                                        }
                                        break;
                                }
                            }
                            constraintInfo.textContent = constraintText;
                            
                            constraintItem.appendChild(constraintCheckbox);
                            constraintItem.appendChild(constraintInfo);
                            
                            constraintsSublist.appendChild(constraintItem);
                            
                            // 为表面约束添加大小滑块（放在约束项下方）
                            if (constraint.geometry.type === 'plane' || constraint.geometry.type === 'xygauss') {
                                const sliderContainer = document.createElement('div');
                                sliderContainer.className = 'surface-slider-container';
                                sliderContainer.style.marginLeft = '25px'; // 与约束项对齐
                                sliderContainer.style.marginTop = '3px';
                                sliderContainer.style.marginBottom = '5px';
                                
                                const sliderLabel = document.createElement('span');
                                sliderLabel.textContent = 'Size:';
                                sliderLabel.style.fontSize = '10px';
                                sliderLabel.style.color = '#999';
                                sliderLabel.style.minWidth = '30px';
                                sliderLabel.style.display = 'inline-block';
                                
                                const slider = document.createElement('input');
                                slider.type = 'range';
                                slider.className = 'surface-slider';
                                slider.min = '10';
                                slider.max = '200';
                                slider.step = '2';
                                slider.style.margin = '0 5px';
                                slider.style.width = '105px'; // 限制滑块宽度
                                
                                // 获取当前大小
                                const currentSize = getSurfaceConstraintSize(constraintId);
                                slider.value = currentSize.toString();
                                
                                const valueDisplay = document.createElement('span');
                                valueDisplay.style.fontSize = '10px';
                                valueDisplay.style.color = '#999';
                                valueDisplay.style.minWidth = '25px';
                                valueDisplay.style.display = 'inline-block';
                                valueDisplay.textContent = currentSize.toFixed(0);
                                
                                // 滑块变化事件
                                slider.addEventListener('input', () => {
                                    const newSize = parseFloat(slider.value);
                                    valueDisplay.textContent = newSize.toFixed(0);
                                    setSurfaceConstraintSize(constraintId, newSize);
                                });
                                
                                sliderContainer.appendChild(sliderLabel);
                                sliderContainer.appendChild(slider);
                                sliderContainer.appendChild(valueDisplay);
                                constraintsSublist.appendChild(sliderContainer);
                            }
                        });
                        
                        structureContainer.appendChild(constraintsSublist);
                    }
                    
                    structureList.appendChild(structureContainer);
                });
                
                // 在约束区域显示全局统计信息
                const statsDiv = document.createElement('div');
                statsDiv.style.fontSize = '11px';
                statsDiv.style.color = '#888';
                statsDiv.style.padding = '5px';
                statsDiv.style.borderTop = '1px solid #444';
                
                const totalStructures = currentData.input.structures.length;
                const totalConstraints = currentData.input.structures.reduce((sum, s) => sum + (s.constraints?.length || 0), 0);
                statsDiv.textContent = \`Total: \${totalStructures} structures, \${totalConstraints} constraints\`;
                
                constraintList.appendChild(statsDiv);
            }
            
            // 切换结构可见性
            function toggleStructureVisibility(structureId, visible) {
                const group = structureGroups.get(structureId);
                if (group) {
                    group.visible = visible;
                }
            }
            
            // 切换约束可见性
            function toggleConstraintVisibility(constraintId, visible) {
                const constraintMesh = constraintGroups.get(constraintId);
                if (constraintMesh) {
                    constraintMesh.visible = visible;
                }
            }
            
            // 重置相机
            function resetCamera() {
                camera.position.set(50, 50, 50);
                camera.lookAt(0, 0, 0);
                fitCameraToScene();
            }
            
            // 切换线框模式
            function toggleWireframe() {
                wireframeMode = !wireframeMode;
                structureGroups.forEach(group => {
                    group.traverse(child => {
                        if (child.material) {
                            child.material.wireframe = wireframeMode;
                        }
                    });
                });
                constraintGroups.forEach(group => {
                    if (group.material) {
                        group.material.wireframe = wireframeMode;
                    }
                });
            }
            
            // 随机化颜色
            function randomizeColors() {
                if (!currentData || !currentData.input || !currentData.input.structures) return;
                
                currentData.input.structures.forEach(structure => {
                    // 生成随机颜色
                    const randomColor = Math.floor(Math.random() * 16777215); // 0xFFFFFF
                    setStructureColor(structure.id, randomColor);
                });
                
                // 更新控制面板中的颜色选择器
                updateControlPanel();
            }
            
            // 重置颜色
            function resetColors() {
                if (!window.structureColorMap) return;
                
                // 清除颜色映射
                window.structureColorMap.clear();
                window.structureColorIndex = 0;
                
                if (!currentData || !currentData.input || !currentData.input.structures) return;
                
                // 重新分配默认颜色
                currentData.input.structures.forEach(structure => {
                    const defaultColor = getStructureColor(structure.id);
                    updateStructureColors(structure.id, defaultColor);
                });
                
                // 更新控制面板中的颜色选择器
                updateControlPanel();
            }
            
            // 调整相机适应场景
            function fitCameraToScene() {
                const box = new THREE.Box3();
                scene.traverse(object => {
                    if (object.geometry) {
                        box.expandByObject(object);
                    }
                });
                
                if (!box.isEmpty()) {
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const distance = maxDim * 2;
                    
                    camera.position.set(center.x + distance, center.y + distance, center.z + distance);
                    camera.lookAt(center);
                }
            }
            
            // 获取结构颜色
            function getStructureColor(structureId) {
                const colors = [
                    0xff6b6b,  // 红色
                    0x4ecdc4,  // 青色
                    0x45b7d1,  // 蓝色
                    0x96ceb4,  // 绿色
                    0xffeaa7,  // 黄色
                    0xdda0dd,  // 紫色
                    0x74b9ff,  // 亮蓝色
                    0xfd79a8,  // 粉色
                    0xa29bfe,  // 淡紫色
                    0x6c5ce7   // 深紫色
                ];
                
                // 为每个结构分配一个固定的颜色索引
                if (!window.structureColorMap) {
                    window.structureColorMap = new Map();
                    window.structureColorIndex = 0;
                }
                
                if (!window.structureColorMap.has(structureId)) {
                    window.structureColorMap.set(structureId, colors[window.structureColorIndex % colors.length]);
                    window.structureColorIndex++;
                }
                
                return window.structureColorMap.get(structureId);
            }
            
            // 设置结构颜色
            function setStructureColor(structureId, color) {
                if (!window.structureColorMap) {
                    window.structureColorMap = new Map();
                }
                window.structureColorMap.set(structureId, color);
                
                // 更新现有的结构颜色
                updateStructureColors(structureId, color);
            }
            
            // 更新结构颜色
            function updateStructureColors(structureId, color) {
                const group = structureGroups.get(structureId);
                if (group) {
                    group.traverse(child => {
                        if (child.material && (child.name === structureId || child.name.includes(structureId))) {
                            child.material.color.setHex(color);
                        }
                    });
                }
                
                // 更新约束颜色
                constraintGroups.forEach((constraintGroup, constraintId) => {
                    if (constraintId.startsWith(structureId)) {
                        if (constraintGroup.material) {
                            // 约束使用稍微透明的结构颜色
                            const constraintColor = new THREE.Color(color);
                            constraintColor.multiplyScalar(0.7); // 稍微暗一些
                            constraintGroup.material.color = constraintColor;
                        }
                    }
                });
            }
            
            // 消息处理
            window.addEventListener('message', event => {
                console.log('=== WEBVIEW MESSAGE RECEIVED ===');
                console.log('Message data:', event.data);
                console.log('Three.js ready status:', isThreeJSReady);
                
                const message = event.data;
                
                // 添加视觉确认
                if (message.type === 'update') {
                    console.log('📦 UPDATE message received! Creating alert...');
                    alert('收到 UPDATE 消息！正在处理...');
                }
                
                if (!isThreeJSReady && message.type !== 'ready') {
                    console.log('⚠️ Three.js not ready, ignoring message:', message);
                    alert('Three.js 还未准备好，忽略消息: ' + message.type);
                    return;
                }
                
                switch (message.type) {
                    case 'update':
                        console.log('🎯 Processing update message');
                        try {
                            updateData(message);
                            console.log('✅ Update processing completed');
                        } catch (error) {
                            console.error('❌ Error in updateData:', error);
                            alert('更新数据时出错: ' + error.message);
                        }
                        break;
                    case 'toggleStructure':
                        console.log('🔄 Processing toggleStructure message');
                        toggleStructureVisibility(message.structureId, message.visible);
                        break;
                    case 'resetCamera':
                        console.log('📷 Processing resetCamera message');
                        resetCamera();
                        break;
                    default:
                        console.log('❓ Unknown message type:', message.type);
                }
                
                console.log('=== MESSAGE PROCESSING COMPLETE ===');
            });
            
            // 切换多球显示
            let multisphereVisible = true;
            function toggleMultisphere() {
                multisphereVisible = !multisphereVisible;
                
                structureGroups.forEach(group => {
                    group.traverse(child => {
                        // 切换多球和相关元素的可见性
                        if (child.name && (
                            child.name.includes('_multisphere_') || 
                            child.name.includes('_centroid') ||
                            child.name.includes('bond_')
                        )) {
                            child.visible = multisphereVisible;
                        }
                    });
                });
                
                console.log('Multisphere visibility toggled to:', multisphereVisible);
            }
            
            // 启动初始化
            console.log('🏁 Starting initialization sequence...');
            
            // 立即测试连接
            testVSCodeConnection();
            
            // 检查 DOM 状态并开始初始化
            function startInitialization() {
                console.log('📋 DOM ready, starting Three.js check...');
                // 短暂延迟以确保脚本标签有时间加载
                setTimeout(() => {
                    checkThreeJS();
                }, 100);
            }
            
            // 等待 DOM 加载
            if (document.readyState === 'loading') {
                console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
                document.addEventListener('DOMContentLoaded', startInitialization);
            } else {
                console.log('✅ DOM already loaded');
                startInitialization();
            }
            
            // 备用方案：如果在 5 秒内还没有初始化，强制发送 ready 消息
            setTimeout(() => {
                if (!isThreeJSReady && vscode) {
                    console.log('⚠️ Fallback: Sending ready message after timeout');
                    sendReadyMessage();
                }
            }, 5000);
        </script>
        
        <!-- 在最后添加 Three.js 脚本，确保 DOM 先加载 -->
        <script src="${threeJsUri}" 
                onerror="console.error('❌ Failed to load Three.js from CDN'); document.getElementById('loading').innerHTML = 'Error: Failed to load Three.js';"
                onload="console.log('✅ Three.js script loaded from CDN');">
        </script>
    </body>
    </html>`;
  }
}
