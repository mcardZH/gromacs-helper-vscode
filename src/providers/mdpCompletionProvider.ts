import * as vscode from 'vscode';
import { MDP_PARAMETERS, getMdpParameter, MdpParameter } from '../constants/mdpParameters';
import { SnippetManager } from '../snippetManager';

export class MdpCompletionProvider implements vscode.CompletionItemProvider {
  private snippetManager?: SnippetManager;

  setSnippetManager(snippetManager: SnippetManager): void {
    this.snippetManager = snippetManager;
  }
  
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);
    const textAfterCursor = lineText.substring(position.character);
    
    // 检查是否在注释中（分号后面的内容）
    const commentMatch = textBeforeCursor.match(/^([^;]*);/);
    if (commentMatch) {
      return [];
    }
    
    // 检查是否在参数值位置（等号后面）
    const parameterValueMatch = textBeforeCursor.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*(.*)$/);
    if (parameterValueMatch) {
      return this.provideParameterValueCompletions(parameterValueMatch[1], parameterValueMatch[2]);
    }
    
    // 检查是否在等号前面或刚输入等号
    const parameterWithEqualsMatch = textBeforeCursor.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=?\s*$/);
    if (parameterWithEqualsMatch) {
      const paramName = parameterWithEqualsMatch[1];
      const hasEquals = textBeforeCursor.includes('=');
      
      // 如果已经有等号，提供参数值补全
      if (hasEquals) {
        return this.provideParameterValueCompletions(paramName, '');
      }
      
      // 如果还没有等号，提供参数名补全（包括已匹配的参数）
      const parameterCompletions = this.provideParameterNameCompletions();
      const snippetCompletions = this.snippetManager ? this.snippetManager.getCompletionItems() : [];
      return [...snippetCompletions, ...parameterCompletions];
    }
    
    // 检查是否在输入参数名的部分字符
    const partialParameterMatch = textBeforeCursor.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)$/);
    if (partialParameterMatch) {
      const parameterCompletions = this.provideParameterNameCompletions();
      const snippetCompletions = this.snippetManager ? this.snippetManager.getCompletionItems() : [];
      return [...snippetCompletions, ...parameterCompletions];
    }
    
    // 空行或只有空格时，提供所有补全选项
    if (textBeforeCursor.trim() === '' || /^\s*$/.test(textBeforeCursor)) {
      const parameterCompletions = this.provideParameterNameCompletions();
      const snippetCompletions = this.snippetManager ? this.snippetManager.getCompletionItems() : [];
      const contextualCompletions = this.provideContextualCompletions(document, position);
      return [...snippetCompletions, ...parameterCompletions, ...contextualCompletions];
    }
    
    // 其他情况：尝试智能匹配
    const smartCompletions = this.provideSmartCompletions(textBeforeCursor, textAfterCursor);
    const contextualCompletions = this.provideContextualCompletions(document, position);
    return [...smartCompletions, ...contextualCompletions];
  }
  
  private provideParameterNameCompletions(): vscode.CompletionItem[] {
    return MDP_PARAMETERS.map(param => {
      const item = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Property);
      item.detail = param.description;
      item.documentation = this.createParameterDocumentation(param);
      
      // 插入文本包含等号和默认值
      if (param.defaultValue) {
        item.insertText = new vscode.SnippetString(`${param.name} = \${1:${param.defaultValue}}`);
      } else {
        item.insertText = new vscode.SnippetString(`${param.name} = \${1}`);
      }
      
      // 设置排序文本，常用参数排在前面
      const commonParams = ['integrator', 'dt', 'nsteps', 'tcoupl', 'pcoupl', 'constraints'];
      if (commonParams.includes(param.name)) {
        item.sortText = `0_${param.name}`;
      } else {
        item.sortText = `1_${param.name}`;
      }
      
      return item;
    });
  }
  
  private provideSmartCompletions(textBeforeCursor: string, textAfterCursor: string): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    
    // 尝试从不完整的输入中推断用户意图
    const trimmedText = textBeforeCursor.trim();
    
    // 如果输入看起来像参数名的开始，提供匹配的参数名
    if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(trimmedText)) {
      const matchingParams = MDP_PARAMETERS.filter(param => 
        param.name.toLowerCase().startsWith(trimmedText.toLowerCase())
      );
      
      if (matchingParams.length > 0) {
        return matchingParams.map(param => {
          const item = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Property);
          item.detail = param.description;
          item.documentation = this.createParameterDocumentation(param);
          
          if (param.defaultValue) {
            item.insertText = new vscode.SnippetString(`${param.name} = \${1:${param.defaultValue}}`);
          } else {
            item.insertText = new vscode.SnippetString(`${param.name} = \${1}`);
          }
          
          return item;
        });
      }
    }
    
    // 如果输入包含部分等号，尝试补全
    if (trimmedText.includes('=')) {
      const parts = trimmedText.split('=');
      if (parts.length === 2) {
        const paramName = parts[0].trim();
        const valuePrefix = parts[1].trim();
        return this.provideParameterValueCompletions(paramName, valuePrefix);
      }
    }
    
    // 默认提供参数名补全
    const parameterCompletions = this.provideParameterNameCompletions();
    const snippetCompletions = this.snippetManager ? this.snippetManager.getCompletionItems() : [];
    return [...snippetCompletions, ...parameterCompletions];
  }

  private provideParameterValueCompletions(paramName: string, currentValue: string): vscode.CompletionItem[] {
    const parameter = getMdpParameter(paramName);
    if (!parameter) {
      return [];
    }
    
    const completions: vscode.CompletionItem[] = [];
    const valuePrefix = currentValue.trim().toLowerCase();
    
    // 检查是否为向量参数
    if (this.isVectorParameter(paramName)) {
      const vectorCompletions = this.provideVectorParameterCompletions(paramName);
      completions.push(...vectorCompletions);
    }
    
    // 如果有有效值列表，提供这些选项（支持过滤）
    if (parameter.validValues) {
      parameter.validValues.forEach(value => {
        // 如果用户已经输入了部分值，只显示匹配的选项
        if (valuePrefix === '' || value.toLowerCase().includes(valuePrefix) || value.toLowerCase().startsWith(valuePrefix)) {
          const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
          item.detail = `Valid value for ${parameter.name}`;
          item.documentation = this.getValueDocumentation(parameter, value);
          
          // 设置过滤和排序
          if (value.toLowerCase().startsWith(valuePrefix)) {
            item.sortText = `0_${value}`;
          } else {
            item.sortText = `1_${value}`;
          }
          
          // 设置插入文本，替换当前已输入的部分
          if (valuePrefix !== '') {
            item.filterText = value;
            item.insertText = value;
          }
          
          completions.push(item);
        }
      });
    }
    
    // 如果是数值类型，提供默认值和示例
    if (parameter.type === 'real' || parameter.type === 'integer') {
      if (parameter.defaultValue) {
        const defaultStr = parameter.defaultValue;
        if (valuePrefix === '' || defaultStr.includes(valuePrefix)) {
          const item = new vscode.CompletionItem(defaultStr, vscode.CompletionItemKind.Value);
          item.detail = `Default value for ${parameter.name}`;
          item.documentation = `Default: ${parameter.defaultValue}${parameter.unit ? ` ${parameter.unit}` : ''}`;
          item.sortText = '0_default';
          completions.push(item);
        }
      }
      
      // 提供范围提示
      if (parameter.range) {
        if (parameter.range.min !== undefined) {
          const minStr = parameter.range.min.toString();
          if (valuePrefix === '' || minStr.includes(valuePrefix)) {
            const minItem = new vscode.CompletionItem(minStr, vscode.CompletionItemKind.Value);
            minItem.detail = `Minimum value for ${parameter.name}`;
            minItem.sortText = '0_min';
            completions.push(minItem);
          }
        }
        if (parameter.range.max !== undefined) {
          const maxStr = parameter.range.max.toString();
          if (valuePrefix === '' || maxStr.includes(valuePrefix)) {
            const maxItem = new vscode.CompletionItem(maxStr, vscode.CompletionItemKind.Value);
            maxItem.detail = `Maximum value for ${parameter.name}`;
            maxItem.sortText = '0_max';
            completions.push(maxItem);
          }
        }
      }
      
      // 为数值类型提供常见的示例值
      const commonNumericalValues = this.getCommonNumericalValues(parameter);
      commonNumericalValues.forEach(value => {
        if (valuePrefix === '' || value.includes(valuePrefix)) {
          const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
          item.detail = `Common value for ${parameter.name}`;
          item.sortText = '1_common';
          completions.push(item);
        }
      });
    }
    
    // 布尔类型提供 yes/no（支持过滤）
    if (parameter.type === 'boolean') {
      ['yes', 'no'].forEach(value => {
        if (valuePrefix === '' || value.startsWith(valuePrefix)) {
          const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
          item.detail = `Boolean value for ${parameter.name}`;
          item.sortText = value.startsWith(valuePrefix) ? `0_${value}` : `1_${value}`;
          completions.push(item);
        }
      });
    }
    
    // 向量参数补全
    if (this.isVectorParameter(paramName)) {
      const vectorCompletions = this.provideVectorParameterCompletions(paramName);
      completions.push(...vectorCompletions);
    }
    
    return completions;
  }
  
  private provideVectorParameterCompletions(paramName: string): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    
    // 为向量参数提供特殊的补全
    if (paramName === 'tc_grps') {
      const groups = ['System', 'Protein', 'Water', 'Ion', 'DNA', 'RNA', 'Lipid'];
      groups.forEach(group => {
        const item = new vscode.CompletionItem(group, vscode.CompletionItemKind.Value);
        item.detail = `Temperature coupling group: ${group}`;
        completions.push(item);
      });
    } else if (paramName === 'energygrps') {
      const groups = ['Protein', 'Water', 'Ion', 'DNA', 'RNA', 'Lipid', 'Other'];
      groups.forEach(group => {
        const item = new vscode.CompletionItem(group, vscode.CompletionItemKind.Value);
        item.detail = `Energy group: ${group}`;
        completions.push(item);
      });
    } else if (paramName === 'freezegrps') {
      const item = new vscode.CompletionItem('none', vscode.CompletionItemKind.Value);
      item.detail = 'No freeze groups';
      completions.push(item);
    }
    
    return completions;
  }
  
  private isVectorParameter(paramName: string): boolean {
    const vectorParams = ['tau-t', 'ref-t', 'tc-grps', 'energygrps', 'freezegrps'];
    return vectorParams.includes(paramName);
  }
  
  private provideContextualCompletions(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    
    // 分析文档上下文，提供相关的参数建议
    const documentText = document.getText();
    const lines = documentText.split('\n');
    
    // 检查已存在的参数，避免重复建议
    const existingParams = new Set<string>();
    lines.forEach(line => {
      const paramMatch = line.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=/);
      if (paramMatch) {
        existingParams.add(paramMatch[1]);
      }
    });
    
    // 根据已有参数推荐相关参数
    const relatedParams = this.getRelatedParameters(existingParams);
    relatedParams.forEach(paramName => {
      if (!existingParams.has(paramName)) {
        const param = getMdpParameter(paramName);
        if (param) {
          const item = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Property);
          item.detail = `${param.description} (Related parameter)`;
          item.documentation = this.createParameterDocumentation(param);
          
          if (param.defaultValue) {
            item.insertText = new vscode.SnippetString(`${param.name} = \${1:${param.defaultValue}}`);
          } else {
            item.insertText = new vscode.SnippetString(`${param.name} = \${1}`);
          }
          
          item.sortText = `2_related_${param.name}`;
          completions.push(item);
        }
      }
    });
    
    return completions;
  }
  
  private getRelatedParameters(existingParams: Set<string>): string[] {
    const related: string[] = [];
    
    // 相关参数组
    const paramGroups: { [key: string]: string[] } = {
      'integrator': ['dt', 'nsteps', 'nstlist'],
      'dt': ['integrator', 'nsteps', 'verlet-buffer-tolerance'],
      'tcoupl': ['tau-t', 'ref-t', 'tc-grps'],
      'pcoupl': ['tau-p', 'ref-p', 'pcoupltype', 'compressibility'],
      'coulombtype': ['rcoulomb', 'fourierspacing', 'pme-order'],
      'vdwtype': ['rvdw', 'vdw-modifier'],
      'constraints': ['constraint-algorithm', 'lincs-order', 'lincs-iter'],
      'nstxout': ['nstvout', 'nstfout', 'nstlog', 'nstenergy'],
      'free-energy': ['init-lambda-state', 'delta-lambda', 'calc-lambda-neighbors']
    };
    
    // 找到相关参数
    existingParams.forEach(param => {
      if (paramGroups[param]) {
        related.push(...paramGroups[param]);
      }
    });
    
    return Array.from(new Set(related));
  }

  private getCommonNumericalValues(parameter: MdpParameter): string[] {
    const commonValues: { [key: string]: string[] } = {
      'dt': ['0.001', '0.002', '0.005', '0.01'],
      'nsteps': ['1000', '5000', '10000', '50000', '100000', '500000', '1000000'],
      'nstlist': ['1', '5', '10', '20'],
      'rcoulomb': ['0.9', '1.0', '1.2', '1.4'],
      'rvdw': ['0.9', '1.0', '1.2', '1.4'],
      'rlist': ['0.9', '1.0', '1.2', '1.4'],
      'tau-t': ['0.1', '0.2', '0.5', '1.0'],
      'tau-p': ['0.5', '1.0', '2.0', '5.0'],
      'ref-t': ['298.15', '300', '310', '323.15'],
      'ref-p': ['1.0', '1.01325'],
      'fourierspacing': ['0.12', '0.15', '0.16', '0.20'],
      'pme-order': ['4', '6', '8'],
      'ewald-rtol': ['1e-5', '1e-6', '1e-7'],
      'verlet-buffer-tolerance': ['0.005', '0.01', '0.02'],
      'nstxout': ['0', '1000', '5000', '10000'],
      'nstvout': ['0', '1000', '5000', '10000'],
      'nstfout': ['0', '1000', '5000', '10000'],
      'nstenergy': ['100', '500', '1000'],
      'nstlog': ['100', '500', '1000'],
      'nstxtcout': ['0', '1000', '5000', '10000'],
      'xtc-precision': ['1000', '10000'],
      'nstdhdl': ['10', '50', '100']
    };
    
    return commonValues[parameter.name] || [];
  }

  private createParameterDocumentation(param: MdpParameter): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown(`**${param.name}**\n\n`);
    markdown.appendMarkdown(`${param.description}\n\n`);
    
    if (param.defaultValue) {
      markdown.appendMarkdown(`**Default:** ${param.defaultValue}${param.unit ? ` ${param.unit}` : ''}\n\n`);
    }
    
    if (param.type) {
      markdown.appendMarkdown(`**Type:** ${param.type}\n\n`);
    }
    
    if (param.validValues && param.validValues.length > 0) {
      markdown.appendMarkdown(`**Valid values:** ${param.validValues.join(', ')}\n\n`);
    }
    
    if (param.range) {
      const rangeText: string[] = [];
      if (param.range.min !== undefined) {
        rangeText.push(`min: ${param.range.min}`);
      }
      if (param.range.max !== undefined) {
        rangeText.push(`max: ${param.range.max}`);
      }
      if (rangeText.length > 0) {
        markdown.appendMarkdown(`**Range:** ${rangeText.join(', ')}\n\n`);
      }
    }
    
    if (param.unit) {
      markdown.appendMarkdown(`**Unit:** ${param.unit}\n\n`);
    }
    
    return markdown;
  }
  
  private getValueDocumentation(param: MdpParameter, value: string): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    
    // 为特定参数值提供详细说明
    const valueDescriptions: { [key: string]: { [value: string]: string } } = {
      'integrator': {
        'md': 'Leap-frog integrator',
        'md-vv': 'Velocity-verlet integrator',
        'sd': 'Stochastic dynamics integrator',
        'bd': 'Brownian dynamics',
        'steep': 'Steepest descent minimization',
        'cg': 'Conjugate gradient minimization',
        'l-bfgs': 'Limited-memory Broyden-Fletcher-Goldfarb-Shanno minimization'
      },
      'coulombtype': {
        'PME': 'Particle-Mesh Ewald for long-range electrostatics',
        'Cut-off': 'Simple cutoff',
        'Reaction-Field': 'Reaction field method',
        'Ewald': 'Classical Ewald summation'
      },
      'vdwtype': {
        'Cut-off': 'Simple cutoff for van der Waals',
        'Switch': 'Switching function',
        'Shift': 'Force-shifted potential',
        'PME': 'Particle-Mesh Ewald for Lennard-Jones'
      },
      'tcoupl': {
        'no': 'No temperature coupling',
        'berendsen': 'Berendsen weak coupling',
        'nose-hoover': 'Nose-Hoover extended ensemble',
        'v-rescale': 'Velocity rescaling with correct kinetic energy distribution',
        'andersen': 'Andersen thermostat',
        'andersen-massive': 'Andersen thermostat with massive collisions'
      },
      'pcoupl': {
        'no': 'No pressure coupling',
        'berendsen': 'Berendsen weak coupling',
        'parrinello-rahman': 'Extended-ensemble pressure coupling',
        'MTTK': 'Martyna-Tobias-Klein barostat',
        'c-rescale': 'C-rescale barostat'
      }
    };
    
    if (valueDescriptions[param.name] && valueDescriptions[param.name][value]) {
      markdown.appendMarkdown(valueDescriptions[param.name][value]);
    } else {
      markdown.appendMarkdown(`Value: **${value}**`);
    }
    
    return markdown;
  }
}
