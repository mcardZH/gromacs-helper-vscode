import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { AtomType } from '../../types/forcefield';

/**
 * RtpHoverProvider - .rtp 文件的悬浮提示提供者
 */
export class RtpHoverProvider implements vscode.HoverProvider {
  constructor(private indexManager: ForceFieldIndexManager) {}

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) {
      return null;
    }

    const word = document.getText(range);
    console.log(`[RtpHover] 悬浮请求: ${word}`);

    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[RtpHover] ✗ 未找到力场目录`);
      return null;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 检查是否是原子类型
    if (index.atomTypes.has(word)) {
      console.log(`[RtpHover] ✓ 显示原子类型信息: ${word}`);
      return this.createAtomTypeHover(index.atomTypes.get(word)!);
    }

    // 检查是否是残基名（包括在段标记中或作为引用）
    if (index.residues.has(word)) {
      console.log(`[RtpHover] ✓ 显示残基信息: ${word}`);
      return this.createResidueHover(word, index);
    }

    // 检查是否是段标记关键字
    const sectionKeywords = ['atoms', 'bonds', 'angles', 'dihedrals', 'impropers', 'cmap', 'bondedtypes'];
    if (sectionKeywords.includes(word.toLowerCase())) {
      const line = document.lineAt(position.line).text;
      if (line.match(/^\s*\[\s*\w+\s*\]/)) {
        console.log(`[RtpHover] ✓ 显示段标记说明: ${word}`);
        return this.createSectionKeywordHover(word.toLowerCase());
      }
    }

    return null;
  }

  /**
   * 创建原子类型悬浮信息
   */
  private createAtomTypeHover(atomType: AtomType): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### Atom Type: \`${atomType.name}\`\n\n`);
    md.appendMarkdown(`**Mass:** ${atomType.mass} amu\n\n`);

    if (atomType.description) {
      md.appendMarkdown(`**Description:** ${atomType.description}\n\n`);
    }

    if (atomType.sigma !== undefined && atomType.epsilon !== undefined) {
      md.appendMarkdown(`**Lennard-Jones Parameters:**\n`);
      md.appendMarkdown(`- σ (sigma): ${atomType.sigma.toFixed(4)} nm\n`);
      md.appendMarkdown(`- ε (epsilon): ${atomType.epsilon.toFixed(4)} kJ/mol\n\n`);
    }

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(
      `[Go to definition](${atomType.location.uri.toString()}#L${atomType.location.range.start.line + 1})`
    );

    return new vscode.Hover(md);
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

    // 计算总电荷
    const totalCharge = residue.atoms.reduce((sum: number, a: any) => sum + a.charge, 0);
    md.appendMarkdown(`**Total Charge:** ${totalCharge.toFixed(3)} e\n\n`);

    if (residue.impropers.length > 0) {
      md.appendMarkdown(`**Impropers:** ${residue.impropers.length}\n\n`);
    }

    if (residue.cmaps.length > 0) {
      md.appendMarkdown(`**CMAP:** ${residue.cmaps.length}\n\n`);
    }

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(
      `[Go to definition](${residue.location.uri.toString()}#L${residue.location.range.start.line + 1})`
    );

    return new vscode.Hover(md);
  }

  /**
   * 创建段标记关键字悬浮信息
   */
  private createSectionKeywordHover(keyword: string): vscode.Hover {
    const docs: { [key: string]: string } = {
      atoms: `### \`[ atoms ]\` - 原子定义

**格式:**
\`\`\`
atom_name  atom_type  charge  charge_group
\`\`\`

**示例:**
\`\`\`
N     NH1    -0.47   0
CA    CT1     0.07   1
C     C       0.51   2
O     O      -0.51   2
\`\`\`

**说明:**
- \`atom_name\`: 原子名称（唯一）
- \`atom_type\`: 原子类型（必须在 atomtypes.atp 中定义）
- \`charge\`: 部分电荷（e）
- \`charge_group\`: 电荷组编号`,

      bonds: `### \`[ bonds ]\` - 键定义

**格式:**
\`\`\`
atom1  atom2
\`\`\`

**示例:**
\`\`\`
N    CA
CA   C
C    +N
-C   N
\`\`\`

**说明:**
- 定义残基内的键
- 支持跨残基引用：\`+N\` (下一个残基)、\`-C\` (前一个残基)
- 键参数从 ffbonded.itp 自动查找`,

      impropers: `### \`[ impropers ]\` - Improper 二面角

**格式:**
\`\`\`
atom1  atom2  atom3  atom4
\`\`\`

**示例:**
\`\`\`
N     -C    CA    HN
C     CA    +N    O
\`\`\`

**说明:**
- 用于维持平面性（如肽键、芳香环）
- 通常涉及 sp2 杂化的中心原子
- 参数从 ffbonded.itp 查找`,

      cmap: `### \`[ cmap ]\` - CMAP 校正

**格式:**
\`\`\`
atom1  atom2  atom3  atom4  atom5
\`\`\`

**示例:**
\`\`\`
-C    N     CA    C     +N
\`\`\`

**说明:**
- CHARMM 力场特有的骨架校正
- 对 φ/ψ 二面角应用 2D 校正图
- 校正数据在 cmap.itp 中定义`,

      bondedtypes: `### \`[ bondedtypes ]\` - 键合类型设置

**格式:**
\`\`\`
bonds  angles  dihedrals  impropers  all_dihedrals  nrexcl  HH14  RemoveDih
\`\`\`

**示例:**
\`\`\`
1      5       9          2          1              3       1     0
\`\`\`

**说明:**
- \`bonds\`: 键函数类型（1=谐振）
- \`angles\`: 角函数类型（5=Urey-Bradley）
- \`dihedrals\`: 二面角函数类型（9=多重傅里叶）
- \`impropers\`: Improper 函数类型（2=谐振）
- \`all_dihedrals\`: 生成所有二面角（1=是，0=仅重原子）
- \`nrexcl\`: 排除邻居数（通常为3）
- \`HH14\`: 生成1-4 H-H相互作用（1=是）
- \`RemoveDih\`: 移除improper键上的二面角（0=否）`,

      angles: `### \`[ angles ]\` - 角定义

**格式:**
\`\`\`
atom1  atom2  atom3
\`\`\`

**说明:**
- 定义三原子夹角
- 通常自动从键生成，很少手动定义
- 参数从 ffbonded.itp 查找`,

      dihedrals: `### \`[ dihedrals ]\` - 二面角定义

**格式:**
\`\`\`
atom1  atom2  atom3  atom4
\`\`\`

**说明:**
- 定义四原子二面角
- 通常自动从键生成
- 参数从 ffbonded.itp 查找`,
    };

    const md = new vscode.MarkdownString(docs[keyword] || `### \`[ ${keyword} ]\``);
    md.isTrusted = true;
    return new vscode.Hover(md);
  }
}

