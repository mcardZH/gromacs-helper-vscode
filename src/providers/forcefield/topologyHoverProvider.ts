import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { TopologyParser, TopologySectionType } from '../../parsers/forcefield/topologyParser';
import { ParserUtils } from '../../parsers/forcefield/common';

/**
 * 原子信息
 */
interface AtomInfo {
  nr: number;
  type: string;
  resnr: number;
  residue: string;
  atom: string;
  charge: number;
  mass: number;
  line: number;
}

/**
 * TopologyHoverProvider - 为 TOP/ITP 文件提供悬浮提示
 */
export class TopologyHoverProvider implements vscode.HoverProvider {
  private topologyParser: TopologyParser;

  constructor(private indexManager: ForceFieldIndexManager) {
    this.topologyParser = new TopologyParser();
  }

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const line = document.lineAt(position.line);
    const lineText = line.text;

    console.log(`[TopologyHover] 请求 hover: line ${position.line + 1}`);

    // 1. 段标记 hover
    const sectionMatch = lineText.match(/^\s*\[\s*(\w+)\s*\]/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      return this.createSectionHover(sectionName);
    }

    // 2. 原子序号 hover（在 bonds、angles、dihedrals 等段中）
    const wordRange = document.getWordRangeAtPosition(position, /\d+/);
    if (wordRange) {
      const word = document.getText(wordRange);
      const atomNr = parseInt(word, 10);

      // 检查当前是否在需要显示原子信息的段中
      const currentSection = this.getCurrentSection(document, position.line);
      if (this.shouldShowAtomInfo(currentSection)) {
        const atomInfo = await this.getAtomInfo(document, atomNr);
        if (atomInfo) {
          console.log(`[TopologyHover] ✓ 找到原子信息: ${atomNr} -> ${atomInfo.residue} ${atomInfo.atom}`);
          return this.createAtomInfoHover(atomInfo);
        }
      }
    }

    // 3. 原子类型 hover
    const wordRange2 = document.getWordRangeAtPosition(position, /[A-Za-z0-9_]+/);
    if (!wordRange2) {
      return null;
    }

    const word = document.getText(wordRange2);

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[TopologyHover] 未找到力场目录`);
      return null;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 检查是否是原子类型
    const atomType = index.atomTypes.get(word);
    if (atomType) {
      console.log(`[TopologyHover] ✓ 找到原子类型: ${word}`);
      return this.createAtomTypeHover(atomType);
    }

    return null;
  }

  /**
   * 判断当前段是否应该显示原子信息
   */
  private shouldShowAtomInfo(sectionType: TopologySectionType | null): boolean {
    if (!sectionType) {
      return false;
    }

    return [
      TopologySectionType.Bonds,
      TopologySectionType.Pairs,
      TopologySectionType.Angles,
      TopologySectionType.Dihedrals,
      TopologySectionType.Exclusions,
      TopologySectionType.Constraints,
      TopologySectionType.SettleS,
      TopologySectionType.VirtualSites,
      TopologySectionType.Position_Restraints,
    ].includes(sectionType);
  }

  /**
   * 获取原子信息
   */
  private async getAtomInfo(document: vscode.TextDocument, atomNr: number): Promise<AtomInfo | null> {
    const parseResult = this.topologyParser.parse(document);

    // 查找 [ atoms ] 段
    const atomsSections = parseResult.sections.get(TopologySectionType.Atoms) || [];
    for (const section of atomsSections) {
      for (const entry of section.entries) {
        // 格式: nr type resnr residue atom cgnr charge mass
        if (entry.tokens.length >= 8) {
          const nr = parseInt(entry.tokens[0], 10);
          if (nr === atomNr) {
            return {
              nr,
              type: entry.tokens[1],
              resnr: parseInt(entry.tokens[2], 10),
              residue: entry.tokens[3],
              atom: entry.tokens[4],
              charge: parseFloat(entry.tokens[6]),
              mass: parseFloat(entry.tokens[7]),
              line: entry.line,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * 获取当前行所在的段类型
   */
  private getCurrentSection(document: vscode.TextDocument, currentLine: number): TopologySectionType | null {
    for (let i = currentLine; i >= 0; i--) {
      const line = document.lineAt(i).text;
      const cleanLine = ParserUtils.stripComment(line).trim();

      const sectionMatch = cleanLine.match(/^\[\s*(\w+)\s*\]$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1].toLowerCase().replace(/[-_]/g, '');

        if (sectionName === 'atoms') return TopologySectionType.Atoms;
        if (sectionName === 'bonds') return TopologySectionType.Bonds;
        if (sectionName === 'pairs') return TopologySectionType.Pairs;
        if (sectionName === 'angles') return TopologySectionType.Angles;
        if (sectionName === 'dihedrals') return TopologySectionType.Dihedrals;
        if (sectionName === 'exclusions') return TopologySectionType.Exclusions;
        if (sectionName === 'constraints') return TopologySectionType.Constraints;
        if (sectionName === 'settles') return TopologySectionType.SettleS;
        if (sectionName.startsWith('virtualsites')) return TopologySectionType.VirtualSites;
        if (sectionName === 'positionrestraints') return TopologySectionType.Position_Restraints;

        return TopologySectionType.Unknown;
      }
    }

    return null;
  }

  /**
   * 创建原子信息的 hover
   */
  private createAtomInfoHover(atomInfo: AtomInfo): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`### 原子 #${atomInfo.nr}\n\n`);
    md.appendMarkdown(`**残基**: ${atomInfo.residue} ${atomInfo.resnr}\n\n`);
    md.appendMarkdown(`**原子名**: ${atomInfo.atom}\n\n`);
    md.appendMarkdown(`**原子类型**: \`${atomInfo.type}\`\n\n`);
    md.appendMarkdown(`**电荷**: ${atomInfo.charge.toFixed(2)} e\n\n`);
    md.appendMarkdown(`**质量**: ${atomInfo.mass.toFixed(4)} amu\n\n`);
    md.isTrusted = true;

    return new vscode.Hover(md);
  }

  /**
   * 创建段标记的 hover
   */
  private createSectionHover(sectionName: string): vscode.Hover | null {
    const docs = this.getSectionDocs(sectionName.toLowerCase());
    if (!docs) {
      return null;
    }

    const md = new vscode.MarkdownString();
    md.appendMarkdown(docs);
    md.isTrusted = true;

    console.log(`[TopologyHover] ✓ 段标记 hover: [${sectionName}]`);
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
   * 获取段文档
   */
  private getSectionDocs(sectionName: string): string | null {
    const docs: Record<string, string> = {
      'atoms': `### \`[ atoms ]\` - 原子定义

**格式:**
\`\`\`
nr  type  resnr  residue  atom  cgnr  charge  mass
\`\`\`

**参数说明:**
- \`nr\`: 原子编号
- \`type\`: 原子类型
- \`resnr\`: 残基编号
- \`residue\`: 残基名称
- \`atom\`: 原子名称
- \`cgnr\`: 电荷组编号
- \`charge\`: 电荷 (e)
- \`mass\`: 质量 (amu，可选)
`,

      'bonds': `### \`[ bonds ]\` - 键定义

**格式:**
\`\`\`
ai  aj  func  [parameters...]
\`\`\`

**参数说明:**
- \`ai, aj\`: 原子编号
- \`func\`: 函数类型
- 后续参数依函数类型而定
`,

      'pairs': `### \`[ pairs ]\` - 1-4 相互作用

**格式:**
\`\`\`
ai  aj  func
\`\`\`

**参数说明:**
- \`ai, aj\`: 原子编号（通过三个键相连）
- \`func\`: 函数类型
`,

      'angles': `### \`[ angles ]\` - 角定义

**格式:**
\`\`\`
ai  aj  ak  func  [parameters...]
\`\`\`

**参数说明:**
- \`ai, aj, ak\`: 原子编号（aj 为中心原子）
- \`func\`: 函数类型
`,

      'dihedrals': `### \`[ dihedrals ]\` - 二面角定义

**格式:**
\`\`\`
ai  aj  ak  al  func  [parameters...]
\`\`\`

**参数说明:**
- \`ai, aj, ak, al\`: 原子编号
- \`func\`: 函数类型
`,

      'moleculetype': `### \`[ moleculetype ]\` - 分子类型定义

**格式:**
\`\`\`
name  nrexcl
\`\`\`

**参数说明:**
- \`name\`: 分子名称
- \`nrexcl\`: 排除相邻键的数量（通常为 3）
`,

      'system': `### \`[ system ]\` - 系统名称

定义模拟系统的名称。
`,

      'molecules': `### \`[ molecules ]\` - 分子列表

**格式:**
\`\`\`
molecule_name  number
\`\`\`

列出系统中包含的分子及其数量。
`,
    };

    return docs[sectionName] || null;
  }
}
