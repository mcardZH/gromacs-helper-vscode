import * as vscode from 'vscode';

export class XvgHoverProvider implements vscode.HoverProvider {
    
    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        
        const lineNumber = position.line;
        const lineText = document.lineAt(lineNumber).text;
        
        // 检查是否是注释行
        if (lineText.trim().startsWith('#')) {
            return new vscode.Hover(new vscode.MarkdownString('**Comment line** - General comment or information'));
        }
        
        // 检查是否是元数据行
        if (lineText.trim().startsWith('@')) {
            return this.getMetadataHover(lineText);
        }
        
        // 检查是否是数据行
        const dataMatch = lineText.match(/^\s*([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)/);
        if (dataMatch) {
            return this.getDataPointHover(dataMatch[1], dataMatch[2]);
        }
        
        return null;
    }
    
    private getMetadataHover(lineText: string): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        
        if (lineText.includes('title')) {
            markdown.appendMarkdown('### XVG Title\n\n');
            markdown.appendMarkdown('Sets the title of the plot displayed in the chart viewer.');
        } else if (lineText.includes('xaxis')) {
            markdown.appendMarkdown('### X-Axis Label\n\n');
            markdown.appendMarkdown('Defines the label for the X-axis of the plot.');
        } else if (lineText.includes('yaxis')) {
            markdown.appendMarkdown('### Y-Axis Label\n\n');
            markdown.appendMarkdown('Defines the label for the Y-axis of the plot.');
        } else if (lineText.includes('legend')) {
            markdown.appendMarkdown('### Legend\n\n');
            markdown.appendMarkdown('Defines legend properties for data series visualization.');
        } else if (lineText.includes('TYPE')) {
            markdown.appendMarkdown('### Plot Type\n\n');
            markdown.appendMarkdown('Specifies the type of plot (xy, bar, etc.).');
        } else {
            markdown.appendMarkdown('### XVG Metadata\n\n');
            markdown.appendMarkdown('Grace/Xmgr plot formatting directive.');
        }
        
        return new vscode.Hover(markdown);
    }
    
    private getDataPointHover(xValue: string, yValue: string): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        
        markdown.appendMarkdown('### Data Point\n\n');
        markdown.appendMarkdown(`**X Value:** \`${xValue}\`\n\n`);
        markdown.appendMarkdown(`**Y Value:** \`${yValue}\`\n\n`);
        markdown.appendMarkdown('Click the chart icon in the title bar to preview this data as a plot.');
        
        return new vscode.Hover(markdown);
    }
}
