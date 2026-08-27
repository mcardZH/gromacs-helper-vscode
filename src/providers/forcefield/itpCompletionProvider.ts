import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { ItpParser, ItpSectionType } from '../../parsers/forcefield/itpParser';
import { ParserUtils } from '../../parsers/forcefield/common';

/**
 * ItpCompletionProvider - 为 ITP 力场参数文件提供补全
 */
export class ItpCompletionProvider implements vscode.CompletionItemProvider {
  private itpParser: ItpParser;

  constructor(private indexManager: ForceFieldIndexManager) {
    this.itpParser = new ItpParser();
  }

  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const line = document.lineAt(position.line);
    const lineText = line.text.substring(0, position.character);
    const cleanLine = ParserUtils.stripComment(lineText).trim();

    console.log(`[ItpCompletion] 请求补全: line ${position.line + 1}`);

    // 跳过段标记行
    if (cleanLine.match(/^\[/)) {
      return [];
    }

    // 确定当前所在的段
    const currentSection = this.getCurrentSection(document, position.line);
    if (!currentSection) {
      console.log(`[ItpCompletion] 不在任何段内`);
      return [];
    }

    console.log(`[ItpCompletion] 当前段: ${currentSection}`);

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[ItpCompletion] 未找到力场目录`);
      return [];
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 根据段类型提供补全
    switch (currentSection) {
      case ItpSectionType.BondTypes:
        return this.provideBondTypesCompletion(index, cleanLine);

      case ItpSectionType.AngleTypes:
        return this.provideAngleTypesCompletion(index, cleanLine);

      case ItpSectionType.DihedralTypes:
        return this.provideDihedralTypesCompletion(index, cleanLine);

      case ItpSectionType.NonbondParams:
      case ItpSectionType.PairTypes:
        return this.provideNonbondCompletion(index, cleanLine);

      default:
        return [];
    }
  }

  /**
   * 获取当前行所在的段类型
   */
  private getCurrentSection(document: vscode.TextDocument, currentLine: number): ItpSectionType | null {
    // 向上查找最近的段标记
    for (let i = currentLine; i >= 0; i--) {
      const line = document.lineAt(i).text;
      const cleanLine = ParserUtils.stripComment(line).trim();

      const sectionMatch = cleanLine.match(/^\[\s*(\w+)\s*\]$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1].toLowerCase().replace(/[-_]/g, '');

        if (sectionName === 'bondtypes') return ItpSectionType.BondTypes;
        if (sectionName === 'angletypes') return ItpSectionType.AngleTypes;
        if (sectionName === 'dihedraltypes') return ItpSectionType.DihedralTypes;
        if (sectionName === 'nonbondparams') return ItpSectionType.NonbondParams;
        if (sectionName === 'pairtypes') return ItpSectionType.PairTypes;

        return ItpSectionType.Unknown;
      }
    }

    return null;
  }

  /**
   * 提供 bondtypes 段的补全（2个原子类型）
   */
  private provideBondTypesCompletion(index: any, lineText: string): vscode.CompletionItem[] {
    const tokens = lineText.split(/\s+/).filter(t => t);

    // 只在前两列提供原子类型补全
    if (tokens.length === 0 || tokens.length === 1) {
      return this.createAtomTypeCompletions(index, 'bondtypes');
    }

    return [];
  }

  /**
   * 提供 angletypes 段的补全（3个原子类型）
   */
  private provideAngleTypesCompletion(index: any, lineText: string): vscode.CompletionItem[] {
    const tokens = lineText.split(/\s+/).filter(t => t);

    // 只在前三列提供原子类型补全
    if (tokens.length >= 0 && tokens.length <= 2) {
      return this.createAtomTypeCompletions(index, 'angletypes');
    }

    return [];
  }

  /**
   * 提供 dihedraltypes 段的补全（4个原子类型）
   */
  private provideDihedralTypesCompletion(index: any, lineText: string): vscode.CompletionItem[] {
    const tokens = lineText.split(/\s+/).filter(t => t);

    // 只在前四列提供原子类型补全
    if (tokens.length >= 0 && tokens.length <= 3) {
      return this.createAtomTypeCompletions(index, 'dihedraltypes');
    }

    return [];
  }

  /**
   * 提供非键参数段的补全（2个原子类型）
   */
  private provideNonbondCompletion(index: any, lineText: string): vscode.CompletionItem[] {
    const tokens = lineText.split(/\s+/).filter(t => t);

    // 只在前两列提供原子类型补全
    if (tokens.length === 0 || tokens.length === 1) {
      return this.createAtomTypeCompletions(index, 'nonbond');
    }

    return [];
  }

  /**
   * 创建原子类型补全项
   */
  private createAtomTypeCompletions(index: any, context: string): vscode.CompletionItem[] {
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

    console.log(`[ItpCompletion] ✓ 生成 ${completions.length} 个原子类型补全 (context: ${context})`);
    return completions;
  }
}
