import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Packmol 文档格式化提供者
 */
export class PackmolFormattingProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
  
  constructor() {
    
  }

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
    const edits: vscode.TextEdit[] = [];
    let structureDepth = 0;
    let atomsDepth = 0;
    
    // 第一阶段：收集所有行信息
    const lineInfos: Array<{
      lineIndex: number;
      line: vscode.TextLine;
      keyword?: string;
      depth: number;
      isStructureBlock: boolean;
      isAtomsBlock: boolean;
      isConstraintLine: boolean;
    }> = [];
    
    for (let i = range.start.line; i <= range.end.line; i++) {
      const line = document.lineAt(i);
      const trimmedLine = line.text.trim();
      
      // 跳过空行和注释行
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        lineInfos.push({
          lineIndex: i,
          line,
          depth: structureDepth + atomsDepth,
          isStructureBlock: false,
          isAtomsBlock: false,
          isConstraintLine: false
        });
        continue;
      }
      
      const tokens = trimmedLine.split(/\s+/);
      const firstToken = tokens[0].toLowerCase();
      
      // 检查是否是 structure 开始
      if (firstToken === 'structure') {
        lineInfos.push({
          lineIndex: i,
          line,
          keyword: firstToken,
          depth: structureDepth,
          isStructureBlock: true,
          isAtomsBlock: false,
          isConstraintLine: false
        });
        structureDepth++;
        continue;
      }
      
      // 检查是否是 atoms 开始
      if (firstToken === 'atoms') {
        lineInfos.push({
          lineIndex: i,
          line,
          keyword: firstToken,
          depth: structureDepth + atomsDepth,
          isStructureBlock: false,
          isAtomsBlock: true,
          isConstraintLine: false
        });
        atomsDepth++;
        continue;
      }
      
      // 检查是否是 end structure
      if (firstToken === 'end' && tokens.length > 1 && tokens[1].toLowerCase() === 'structure') {
        structureDepth = Math.max(0, structureDepth - 1);
        lineInfos.push({
          lineIndex: i,
          line,
          keyword: 'end structure',
          depth: structureDepth,
          isStructureBlock: true,
          isAtomsBlock: false,
          isConstraintLine: false
        });
        continue;
      }

      // 检查是否是 end atoms
      if (firstToken === 'end' && tokens.length > 1 && tokens[1].toLowerCase() === 'atoms') {
        atomsDepth = Math.max(0, atomsDepth - 1);
        lineInfos.push({
          lineIndex: i,
          line,
          keyword: 'end atoms',
          depth: structureDepth + atomsDepth,
          isStructureBlock: false,
          isAtomsBlock: true,
          isConstraintLine: false
        });
        continue;
      }
      
      // 识别关键字、命令和约束
      const keyword = this.identifyKeyword(firstToken);
      const isConstraintLine = this.isConstraintKeyword(firstToken);
      
      if (keyword) {
        lineInfos.push({
          lineIndex: i,
          line,
          keyword: firstToken,
          depth: structureDepth + atomsDepth,
          isStructureBlock: false,
          isAtomsBlock: false,
          isConstraintLine
        });
      } else {
        lineInfos.push({
          lineIndex: i,
          line,
          depth: structureDepth + atomsDepth,
          isStructureBlock: false,
          isAtomsBlock: false,
          isConstraintLine: false
        });
      }
    }
    
    // 第二阶段：格式化所有行
    for (const lineInfo of lineInfos) {
      const originalText = lineInfo.line.text;
      const formattedText = this.formatLine(
        originalText,
        options,
        lineInfo.depth,
        lineInfo.keyword,
        lineInfo.isStructureBlock,
        lineInfo.isAtomsBlock,
        lineInfo.isConstraintLine
      );
      
      if (originalText !== formattedText) {
        edits.push(vscode.TextEdit.replace(lineInfo.line.range, formattedText));
      }
    }
    
    return edits;
  }
  
  private formatLine(
    line: string,
    options: vscode.FormattingOptions,
    depth: number,
    keyword?: string,
    isStructureBlock: boolean = false,
    isAtomsBlock: boolean = false,
    isConstraintLine: boolean = false
  ): string {
    const trimmedLine = line.trim();
    
    // 保留空行
    if (trimmedLine === '') {
      return '';
    }
    
    // 处理注释行
    if (trimmedLine.startsWith('#')) {
      return this.formatCommentLine(trimmedLine, depth, options);
    }
    
    // 计算缩进
    const indent = this.getIndent(depth, options);
    
    // 处理 structure 块
    if (isStructureBlock) {
      return this.formatStructureLine(trimmedLine, indent, options);
    }
    
    // 处理 atoms 块
    if (isAtomsBlock) {
      return this.formatAtomsLine(trimmedLine, indent, options);
    }
    
    // 处理约束行
    if (isConstraintLine) {
      return this.formatConstraintLine(trimmedLine, indent, options);
    }
    
    // 处理普通关键字行
    if (keyword) {
      return this.formatKeywordLine(trimmedLine, indent, options);
    }
    
    // 其他行保持原样但调整缩进
    return `${indent}${trimmedLine}`;
  }
  
  private formatCommentLine(line: string, depth: number, options: vscode.FormattingOptions): string {
    const indent = this.getIndent(depth, options);
    const commentContent = line.substring(1).trim();
    return commentContent ? `${indent}# ${commentContent}` : `${indent}#`;
  }
  
  private formatStructureLine(line: string, indent: string, options: vscode.FormattingOptions): string {
    const tokens = line.split(/\s+/);
    
    if (tokens[0].toLowerCase() === 'structure' && tokens.length > 1) {
      // structure filename.pdb
      const keyword = tokens[0];
      const filename = tokens.slice(1).join(' ');
      return `${indent}${keyword} ${filename}`;
    }
    
    if (tokens[0].toLowerCase() === 'end' && tokens.length > 1) {
      // end structure
      if (tokens[1].toLowerCase() === 'structure') {
        return `${indent}${tokens[0]} ${tokens[1]}`;
      }
    }
    
    return `${indent}${line}`;
  }
  
  private formatAtomsLine(line: string, indent: string, options: vscode.FormattingOptions): string {
    const tokens = line.split(/\s+/);
    
    if (tokens[0].toLowerCase() === 'atoms' && tokens.length > 1) {
      // atoms 37
      const keyword = tokens[0];
      const args = tokens.slice(1).join(' ');
      return `${indent}${keyword} ${args}`;
    }
    
    if (tokens[0].toLowerCase() === 'end' && tokens.length > 1) {
      // end atoms
      if (tokens[1].toLowerCase() === 'atoms') {
        return `${indent}${tokens[0]} ${tokens[1]}`;
      }
    }
    
    return `${indent}${line}`;
  }
  
  private formatConstraintLine(line: string, indent: string, options: vscode.FormattingOptions): string {
    const tokens = line.split(/\s+/);
    const keyword = tokens[0];
    const args = tokens.slice(1);
    
    if (args.length === 0) {
      return `${indent}${keyword}`;
    }
    
    // 对于几何约束，特殊处理坐标参数
    if (this.isGeometryConstraint(keyword.toLowerCase())) {
      return this.formatGeometryConstraint(keyword, args, indent);
    }
    
    // 对于其他约束，简单的单个空格分隔
    return `${indent}${keyword} ${args.join(' ')}`;
  }
  
  private formatKeywordLine(line: string, indent: string, options: vscode.FormattingOptions): string {
    const tokens = line.split(/\s+/);
    const keyword = tokens[0];
    const args = tokens.slice(1);
    
    if (args.length === 0) {
      return `${indent}${keyword}`;
    }
    
    // 简单的单个空格分隔
    return `${indent}${keyword} ${args.join(' ')}`;
  }
  
  private formatGeometryConstraint(keyword: string, args: string[], indent: string): string {
    // 对于需要坐标的几何约束，格式化数值参数
    if (['sphere', 'box', 'cube', 'cylinder', 'ellipsoid'].includes(keyword.toLowerCase())) {
      const formattedArgs = args.map(arg => {
        // 如果是数字，保持适当的精度
        if (/^-?\d+\.?\d*([eE][+-]?\d+)?$/.test(arg)) {
          const num = parseFloat(arg);
          if (Number.isInteger(num)) {
            return num.toString();
          } else {
            return num.toFixed(3).replace(/\.?0+$/, '');
          }
        }
        return arg;
      });
      return `${indent}${keyword} ${formattedArgs.join(' ')}`;
    }
    
    return `${indent}${keyword} ${args.join(' ')}`;
  }
  
  private getIndent(depth: number, options: vscode.FormattingOptions): string {
    const tabSize = options.tabSize || 2;
    const useSpaces = options.insertSpaces !== false;
    const indentUnit = useSpaces ? ' '.repeat(tabSize) : '\t';
    return indentUnit.repeat(depth);
  }
  
  private identifyKeyword(token: string): string | undefined {
    const keywords = [
      'tolerance', 'seed', 'output', 'filetype', 'nloop', 'maxtry',
      'writeout', 'writebad', 'check', 'sidemax', 'randominitialpoint',
      'avoid_overlap', 'discale', 'restart_to', 'restart_from', 'add_box_sides',
      'pbc', 'fscale', 'short_radius', 'short_radius_scale', 'add_amber_ter',
      'add_to_list', 'comment', 'structure', 'end', 'number', 'center', 'fixed',
      'centerofmass', 'changechains', 'resnumbers', 'chain', 'segid'
    ];
    
    const constraints = [
      'atoms', 'radius', 'fscale', 'short_radius', 'short_radius_scale',
      'over', 'below', 'outside', 'inside', 'above', 'mindistance',
      'constrain_rotation', 'sphere', 'box', 'cube', 'plane', 'cylinder',
      'ellipsoid', 'xygauss'
    ];
    
    const lowerToken = token.toLowerCase();
    
    if (keywords.includes(lowerToken) || constraints.includes(lowerToken)) {
      return lowerToken;
    }
    
    return undefined;
  }
  
  private isConstraintKeyword(token: string): boolean {
    const constraints = [
      'atoms', 'radius', 'fscale', 'short_radius', 'short_radius_scale',
      'over', 'below', 'outside', 'inside', 'above', 'mindistance',
      'constrain_rotation', 'sphere', 'box', 'cube', 'plane', 'cylinder',
      'ellipsoid', 'xygauss'
    ];
    
    return constraints.includes(token.toLowerCase());
  }
  
  private isGeometryConstraint(token: string): boolean {
    const geometryConstraints = [
      'sphere', 'box', 'cube', 'cylinder', 'ellipsoid', 'plane', 'xygauss'
    ];
    
    return geometryConstraints.includes(token.toLowerCase());
  }
  
  /**
   * 解析 structure 块的信息
   */
  private async parseStructureBlock(
    lines: string[],
    startLine: number,
    pdbPath: string,
    globalTolerance: number
  ): Promise<{
    currentNumber: number;
    endLine: number;
  } | null> {
    let currentNumber = 1; // 默认数量
    let i = startLine + 1;
    
    // 查找 structure 块的结束
    while (i < lines.length) {
      const line = lines[i].trim().toLowerCase();
      
      if (line.startsWith('end structure')) {
        break;
      }
      
      if (line === '' || line.startsWith('#')) {
        i++;
        continue;
      }
      
      const tokens = line.split(/\s+/);
      const firstToken = tokens[0];
      
      // 解析 number 参数
      if (firstToken === 'number') {
        if (tokens.length > 1) {
          const num = parseInt(tokens[1]);
          if (!isNaN(num)) {
            currentNumber = num;
          }
        }
      }
      
      i++;
    }
    
    return {
      currentNumber,
      endLine: i
    };
  }
  
}
