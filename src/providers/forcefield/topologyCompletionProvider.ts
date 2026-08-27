import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { TopologyParser, TopologySectionType } from '../../parsers/forcefield/topologyParser';
import { ParserUtils } from '../../parsers/forcefield/common';

/**
 * TopologyCompletionProvider - 为 TOP/ITP 文件提供补全
 */
export class TopologyCompletionProvider implements vscode.CompletionItemProvider {
  private topologyParser: TopologyParser;

  constructor(private indexManager: ForceFieldIndexManager) {
    this.topologyParser = new TopologyParser();
  }

  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const line = document.lineAt(position.line);
    const lineText = line.text.substring(0, position.character);
    const cleanLine = ParserUtils.stripComment(lineText).trim();

    console.log(`[TopologyCompletion] 请求补全: line ${position.line + 1}`);

    // 跳过段标记行和预处理指令
    if (cleanLine.match(/^\[/) || cleanLine.startsWith('#')) {
      return [];
    }

    // 确定当前所在的段
    const currentSection = this.getCurrentSection(document, position.line);
    if (!currentSection) {
      console.log(`[TopologyCompletion] 不在任何段内`);
      return [];
    }

    console.log(`[TopologyCompletion] 当前段: ${currentSection}`);

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[TopologyCompletion] 未找到力场目录`);
      return [];
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 根据段类型提供补全
    switch (currentSection) {
      case TopologySectionType.Atoms:
        return this.provideAtomsCompletion(index, cleanLine);

      case TopologySectionType.Bonds:
      case TopologySectionType.Pairs:
      case TopologySectionType.Angles:
      case TopologySectionType.Dihedrals:
        // 这些段中主要是原子编号，不需要补全
        return [];

      default:
        return [];
    }
  }

  /**
   * 获取当前行所在的段类型
   */
  private getCurrentSection(document: vscode.TextDocument, currentLine: number): TopologySectionType | null {
    // 向上查找最近的段标记
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
        if (sectionName === 'moleculetype') return TopologySectionType.MoleculeType;

        return TopologySectionType.Unknown;
      }
    }

    return null;
  }

  /**
   * 提供 [ atoms ] 段的补全
   * 格式: nr type resnr residue atom cgnr charge mass
   */
  private provideAtomsCompletion(index: any, lineText: string): vscode.CompletionItem[] {
    const tokens = lineText.split(/\s+/).filter(t => t);

    // 第二列：原子类型
    if (tokens.length === 1) {
      return this.createAtomTypeCompletions(index);
    }

    return [];
  }

  /**
   * 创建原子类型补全项
   */
  private createAtomTypeCompletions(index: any): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    for (const [name, atomType] of index.atomTypes) {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
      item.detail = `原子类型 (质量: ${atomType.mass})`;

      if (atomType.description) {
        item.documentation = new vscode.MarkdownString(`${atomType.description}\n\n质量: ${atomType.mass} amu`);
      } else {
        item.documentation = new vscode.MarkdownString(`质量: ${atomType.mass} amu`);
      }

      item.sortText = name;
      completions.push(item);
    }

    console.log(`[TopologyCompletion] ✓ 生成 ${completions.length} 个原子类型补全`);
    return completions;
  }
}
