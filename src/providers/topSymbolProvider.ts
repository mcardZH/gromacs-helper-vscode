import * as vscode from 'vscode';

export class TopSymbolProvider implements vscode.DocumentSymbolProvider {
  
  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    
    const symbols: vscode.DocumentSymbol[] = [];
    const lines = document.getText().split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 匹配形如 [ xxx ] 的节区标题（注意中间有空格）
      const sectionMatch = trimmedLine.match(/^\[\s*([^\]]+)\s*\]$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1].trim();
        
        // 创建节区符号
        const sectionRange = new vscode.Range(i, 0, i, line.length);
        const sectionSymbol = new vscode.DocumentSymbol(
          sectionName,
          '',
          vscode.SymbolKind.Namespace,
          sectionRange,
          sectionRange
        );
        
        // 查找下一个节区或文件末尾，作为当前节区的结束
        let endLine = lines.length - 1;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine.match(/^\[\s*[^\]]+\s*\]$/)) {
            endLine = j - 1;
            break;
          }
        }
        
        // 更新节区的范围
        sectionSymbol.range = new vscode.Range(i, 0, endLine, lines[endLine]?.length || 0);
        
        // 分析节区内容，添加子符号
        this.parseSection(lines, i + 1, endLine, sectionSymbol);
        
        symbols.push(sectionSymbol);
      }
    }
    
    return symbols;
  }
  
  private parseSection(
    lines: string[], 
    startLine: number, 
    endLine: number, 
    parentSymbol: vscode.DocumentSymbol
  ): void {
    
    for (let i = startLine; i <= endLine; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 跳过注释和空行
      if (trimmedLine.startsWith(';') || trimmedLine === '') {
        continue;
      }
      
      // 检查是否是预处理器指令
      const directiveMatch = trimmedLine.match(/^#(include|define|ifdef|ifndef|endif|else)\b(.*)$/);
      if (directiveMatch) {
        const directiveName = directiveMatch[1];
        const directiveValue = directiveMatch[2].trim();
        
        const directiveRange = new vscode.Range(i, 0, i, line.length);
        const directiveSymbol = new vscode.DocumentSymbol(
          `#${directiveName} ${directiveValue}`,
          'Preprocessor directive',
          vscode.SymbolKind.Constant,
          directiveRange,
          directiveRange
        );
        
        parentSymbol.children.push(directiveSymbol);
        continue;
      }
      
      // 分析不同节区类型的内容
      this.parseLineContent(line, i, parentSymbol);
    }
  }
  
  private parseLineContent(
    line: string, 
    lineNumber: number, 
    parentSymbol: vscode.DocumentSymbol
  ): void {
    
    const trimmedLine = line.trim();
    if (trimmedLine === '' || trimmedLine.startsWith(';')) {
      return;
    }
    
    const sectionName = parentSymbol.name.toLowerCase();
    
    // 根据节区类型解析不同的内容
    switch (sectionName) {
      case 'moleculetype':
        this.parseMoleculeType(line, lineNumber, parentSymbol);
        break;
      case 'atoms':
        this.parseAtoms(line, lineNumber, parentSymbol);
        break;
      case 'bonds':
      case 'angles':
      case 'dihedrals':
      case 'impropers':
        this.parseInteractions(line, lineNumber, parentSymbol, sectionName);
        break;
      case 'system':
        this.parseSystem(line, lineNumber, parentSymbol);
        break;
      case 'molecules':
        this.parseMolecules(line, lineNumber, parentSymbol);
        break;
      default:
        // 对于未知类型的节区，简单解析为通用条目
        this.parseGenericEntry(line, lineNumber, parentSymbol);
        break;
    }
  }
  
  private parseMoleculeType(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 1) {
      const moleculeName = parts[0];
      const nrexcl = parts[1] || '';
      
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        moleculeName,
        `nrexcl: ${nrexcl}`,
        vscode.SymbolKind.Class,
        range,
        range
      );
      
      parentSymbol.children.push(symbol);
    }
  }
  
  private parseAtoms(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5) {
      const atomId = parts[0];
      const atomType = parts[1];
      const residueId = parts[2];
      const residueName = parts[3];
      const atomName = parts[4];
      const charge = parts[5] || '';
      const mass = parts[6] || '';
      
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        `${atomName} (${atomId})`,
        `${residueName}${residueId} ${atomType} q=${charge} m=${mass}`,
        vscode.SymbolKind.Variable,
        range,
        range
      );
      
      parentSymbol.children.push(symbol);
    }
  }
  
  private parseInteractions(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol, type: string): void {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const atomIndices = parts.slice(0, this.getInteractionAtomCount(type)).join('-');
      const funcType = parts[this.getInteractionAtomCount(type)] || '';
      
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        `${atomIndices}`,
        `${type} function: ${funcType}`,
        vscode.SymbolKind.Method,
        range,
        range
      );
      
      parentSymbol.children.push(symbol);
    }
  }
  
  private getInteractionAtomCount(type: string): number {
    switch (type) {
      case 'bonds':
        return 2;
      case 'angles':
        return 3;
      case 'dihedrals':
      case 'impropers':
        return 4;
      default:
        return 2;
    }
  }
  
  private parseSystem(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const systemName = line.trim();
    if (systemName) {
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        systemName,
        'System name',
        vscode.SymbolKind.String,
        range,
        range
      );
      
      parentSymbol.children.push(symbol);
    }
  }
  
  private parseMolecules(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const moleculeName = parts[0];
      const count = parts[1];
      
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        moleculeName,
        `Count: ${count}`,
        vscode.SymbolKind.Object,
        range,
        range
      );
      
      parentSymbol.children.push(symbol);
    }
  }
  
  private parseGenericEntry(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      const parts = trimmedLine.split(/\s+/);
      const firstPart = parts[0];
      const restParts = parts.slice(1).join(' ');
      
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        firstPart,
        restParts,
        vscode.SymbolKind.Property,
        range,
        range
      );
      
      parentSymbol.children.push(symbol);
    }
  }
}
