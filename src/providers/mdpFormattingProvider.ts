import * as vscode from 'vscode';
import { getMdpParameter } from '../constants/mdpParameters';

// 对齐组的类型定义
interface AlignmentGroup {
  name: string;
  paramNames: string[];
  columnWidths: Map<string, number[]>;
  maxColumns: number;
}

export class MdpFormattingProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
  
  // 定义需要对齐的参数组合
  private readonly alignmentGroups: Array<{ name: string; paramNames: string[] }> = [
    {
      name: 'temperature-coupling',
      paramNames: ['tc-grps', 'tau-t', 'ref-t']
    },
    {
      name: 'wall',
      paramNames: ['wall-atomtype', 'wall-density']
    }
    // 可以添加更多组，例如：
    // { name: 'pressure-coupling', paramNames: ['pcoupltype', 'tau-p', 'compressibility'] }
  ];
  
  public provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): vscode.TextEdit[] {
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
  ): vscode.TextEdit[] {
    const edits: vscode.TextEdit[] = [];
    
    // 第一阶段：收集所有对齐组的信息并计算列宽
    const alignmentGroupsInfo: AlignmentGroup[] = [];
    
    for (const groupDef of this.alignmentGroups) {
      const groupInfo: AlignmentGroup = {
        name: groupDef.name,
        paramNames: groupDef.paramNames,
        columnWidths: new Map(),
        maxColumns: 0
      };
      
      // 收集该组中所有参数的值
      const groupParamValues = new Map<string, string[]>();
      for (const paramName of groupDef.paramNames) {
        groupParamValues.set(paramName, []);
      }
      
      // 扫描文档找到该组的参数
      for (let i = range.start.line; i <= range.end.line; i++) {
        const line = document.lineAt(i);
        const parameterMatch = line.text.match(/^(\s*)([a-zA-Z][a-zA-Z0-9_-]*)\s*(=)\s*([^;]*?)\s*(;.*)?$/);
        if (!parameterMatch) {
          continue;
        }
        const [, , paramName, , paramValue] = parameterMatch;
        const parameter = getMdpParameter(paramName);
        if (parameter && groupDef.paramNames.includes(parameter.name)) {
          const values = paramValue.trim().split(/\s+/).filter(v => v.length > 0);
          groupParamValues.set(parameter.name, values);
          groupInfo.maxColumns = Math.max(groupInfo.maxColumns, values.length);
        }
      }
      
      // 计算该组的列宽
      if (groupInfo.maxColumns > 0) {
        this.calculateGroupColumnWidths(groupInfo, groupParamValues);
        alignmentGroupsInfo.push(groupInfo);
      }
    }

    // 第二阶段：收集所有参数信息并计算最长参数名和参数值行长度
    const lineInfos: Array<{
      lineIndex: number;
      line: vscode.TextLine;
      paramName?: string;
      normalizedParamName?: string;
      paramValue?: string;
      comment?: string;
      hasComment?: boolean;
    }> = [];
    
    let maxParamNameLength = 0;
    let maxParamLineLength = 0; // 参数行（不包括注释）的最大长度
    
    for (let i = range.start.line; i <= range.end.line; i++) {
      const line = document.lineAt(i);
      const lineInfo: {
        lineIndex: number;
        line: vscode.TextLine;
        paramName?: string;
        normalizedParamName?: string;
        paramValue?: string;
        comment?: string;
        hasComment?: boolean;
      } = { lineIndex: i, line };
      
      // 检查是否是参数行
      const parameterMatch = line.text.match(/^(\s*)([a-zA-Z][a-zA-Z0-9_-]*)\s*(=)\s*([^;]*?)\s*(;.*)?$/);
      if (parameterMatch) {
        const [, , paramName, , paramValue, comment] = parameterMatch;
        const parameter = getMdpParameter(paramName);
        const normalizedParamName = parameter ? parameter.name : paramName;
        
        lineInfo.paramName = paramName;
        lineInfo.normalizedParamName = normalizedParamName;
        lineInfo.paramValue = paramValue.trim();
        lineInfo.comment = comment;
        lineInfo.hasComment = !!comment && comment.trim().length > 0;
        
        maxParamNameLength = Math.max(maxParamNameLength, normalizedParamName.length);
        
        // 计算参数行长度（用于对齐注释）
        const paramLineLength = normalizedParamName.length + 3 + lineInfo.paramValue.length; // name + " = " + value
        maxParamLineLength = Math.max(maxParamLineLength, paramLineLength);
      }
      
      lineInfos.push(lineInfo);
    }
    
    // 第三阶段：根据最长参数名长度和参数行长度格式化所有行
    for (const lineInfo of lineInfos) {
      const originalText = lineInfo.line.text;
      const formattedText = this.formatLineWithAlignment(
        originalText, 
        options, 
        maxParamNameLength,
        maxParamLineLength,
        lineInfo.normalizedParamName,
        lineInfo.paramValue,
        lineInfo.hasComment,
        alignmentGroupsInfo
      );
      
      if (originalText !== formattedText) {
        edits.push(vscode.TextEdit.replace(lineInfo.line.range, formattedText));
      }
    }
    
    return edits;
  }

  private formatLineWithAlignment(
    line: string, 
    options: vscode.FormattingOptions, 
    maxParamNameLength: number,
    maxParamLineLength: number,
    normalizedParamName?: string,
    paramValue?: string,
    hasComment?: boolean,
    alignmentGroups?: AlignmentGroup[]
  ): string {
    // 保留空行
    if (line.trim() === '') {
      return '';
    }
    
    // 处理纯注释行
    if (line.trim().startsWith(';')) {
      return this.formatCommentLine(line);
    }
    
    // 处理参数行
    const parameterMatch = line.match(/^(\s*)([a-zA-Z][a-zA-Z0-9_-]*)\s*(=)\s*([^;]*?)\s*(;.*)?$/);
    if (parameterMatch) {
      const [, leadingWhitespace, paramName, equals, paramValueMatch, comment] = parameterMatch;
      return this.formatParameterLineWithAlignment(
        paramName, 
        paramValueMatch.trim(), 
        comment || '', 
        options, 
        maxParamNameLength, 
        maxParamLineLength,
        normalizedParamName,
        hasComment,
        alignmentGroups
      );
    }
    
    // 处理其他行（可能是格式错误的行）
    return line.trimEnd();
  }
  
  private formatLine(line: string, options: vscode.FormattingOptions): string {
    // 保留空行
    if (line.trim() === '') {
      return '';
    }
    
    // 处理纯注释行
    if (line.trim().startsWith(';')) {
      return this.formatCommentLine(line);
    }
    
    // 处理参数行
    const parameterMatch = line.match(/^(\s*)([a-zA-Z][a-zA-Z0-9_-]*)\s*(=)\s*([^;]*?)\s*(;.*)?$/);
    if (parameterMatch) {
      const [, leadingWhitespace, paramName, equals, paramValue, comment] = parameterMatch;
      return this.formatParameterLine(paramName, paramValue.trim(), comment || '', options);
    }
    
    // 处理其他行（可能是格式错误的行）
    return line.trimEnd();
  }
  
  private formatCommentLine(line: string): string {
    const trimmed = line.trim();
    
    // 检查是否是分节注释（多个分号）
    if (trimmed.match(/^;{2,}/)) {
      return trimmed;
    }
    
    // 标准注释格式：一个空格后跟注释内容
    if (trimmed.startsWith(';')) {
      const commentContent = trimmed.substring(1).trim();
      return commentContent ? `; ${commentContent}` : ';';
    }
    
    return line.trimEnd();
  }
  
  private formatParameterLine(paramName: string, paramValue: string, comment: string, options: vscode.FormattingOptions): string {
    const parameter = getMdpParameter(paramName);
    
    // 规范化参数名（使用连字符格式）
    const normalizedParamName = parameter ? parameter.name : paramName;
    
    // 格式化参数值
    const formattedValue = this.formatParameterValue(parameter, paramValue);
    
    // 计算对齐
    const tabSize = options.tabSize || 4;
    const useSpaces = options.insertSpaces !== false;
    const indent = useSpaces ? ' '.repeat(tabSize) : '\t';
    
    // 基本格式：参数名 = 值
    let formattedLine = `${normalizedParamName} = ${formattedValue}`;
    
    // 添加注释（如果有）
    if (comment.trim()) {
      // 确保注释前有适当的间距
      const commentSpacing = '  '; // 两个空格
      formattedLine += `${commentSpacing}${comment.trim()}`;
    }
    
    return formattedLine;
  }
  
  private formatParameterLineWithAlignment(
    paramName: string, 
    paramValue: string, 
    comment: string, 
    options: vscode.FormattingOptions, 
    maxParamNameLength: number,
    maxParamLineLength: number,
    normalizedParamName?: string,
    hasComment?: boolean,
    alignmentGroups?: AlignmentGroup[]
  ): string {
    const parameter = getMdpParameter(paramName);
    
    // 规范化参数名（使用连字符格式）
    const finalParamName = normalizedParamName || (parameter ? parameter.name : paramName);
    
    // 格式化参数值
    let formattedValue = this.formatParameterValue(parameter, paramValue);
    
    // 处理多值参数的列对齐
    if (parameter && alignmentGroups && alignmentGroups.length > 0) {
      // 查找该参数属于哪个对齐组
      const relevantGroup = alignmentGroups.find(group => 
        group.paramNames.includes(finalParamName)
      );
      
      if (relevantGroup) {
        const widths = relevantGroup.columnWidths.get(finalParamName);
        if (widths && widths.length > 0) {
          const values = paramValue.trim().split(/\s+/).filter(v => v.length > 0);
          const alignedValues: string[] = [];
          
          for (let i = 0; i < values.length; i++) {
            const value = this.formatParameterValue(parameter, values[i]);
            if (widths[i]) {
              // 左对齐，用空格填充到指定宽度
              alignedValues.push(value.padEnd(widths[i]));
            } else {
              alignedValues.push(value);
            }
          }
          
          formattedValue = alignedValues.join(' ').trimEnd();
        }
      }
    }
    
    // 计算对齐所需的空格数（参数名对齐）
    const paddingLength = maxParamNameLength - finalParamName.length;
    const padding = ' '.repeat(Math.max(0, paddingLength));
    
    // 基本格式：参数名 + 填充空格 + = + 值
    let formattedLine = `${finalParamName}${padding} = ${formattedValue}`;
    
    // 添加注释（如果有）
    if (comment.trim()) {
      // 计算当前行长度
      const currentLineLength = formattedLine.length;
      
      // 计算注释应该开始的位置（在最长参数行之后加2个空格）
      const commentStartPosition = maxParamLineLength + 2;
      
      if (currentLineLength < commentStartPosition) {
        // 需要补充空格以对齐注释
        const commentPadding = ' '.repeat(commentStartPosition - currentLineLength);
        formattedLine += commentPadding + comment.trim();
      } else {
        // 当前行已经超过对齐位置，添加最少的间距
        formattedLine += '  ' + comment.trim();
      }
    }
    
    return formattedLine;
  }

  private formatParameterValue(parameter: any, value: string): string {
    if (!parameter) {
      return value;
    }
    
    // 布尔值标准化
    if (parameter.type === 'boolean') {
      const lowerValue = value.toLowerCase();
      if (['true', 'on', '1'].includes(lowerValue)) {
        return 'yes';
      } else if (['false', 'off', '0'].includes(lowerValue)) {
        return 'no';
      }
    }
    
    // 枚举值标准化（保持原始大小写，但移除多余空格）
    if (parameter.type === 'enum' && parameter.validValues) {
      const normalizedValue = value.toLowerCase().trim();
      const matchingValue = parameter.validValues.find((v: string) => v.toLowerCase() === normalizedValue);
      if (matchingValue) {
        return matchingValue;
      }
    }
    
    // 数值格式化
    if (parameter.type === 'integer') {
      const intValue = parseInt(value, 10);
      if (!isNaN(intValue)) {
        return intValue.toString();
      }
    }
    
    if (parameter.type === 'real') {
      const floatValue = parseFloat(value);
      if (!isNaN(floatValue)) {
        // 保持合理的小数位数
        if (floatValue === Math.floor(floatValue)) {
          return floatValue.toString();
        } else {
          return floatValue.toString();
        }
      }
    }
    
    // 默认情况：移除首尾空格
    return value.trim();
  }

  private calculateGroupColumnWidths(
    groupInfo: AlignmentGroup, 
    groupParamValues: Map<string, string[]>
  ): void {
    // 为该组中的每个参数计算列宽
    for (const paramName of groupInfo.paramNames) {
      const widths: number[] = [];
      
      // 对于每一列，计算该列所有参数值的最大宽度
      for (let col = 0; col < groupInfo.maxColumns; col++) {
        let maxWidth = 0;
        
        // 遍历该组中的所有参数
        for (const pName of groupInfo.paramNames) {
          const values = groupParamValues.get(pName) || [];
          if (col < values.length) {
            const parameter = getMdpParameter(pName);
            const formattedValue = this.formatParameterValue(parameter, values[col]);
            maxWidth = Math.max(maxWidth, formattedValue.length);
          }
        }
        
        widths.push(maxWidth);
      }
      
      groupInfo.columnWidths.set(paramName, widths);
    }
  }
  
  // 提供格式化配置的建议
  public static getDefaultFormattingOptions(): vscode.FormattingOptions {
    return {
      insertSpaces: true,
      tabSize: 4
    };
  }
}
