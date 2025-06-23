import * as vscode from 'vscode';

/**
 * Packmol 符号提供者
 */
export class PackmolSymbolProvider implements vscode.DocumentSymbolProvider {
  
  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    
    const symbols: vscode.DocumentSymbol[] = [];
    const text = document.getText();
    const lines = text.split('\n');
    
    let currentStructure: vscode.DocumentSymbol | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 跳过注释和空行
      if (line.startsWith('#') || line === '') {
        continue;
      }
      
      const tokens = line.split(/\s+/);
      const firstToken = tokens[0].toLowerCase();
      
      if (firstToken === 'structure' && tokens.length > 1) {
        const filename = tokens[1];
        const range = new vscode.Range(i, 0, i, line.length);
        const selectionRange = new vscode.Range(i, 0, i, firstToken.length);
        
        currentStructure = new vscode.DocumentSymbol(
          `Structure: ${filename}`,
          filename,
          vscode.SymbolKind.Class,
          range,
          selectionRange
        );
        
        symbols.push(currentStructure);
      } else if (firstToken === 'end' && tokens.length > 1 && tokens[1].toLowerCase() === 'structure') {
        if (currentStructure) {
          currentStructure.range = new vscode.Range(
            currentStructure.range.start,
            new vscode.Position(i, line.length)
          );
          currentStructure = null;
        }
      } else if (currentStructure) {
        // 在结构块内部的重要命令
        if (firstToken === 'number' && tokens.length > 1) {
          const range = new vscode.Range(i, 0, i, line.length);
          const selectionRange = new vscode.Range(i, 0, i, firstToken.length);
          
          const numberSymbol = new vscode.DocumentSymbol(
            `Number: ${tokens[1]}`,
            tokens[1],
            vscode.SymbolKind.Property,
            range,
            selectionRange
          );
          
          currentStructure.children.push(numberSymbol);
        } else if ((firstToken === 'inside' || firstToken === 'outside') && tokens.length > 2) {
          const geometryType = tokens[1];
          const range = new vscode.Range(i, 0, i, line.length);
          const selectionRange = new vscode.Range(i, 0, i, firstToken.length);
          
          const constraintSymbol = new vscode.DocumentSymbol(
            `${firstToken} ${geometryType}`,
            `${firstToken} ${geometryType}`,
            vscode.SymbolKind.Method,
            range,
            selectionRange
          );
          
          currentStructure.children.push(constraintSymbol);
        } else if (firstToken === 'fixed') {
          const range = new vscode.Range(i, 0, i, line.length);
          const selectionRange = new vscode.Range(i, 0, i, firstToken.length);
          
          const fixedSymbol = new vscode.DocumentSymbol(
            'Fixed position',
            'fixed',
            vscode.SymbolKind.Method,
            range,
            selectionRange
          );
          
          currentStructure.children.push(fixedSymbol);
        } else if (firstToken === 'center') {
          const range = new vscode.Range(i, 0, i, line.length);
          const selectionRange = new vscode.Range(i, 0, i, firstToken.length);
          
          const centerSymbol = new vscode.DocumentSymbol(
            'Center molecule',
            'center',
            vscode.SymbolKind.Method,
            range,
            selectionRange
          );
          
          currentStructure.children.push(centerSymbol);
        }
      } else {
        // 全局命令
        if ((firstToken === 'output' || firstToken === 'tolerance' || firstToken === 'seed') && tokens.length > 1) {
          const range = new vscode.Range(i, 0, i, line.length);
          const selectionRange = new vscode.Range(i, 0, i, firstToken.length);
          
          const globalSymbol = new vscode.DocumentSymbol(
            `${firstToken}: ${tokens[1]}`,
            tokens[1],
            vscode.SymbolKind.Variable,
            range,
            selectionRange
          );
          
          symbols.push(globalSymbol);
        }
      }
    }
    
    return symbols;
  }
}
