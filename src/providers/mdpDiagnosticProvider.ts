import * as vscode from 'vscode';
import { getMdpParameter, MdpParameter, MDP_PARAMETERS } from '../constants/mdpParameters';

export class MdpDiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  
  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('mdp');
  }
  
  public provideDiagnostics(document: vscode.TextDocument): void {
    const diagnostics: vscode.Diagnostic[] = [];
    const documentParameters = new Map<string, { value: string; line: number; range: vscode.Range }>();
    
    // 第一遍：解析所有参数并检查基本语法
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
          // 检查是否缺少等号
          if (!lineText.includes('=')) {
            const diagnostic = new vscode.Diagnostic(
              line.range,
              'Missing "=" in parameter assignment. Expected format: parameter = value',
              vscode.DiagnosticSeverity.Error
            );
            diagnostic.code = 'missing-equals';
            diagnostics.push(diagnostic);
          } else {
            const diagnostic = new vscode.Diagnostic(
              line.range,
              'Invalid parameter line format. Expected: parameter = value',
              vscode.DiagnosticSeverity.Error
            );
            diagnostic.code = 'invalid-format';
            diagnostics.push(diagnostic);
          }
        } else {
          // 检查是否包含不支持的字符
          if (/[^\s\w=;.-]/.test(lineText)) {
            const diagnostic = new vscode.Diagnostic(
              line.range,
              'Line contains unsupported characters or invalid syntax',
              vscode.DiagnosticSeverity.Warning
            );
            diagnostic.code = 'invalid-characters';
            diagnostics.push(diagnostic);
          }
        }
        continue;
      }

      const [, paramName, paramValue] = parameterMatch;
      const parameter = getMdpParameter(paramName);
      
      // 记录参数用于重复检查
      const paramRange = new vscode.Range(
        new vscode.Position(i, lineText.indexOf(paramName)),
        new vscode.Position(i, lineText.indexOf(paramName) + paramName.length)
      );
      
      if (documentParameters.has(paramName)) {
        // 检查重复参数
        const diagnostic = new vscode.Diagnostic(
          paramRange,
          `Duplicate parameter '${paramName}'. Previous definition at line ${documentParameters.get(paramName)!.line + 1}`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'duplicate-parameter';
        diagnostics.push(diagnostic);
      } else {
        documentParameters.set(paramName, { value: paramValue.trim(), line: i, range: paramRange });
      }
      
      // 检查未知参数
      if (!parameter) {
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
    
    // 第二遍：检查参数间的依赖关系和逻辑一致性
    this.validateParameterDependencies(documentParameters, diagnostics);
    
    // 检查缺失的必需参数
    this.validateRequiredParameters(documentParameters, diagnostics);
    
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

    // 检查空白值
    if (value.trim() === '') {
      return {
        message: `Empty value for parameter ${parameter.name}`,
        severity: vscode.DiagnosticSeverity.Error,
        code: 'empty-value'
      };
    }
    
    // 验证枚举类型
    if (parameter.type === 'enum' && parameter.validValues) {
      const normalizedValue = value.toLowerCase();
      const validValues = parameter.validValues.map(v => v.toLowerCase());
      
      if (!validValues.includes(normalizedValue)) {
        // 提供相似值建议
        const suggestions = this.getSimilarValues(value, parameter.validValues);
        let message = `Invalid value '${value}' for ${parameter.name}. Valid values: ${parameter.validValues.join(', ')}`;
        if (suggestions.length > 0) {
          message += `. Did you mean: ${suggestions.join(', ')}?`;
        }
        
        return {
          message,
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
      // 支持科学计数法和负数
      const numericPattern = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
      if (!numericPattern.test(value)) {
        return {
          message: `Invalid integer value '${value}' for ${parameter.name}. Expected an integer number`,
          severity: vscode.DiagnosticSeverity.Error,
          code: 'invalid-integer-value'
        };
      }
      
      const intValue = parseInt(value, 10);
      if (isNaN(intValue) || !Number.isInteger(Number(value))) {
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
      // 支持科学计数法和负数
      const numericPattern = /^-?\d*\.?\d+([eE][+-]?\d+)?$/;
      if (!numericPattern.test(value)) {
        return {
          message: `Invalid real number value '${value}' for ${parameter.name}. Expected a decimal number`,
          severity: vscode.DiagnosticSeverity.Error,
          code: 'invalid-real-value'
        };
      }
      
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

    // 验证字符串类型的特定格式
    if (parameter.type === 'string') {
      const validationResult = this.validateStringParameter(parameter, value);
      if (validationResult) {
        return validationResult;
      }
    }
    
    return null;
  }

  private validateStringParameter(parameter: MdpParameter, value: string): {
    message: string;
    severity: vscode.DiagnosticSeverity;
    code: string;
  } | null {
    
    // 验证文件路径参数
    const filePathParams = ['include', 'xtc-file', 'trr-file', 'gro-file', 'top-file'];
    if (filePathParams.includes(parameter.name)) {
      // 基本的路径验证
      if (value.includes('\\')) {
        return {
          message: `Use forward slashes (/) in file paths for parameter ${parameter.name}`,
          severity: vscode.DiagnosticSeverity.Warning,
          code: 'invalid-path-separator'
        };
      }
    }

    // 验证组名参数（应该是有效的组名格式）
    const groupParams = ['tc-grps', 'energygrps'];
    if (groupParams.includes(parameter.name)) {
      // 检查组名格式
      const groups = value.split(/\s+/);
      for (const group of groups) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(group) && group !== 'System') {
          return {
            message: `Invalid group name '${group}' in ${parameter.name}. Group names should start with a letter or underscore`,
            severity: vscode.DiagnosticSeverity.Warning,
            code: 'invalid-group-name'
          };
        }
      }
    }

    return null;
  }

  private validateParameterDependencies(
    documentParameters: Map<string, { value: string; line: number; range: vscode.Range }>,
    diagnostics: vscode.Diagnostic[]
  ): void {
    
    // 检查温度耦合相关参数
    const tcoupl = documentParameters.get('tcoupl');
    if (tcoupl && tcoupl.value !== 'no') {
      if (!documentParameters.has('tau-t') && !documentParameters.has('tau_t')) {
        diagnostics.push(new vscode.Diagnostic(
          tcoupl.range,
          'Parameter tau-t is required when tcoupl is not "no"',
          vscode.DiagnosticSeverity.Warning
        ));
      }
      if (!documentParameters.has('ref-t') && !documentParameters.has('ref_t')) {
        diagnostics.push(new vscode.Diagnostic(
          tcoupl.range,
          'Parameter ref-t is required when tcoupl is not "no"',
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }

    // 检查压力耦合相关参数
    const pcoupl = documentParameters.get('pcoupl');
    if (pcoupl && pcoupl.value !== 'no') {
      if (!documentParameters.has('tau_p') && !documentParameters.has('tau-p')) {
        diagnostics.push(new vscode.Diagnostic(
          pcoupl.range,
          'Parameter tau_p is required when pcoupl is not "no"',
          vscode.DiagnosticSeverity.Warning
        ));
      }
      if (!documentParameters.has('ref_p') && !documentParameters.has('ref-p')) {
        diagnostics.push(new vscode.Diagnostic(
          pcoupl.range,
          'Parameter ref_p is required when pcoupl is not "no"',
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }

    // 检查PME相关参数
    const coulombtype = documentParameters.get('coulombtype');
    if (coulombtype && coulombtype.value.toLowerCase() === 'pme') {
      if (!documentParameters.has('fourierspacing')) {
        diagnostics.push(new vscode.Diagnostic(
          coulombtype.range,
          'Parameter fourierspacing is recommended when using PME',
          vscode.DiagnosticSeverity.Information
        ));
      }
    }

    // 检查约束相关参数
    const constraints = documentParameters.get('constraints');
    if (constraints && constraints.value !== 'none') {
      if (!documentParameters.has('constraint_algorithm') && !documentParameters.has('constraint-algorithm')) {
        diagnostics.push(new vscode.Diagnostic(
          constraints.range,
          'Parameter constraint_algorithm should be specified when using constraints',
          vscode.DiagnosticSeverity.Information
        ));
      }
    }

    // 检查自由能相关参数
    const freeEnergy = documentParameters.get('free_energy');
    if (freeEnergy && freeEnergy.value === 'yes') {
      const requiredFepParams = ['init_lambda_state', 'delta_lambda'];
      for (const param of requiredFepParams) {
        if (!documentParameters.has(param) && !documentParameters.has(param.replace('_', '-'))) {
          diagnostics.push(new vscode.Diagnostic(
            freeEnergy.range,
            `Parameter ${param} is required for free energy calculations`,
            vscode.DiagnosticSeverity.Warning
          ));
        }
      }
    }
  }

  private validateRequiredParameters(
    documentParameters: Map<string, { value: string; line: number; range: vscode.Range }>,
    diagnostics: vscode.Diagnostic[]
  ): void {
    
    // 基本必需参数
    const requiredParams = ['integrator'];
    
    for (const paramName of requiredParams) {
      if (!documentParameters.has(paramName)) {
        // 在文档末尾添加缺失参数的诊断
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          `Missing required parameter: ${paramName}`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.code = 'missing-required-parameter';
        diagnostics.push(diagnostic);
      }
    }

    // 检查推荐的参数
    const recommendedParams = ['nstlist', 'coulombtype', 'vdwtype'];
    for (const paramName of recommendedParams) {
      if (!documentParameters.has(paramName)) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          `Recommended parameter not found: ${paramName}`,
          vscode.DiagnosticSeverity.Information
        );
        diagnostic.code = 'missing-recommended-parameter';
        diagnostics.push(diagnostic);
      }
    }
  }

  private getSimilarValues(input: string, validValues: string[]): string[] {
    const suggestions: string[] = [];
    const inputLower = input.toLowerCase();
    
    for (const value of validValues) {
      const similarity = this.calculateSimilarity(inputLower, value.toLowerCase());
      if (similarity > 0.6) {
        suggestions.push(value);
      }
    }
    
    return suggestions.slice(0, 3);
  }
  
  private getSimilarParameterNames(input: string): string[] {
    const allParams = MDP_PARAMETERS.map(p => p.name);
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
