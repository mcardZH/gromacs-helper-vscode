import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { ParserUtils } from '../../parsers/forcefield/common';

/**
 * TDB 文件中的段类型
 */
enum TdbSectionType {
  Replace = 'replace',
  Add = 'add',
  Delete = 'delete',
  Bonds = 'bonds',
  Impropers = 'impropers',
  Cmap = 'cmap',
  Unknown = 'unknown',
}

/**
 * TdbCompletionProvider - 为 TDB 文件提供补全
 */
export class TdbCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private indexManager: ForceFieldIndexManager) {}

  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const line = document.lineAt(position.line);
    const lineText = line.text.substring(0, position.character);
    const cleanLine = ParserUtils.stripComment(lineText).trim();

    console.log(`[TdbCompletion] 请求补全: line ${position.line + 1}`);

    // 跳过段标记行
    if (cleanLine.match(/^\[/)) {
      return [];
    }

    // 确定当前所在的段
    const currentSection = this.getCurrentSection(document, position.line);
    if (!currentSection) {
      console.log(`[TdbCompletion] 不在任何段内`);
      return [];
    }

    console.log(`[TdbCompletion] 当前段: ${currentSection}`);

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[TdbCompletion] 未找到力场目录`);
      return [];
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 根据段类型提供补全
    switch (currentSection) {
      case TdbSectionType.Replace:
        return this.provideReplaceCompletion(index, cleanLine);

      case TdbSectionType.Add:
        return this.provideAddCompletion(index, cleanLine, lineText);

      case TdbSectionType.Impropers:
        return this.provideImpropersCompletion(index, cleanLine);

      case TdbSectionType.Bonds:
        return this.provideBondsCompletion(index, cleanLine);

      default:
        return [];
    }
  }

  /**
   * 获取当前行所在的段类型
   */
  private getCurrentSection(document: vscode.TextDocument, currentLine: number): TdbSectionType | null {
    // 向上查找最近的段标记
    for (let i = currentLine; i >= 0; i--) {
      const line = document.lineAt(i).text;
      const cleanLine = ParserUtils.stripComment(line).trim();

      const sectionMatch = cleanLine.match(/^\[\s*(\w+)\s*\]$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1].toLowerCase();

        if (sectionName === 'replace') return TdbSectionType.Replace;
        if (sectionName === 'add') return TdbSectionType.Add;
        if (sectionName === 'delete') return TdbSectionType.Delete;
        if (sectionName === 'bonds') return TdbSectionType.Bonds;
        if (sectionName === 'impropers') return TdbSectionType.Impropers;
        if (sectionName === 'cmap') return TdbSectionType.Cmap;

        return TdbSectionType.Unknown;
      }
    }

    return null;
  }

  /**
   * 提供 [ replace ] 段的补全
   * 格式: old_atom new_atom atom_type mass charge
   */
  private provideReplaceCompletion(index: any, lineText: string): vscode.CompletionItem[] {
    const tokens = lineText.split(/\s+/).filter(t => t);

    // 第三列：原子类型
    if (tokens.length === 2) {
      return this.createAtomTypeCompletions(index, 'replace');
    }

    return [];
  }

  /**
   * 提供 [ add ] 段的补全
   * 第一行格式: nH geometry atom_name ref1 ref2 ref3
   * 第二行格式: atom_type mass charge chargegroup
   */
  private provideAddCompletion(index: any, cleanLine: string, rawLine: string): vscode.CompletionItem[] {
    const tokens = cleanLine.split(/\s+/).filter(t => t);

    // 判断是第一行还是第二行（第二行以空格开头）
    const isSecondLine = rawLine.match(/^\s+\S/);

    if (isSecondLine) {
      // 第二行：第一列是原子类型
      if (tokens.length === 0) {
        return this.createAtomTypeCompletions(index, 'add-atomtype');
      }
    }

    return [];
  }

  /**
   * 提供 [ impropers ] 段的补全
   * 格式: atom1 atom2 atom3 atom4
   */
  private provideImpropersCompletion(index: any, lineText: string): vscode.CompletionItem[] {
    // 所有列都可能是原子类型
    return this.createAtomTypeCompletions(index, 'impropers');
  }

  /**
   * 提供 [ bonds ] 段的补全
   * 格式: atom1 atom2
   */
  private provideBondsCompletion(index: any, lineText: string): vscode.CompletionItem[] {
    const tokens = lineText.split(/\s+/).filter(t => t);

    // 前两列是原子名称，不需要补全原子类型
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

    console.log(`[TdbCompletion] ✓ 生成 ${completions.length} 个原子类型补全 (context: ${context})`);
    return completions;
  }
}
