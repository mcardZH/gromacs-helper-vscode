import * as vscode from 'vscode';

/**
 * Packmol 折叠提供者
 */
export class PackmolFoldingProvider implements vscode.FoldingRangeProvider {
  
  provideFoldingRanges(
    document: vscode.TextDocument,
    context: vscode.FoldingContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    
    const foldingRanges: vscode.FoldingRange[] = [];
    const text = document.getText();
    const lines = text.split('\n');
    
    let structureStartLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 跳过注释和空行
      if (line.startsWith('#') || line === '') {
        continue;
      }
      
      const tokens = line.split(/\s+/);
      const firstToken = tokens[0].toLowerCase();
      
      if (firstToken === 'structure') {
        structureStartLine = i;
      } else if (firstToken === 'end' && tokens.length > 1 && tokens[1].toLowerCase() === 'structure') {
        if (structureStartLine >= 0) {
          const foldingRange = new vscode.FoldingRange(
            structureStartLine,
            i,
            vscode.FoldingRangeKind.Region
          );
          foldingRanges.push(foldingRange);
          structureStartLine = -1;
        }
      }
    }
    
    return foldingRanges;
  }
}
