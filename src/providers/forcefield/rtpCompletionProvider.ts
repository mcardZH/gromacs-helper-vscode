import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { ResidueAtom } from '../../types/forcefield';

/**
 * RtpCompletionProvider - .rtp 文件的补全提供者
 */
export class RtpCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private indexManager: ForceFieldIndexManager) {}

  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    console.log(`[RtpCompletion] 补全请求: line ${position.line}, char ${position.character}`);

    const line = document.lineAt(position.line).text;
    const linePrefix = line.substring(0, position.character);

    // 检查当前所在的段
    const section = this.getCurrentSection(document, position);
    console.log(`[RtpCompletion] 当前段: ${section || 'unknown'}`);

    if (section === 'atoms') {
      // 在 [ atoms ] 段中，补全原子类型（第二列）
      return this.provideAtomTypeCompletions(document, linePrefix);
    }

    if (section === 'bonds' || section === 'impropers' || section === 'cmap') {
      // 在键/impropers/cmap 段中，补全原子名
      return this.provideAtomNameCompletions(document, position);
    }

    return [];
  }

  /**
   * 提供原子类型补全
   */
  private async provideAtomTypeCompletions(
    document: vscode.TextDocument,
    linePrefix: string
  ): Promise<vscode.CompletionItem[]> {
    // 检查是否在第二列（原子类型位置）
    const fields = linePrefix.trim().split(/\s+/);
    if (fields.length !== 2 && !linePrefix.endsWith(' ')) {
      return [];
    }

    console.log(`[RtpCompletion] 提供原子类型补全...`);

    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[RtpCompletion] ✗ 未找到力场目录`);
      return [];
    }

    const index = await this.indexManager.getIndex(forceFieldDir);
    const items: vscode.CompletionItem[] = [];

    for (const [name, atomType] of index.atomTypes) {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
      item.detail = `mass: ${atomType.mass}`;
      item.documentation = new vscode.MarkdownString(
        atomType.description || 'Atom type from forcefield'
      );
      item.sortText = name;
      items.push(item);
    }

    console.log(`[RtpCompletion] ✓ 提供 ${items.length} 个原子类型`);
    return items;
  }

  /**
   * 提供原子名补全（在当前残基内）
   */
  private provideAtomNameCompletions(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    console.log(`[RtpCompletion] 提供原子名补全...`);

    // 解析当前残基的 [ atoms ] 段
    const residueAtoms = this.getCurrentResidueAtoms(document, position);
    const items: vscode.CompletionItem[] = [];

    for (const atom of residueAtoms) {
      const item = new vscode.CompletionItem(atom.name, vscode.CompletionItemKind.Variable);
      item.detail = `${atom.type} (charge: ${atom.charge})`;
      item.sortText = atom.name;
      items.push(item);
    }

    // 添加跨残基引用
    items.push(
      this.createCrossResidueItem('-C', '前一个残基的 C 原子'),
      this.createCrossResidueItem('-CA', '前一个残基的 CA 原子'),
      this.createCrossResidueItem('+N', '下一个残基的 N 原子'),
      this.createCrossResidueItem('+CA', '下一个残基的 CA 原子')
    );

    console.log(`[RtpCompletion] ✓ 提供 ${items.length} 个原子名`);
    return items;
  }

  /**
   * 创建跨残基引用补全项
   */
  private createCrossResidueItem(name: string, description: string): vscode.CompletionItem {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Reference);
    item.detail = description;
    item.sortText = `~${name}`; // 排在后面
    return item;
  }

  /**
   * 获取当前所在的段名称
   */
  private getCurrentSection(
    document: vscode.TextDocument,
    position: vscode.Position
  ): string | null {
    // 向上搜索最近的 [ section ]
    for (let i = position.line; i >= 0; i--) {
      const line = document.lineAt(i).text;
      const match = line.match(/^\s*\[\s*(\w+)\s*\]/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * 获取当前残基的所有原子
   */
  private getCurrentResidueAtoms(
    document: vscode.TextDocument,
    position: vscode.Position
  ): ResidueAtom[] {
    const atoms: ResidueAtom[] = [];
    let inAtomsSection = false;
    let currentResidueStartLine = -1;

    // 向上找到当前残基的开始
    for (let i = position.line; i >= 0; i--) {
      const line = document.lineAt(i).text.trim();
      if (line.match(/^\[\s*[A-Z][A-Z0-9]+\s*\]/)) {
        currentResidueStartLine = i;
        break;
      }
    }

    if (currentResidueStartLine < 0) {
      return atoms;
    }

    // 从残基开始解析 [ atoms ] 段
    for (let i = currentResidueStartLine; i < Math.min(document.lineCount, position.line + 100); i++) {
      const line = document.lineAt(i).text.trim();

      if (line.match(/^\[\s*atoms\s*\]/)) {
        inAtomsSection = true;
        continue;
      }

      if (line.match(/^\[\s*\w+\s*\]/)) {
        if (inAtomsSection) {
          break; // [ atoms ] 段结束
        }
        continue;
      }

      if (inAtomsSection && line && !line.startsWith(';')) {
        const match = line.match(/^(\S+)\s+(\S+)\s+([-+]?\d+\.\d+)\s+(\d+)/);
        if (match) {
          atoms.push({
            name: match[1],
            type: match[2],
            charge: parseFloat(match[3]),
            chargeGroup: parseInt(match[4], 10),
            location: new vscode.Location(document.uri, new vscode.Range(i, 0, i, 0)),
          });
        }
      }
    }

    return atoms;
  }
}
