import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';

/**
 * HdbHoverProvider - .hdb 文件的悬浮提示提供者
 */
export class HdbHoverProvider implements vscode.HoverProvider {
  constructor(private indexManager: ForceFieldIndexManager) {}

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const range = document.getWordRangeAtPosition(position, /[A-Za-z][A-Za-z0-9']*/);
    if (!range) {
      return null;
    }

    const word = document.getText(range);
    console.log(`[HdbHover] 悬浮请求: ${word}`);

    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[HdbHover] ✗ 未找到力场目录`);
      return null;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 检查是否是残基名
    if (index.residues.has(word)) {
      console.log(`[HdbHover] ✓ 显示残基信息: ${word}`);
      return this.createResidueHover(word, index);
    }

    // 检查是否是原子类型
    if (index.atomTypes.has(word)) {
      console.log(`[HdbHover] ✓ 显示原子类型信息: ${word}`);
      return this.createAtomTypeHover(index.atomTypes.get(word)!);
    }

    // 检查是否是原子名（在当前残基的atoms中）
    const line = document.lineAt(position.line).text;
    const lineMatch = line.match(/^([A-Z][A-Z0-9]*)\s+(\d+)\s+(\d+)\s+(.+)$/);
    if (lineMatch) {
      const residueName = lineMatch[1];
      const atomNames = lineMatch[4].trim().split(/\s+/);

      if (atomNames.includes(word) && index.residues.has(residueName)) {
        console.log(`[HdbHover] ✓ 显示原子名信息: ${word} in ${residueName}`);
        return this.createAtomNameHover(word, residueName, index);
      }
    }

    return null;
  }

  /**
   * 创建残基悬浮信息
   */
  private createResidueHover(residueName: string, index: any): vscode.Hover {
    const residue = index.residues.get(residueName);
    if (!residue) {
      return new vscode.Hover('');
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### Residue: \`${residue.name}\`\n\n`);
    md.appendMarkdown(`**Atoms:** ${residue.atoms.length}\n\n`);
    md.appendMarkdown(`**Bonds:** ${residue.bonds.length}\n\n`);

    const totalCharge = residue.atoms.reduce((sum: number, a: any) => sum + a.charge, 0);
    md.appendMarkdown(`**Total Charge:** ${totalCharge.toFixed(3)} e\n\n`);

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(
      `[Go to definition](${residue.location.uri.toString()}#L${residue.location.range.start.line + 1})`
    );

    return new vscode.Hover(md);
  }

  /**
   * 创建原子类型悬浮信息
   */
  private createAtomTypeHover(atomType: any): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### Atom Type: \`${atomType.name}\`\n\n`);
    md.appendMarkdown(`**Mass:** ${atomType.mass} amu\n\n`);

    if (atomType.description) {
      md.appendMarkdown(`**Description:** ${atomType.description}\n\n`);
    }

    return new vscode.Hover(md);
  }

  /**
   * 创建原子名悬浮信息
   */
  private createAtomNameHover(atomName: string, residueName: string, index: any): vscode.Hover {
    const residue = index.residues.get(residueName);
    const atom = residue?.atoms.find((a: any) => a.name === atomName);

    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### Atom: \`${atomName}\`\n\n`);
    md.appendMarkdown(`**Residue:** ${residueName}\n\n`);

    if (atom) {
      md.appendMarkdown(`**Type:** ${atom.type}\n\n`);
      md.appendMarkdown(`**Charge:** ${atom.charge} e\n\n`);
      md.appendMarkdown(`**Charge Group:** ${atom.chargeGroup}\n\n`);
    }

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`**HDB Entry Format:**\n`);
    md.appendMarkdown('```\n');
    md.appendMarkdown('ResidueName  NumH  GeometryType  Atom1  Atom2  Atom3  ...\n');
    md.appendMarkdown('```\n');

    return new vscode.Hover(md);
  }
}
