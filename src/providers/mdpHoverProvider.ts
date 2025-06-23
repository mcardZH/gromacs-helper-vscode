import * as vscode from 'vscode';
import { getMdpParameter } from '../constants/mdpParameters';

export class MdpHoverProvider implements vscode.HoverProvider {
  
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return null;
    }
    
    const word = document.getText(wordRange);
    const lineText = document.lineAt(position).text;
    
    // 检查是否在注释中
    const commentIndex = lineText.indexOf(';');
    if (commentIndex !== -1 && position.character > commentIndex) {
      return null;
    }
    
    // 尝试获取参数信息
    let parameter = getMdpParameter(word);

    // 如果这里没有获取到参数，可能是因为包含【-】，尝试从本行第一个字符开始获取
    let new_text = document.getText(new vscode.Range(position.line, 0, position.line, position.character + 100)) + " ";
    new_text = new_text.split(" ")[0];
    if (!parameter) {
      parameter = getMdpParameter(new_text);
      if (!parameter) { 
        return null;
      }
    }

    
    
    
    // 创建悬停内容
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    // 参数名称和描述
    markdown.appendMarkdown(`### ${parameter.name} [${parameter.category}]\n\n`);
    markdown.appendMarkdown(`${parameter.description}\n\n`);
    
    // 参数详细信息表格
    markdown.appendMarkdown('| Property | Value |\n');
    markdown.appendMarkdown('|----------|-------|\n');
    markdown.appendMarkdown(`| Type | \`${parameter.type}\` |\n`);
    
    if (parameter.defaultValue) {
      markdown.appendMarkdown(`| Default | \`${parameter.defaultValue}\`${parameter.unit ? ` ${parameter.unit}` : ''} |\n`);
    }
    
    if (parameter.unit) {
      markdown.appendMarkdown(`| Unit | ${parameter.unit} |\n`);
    }
    
    if (parameter.range) {
      const rangeText: string[] = [];
      if (parameter.range.min !== undefined) {
        rangeText.push(`min: ${parameter.range.min}`);
      }
      if (parameter.range.max !== undefined) {
        rangeText.push(`max: ${parameter.range.max}`);
      }
      if (rangeText.length > 0) {
        markdown.appendMarkdown(`| Range | ${rangeText.join(', ')} |\n`);
      }
    }
    
    if (parameter.category) {
      markdown.appendMarkdown(`| Category | ${parameter.category} |\n`);
    }
    
    // 有效值
    if (parameter.validValues && parameter.validValues.length > 0) {
      markdown.appendMarkdown('\n#### Valid Values\n');
      parameter.validValues.forEach(value => {
        markdown.appendMarkdown(`- \`${value}\`\n`);
      });
    }
    
    // 添加使用示例
    markdown.appendMarkdown('\n#### Example\n');
    const exampleValue = parameter.defaultValue || (parameter.validValues ? parameter.validValues[0] : 'value');
    markdown.appendCodeblock(`${parameter.name} = ${exampleValue}`, 'mdp');
    
    // 添加相关链接
    markdown.appendMarkdown('\n---\n');
    markdown.appendMarkdown('[📖 GROMACS Manual](https://manual.gromacs.org/current/user-guide/mdp-options.html#mdp-'+ parameter.name + ')');
    // https://manual.gromacs.org/current/user-guide/mdp-options.html#mdp-qmmm-cp2k-qmmultiplicity
    return new vscode.Hover(markdown, wordRange);
  }
}
