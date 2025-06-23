import * as vscode from 'vscode';
import * as path from 'path';

interface XvgData {
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    series: {
        name: string;
        data: { x: number; y: number }[];
    }[];
}

export class XvgPreviewProvider {
    private static readonly viewType = 'xvgPreview';
    private panels = new Map<string, vscode.WebviewPanel>();

    constructor(private context: vscode.ExtensionContext) {}

    public async previewXvg(uri: vscode.Uri) {
        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        
        // 检查是否已经有这个文件的预览窗口
        const existingPanel = this.panels.get(filePath);
        if (existingPanel) {
            existingPanel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        // 创建新的预览窗口
        const panel = vscode.window.createWebviewPanel(
            XvgPreviewProvider.viewType,
            `XVG Preview: ${fileName}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'resources'))
                ]
            }
        );

        this.panels.set(filePath, panel);

        // 当面板关闭时清理
        panel.onDidDispose(() => {
            this.panels.delete(filePath);
        });

        try {
            const xvgData = await this.parseXvgFile(uri);
            panel.webview.html = this.getWebviewContent(xvgData, fileName);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to parse XVG file: ${error}`);
            panel.dispose();
        }
    }

    private async parseXvgFile(uri: vscode.Uri): Promise<XvgData> {
        const document = await vscode.workspace.openTextDocument(uri);
        const lines = document.getText().split('\n');
        
        const result: XvgData = {
            series: []
        };
        
        const seriesMap = new Map<number, string>();
        let maxColumns = 0;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // 跳过空行
            if (!trimmedLine) {
                continue;
            }
            
            // 解析元数据
            if (trimmedLine.startsWith('@')) {
                if (trimmedLine.includes('title')) {
                    const match = trimmedLine.match(/@\s*title\s+"([^"]+)"/);
                    if (match) {
                        result.title = match[1];
                    }
                } else if (trimmedLine.includes('xaxis') && trimmedLine.includes('label')) {
                    const match = trimmedLine.match(/@\s*xaxis\s+label\s+"([^"]+)"/);
                    if (match) {
                        result.xAxisLabel = match[1];
                    }
                } else if (trimmedLine.includes('yaxis') && trimmedLine.includes('label')) {
                    const match = trimmedLine.match(/@\s*yaxis\s+label\s+"([^"]+)"/);
                    if (match) {
                        result.yAxisLabel = match[1];
                    }
                } else if (trimmedLine.includes('legend')) {
                    const match = trimmedLine.match(/@\s*s(\d+)\s+legend\s+"([^"]+)"/);
                    if (match) {
                        const seriesIndex = parseInt(match[1]);
                        const seriesName = match[2];
                        seriesMap.set(seriesIndex, seriesName);
                    }
                }
                continue;
            }
            
            // 跳过注释行
            if (trimmedLine.startsWith('#')) {
                continue;
            }
            
            // 解析数据行 - 支持多列Y值
            const values = trimmedLine.split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
            if (values.length >= 2) {
                const x = values[0];
                maxColumns = Math.max(maxColumns, values.length);
                
                // 为每个Y列创建数据点
                for (let i = 1; i < values.length; i++) {
                    const y = values[i];
                    const seriesIndex = i - 1;
                    
                    // 确保有足够的series
                    while (result.series.length <= seriesIndex) {
                        const seriesName = seriesMap.get(result.series.length) || 
                                         `Series ${result.series.length + 1}`;
                        result.series.push({ name: seriesName, data: [] });
                    }
                    
                    result.series[seriesIndex].data.push({ x, y });
                }
            }
        }
        
        // 更新系列名称
        result.series.forEach((series, index) => {
            if (seriesMap.has(index)) {
                series.name = seriesMap.get(index)!;
            }
        });
        
        // 如果没有数据，创建一个空系列
        if (result.series.length === 0) {
            result.series.push({ name: 'No Data', data: [] });
        }
        
        return result;
    }

    private getWebviewContent(data: XvgData, fileName: string): string {
        const chartData = {
            title: data.title || fileName,
            xAxisLabel: data.xAxisLabel || 'X',
            yAxisLabel: data.yAxisLabel || 'Y',
            series: data.series.filter(s => s.data.length > 0)
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XVG Preview</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <style>
        :root {
            --primary-color: var(--vscode-textLink-foreground, #007acc);
            --text-color: var(--vscode-editor-foreground, #cccccc);
            --bg-color: var(--vscode-editor-background, #1e1e1e);
            --border-color: var(--vscode-panel-border, #2d2d30);
            --button-bg: var(--vscode-button-background, #0e639c);
            --button-hover: var(--vscode-button-hoverBackground, #1177bb);
            --input-bg: var(--vscode-input-background, #3c3c3c);
            --card-bg: var(--vscode-sideBar-background, #252526);
        }
        
        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
            margin: 0;
            padding: 20px;
            background-color: var(--bg-color);
            color: var(--text-color);
            font-size: var(--vscode-font-size, 13px);
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            margin-bottom: 20px;
            text-align: center;
        }
        
        .controls {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
        }
        
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
            min-width: 120px;
        }
        
        .control-group label {
            font-size: 11px;
            font-weight: bold;
            color: var(--text-color);
            opacity: 0.8;
        }
        
        .control-group input, .control-group select {
            padding: 4px 8px;
            background-color: var(--input-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            color: var(--text-color);
            font-size: 12px;
        }
        
        .control-group input:focus, .control-group select:focus {
            outline: 1px solid var(--primary-color);
            border-color: var(--primary-color);
        }
        
        .button-group {
            display: flex;
            gap: 10px;
            align-items: end;
        }
        
        .btn {
            padding: 6px 12px;
            background-color: var(--button-bg);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }
        
        .btn:hover {
            background-color: var(--button-hover);
        }
        
        .chart-container {
            position: relative;
            height: 600px;
            background-color: var(--bg-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .stat-card {
            background-color: var(--card-bg);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        
        .stat-title {
            font-weight: bold;
            color: var(--primary-color);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .stat-value {
            font-size: 1.1em;
            color: var(--text-color);
            line-height: 1.4;
        }
        
        .series-color {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        h1 {
            color: var(--primary-color);
            margin-bottom: 10px;
            font-size: 1.8em;
        }
        
        .file-info {
            color: var(--text-color);
            opacity: 0.7;
            margin-bottom: 20px;
            font-size: 0.9em;
        }
        
        .series-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
        }
        
        .series-control {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 10px;
            background-color: var(--input-bg);
            border-radius: 4px;
            font-size: 11px;
        }
        
        .color-picker {
            width: 20px;
            height: 20px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        
        .line-width-input {
            width: 50px;
        }
        
        .toggle-btn {
            padding: 2px 6px;
            font-size: 10px;
            background-color: var(--button-bg);
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        
        .toggle-btn.inactive {
            background-color: var(--border-color);
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${chartData.title}</h1>
            <div class="file-info">Source: ${fileName} | Data series: ${chartData.series.length}</div>
        </div>
        
        <div class="controls">
            <div class="control-group">
                <label>Chart Type</label>
                <select id="chartType">
                    <option value="line">Line Chart</option>
                    <option value="scatter">Scatter Plot</option>
                    <option value="bar">Bar Chart</option>
                </select>
            </div>
            
            <div class="control-group">
                <label>X Min</label>
                <input type="number" id="xMin" placeholder="Auto">
            </div>
            
            <div class="control-group">
                <label>X Max</label>
                <input type="number" id="xMax" placeholder="Auto">
            </div>
            
            <div class="control-group">
                <label>Y Min</label>
                <input type="number" id="yMin" placeholder="Auto">
            </div>
            
            <div class="control-group">
                <label>Y Max</label>
                <input type="number" id="yMax" placeholder="Auto">
            </div>
            
            <div class="control-group">
                <label>Point Size</label>
                <input type="range" id="pointSize" min="0" max="10" value="3" step="1">
            </div>
            
            <div class="button-group">
                <button class="btn" onclick="resetZoom()">Reset Zoom</button>
                <button class="btn" onclick="exportChart()">Export PNG</button>
                <button class="btn" onclick="exportData()">Export Data</button>
            </div>
        </div>
        
        <div class="chart-container">
            <canvas id="xvgChart"></canvas>
        </div>
        
        <div class="stats" id="statsContainer">
            <!-- Stats will be populated by JavaScript -->
        </div>
    </div>

    <script>
        const data = ${JSON.stringify(chartData)};
        let chart;
        
        // 主题适配的颜色生成
        const isDarkTheme = getComputedStyle(document.documentElement)
            .getPropertyValue('--vscode-editor-background').includes('#') ? 
            getComputedStyle(document.documentElement)
                .getPropertyValue('--vscode-editor-background').toLowerCase().includes('1') ||
            getComputedStyle(document.documentElement)
                .getPropertyValue('--vscode-editor-background').toLowerCase().includes('2') ||
            getComputedStyle(document.documentElement)
                .getPropertyValue('--vscode-editor-background').toLowerCase().includes('0') : true;
        
        const colorPalette = isDarkTheme ? [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FCEAA8',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ] : [
            '#E74C3C', '#2ECC71', '#3498DB', '#F39C12', '#9B59B6',
            '#E67E22', '#1ABC9C', '#34495E', '#E91E63', '#FF5722'
        ];
        
        // 获取点大小，支持0值
        function getPointSize() {
            const pointSizeElement = document.getElementById('pointSize');
            if (!pointSizeElement) return 3;
            const value = parseInt(pointSizeElement.value);
            return isNaN(value) ? 3 : value;
        }
        
        // 生成图表数据
        function generateChartData() {
            return data.series.map((series, index) => ({
                label: series.name,
                data: series.data,
                borderColor: colorPalette[index % colorPalette.length],
                backgroundColor: colorPalette[index % colorPalette.length] + '20',
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointRadius: getPointSize(),
                pointHoverRadius: getPointSize() + 2,
                hidden: false
            }));
        }
        
        // 获取图表配置
        function getChartConfig() {
            const textColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--text-color') || '#cccccc';
            const borderColor = getComputedStyle(document.documentElement)
                .getPropertyValue('--border-color') || '#2d2d30';
                
            return {
                type: document.getElementById('chartType').value || 'line',
                data: {
                    datasets: generateChartData()
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: data.title,
                            color: textColor,
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            display: data.series.length > 1,
                            labels: {
                                color: textColor,
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: isDarkTheme ? '#2d2d30' : '#ffffff',
                            titleColor: textColor,
                            bodyColor: textColor,
                            borderColor: borderColor,
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            display: true,
                            title: {
                                display: true,
                                text: data.xAxisLabel,
                                color: textColor,
                                font: { size: 14, weight: 'bold' }
                            },
                            ticks: { color: textColor },
                            grid: { color: borderColor + '80' },
                            min: parseFloat(document.getElementById('xMin').value) || undefined,
                            max: parseFloat(document.getElementById('xMax').value) || undefined
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: data.yAxisLabel,
                                color: textColor,
                                font: { size: 14, weight: 'bold' }
                            },
                            ticks: { color: textColor },
                            grid: { color: borderColor + '80' },
                            min: parseFloat(document.getElementById('yMin').value) || undefined,
                            max: parseFloat(document.getElementById('yMax').value) || undefined
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    hover: {
                        mode: 'nearest',
                        intersect: false
                    },
                    elements: {
                        point: {
                            hoverRadius: Math.max(getPointSize() + 3, 5)
                        }
                    }
                }
            };
        }
        
        // 初始化图表
        function initChart() {
            const ctx = document.getElementById('xvgChart').getContext('2d');
            if (chart) {
                chart.destroy();
            }
            chart = new Chart(ctx, getChartConfig());
        }
        
        // 更新图表
        function updateChart() {
            if (chart) {
                chart.destroy();
            }
            initChart();
        }
        
        // 重置缩放
        function resetZoom() {
            document.getElementById('xMin').value = '';
            document.getElementById('xMax').value = '';
            document.getElementById('yMin').value = '';
            document.getElementById('yMax').value = '';
            updateChart();
        }
        
        // 导出图表为PNG
        function exportChart() {
            const canvas = document.getElementById('xvgChart');
            const link = document.createElement('a');
            link.download = data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
        
        // 导出数据为CSV
        function exportData() {
            let csv = 'X';
            data.series.forEach(series => {
                csv += ',' + series.name;
            });
            csv += '\\n';
            
            const maxLength = Math.max(...data.series.map(s => s.data.length));
            for (let i = 0; i < maxLength; i++) {
                const xValue = data.series[0].data[i]?.x || '';
                csv += xValue;
                data.series.forEach(series => {
                    const yValue = series.data[i]?.y || '';
                    csv += ',' + yValue;
                });
                csv += '\\n';
            }
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const link = document.createElement('a');
            link.download = data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.csv';
            link.href = URL.createObjectURL(blob);
            link.click();
        }
        
        // 生成统计信息和系列控制
        function generateStats() {
            const statsContainer = document.getElementById('statsContainer');
            
            data.series.forEach((series, index) => {
                if (series.data.length === 0) return;
                
                const xValues = series.data.map(d => d.x);
                const yValues = series.data.map(d => d.y);
                
                const minX = Math.min(...xValues);
                const maxX = Math.max(...xValues);
                const minY = Math.min(...yValues);
                const maxY = Math.max(...yValues);
                const avgY = yValues.reduce((a, b) => a + b, 0) / yValues.length;
                const stdY = Math.sqrt(yValues.reduce((sq, n) => sq + Math.pow(n - avgY, 2), 0) / yValues.length);
                
                const seriesStats = document.createElement('div');
                seriesStats.className = 'stat-card';
                seriesStats.innerHTML = \`
                    <div class="stat-title">
                        <div class="series-color" style="background-color: \${colorPalette[index % colorPalette.length]}"></div>
                        \${series.name}
                    </div>
                    <div class="stat-value">
                        <strong>Data Points:</strong> \${series.data.length}<br>
                        <strong>X Range:</strong> \${minX.toExponential(3)} → \${maxX.toExponential(3)}<br>
                        <strong>Y Range:</strong> \${minY.toExponential(3)} → \${maxY.toExponential(3)}<br>
                        <strong>Y Average:</strong> \${avgY.toExponential(3)}<br>
                        <strong>Y Std Dev:</strong> \${stdY.toExponential(3)}
                    </div>
                    <div class="series-controls">
                        <div class="series-control">
                            <input type="color" class="color-picker" value="\${colorPalette[index % colorPalette.length]}" 
                                   onchange="updateSeriesColor(\${index}, this.value)">
                            <span>Color</span>
                        </div>
                        <div class="series-control">
                            <input type="number" class="line-width-input" value="2" min="1" max="10" 
                                   onchange="updateSeriesWidth(\${index}, this.value)">
                            <span>Width</span>
                        </div>
                        <button class="toggle-btn" onclick="toggleSeries(\${index}, this)">Hide</button>
                    </div>
                \`;
                statsContainer.appendChild(seriesStats);
            });
        }
        
        // 更新系列颜色
        function updateSeriesColor(index, color) {
            if (chart && chart.data.datasets[index]) {
                chart.data.datasets[index].borderColor = color;
                chart.data.datasets[index].backgroundColor = color + '20';
                chart.update();
            }
        }
        
        // 更新系列线宽
        function updateSeriesWidth(index, width) {
            if (chart && chart.data.datasets[index]) {
                chart.data.datasets[index].borderWidth = parseInt(width);
                chart.update();
            }
        }
        
        // 切换系列显示/隐藏
        function toggleSeries(index, button) {
            if (chart && chart.data.datasets[index]) {
                const isHidden = chart.getDatasetMeta(index).hidden;
                chart.getDatasetMeta(index).hidden = !isHidden;
                chart.update();
                
                button.textContent = isHidden ? 'Hide' : 'Show';
                button.classList.toggle('inactive', !isHidden);
            }
        }
        
        // 事件监听
        document.getElementById('chartType').addEventListener('change', updateChart);
        document.getElementById('xMin').addEventListener('change', updateChart);
        document.getElementById('xMax').addEventListener('change', updateChart);
        document.getElementById('yMin').addEventListener('change', updateChart);
        document.getElementById('yMax').addEventListener('change', updateChart);
        document.getElementById('pointSize').addEventListener('input', updateChart);
        
        // 初始化
        initChart();
        generateStats();
    </script>
</body>
</html>`;
    }
}
