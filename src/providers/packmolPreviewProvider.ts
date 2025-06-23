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
  
  /**
   * 预览 Packmol 文件
   */
  public async previewPackmolFile(uri: vscode.Uri): Promise<void> {
    try {
      console.log('Starting Packmol preview for:', uri.fsPath);
      
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
  private _updatePreview(): void {
    console.log('🔄 === _updatePreview START ===');
    console.log('View exists:', !!this._view);
    console.log('Current input exists:', !!this._currentInput);
    console.log('Webview ready:', this._isWebviewReady);
    
    if (!this._view || !this._currentInput) {
      console.log('❌ Missing view or input, aborting update');
      return;
    }
    
    const data = {
      type: 'update',
      input: this._currentInput,
      // 不传递结构数据，只传递配置信息
      structureData: {}
    };
    
    console.log('📦 Prepared data for webview:', data);
    console.log('Input structures count:', this._currentInput.structures?.length || 0);
    
    if (this._isWebviewReady) {
      console.log('📤 Sending data to webview immediately');
      try {
        this._view.webview.postMessage(data);
        console.log('✅ Data sent successfully');
      } catch (error) {
        console.error('❌ Error sending data to webview:', error);
        vscode.window.showErrorMessage(`Failed to send data to webview: ${error}`);
      }
    } else {
      console.log('⏳ Webview not ready, storing data for later');
      this._pendingData = data;
      // 强制显示视图以触发初始化
      console.log('📺 Forcing view to show');
      this._view.show?.(true);
    }
    
    console.log('🔄 === _updatePreview END ===');
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
                    console.log('✅ Axes helper added');
                    
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
                        data.input.structures.forEach((structure, index) => {
                            console.log(\`📦 Creating structure \${index}:\`, structure);
                            try {
                                createStructureVisualization(structure);
                                console.log(\`✅ Structure \${index} created successfully\`);
                            } catch (structError) {
                                console.error(\`❌ Error creating structure \${index}:\`, structError);
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
            
            // 创建结构可视化（简化版本，不显示具体原子）
            function createStructureVisualization(structure) {
                console.log('createStructureVisualization called for:', structure);
                
                try {
                    const group = new THREE.Group();
                    group.name = structure.id;
                    console.log('Created group for structure:', structure.id);
                    
                    // 创建一个简单的占位符来表示结构
                    // 根据约束来确定结构的大小和位置
                    let structureGeometry, structurePosition;
                    
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
                        
                        // 为结构本身创建一个小的标记
                        const markerGeometry = new THREE.SphereGeometry(1, 16, 16);
                        const markerMaterial = new THREE.MeshLambertMaterial({ 
                            color: getStructureColor(structure.id),
                            transparent: true,
                            opacity: 0.8
                        });
                        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                        console.log('Created structure marker');
                        
                        // 如果有 center 属性，使用它
                        if (structure.center) {
                            console.log('Using structure center:', structure.center);
                            marker.position.set(structure.center[0], structure.center[1], structure.center[2]);
                        } else {
                            // 否则放在约束的中心
                            const firstConstraint = structure.constraints[0];
                            if (firstConstraint.geometry.type === 'sphere' && firstConstraint.geometry.parameters.length >= 3) {
                                const pos = [
                                    firstConstraint.geometry.parameters[0],
                                    firstConstraint.geometry.parameters[1],
                                    firstConstraint.geometry.parameters[2]
                                ];
                                console.log('Using constraint center:', pos);
                                marker.position.set(pos[0], pos[1], pos[2]);
                            }
                        }
                        
                        group.add(marker);
                        
                    } else {
                        console.log('No constraints found, creating default representation');
                        
                        // 如果没有约束，创建一个默认的表示
                        const defaultGeometry = new THREE.BoxGeometry(3, 3, 3);
                        const defaultMaterial = new THREE.MeshLambertMaterial({ 
                            color: getStructureColor(structure.id),
                            transparent: true,
                            opacity: 0.7,
                            wireframe: true
                        });
                        const defaultMesh = new THREE.Mesh(defaultGeometry, defaultMaterial);
                        
                        if (structure.center) {
                            console.log('Using structure center for default mesh:', structure.center);
                            defaultMesh.position.set(structure.center[0], structure.center[1], structure.center[2]);
                        }
                        
                        group.add(defaultMesh);
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
                        if (geometry.parameters.length >= 7) {
                            const [x1, y1, z1, x2, y2, z2, radius] = geometry.parameters;
                            const height = Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2);
                            console.log(\`Creating cylinder from (\${x1}, \${y1}, \${z1}) to (\${x2}, \${y2}, \${z2}) with radius \${radius}\`);
                            const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, height, 32);
                            cylinderGeometry.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
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
                        if (geometry.parameters.length >= 6) {
                            const [x, y, z, a, b, c] = geometry.parameters;
                            console.log(\`Creating ellipsoid at (\${x}, \${y}, \${z}) with semi-axes (\${a}, \${b}, \${c})\`);
                            
                            // 创建单位球体然后缩放
                            const ellipsoidGeometry = new THREE.SphereGeometry(1, 32, 32);
                            ellipsoidGeometry.scale(a, b, c);
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
                    structureLabel.innerHTML = \`📦 \${structure.filename}<span class="structure-count">(\${structure.number})</span>\`;
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
