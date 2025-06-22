import * as vscode from 'vscode';
import { MDP_PARAMETERS, getMdpParameter, MdpParameter } from '../constants/mdpParameters';

export class MdpCompletionProvider implements vscode.CompletionItemProvider {
  
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);
    
    // 检查是否在注释中
    if (textBeforeCursor.includes(';')) {
      return [];
    }
    
    // 检查是否在参数值位置（等号后面）
    const parameterValueMatch = textBeforeCursor.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*(.*)$/);
    if (parameterValueMatch) {
      return this.provideParameterValueCompletions(parameterValueMatch[1], parameterValueMatch[2]);
    }
    
    // 检查是否在输入参数名
    const parameterNameMatch = textBeforeCursor.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)$/);
    if (parameterNameMatch || textBeforeCursor.trim() === '' || /^\s*$/.test(textBeforeCursor)) {
      return this.provideParameterNameCompletions();
    }
    
    return [];
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
  
  private provideParameterValueCompletions(paramName: string, currentValue: string): vscode.CompletionItem[] {
    const parameter = getMdpParameter(paramName);
    if (!parameter) {
      return [];
    }
    
    const completions: vscode.CompletionItem[] = [];
    
    // 如果有有效值列表，提供这些选项
    if (parameter.validValues) {
      parameter.validValues.forEach(value => {
        const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
        item.detail = `Valid value for ${parameter.name}`;
        item.documentation = this.getValueDocumentation(parameter, value);
        completions.push(item);
      });
    }
    
    // 如果是数值类型，提供默认值和示例
    if (parameter.type === 'real' || parameter.type === 'integer') {
      if (parameter.defaultValue) {
        const item = new vscode.CompletionItem(parameter.defaultValue, vscode.CompletionItemKind.Value);
        item.detail = `Default value for ${parameter.name}`;
        item.documentation = `Default: ${parameter.defaultValue}${parameter.unit ? ` ${parameter.unit}` : ''}`;
        completions.push(item);
      }
      
      // 提供范围提示
      if (parameter.range) {
        if (parameter.range.min !== undefined) {
          const minItem = new vscode.CompletionItem(parameter.range.min.toString(), vscode.CompletionItemKind.Value);
          minItem.detail = `Minimum value for ${parameter.name}`;
          completions.push(minItem);
        }
        if (parameter.range.max !== undefined) {
          const maxItem = new vscode.CompletionItem(parameter.range.max.toString(), vscode.CompletionItemKind.Value);
          maxItem.detail = `Maximum value for ${parameter.name}`;
          completions.push(maxItem);
        }
      }
    }
    
    // 布尔类型提供 yes/no
    if (parameter.type === 'boolean') {
      ['yes', 'no'].forEach(value => {
        const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
        item.detail = `Boolean value for ${parameter.name}`;
        completions.push(item);
      });
    }
    
    return completions;
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
