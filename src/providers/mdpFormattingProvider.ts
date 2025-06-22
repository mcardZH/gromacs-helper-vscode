import * as vscode from 'vscode';
import { getMdpParameter } from '../constants/mdpParameters';

export class MdpFormattingProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
  
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
    
    // 第一阶段：收集所有参数信息并计算最长参数名
    const lineInfos: Array<{
      lineIndex: number;
      line: vscode.TextLine;
      paramName?: string;
      normalizedParamName?: string;
    }> = [];
    
    let maxParamNameLength = 0;
    
    for (let i = range.start.line; i <= range.end.line; i++) {
      const line = document.lineAt(i);
      const lineInfo: {
        lineIndex: number;
        line: vscode.TextLine;
        paramName?: string;
        normalizedParamName?: string;
      } = { lineIndex: i, line };
      
      // 检查是否是参数行
      const parameterMatch = line.text.match(/^(\s*)([a-zA-Z][a-zA-Z0-9_-]*)\s*(=)\s*([^;]*?)\s*(;.*)?$/);
      if (parameterMatch) {
        const [, , paramName] = parameterMatch;
        const parameter = getMdpParameter(paramName);
        const normalizedParamName = parameter ? parameter.name : paramName;
        
        lineInfo.paramName = paramName;
        lineInfo.normalizedParamName = normalizedParamName;
        maxParamNameLength = Math.max(maxParamNameLength, normalizedParamName.length);
      }
      
      lineInfos.push(lineInfo);
    }
    
    // 第二阶段：根据最长参数名长度格式化所有行
    for (const lineInfo of lineInfos) {
      const originalText = lineInfo.line.text;
      const formattedText = this.formatLineWithAlignment(
        originalText, 
        options, 
        maxParamNameLength,
        lineInfo.normalizedParamName
      );
      
      if (originalText !== formattedText) {
        edits.push(vscode.TextEdit.replace(lineInfo.line.range, formattedText));
      }
    }
    
    return edits;
  }

  private formatLineWithAlignment(line: string, options: vscode.FormattingOptions, maxParamNameLength: number, normalizedParamName?: string): string {
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
      return this.formatParameterLineWithAlignment(paramName, paramValue.trim(), comment || '', options, maxParamNameLength, normalizedParamName);
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
    normalizedParamName?: string
  ): string {
    const parameter = getMdpParameter(paramName);
    
    // 规范化参数名（使用连字符格式）
    const finalParamName = normalizedParamName || (parameter ? parameter.name : paramName);
    
    // 格式化参数值
    const formattedValue = this.formatParameterValue(parameter, paramValue);
    
    // 计算对齐所需的空格数
    const paddingLength = maxParamNameLength - finalParamName.length;
    const padding = ' '.repeat(Math.max(0, paddingLength));
    
    // 基本格式：参数名 + 填充空格 + = + 值
    let formattedLine = `${finalParamName}${padding} = ${formattedValue}`;
    
    // 添加注释（如果有）
    if (comment.trim()) {
      // 确保注释前有适当的间距
      const commentSpacing = '  '; // 两个空格
      formattedLine += `${commentSpacing}${comment.trim()}`;
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
  
  // 提供格式化配置的建议
  public static getDefaultFormattingOptions(): vscode.FormattingOptions {
    return {
      insertSpaces: true,
      tabSize: 4
    };
  }
}
