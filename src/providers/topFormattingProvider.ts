import * as vscode from 'vscode';

export class TopFormattingProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
  
  public provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    
    return this.provideDocumentRangeFormattingEdits(document, fullRange, options, token);
  }
  
  public provideDocumentRangeFormattingEdits(
    document: vscode.TextDocument,
    range: vscode.Range,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    
    const text = document.getText(range);
    const lines = text.split('\n');
    const formattedLines: string[] = [];
    const edits: vscode.TextEdit[] = [];
    
    let currentSection = '';
    let isInMoleculesSection = false;
    let isInAtomsSection = false;
    let isInBondsSection = false;
    let isInAnglesSection = false;
    let isInDihedralsSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 跳过空行
      if (trimmedLine === '') {
        formattedLines.push(line);
        continue;
      }
      
      // 处理注释行（可能包含列名）
      if (trimmedLine.startsWith(';')) {
        // 检查是否是列名注释行
        if (this.isColumnHeaderComment(trimmedLine, currentSection)) {
          const formattedComment = this.formatColumnHeaderComment(trimmedLine, currentSection, options);
          formattedLines.push(formattedComment);
        } else {
          formattedLines.push(line);
        }
        continue;
      }
      
      // 处理节区标题 [ xxx ]
      const sectionMatch = trimmedLine.match(/^\[\s*([^\]]+)\s*\]$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1].trim();
        currentSection = sectionName.toLowerCase();
        
        // 格式化节区标题：确保格式为 [ section_name ]
        const formattedSection = `[ ${sectionName} ]`;
        formattedLines.push(formattedSection);
        
        // 更新当前节区状态
        isInMoleculesSection = currentSection === 'molecules';
        isInAtomsSection = currentSection === 'atoms';
        isInBondsSection = currentSection === 'bonds';
        isInAnglesSection = currentSection === 'angles';
        isInDihedralsSection = currentSection === 'dihedrals';
        
        continue;
      }
      
      // 根据不同节区进行格式化
      let formattedLine = '';
      
      if (isInMoleculesSection) {
        formattedLine = this.formatMoleculesLine(trimmedLine, options);
      } else if (isInAtomsSection) {
        formattedLine = this.formatAtomsLine(trimmedLine, options);
      } else if (isInBondsSection) {
        formattedLine = this.formatBondsLine(trimmedLine, options);
      } else if (isInAnglesSection) {
        formattedLine = this.formatAnglesLine(trimmedLine, options);
      } else if (isInDihedralsSection) {
        formattedLine = this.formatDihedralsLine(trimmedLine, options);
      } else {
        // 默认格式化：移除多余空格，使用统一的分隔符
        formattedLine = this.formatDefaultLine(trimmedLine, options);
      }
      
      formattedLines.push(formattedLine);
    }
    
    // 创建编辑操作
    const formattedText = formattedLines.join('\n');
    if (formattedText !== text) {
      edits.push(vscode.TextEdit.replace(range, formattedText));
    }
    
    return edits;
  }
  
  private formatMoleculesLine(line: string, options: vscode.FormattingOptions): string {
    // molecules 节区格式: molecule_name  number
    const parts = line.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length >= 2) {
      const moleculeName = parts[0];
      const number = parts[1];
      
      // 对齐格式：分子名称和数量之间用制表符或多个空格分隔
      const separator = options.insertSpaces ? '    ' : '\t';
      return `${moleculeName}${separator}${number}`;
    }
    
    return line;
  }
  
  private formatAtomsLine(line: string, options: vscode.FormattingOptions): string {
    // atoms 节区格式: nr type resnr residue atom cgnr charge mass
    const parts = line.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length >= 6) {
      const separator = options.insertSpaces ? '  ' : '\t';
      
      // 对齐各列
      const nr = parts[0].padEnd(4);
      const type = parts[1].padEnd(8);
      const resnr = parts[2].padEnd(6);
      const residue = parts[3].padEnd(8);
      const atom = parts[4].padEnd(6);
      const cgnr = parts[5].padEnd(4);
      const charge = parts.length > 6 ? parts[6].padEnd(10) : '';
      const mass = parts.length > 7 ? parts[7] : '';
      
      return `${nr}${separator}${type}${separator}${resnr}${separator}${residue}${separator}${atom}${separator}${cgnr}${separator}${charge}${separator}${mass}`.trim();
    }
    
    return line;
  }
  
  private formatBondsLine(line: string, options: vscode.FormattingOptions): string {
    // bonds 节区格式: i j func parameter1 parameter2 ...
    const parts = line.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length >= 3) {
      const separator = options.insertSpaces ? '    ' : '\t';
      
      const i = parts[0].padEnd(6);
      const j = parts[1].padEnd(6);
      const func = parts[2].padEnd(4);
      const parameters = parts.slice(3).join('  ');
      
      return `${i}${separator}${j}${separator}${func}${separator}${parameters}`.trim();
    }
    
    return line;
  }
  
  private formatAnglesLine(line: string, options: vscode.FormattingOptions): string {
    // angles 节区格式: i j k func parameter1 parameter2 ...
    const parts = line.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length >= 4) {
      const separator = options.insertSpaces ? '    ' : '\t';
      
      const i = parts[0].padEnd(6);
      const j = parts[1].padEnd(6);
      const k = parts[2].padEnd(6);
      const func = parts[3].padEnd(4);
      const parameters = parts.slice(4).join('  ');
      
      return `${i}${separator}${j}${separator}${k}${separator}${func}${separator}${parameters}`.trim();
    }
    
    return line;
  }
  
  private formatDihedralsLine(line: string, options: vscode.FormattingOptions): string {
    // dihedrals 节区格式: i j k l func parameter1 parameter2 ...
    const parts = line.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length >= 5) {
      const separator = options.insertSpaces ? '    ' : '\t';
      
      const i = parts[0].padEnd(6);
      const j = parts[1].padEnd(6);
      const k = parts[2].padEnd(6);
      const l = parts[3].padEnd(6);
      const func = parts[4].padEnd(4);
      const parameters = parts.slice(5).join('  ');
      
      return `${i}${separator}${j}${separator}${k}${separator}${l}${separator}${func}${separator}${parameters}`.trim();
    }
    
    return line;
  }
  
  private formatDefaultLine(line: string, options: vscode.FormattingOptions): string {
    // 默认格式化：清理多余空格，使用统一分隔符
    const parts = line.split(/\s+/).filter(part => part.length > 0);
    const separator = options.insertSpaces ? '  ' : '\t';
    
    return parts.join(separator);
  }
  
  private isColumnHeaderComment(line: string, currentSection: string): boolean {
    // 检查是否是列名注释行
    const content = line.substring(1).trim(); // 移除 ';' 字符
    
    // 定义不同节区的常见列名关键词
    const sectionHeaders = {
      'bonds': ['ai', 'aj', 'func', 'b0', 'kb', 'r0', 'k'],
      'angles': ['ai', 'aj', 'ak', 'func', 'th0', 'cth', 'angle', 'k'],
      'dihedrals': ['ai', 'aj', 'ak', 'al', 'func', 'phi0', 'cp', 'mult'],
      'atoms': ['nr', 'type', 'resnr', 'residue', 'atom', 'cgnr', 'charge', 'mass', 'atomtype'],
      'molecules': ['molecule', 'nmol', 'number']
    };
    
    const keywords = sectionHeaders[currentSection as keyof typeof sectionHeaders];
    if (!keywords) {
      return false;
    }
    
    // 检查注释内容是否包含多个列名关键词
    const matchCount = keywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    return matchCount >= 2; // 至少包含2个关键词才认为是列名注释
  }
  
  private formatColumnHeaderComment(line: string, currentSection: string, options: vscode.FormattingOptions): string {
    const content = line.substring(1).trim(); // 移除 ';' 字符
    const parts = content.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length === 0) {
      return line;
    }
    
    const separator = options.insertSpaces ? '  ' : '\t';
    
    // 根据不同节区格式化列名注释
    switch (currentSection) {
      case 'bonds':
        return this.formatBondsHeaderComment(parts, separator);
      case 'angles':
        return this.formatAnglesHeaderComment(parts, separator);
      case 'dihedrals':
        return this.formatDihedralsHeaderComment(parts, separator);
      case 'atoms':
        return this.formatAtomsHeaderComment(parts, separator);
      case 'molecules':
        return this.formatMoleculesHeaderComment(parts, separator);
      default:
        return '; ' + parts.join(separator);
    }
  }
  
  private formatBondsHeaderComment(parts: string[], separator: string): string {
    // bonds 列名格式化
    const formatted = parts.map((part, index) => {
      switch (index) {
        case 0: return part.padEnd(6); // ai
        case 1: return part.padEnd(6); // aj
        case 2: return part.padEnd(4); // func
        default: return part.padEnd(12); // 其他参数
      }
    });
    
    return '; ' + formatted.join(separator).trim();
  }
  
  private formatAnglesHeaderComment(parts: string[], separator: string): string {
    // angles 列名格式化
    const formatted = parts.map((part, index) => {
      switch (index) {
        case 0: return part.padEnd(6); // ai
        case 1: return part.padEnd(6); // aj
        case 2: return part.padEnd(6); // ak
        case 3: return part.padEnd(4); // func
        default: return part.padEnd(12); // 其他参数
      }
    });
    
    return '; ' + formatted.join(separator).trim();
  }
  
  private formatDihedralsHeaderComment(parts: string[], separator: string): string {
    // dihedrals 列名格式化
    const formatted = parts.map((part, index) => {
      switch (index) {
        case 0: return part.padEnd(6); // ai
        case 1: return part.padEnd(6); // aj
        case 2: return part.padEnd(6); // ak
        case 3: return part.padEnd(6); // al
        case 4: return part.padEnd(4); // func
        default: return part.padEnd(12); // 其他参数
      }
    });
    
    return '; ' + formatted.join(separator).trim();
  }
  
  private formatAtomsHeaderComment(parts: string[], separator: string): string {
    // atoms 列名格式化
    const formatted = parts.map((part, index) => {
      switch (index) {
        case 0: return part.padEnd(4);  // nr
        case 1: return part.padEnd(8);  // type
        case 2: return part.padEnd(6);  // resnr
        case 3: return part.padEnd(8);  // residue
        case 4: return part.padEnd(6);  // atom
        case 5: return part.padEnd(4);  // cgnr
        case 6: return part.padEnd(10); // charge
        case 7: return part.padEnd(10); // mass
        default: return part;
      }
    });
    
    return '; ' + formatted.join(separator).trim();
  }
  
  private formatMoleculesHeaderComment(parts: string[], separator: string): string {
    // molecules 列名格式化
    const formatted = parts.map((part, index) => {
      switch (index) {
        case 0: return part.padEnd(15); // molecule
        case 1: return part.padEnd(8);  // number/nmol
        default: return part;
      }
    });
    
    return '; ' + formatted.join(separator).trim();
  }
  
  // 提供文档范围格式化的快捷方法
  public formatTopDocument(document: vscode.TextDocument): string {
    const options: vscode.FormattingOptions = {
      insertSpaces: true,
      tabSize: 4
    };
    
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    
    const edits = this.provideDocumentRangeFormattingEdits(document, fullRange, options, new vscode.CancellationTokenSource().token);
    
    if (Array.isArray(edits) && edits.length > 0) {
      return edits[0].newText;
    }
    
    return document.getText();
  }
}
