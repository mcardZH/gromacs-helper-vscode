import * as vscode from 'vscode';

export interface ConversionUnit {
    name: string;
    symbol: string;
    toBase: number; // 转换到基本单位的乘数
    category: string;
}

export interface ConversionCategory {
    name: string;
    baseUnit: string;
    units: ConversionUnit[];
}

export class UnitConverter {
    private static readonly CONVERSION_CATEGORIES: ConversionCategory[] = [
        {
            name: '长度 (Length)',
            baseUnit: 'm',
            units: [
                { name: '纳米', symbol: 'nm', toBase: 1e-9, category: 'length' },
                { name: '埃', symbol: 'Å', toBase: 1e-10, category: 'length' },
                { name: '皮米', symbol: 'pm', toBase: 1e-12, category: 'length' },
                { name: '米', symbol: 'm', toBase: 1, category: 'length' },
                { name: '厘米', symbol: 'cm', toBase: 1e-2, category: 'length' },
                { name: '毫米', symbol: 'mm', toBase: 1e-3, category: 'length' }
            ]
        },
        {
            name: '时间 (Time)',
            baseUnit: 's',
            units: [
                { name: '飞秒', symbol: 'fs', toBase: 1e-15, category: 'time' },
                { name: '皮秒', symbol: 'ps', toBase: 1e-12, category: 'time' },
                { name: '纳秒', symbol: 'ns', toBase: 1e-9, category: 'time' },
                { name: '微秒', symbol: 'μs', toBase: 1e-6, category: 'time' },
                { name: '毫秒', symbol: 'ms', toBase: 1e-3, category: 'time' },
                { name: '秒', symbol: 's', toBase: 1, category: 'time' }
            ]
        },
        {
            name: '温度 (Temperature)',
            baseUnit: 'K',
            units: [
                { name: '开尔文', symbol: 'K', toBase: 1, category: 'temperature' },
                { name: '摄氏度', symbol: '°C', toBase: 1, category: 'temperature' } // 特殊处理
            ]
        },
        {
            name: '能量 (Energy)',
            baseUnit: 'J',
            units: [
                { name: '焦耳', symbol: 'J', toBase: 1, category: 'energy' },
                { name: '电子伏特', symbol: 'eV', toBase: 1.602176634e-19, category: 'energy' },
                { name: '卡路里', symbol: 'cal', toBase: 4.184, category: 'energy' },
                { name: '千焦', symbol: 'kJ', toBase: 1000, category: 'energy' },
                { name: '千卡', symbol: 'kcal', toBase: 4184, category: 'energy' }
            ]
        },
        {
            name: '摩尔能量 (Molar Energy)',
            baseUnit: 'J/mol',
            units: [
                { name: '焦耳/摩尔', symbol: 'J/mol', toBase: 1, category: 'molar_energy' },
                { name: '千焦/摩尔', symbol: 'kJ/mol', toBase: 1000, category: 'molar_energy' },
                { name: '千卡/摩尔', symbol: 'kcal/mol', toBase: 4184, category: 'molar_energy' },
                { name: '电子伏特/分子', symbol: 'eV/molecule', toBase: 1.602176634e-19, category: 'molar_energy' }
            ]
        },
        {
            name: '比能量 (Specific Energy)',
            baseUnit: 'J/kg',
            units: [
                { name: '焦耳/千克', symbol: 'J/kg', toBase: 1, category: 'specific_energy' },
                { name: '千焦/千克', symbol: 'kJ/kg', toBase: 1000, category: 'specific_energy' },
                { name: '焦耳/克', symbol: 'J/g', toBase: 1000, category: 'specific_energy' },
                { name: '千卡/千克', symbol: 'kcal/kg', toBase: 4184, category: 'specific_energy' }
            ]
        },
        {
            name: '面积 (Area)',
            baseUnit: 'm²',
            units: [
                { name: '平方纳米', symbol: 'nm²', toBase: 1e-18, category: 'area' },
                { name: '平方埃', symbol: 'Å²', toBase: 1e-20, category: 'area' },
                { name: '平方米', symbol: 'm²', toBase: 1, category: 'area' },
                { name: '平方厘米', symbol: 'cm²', toBase: 1e-4, category: 'area' }
            ]
        },
        {
            name: '电势 (Electric Potential)',
            baseUnit: 'V',
            units: [
                { name: '伏特', symbol: 'V', toBase: 1, category: 'voltage' },
                { name: '毫伏', symbol: 'mV', toBase: 1e-3, category: 'voltage' },
                { name: '千伏', symbol: 'kV', toBase: 1000, category: 'voltage' }
            ]
        }
    ];

    public static convert(value: number, fromUnit: ConversionUnit, toUnit: ConversionUnit, molarMass?: number): number {
        if (fromUnit.category !== toUnit.category) {
            // 检查是否是摩尔能量和比能量之间的转换
            if ((fromUnit.category === 'molar_energy' && toUnit.category === 'specific_energy') ||
                (fromUnit.category === 'specific_energy' && toUnit.category === 'molar_energy')) {
                if (!molarMass || molarMass <= 0) {
                    throw new Error('摩尔能量和比能量转换需要提供摩尔质量 (g/mol)');
                }
                return this.convertBetweenMolarAndSpecific(value, fromUnit, toUnit, molarMass);
            }
            throw new Error('无法在不同类型的单位之间转换');
        }

        // 特殊处理温度转换
        if (fromUnit.category === 'temperature') {
            return this.convertTemperature(value, fromUnit.symbol, toUnit.symbol);
        }

        // 一般单位转换：先转换到基本单位，再转换到目标单位
        const baseValue = value * fromUnit.toBase;
        return baseValue / toUnit.toBase;
    }

    private static convertBetweenMolarAndSpecific(
        value: number, 
        fromUnit: ConversionUnit, 
        toUnit: ConversionUnit, 
        molarMass: number
    ): number {
        // 先转换到基本单位
        let baseValue: number;
        
        if (fromUnit.category === 'molar_energy') {
            // J/mol -> J/kg
            baseValue = (value * fromUnit.toBase) / (molarMass / 1000); // molarMass in g/mol, convert to kg/mol
        } else {
            // J/kg -> J/mol
            baseValue = (value * fromUnit.toBase) * (molarMass / 1000); // molarMass in g/mol, convert to kg/mol
        }
        
        // 再转换到目标单位
        return baseValue / toUnit.toBase;
    }

    private static convertTemperature(value: number, fromSymbol: string, toSymbol: string): number {
        if (fromSymbol === toSymbol) return value;
        
        if (fromSymbol === 'K' && toSymbol === '°C') {
            return value - 273.15;
        } else if (fromSymbol === '°C' && toSymbol === 'K') {
            return value + 273.15;
        }
        
        return value;
    }

    public static getCategories(): ConversionCategory[] {
        return this.CONVERSION_CATEGORIES;
    }

    public static getCategoryByName(categoryName: string): ConversionCategory | undefined {
        return this.CONVERSION_CATEGORIES.find(cat => cat.name === categoryName);
    }

    public static getUnitBySymbol(symbol: string, category: string): ConversionUnit | undefined {
        const cat = this.CONVERSION_CATEGORIES.find(c => c.units.some(u => u.category === category));
        return cat?.units.find(u => u.symbol === symbol && u.category === category);
    }
}

export class UnitConverterPanel {
    public static currentPanel: UnitConverterPanel | undefined;
    
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 如果已经有面板打开，就显示它
        if (UnitConverterPanel.currentPanel) {
            UnitConverterPanel.currentPanel._panel.reveal(column);
            return;
        }

        // 否则创建新面板
        const panel = vscode.window.createWebviewPanel(
            'gromacsUnitConverter',
            'GROMACS 单位转换器',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        UnitConverterPanel.currentPanel = new UnitConverterPanel(panel, extensionUri);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        UnitConverterPanel.currentPanel = new UnitConverterPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // 设置初始HTML内容
        this._update();

        // 监听面板关闭事件
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 处理来自webview的消息
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'convert':
                        this._handleConversion(message);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private _handleConversion(message: any) {
        try {
            const { value, fromCategory, fromUnit, toCategory, toUnit, molarMass } = message;
            
            // 获取类别的实际category字符串
            const fromCat = UnitConverter.getCategoryByName(fromCategory);
            const toCat = UnitConverter.getCategoryByName(toCategory);
            
            if (!fromCat || !toCat) {
                this._panel.webview.postMessage({
                    command: 'conversionResult',
                    error: '无效的单位类别'
                });
                return;
            }

            const fromUnitObj = fromCat.units.find(u => u.symbol === fromUnit);
            const toUnitObj = toCat.units.find(u => u.symbol === toUnit);

            if (!fromUnitObj || !toUnitObj) {
                this._panel.webview.postMessage({
                    command: 'conversionResult',
                    error: '无效的单位'
                });
                return;
            }

            // 检查是否需要摩尔质量
            const needsMolarMass = (fromUnitObj.category === 'molar_energy' && toUnitObj.category === 'specific_energy') ||
                                 (fromUnitObj.category === 'specific_energy' && toUnitObj.category === 'molar_energy');
            
            if (needsMolarMass && (!molarMass || molarMass <= 0)) {
                this._panel.webview.postMessage({
                    command: 'conversionResult',
                    error: '摩尔能量和比能量转换需要提供摩尔质量'
                });
                return;
            }

            const result = UnitConverter.convert(
                parseFloat(value), 
                fromUnitObj, 
                toUnitObj, 
                molarMass ? parseFloat(molarMass) : undefined
            );
            
            this._panel.webview.postMessage({
                command: 'conversionResult',
                result: result,
                fromUnit: fromUnit,
                toUnit: toUnit,
                value: value
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'conversionResult',
                error: error instanceof Error ? error.message : '转换错误'
            });
        }
    }

    public dispose() {
        UnitConverterPanel.currentPanel = undefined;

        // 清理资源
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'GROMACS 单位转换器';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const categories = UnitConverter.getCategories();
        
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GROMACS 单位转换器</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            border-bottom: 2px solid var(--vscode-titleBar-border);
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        .converter-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid var(--vscode-panel-border);
        }
        
        .input-group {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            gap: 10px;
        }
        
        label {
            min-width: 80px;
            font-weight: bold;
        }
        
        input, select {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        input:focus, select:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }
        
        .value-input {
            flex: 1;
            max-width: 200px;
        }
        
        .unit-select {
            min-width: 120px;
        }
        
        .category-select {
            min-width: 160px;
        }
        
        .convert-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 10px 0;
        }
        
        .convert-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .result {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
            border-left: 4px solid var(--vscode-notificationToast-border);
        }
        
        .error {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border-left-color: var(--vscode-inputValidation-errorBorder);
        }
        
        .common-conversions {
            margin-top: 30px;
        }
        
        .conversion-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .conversion-table th,
        .conversion-table td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            text-align: left;
        }
        
        .conversion-table th {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            font-weight: bold;
        }
        
        .quick-convert {
            display: inline-block;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            text-decoration: none;
            margin: 2px;
            cursor: pointer;
            border: 1px solid var(--vscode-button-border);
        }
        
        .quick-convert:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧮 GROMACS 单位转换器</h1>
        
        <div class="converter-section">
            <h3>单位转换</h3>
            
            <div class="input-group">
                <label for="value">数值:</label>
                <input type="number" id="value" class="value-input" placeholder="输入数值" step="any">
            </div>
            
            <div class="input-group">
                <label for="fromCategory">从:</label>
                <select id="fromCategory" class="category-select">
                    <option value="">选择类别</option>
                    ${categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
                </select>
                <select id="fromUnit" class="unit-select">
                    <option value="">选择单位</option>
                </select>
            </div>
            
            <div class="input-group">
                <label for="toCategory">到:</label>
                <select id="toCategory" class="category-select">
                    <option value="">选择类别</option>
                    ${categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
                </select>
                <select id="toUnit" class="unit-select">
                    <option value="">选择单位</option>
                </select>
            </div>
            
            <div class="input-group" id="molarMassGroup" style="display: none;">
                <label for="molarMass">摩尔质量:</label>
                <input type="number" id="molarMass" class="value-input" placeholder="g/mol" step="any" min="0">
                <span style="color: var(--vscode-descriptionForeground); margin-left: 10px;">g/mol</span>
            </div>
            
            <button class="convert-btn" onclick="performConversion()">转换</button>
            
            <div id="result" class="result" style="display: none;"></div>
        </div>
        
        <div class="common-conversions">
            <h3>常用转换参考</h3>
            
            <h4>🔬 分子动力学常用转换</h4>
            <table class="conversion-table">
                <tr>
                    <th>类别</th>
                    <th>常用转换</th>
                    <th>说明</th>
                </tr>
                <tr>
                    <td>长度</td>
                    <td>1 nm = 10 Å</td>
                    <td>蛋白质尺寸常用单位</td>
                </tr>
                <tr>
                    <td>时间</td>
                    <td>1 ns = 1000 ps = 1,000,000 fs</td>
                    <td>模拟时间步长</td>
                </tr>
                <tr>
                    <td>温度</td>
                    <td>25°C = 298.15 K</td>
                    <td>室温</td>
                </tr>
                <tr>
                    <td>能量</td>
                    <td>1 kJ = 1000 J</td>
                    <td>基础能量转换</td>
                </tr>
                <tr>
                    <td>摩尔能量</td>
                    <td>1 kJ/mol ≈ 0.239 kcal/mol</td>
                    <td>结合能、相互作用能</td>
                </tr>
                <tr>
                    <td>比能量</td>
                    <td>需要摩尔质量进行转换</td>
                    <td>每单位质量的能量</td>
                </tr>
                <tr>
                    <td>面积</td>
                    <td>1 nm² = 100 Å²</td>
                    <td>表面积计算</td>
                </tr>
            </table>
            
            <div style="margin-top: 15px;">
                <strong>快速转换:</strong><br>
                <span class="quick-convert" onclick="quickConvert(310.15, 'K', '°C')">体温 K→°C</span>
                <span class="quick-convert" onclick="quickConvert(1, 'nm', 'Å')">1 nm→Å</span>
                <span class="quick-convert" onclick="quickConvert(1, 'ns', 'ps')">1 ns→ps</span>
                <span class="quick-convert" onclick="quickConvert(1, 'kJ/mol', 'kcal/mol')">kJ/mol→kcal/mol</span>
                <span class="quick-convert" onclick="quickConvert(1, 'eV', 'J')">1 eV→J</span>
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background-color: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px;">
                <strong>💡 提示:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>摩尔能量 (kJ/mol) 和比能量 (kJ/kg) 转换需要提供摩尔质量</li>
                    <li>常用分子摩尔质量: 水 18 g/mol, 葡萄糖 180 g/mol, 蛋白质约 110×氨基酸数</li>
                    <li>1 eV ≈ 96.485 kJ/mol (用于电子能级转换)</li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const categories = ${JSON.stringify(categories)};
        
        // 更新单位选项
        function updateUnits(categorySelectId, unitSelectId) {
            const categorySelect = document.getElementById(categorySelectId);
            const unitSelect = document.getElementById(unitSelectId);
            
            categorySelect.addEventListener('change', function() {
                const selectedCategory = this.value;
                unitSelect.innerHTML = '<option value="">选择单位</option>';
                
                if (selectedCategory) {
                    const category = categories.find(cat => cat.name === selectedCategory);
                    if (category) {
                        category.units.forEach(unit => {
                            const option = document.createElement('option');
                            option.value = unit.symbol;
                            option.textContent = unit.name + ' (' + unit.symbol + ')';
                            unitSelect.appendChild(option);
                        });
                    }
                }
                
                // 检查是否需要显示摩尔质量输入
                checkMolarMassVisibility();
            });
        }
        
        // 检查是否需要显示摩尔质量输入
        function checkMolarMassVisibility() {
            const fromCategory = document.getElementById('fromCategory').value;
            const toCategory = document.getElementById('toCategory').value;
            const molarMassGroup = document.getElementById('molarMassGroup');
            
            const needsMolarMass = (fromCategory === '摩尔能量 (Molar Energy)' && toCategory === '比能量 (Specific Energy)') ||
                                 (fromCategory === '比能量 (Specific Energy)' && toCategory === '摩尔能量 (Molar Energy)');
            
            molarMassGroup.style.display = needsMolarMass ? 'flex' : 'none';
        }
        
        updateUnits('fromCategory', 'fromUnit');
        updateUnits('toCategory', 'toUnit');
        
        // 监听目标类别变化
        document.getElementById('toCategory').addEventListener('change', checkMolarMassVisibility);
        document.getElementById('toUnit').addEventListener('change', checkMolarMassVisibility);
        
        // 执行转换
        function performConversion() {
            const value = document.getElementById('value').value;
            const fromCategory = document.getElementById('fromCategory').value;
            const fromUnit = document.getElementById('fromUnit').value;
            const toCategory = document.getElementById('toCategory').value;
            const toUnit = document.getElementById('toUnit').value;
            const molarMass = document.getElementById('molarMass').value;
            
            if (!value || !fromCategory || !fromUnit || !toCategory || !toUnit) {
                showResult('请填写所有字段', true);
                return;
            }
            
            // 检查是否需要摩尔质量
            const needsMolarMass = (fromCategory === '摩尔能量 (Molar Energy)' && toCategory === '比能量 (Specific Energy)') ||
                                 (fromCategory === '比能量 (Specific Energy)' && toCategory === '摩尔能量 (Molar Energy)');
            
            if (needsMolarMass && (!molarMass || parseFloat(molarMass) <= 0)) {
                showResult('请提供有效的摩尔质量 (g/mol)', true);
                return;
            }
            
            vscode.postMessage({
                command: 'convert',
                value: value,
                fromCategory: fromCategory,
                fromUnit: fromUnit,
                toCategory: toCategory,
                toUnit: toUnit,
                molarMass: molarMass || null
            });
        }
        
        // 快速转换
        function quickConvert(value, fromSymbol, toSymbol) {
            // 找到对应的类别
            let category = '';
            for (const cat of categories) {
                if (cat.units.some(u => u.symbol === fromSymbol) && 
                    cat.units.some(u => u.symbol === toSymbol)) {
                    category = cat.name;
                    break;
                }
            }
            
            if (category) {
                document.getElementById('value').value = value;
                document.getElementById('fromCategory').value = category;
                document.getElementById('toCategory').value = category;
                
                // 触发change事件更新单位选项
                document.getElementById('fromCategory').dispatchEvent(new Event('change'));
                document.getElementById('toCategory').dispatchEvent(new Event('change'));
                
                setTimeout(() => {
                    document.getElementById('fromUnit').value = fromSymbol;
                    document.getElementById('toUnit').value = toSymbol;
                    performConversion();
                }, 100);
            }
        }
        
        // 显示结果
        function showResult(message, isError = false) {
            const resultDiv = document.getElementById('result');
            resultDiv.textContent = message;
            resultDiv.className = 'result' + (isError ? ' error' : '');
            resultDiv.style.display = 'block';
        }
        
        // 监听来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'conversionResult':
                    if (message.error) {
                        showResult('错误: ' + message.error, true);
                    } else {
                        const formatted = formatResult(message.result);
                        showResult(
                            message.value + ' ' + message.fromUnit + ' = ' + 
                            formatted + ' ' + message.toUnit
                        );
                    }
                    break;
            }
        });
        
        // 格式化结果
        function formatResult(value) {
            if (Math.abs(value) > 1e6 || Math.abs(value) < 1e-6) {
                return value.toExponential(6);
            } else {
                return parseFloat(value.toPrecision(8)).toString();
            }
        }
        
        // 回车键执行转换
        document.getElementById('value').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performConversion();
            }
        });
    </script>
</body>
</html>`;
    }
}
