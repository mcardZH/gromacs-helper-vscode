import * as vscode from 'vscode';
import { getMdpParameter, MdpParameter } from '../constants/mdpParameters';

export class MdpDiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  
  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('mdp');
  }
  
  public provideDiagnostics(document: vscode.TextDocument): void {
    const diagnostics: vscode.Diagnostic[] = [];
    
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text.trim();
      
      // 跳过空行和注释行
      if (!lineText || lineText.startsWith(';')) {
        continue;
      }
      
      // 检查参数行格式
      const parameterMatch = lineText.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*([^;]*?)\s*(;.*)?$/);
      if (!parameterMatch) {
        // 检查是否可能是拼写错误的参数行
        const possibleParamMatch = lineText.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)/);
        if (possibleParamMatch) {
          const diagnostic = new vscode.Diagnostic(
            line.range,
            'Invalid parameter line format. Expected: parameter = value',
            vscode.DiagnosticSeverity.Error
          );
          diagnostic.code = 'invalid-format';
          diagnostics.push(diagnostic);
        }
        continue;
      }
      
      const [, paramName, paramValue] = parameterMatch;
      const parameter = getMdpParameter(paramName);
      
      // 检查未知参数
      if (!parameter) {
        const paramRange = new vscode.Range(
          new vscode.Position(i, lineText.indexOf(paramName)),
          new vscode.Position(i, lineText.indexOf(paramName) + paramName.length)
        );
        
        const diagnostic = new vscode.Diagnostic(
          paramRange,
          `Unknown parameter: ${paramName}`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'unknown-parameter';
        
        // 提供建议的参数名
        const suggestions = this.getSimilarParameterNames(paramName);
        if (suggestions.length > 0) {
          diagnostic.message += `. Did you mean: ${suggestions.join(', ')}?`;
        }
        
        diagnostics.push(diagnostic);
        continue;
      }
      
      // 验证参数值
      const valueValidationResult = this.validateParameterValue(parameter, paramValue.trim());
      if (valueValidationResult) {
        const valueStartIndex = lineText.indexOf('=') + 1;
        const valueMatch = lineText.substring(valueStartIndex).match(/\S+/);
        if (valueMatch) {
          const valueStartPos = valueStartIndex + lineText.substring(valueStartIndex).indexOf(valueMatch[0]);
          const valueRange = new vscode.Range(
            new vscode.Position(i, valueStartPos),
            new vscode.Position(i, valueStartPos + valueMatch[0].length)
          );
          
          const diagnostic = new vscode.Diagnostic(
            valueRange,
            valueValidationResult.message,
            valueValidationResult.severity
          );
          diagnostic.code = valueValidationResult.code;
          diagnostics.push(diagnostic);
        }
      }
    }
    
    this.diagnosticCollection.set(document.uri, diagnostics);
  }
  
  private validateParameterValue(parameter: MdpParameter, value: string): {
    message: string;
    severity: vscode.DiagnosticSeverity;
    code: string;
  } | null {
    
    if (!value) {
      return {
        message: `Missing value for parameter ${parameter.name}`,
        severity: vscode.DiagnosticSeverity.Error,
        code: 'missing-value'
      };
    }
    
    // 验证枚举类型
    if (parameter.type === 'enum' && parameter.validValues) {
      const normalizedValue = value.toLowerCase();
      const validValues = parameter.validValues.map(v => v.toLowerCase());
      
      if (!validValues.includes(normalizedValue)) {
        return {
          message: `Invalid value '${value}' for ${parameter.name}. Valid values: ${parameter.validValues.join(', ')}`,
          severity: vscode.DiagnosticSeverity.Error,
          code: 'invalid-enum-value'
        };
      }
    }
    
    // 验证布尔类型
    if (parameter.type === 'boolean') {
      const booleanValues = ['yes', 'no', 'true', 'false', 'on', 'off'];
      if (!booleanValues.includes(value.toLowerCase())) {
        return {
          message: `Invalid boolean value '${value}' for ${parameter.name}. Use: yes/no, true/false, or on/off`,
          severity: vscode.DiagnosticSeverity.Error,
          code: 'invalid-boolean-value'
        };
      }
    }
    
    // 验证数值类型
    if (parameter.type === 'integer') {
      const intValue = parseInt(value, 10);
      if (isNaN(intValue) || !Number.isInteger(intValue)) {
        return {
          message: `Invalid integer value '${value}' for ${parameter.name}`,
          severity: vscode.DiagnosticSeverity.Error,
          code: 'invalid-integer-value'
        };
      }
      
      // 检查范围
      if (parameter.range) {
        if (parameter.range.min !== undefined && intValue < parameter.range.min) {
          return {
            message: `Value ${intValue} is below minimum ${parameter.range.min} for ${parameter.name}`,
            severity: vscode.DiagnosticSeverity.Error,
            code: 'value-below-minimum'
          };
        }
        if (parameter.range.max !== undefined && intValue > parameter.range.max) {
          return {
            message: `Value ${intValue} is above maximum ${parameter.range.max} for ${parameter.name}`,
            severity: vscode.DiagnosticSeverity.Error,
            code: 'value-above-maximum'
          };
        }
      }
    }
    
    if (parameter.type === 'real') {
      const floatValue = parseFloat(value);
      if (isNaN(floatValue)) {
        return {
          message: `Invalid real number value '${value}' for ${parameter.name}`,
          severity: vscode.DiagnosticSeverity.Error,
          code: 'invalid-real-value'
        };
      }
      
      // 检查范围
      if (parameter.range) {
        if (parameter.range.min !== undefined && floatValue < parameter.range.min) {
          return {
            message: `Value ${floatValue} is below minimum ${parameter.range.min} for ${parameter.name}`,
            severity: vscode.DiagnosticSeverity.Error,
            code: 'value-below-minimum'
          };
        }
        if (parameter.range.max !== undefined && floatValue > parameter.range.max) {
          return {
            message: `Value ${floatValue} is above maximum ${parameter.range.max} for ${parameter.name}`,
            severity: vscode.DiagnosticSeverity.Error,
            code: 'value-above-maximum'
          };
        }
      }
    }
    
    return null;
  }
  
  private getSimilarParameterNames(input: string): string[] {
    const allParams = ['integrator', 'dt', 'nsteps', 'tcoupl', 'pcoupl', 'constraints', 'coulombtype', 'vdwtype'];
    const suggestions: string[] = [];
    
    for (const param of allParams) {
      const similarity = this.calculateSimilarity(input.toLowerCase(), param.toLowerCase());
      if (similarity > 0.6) {
        suggestions.push(param);
      }
    }
    
    return suggestions.slice(0, 3); // 最多返回3个建议
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private getEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  public dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
