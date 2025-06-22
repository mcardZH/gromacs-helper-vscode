import * as vscode from 'vscode';

/**
 * MDP 符号提供者
 * 用于识别 MDP 文件中的符号结构，支持代码折叠功能
 * 
 * 支持的符号模式：
 * - ;;;描述内容 (开始一个可折叠区域)
 * - ;;; (结束可折叠区域)
 */
export class MdpSymbolProvider implements vscode.DocumentSymbolProvider {
  
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    
    const symbols: vscode.DocumentSymbol[] = [];
    const foldingStack: Array<{ symbol: vscode.DocumentSymbol; startLine: number }> = [];
    
    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      const text = line.text.trim();
      
      // 跳过空行
      if (!text) {
        continue;
      }
      
      // 检查是否是折叠区域的开始：;;;描述内容
      const startMatch = text.match(/^;;;(.+)$/);
      if (startMatch) {
        const description = startMatch[1].trim();
        if (description) {
          // 创建文档符号
          const symbol = new vscode.DocumentSymbol(
            description,
            '', // detail
            vscode.SymbolKind.Module, // 使用 Module 类型表示一个区域
            line.range,
            line.range
          );
          
          // 将符号添加到栈中，等待找到对应的结束标记
          foldingStack.push({ symbol, startLine: lineIndex });
        }
        continue;
      }
      
      // 检查是否是折叠区域的结束：;;; (不包含描述内容)
      if (text === ';;;') {
        if (foldingStack.length > 0) {
          const { symbol, startLine } = foldingStack.pop()!;
          
          // 更新符号的范围，从开始行到结束行
          const startPosition = new vscode.Position(startLine, 0);
          const endPosition = new vscode.Position(lineIndex, line.text.length);
          const fullRange = new vscode.Range(startPosition, endPosition);
          
          // 设置符号的选择范围（标题行）和完整范围（包含内容）
          symbol.selectionRange = document.lineAt(startLine).range;
          symbol.range = fullRange;
          
          symbols.push(symbol);
        }
        continue;
      }
    }
    
    // 处理未关闭的折叠区域（到文档末尾）
    while (foldingStack.length > 0) {
      const { symbol, startLine } = foldingStack.pop()!;
      
      const startPosition = new vscode.Position(startLine, 0);
      const endPosition = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
      const fullRange = new vscode.Range(startPosition, endPosition);
      
      symbol.selectionRange = document.lineAt(startLine).range;
      symbol.range = fullRange;
      
      symbols.push(symbol);
    }
    
    return symbols;
  }
}
