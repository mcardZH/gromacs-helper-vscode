import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';

/**
 * TdbHoverProvider - .tdb 文件的悬浮提示提供者
 * 提供 replace/add/delete 等关键字的格式说明，以及原子名称和残基名称的信息
 */
export class TdbHoverProvider implements vscode.HoverProvider {
  private keywordDocs: Map<string, string>;

  constructor(private indexManager: ForceFieldIndexManager) {
    this.keywordDocs = new Map([
      ['replace', this.getReplaceDoc()],
      ['add', this.getAddDoc()],
      ['delete', this.getDeleteDoc()],
      ['bonds', this.getBondsDoc()],
      ['impropers', this.getImpropersDoc()],
      ['cmap', this.getCmapDoc()],
    ]);
  }

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) {
      return null;
    }

    const word = document.getText(range).toLowerCase();
    console.log(`[TdbHover] 悬浮请求: ${word}`);

    // 检查是否在段标记内（[ replace ]）
    const line = document.lineAt(position.line).text;
    const sectionMatch = line.match(/^\s*\[\s*(\w+)\s*\]/);

    if (sectionMatch && this.keywordDocs.has(word)) {
      console.log(`[TdbHover] ✓ 显示关键字文档: ${word}`);
      const md = new vscode.MarkdownString(this.keywordDocs.get(word));
      md.isTrusted = true;
      return new vscode.Hover(md);
    }

    // 尝试获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      return null;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 检查是否是原子类型
    const wordOriginal = document.getText(range);
    if (index.atomTypes.has(wordOriginal)) {
      console.log(`[TdbHover] ✓ 显示原子类型信息: ${wordOriginal}`);
      return this.createAtomTypeHover(index.atomTypes.get(wordOriginal)!);
    }

    // 检查是否是残基名（在段标记中）
    const residueMatch = line.match(/^\s*\[\s*([A-Z][A-Z0-9-]+)\s*\]/);
    if (residueMatch && index.residues.has(residueMatch[1])) {
      console.log(`[TdbHover] ✓ 显示残基信息: ${residueMatch[1]}`);
      return this.createResidueHover(residueMatch[1], index);
    }

    return null;
  }

  private getReplaceDoc(): string {
    return `### \`[ replace ]\` - 替换现有原子属性

**格式:**
\`\`\`
atom_old  atom_new  type_new  mass_new  charge_new
\`\`\`

**示例:**
\`\`\`
C    C    CC    12.011    0.34
O    OT1  OC    15.9994   -0.67
\`\`\`

**说明:**
- \`atom_old\`: 原残基中的原子名称
- \`atom_new\`: 新的原子名称（可以与 atom_old 相同）
- \`type_new\`: 新的原子类型（必须在 atomtypes.atp 中定义）
- \`mass_new\`: 新的质量
- \`charge_new\`: 新的电荷

**用途:** 修改 terminus 处原子的类型、电荷等属性`;
  }

  private getAddDoc(): string {
    return `### \`[ add ]\` - 添加新原子

**格式（第1行）:**
\`\`\`
nh  type  name  ref1  ref2  ref3
\`\`\`

**格式（第2行）:**
\`\`\`
    atom_type  mass  charge  charge_group
\`\`\`

**示例:**
\`\`\`
2  8  OT  C  CA  N
   OC  15.9994  -0.67  -1
\`\`\`

**说明:**
- \`nh\`: 要添加的氢原子数量
- \`type\`: 几何类型（1-4，决定原子放置位置）
  - 1: 单个原子，特定几何
  - 2: 两个原子（如 NH2）
  - 3: 三个原子（如 CH3）
  - 4: 相对于3个参考原子定位
- \`name\`: 原子名称
- \`ref1-3\`: 定位参考的原子名
- \`atom_type\`: 原子类型
- \`mass\`: 质量
- \`charge\`: 电荷
- \`charge_group\`: 电荷组（-1 表示新电荷组）

**用途:** 在 terminus 处添加新原子（如 N-端的 H3+）`;
  }

  private getDeleteDoc(): string {
    return `### \`[ delete ]\` - 删除原子

**格式:**
\`\`\`
atom_name
\`\`\`

**示例:**
\`\`\`
OXT
HN
\`\`\`

**说明:**
- 每行一个要删除的原子名称
- 原子名必须存在于原残基定义中

**用途:** 从 terminus 移除不需要的原子`;
  }

  private getBondsDoc(): string {
    return `### \`[ bonds ]\` - 定义新键

**格式:**
\`\`\`
atom1  atom2
\`\`\`

**示例:**
\`\`\`
NT    CAT
C     +N
\`\`\`

**说明:**
- 定义 terminus 修饰后新增的键
- 可以使用跨残基引用（+N, -C）

**用途:** 添加因 terminus 修饰而产生的新键`;
  }

  private getImpropersDoc(): string {
    return `### \`[ impropers ]\` - 定义 improper 二面角

**格式:**
\`\`\`
atom1  atom2  atom3  atom4
\`\`\`

**示例:**
\`\`\`
NT     C       CAT      HNT
C      CA      NT       O
\`\`\`

**说明:**
- 定义 terminus 修饰后的 improper 二面角
- 用于保持平面性

**用途:** 维持 terminus 处的几何约束`;
  }

  private getCmapDoc(): string {
    return `### \`[ cmap ]\` - 定义 CMAP 校正

**格式:**
\`\`\`
atom1  atom2  atom3  atom4  atom5
\`\`\`

**示例:**
\`\`\`
-C     N       CA      C        NT
\`\`\`

**说明:**
- CHARMM 力场特有的骨架二面角校正
- 通常涉及 φ/ψ 二面角

**用途:** 对 terminus 处的骨架二面角应用 CMAP 校正`;
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

    md.appendMarkdown(`### Terminus Modification: \`${residueName}\`\n\n`);
    md.appendMarkdown(`**Base Residue:** ${residueName.replace(/^(N-?|C-?)/, '')}\n\n`);

    if (residue.atoms) {
      md.appendMarkdown(`**Original Atoms:** ${residue.atoms.length}\n\n`);
      md.appendMarkdown(`**Original Bonds:** ${residue.bonds.length}\n\n`);

      const totalCharge = residue.atoms.reduce((sum: number, a: any) => sum + a.charge, 0);
      md.appendMarkdown(`**Original Total Charge:** ${totalCharge.toFixed(3)} e\n\n`);
    }

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(
      `[Go to residue definition](${residue.location.uri.toString()}#L${residue.location.range.start.line + 1})`
    );

    return new vscode.Hover(md);
  }
}
