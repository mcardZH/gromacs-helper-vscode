import * as vscode from 'vscode';

export class TopFoldingProvider implements vscode.FoldingRangeProvider {
  
  public provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    
    const foldingRanges: vscode.FoldingRange[] = [];
    const lines = document.getText().split('\n');
    
    let currentSectionStart: number | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 检查是否是节区标题
      const sectionMatch = trimmedLine.match(/^\[\s*([^\]]+)\s*\]$/);
      if (sectionMatch) {
        // 如果已经有一个节区在进行中，结束它
        if (currentSectionStart !== null) {
          // 找到上一个非空行作为结束行
          let endLine = i - 1;
          while (endLine > currentSectionStart && lines[endLine].trim() === '') {
            endLine--;
          }
          
          if (endLine > currentSectionStart) {
            foldingRanges.push(new vscode.FoldingRange(
              currentSectionStart,
              endLine,
              vscode.FoldingRangeKind.Region
            ));
          }
        }
        
        // 开始新的节区
        currentSectionStart = i;
      }
    }
    
    // 处理最后一个节区
    if (currentSectionStart !== null) {
      let endLine = lines.length - 1;
      while (endLine > currentSectionStart && lines[endLine].trim() === '') {
        endLine--;
      }
      
      if (endLine > currentSectionStart) {
        foldingRanges.push(new vscode.FoldingRange(
          currentSectionStart,
          endLine,
          vscode.FoldingRangeKind.Region
        ));
      }
    }
    
    // 添加注释块折叠
    this.addCommentFolding(lines, foldingRanges);
    
    // 添加include文件组折叠
    this.addIncludeFolding(lines, foldingRanges);
    
    return foldingRanges;
  }
  
  private addCommentFolding(lines: string[], foldingRanges: vscode.FoldingRange[]): void {
    let commentStart: number | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      
      if (trimmedLine.startsWith(';')) {
        if (commentStart === null) {
          commentStart = i;
        }
      } else if (commentStart !== null) {
        // 注释块结束
        if (i - commentStart > 2) { // 至少3行注释才折叠
          foldingRanges.push(new vscode.FoldingRange(
            commentStart,
            i - 1,
            vscode.FoldingRangeKind.Comment
          ));
        }
        commentStart = null;
      }
    }
    
    // 处理文件末尾的注释块
    if (commentStart !== null && lines.length - commentStart > 2) {
      foldingRanges.push(new vscode.FoldingRange(
        commentStart,
        lines.length - 1,
        vscode.FoldingRangeKind.Comment
      ));
    }
  }
  
  private addIncludeFolding(lines: string[], foldingRanges: vscode.FoldingRange[]): void {
    let includeStart: number | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      
      if (trimmedLine.startsWith('#include')) {
        if (includeStart === null) {
          includeStart = i;
        }
      } else if (includeStart !== null && trimmedLine !== '') {
        // include块结束
        if (i - includeStart > 1) { // 至少2行include才折叠
          foldingRanges.push(new vscode.FoldingRange(
            includeStart,
            i - 1,
            vscode.FoldingRangeKind.Imports
          ));
        }
        includeStart = null;
      }
    }
    
    // 处理文件末尾的include块
    if (includeStart !== null && lines.length - includeStart > 1) {
      foldingRanges.push(new vscode.FoldingRange(
        includeStart,
        lines.length - 1,
        vscode.FoldingRangeKind.Imports
      ));
    }
  }
}
