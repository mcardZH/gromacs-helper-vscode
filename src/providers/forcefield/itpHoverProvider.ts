import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { ItpParser, ItpSectionType } from '../../parsers/forcefield/itpParser';

/**
 * ItpHoverProvider - 为 ffbonded.itp、ffnonbonded.itp 等文件提供悬浮提示
 */
export class ItpHoverProvider implements vscode.HoverProvider {
  private itpParser: ItpParser;
  private sectionDocs: Map<string, string>;

  constructor(private indexManager: ForceFieldIndexManager) {
    this.itpParser = new ItpParser();
    this.sectionDocs = this.initializeSectionDocs();
  }

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const line = document.lineAt(position.line);
    const lineText = line.text;

    console.log(`[ItpHover] 请求 hover: line ${position.line + 1}`);

    // 1. 段标记 hover
    const sectionMatch = lineText.match(/^\s*\[\s*(\w+)\s*\]/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      return this.createSectionHover(sectionName);
    }

    // 2. 原子类型 hover
    const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z0-9_]+/);
    if (!wordRange) {
      return null;
    }

    const word = document.getText(wordRange);

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[ItpHover] 未找到力场目录`);
      return null;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 检查是否是原子类型
    const atomType = index.atomTypes.get(word);
    if (atomType) {
      console.log(`[ItpHover] ✓ 找到原子类型: ${word}`);
      return this.createAtomTypeHover(atomType);
    }

    return null;
  }

  /**
   * 创建段标记的 hover
   */
  private createSectionHover(sectionName: string): vscode.Hover | null {
    const docs = this.sectionDocs.get(sectionName.toLowerCase());
    if (!docs) {
      return null;
    }

    const md = new vscode.MarkdownString();
    md.appendMarkdown(docs);
    md.isTrusted = true;

    console.log(`[ItpHover] ✓ 段标记 hover: [${sectionName}]`);
    return new vscode.Hover(md);
  }

  /**
   * 创建原子类型的 hover
   */
  private createAtomTypeHover(atomType: any): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`### 原子类型: \`${atomType.name}\`\n\n`);
    md.appendMarkdown(`**质量**: ${atomType.mass} amu\n\n`);

    if (atomType.description) {
      md.appendMarkdown(`**描述**: ${atomType.description}\n\n`);
    }

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`[跳转到定义](${atomType.location.uri.toString()}#L${atomType.location.range.start.line + 1})`);
    md.isTrusted = true;

    return new vscode.Hover(md);
  }

  /**
   * 初始化段文档
   */
  private initializeSectionDocs(): Map<string, string> {
    const docs = new Map<string, string>();

    docs.set('atomtypes', `### \`[ atomtypes ]\` - 原子类型定义

**格式:**
\`\`\`
name  at.num  mass  charge  ptype  sigma  epsilon
\`\`\`

或简化格式:
\`\`\`
name  mass  charge  ptype  sigma  epsilon
\`\`\`

**参数说明:**
- \`name\`: 原子类型名称
- \`at.num\`: 原子序数（可选）
- \`mass\`: 原子质量 (amu)
- \`charge\`: 电荷 (e)
- \`ptype\`: 粒子类型 (A=atom, S=shell, V=virtual)
- \`sigma\`: Lennard-Jones σ 参数 (nm)
- \`epsilon\`: Lennard-Jones ε 参数 (kJ/mol)
`);

    docs.set('bondtypes', `### \`[ bondtypes ]\` - 键参数定义

**格式:**
\`\`\`
i  j  func  b0  kb
\`\`\`

**参数说明:**
- \`i, j\`: 原子类型
- \`func\`: 函数类型 (1=harmonic, 2=G96, 3=Morse, 等)
- \`b0\`: 平衡键长 (nm)
- \`kb\`: 力常数 (kJ mol⁻¹ nm⁻²)
`);

    docs.set('angletypes', `### \`[ angletypes ]\` - 角参数定义

**格式:**
\`\`\`
i  j  k  func  th0  cth
\`\`\`

**参数说明:**
- \`i, j, k\`: 原子类型（j 为中心原子）
- \`func\`: 函数类型 (1=harmonic, 2=G96, 5=Urey-Bradley, 等)
- \`th0\`: 平衡角度 (度)
- \`cth\`: 力常数 (kJ mol⁻¹ rad⁻²)
`);

    docs.set('dihedraltypes', `### \`[ dihedraltypes ]\` - 二面角参数定义

**格式:**
\`\`\`
i  j  k  l  func  [parameters...]
\`\`\`

**参数说明:**
- \`i, j, k, l\`: 原子类型
- \`func\`: 函数类型
  - 1: Proper dihedral (Ryckaert-Bellemans)
  - 2: Improper dihedral (harmonic)
  - 3: Proper dihedral (Fourier)
  - 4: Improper dihedral (periodic)
  - 9: Multiple proper dihedrals
- 后续参数依函数类型而定
`);

    docs.set('nonbond_params', `### \`[ nonbond_params ]\` - 非键参数定义

**格式:**
\`\`\`
i  j  func  sigma  epsilon
\`\`\`

**参数说明:**
- \`i, j\`: 原子类型对
- \`func\`: 函数类型 (1=LJ, 2=Buckingham)
- \`sigma\`: Lennard-Jones σ 参数 (nm)
- \`epsilon\`: Lennard-Jones ε 参数 (kJ/mol)

用于覆盖组合规则生成的默认非键参数。
`);

    docs.set('pairtypes', `### \`[ pairtypes ]\` - 1-4 相互作用参数

**格式:**
\`\`\`
i  j  func  sigma  epsilon
\`\`\`

**参数说明:**
- \`i, j\`: 原子类型
- \`func\`: 函数类型
- \`sigma, epsilon\`: LJ 参数

用于定义通过三个键相连的原子对（1-4 相互作用）的特殊参数。
`);

    docs.set('impropers', `### \`[ impropers ]\` - Improper 二面角

**格式:**
\`\`\`
i  j  k  l  func  phase  kd  pn
\`\`\`

**参数说明:**
- \`i, j, k, l\`: 原子类型
- \`func\`: 函数类型
- \`phase\`: 相位角 (度)
- \`kd\`: 力常数 (kJ/mol)
- \`pn\`: 周期数
`);

    return docs;
  }
}
