import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { ParserUtils } from '../../parsers/forcefield/common';

/**
 * HdbCompletionProvider - 为 HDB 文件提供补全
 *
 * HDB 文件格式:
 * 残基名  氢原子总数
 * nH  geometry  H  atom1  atom2  atom3
 */
export class HdbCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private indexManager: ForceFieldIndexManager) {}

  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const line = document.lineAt(position.line);
    const lineText = line.text.substring(0, position.character);
    const cleanLine = ParserUtils.stripComment(lineText).trim();

    console.log(`[HdbCompletion] 请求补全: line ${position.line + 1}`);

    // 跳过注释行
    if (cleanLine.startsWith(';')) {
      return [];
    }

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[HdbCompletion] 未找到力场目录`);
      return [];
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 判断是否是残基头行还是氢原子条目行
    const tokens = cleanLine.split(/\s+/).filter(t => t);

    // 残基头行: RES_NAME  count
    // 第一列是残基名，如果只有一个 token，补全残基名
    if (tokens.length === 0 || (tokens.length === 1 && !lineText.match(/\s$/))) {
      return this.provideResidueCompletion(index);
    }

    // 氢原子条目行: nH  geometry  H  atom1  atom2  atom3
    // 不提供补全（都是具体的原子名称）
    return [];
  }

  /**
   * 提供残基名称补全
   */
  private provideResidueCompletion(index: any): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    for (const [name, residue] of index.residues) {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Struct);
      item.detail = `残基 (${residue.atoms.size} 个原子)`;

      const md = new vscode.MarkdownString();
      md.appendMarkdown(`**残基**: ${name}\n\n`);
      md.appendMarkdown(`- 原子数: ${residue.atoms.size}\n`);
      md.appendMarkdown(`- 键数: ${residue.bonds.length}\n`);

      item.documentation = md;
      item.sortText = name;

      completions.push(item);
    }

    console.log(`[HdbCompletion] ✓ 生成 ${completions.length} 个残基补全`);
    return completions;
  }
}
