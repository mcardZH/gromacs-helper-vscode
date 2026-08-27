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
 * TdbDiagnosticProvider - 为 TDB 文件提供诊断
 */
export class TdbDiagnosticProvider {
  constructor(
    private indexManager: ForceFieldIndexManager,
    private diagnosticCollection: vscode.DiagnosticCollection
  ) {}

  /**
   * 提供诊断
   */
  public async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
    console.log(`[TdbDiagnostic] 开始诊断: ${document.uri.fsPath}`);

    const diagnostics: vscode.Diagnostic[] = [];

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[TdbDiagnostic] 未找到力场目录，跳过诊断`);
      this.diagnosticCollection.set(document.uri, []);
      return;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    let currentSection: TdbSectionType | null = null;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text;
      const cleanLine = ParserUtils.stripComment(lineText).trim();

      // 空行或注释
      if (!cleanLine) {
        continue;
      }

      // 预处理指令
      if (cleanLine.startsWith('#')) {
        continue;
      }

      // 段标记
      const sectionMatch = cleanLine.match(/^\[\s*(\w+)\s*\]$/);
      if (sectionMatch) {
        const sectionName = sectionMatch[1].toLowerCase();
        currentSection = this.getSectionType(sectionName);
        continue;
      }

      // 检查段内容
      if (currentSection) {
        const lineDiagnostics = this.checkLine(
          document,
          i,
          lineText,
          cleanLine,
          currentSection,
          index
        );
        diagnostics.push(...lineDiagnostics);
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
    console.log(`[TdbDiagnostic] ✓ 诊断完成: ${diagnostics.length} 个问题`);
  }

  /**
   * 检查一行
   */
  private checkLine(
    document: vscode.TextDocument,
    lineNumber: number,
    rawLine: string,
    cleanLine: string,
    sectionType: TdbSectionType,
    index: any
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const tokens = cleanLine.split(/\s+/).filter(t => t);

    if (tokens.length === 0) {
      return diagnostics;
    }

    switch (sectionType) {
      case TdbSectionType.Replace:
        // 格式: old_atom new_atom atom_type mass charge
        if (tokens.length >= 3) {
          const atomType = tokens[2];
          // 检查第三列的原子类型
          if (!index.atomTypes.has(atomType)) {
            const range = this.findTokenRange(rawLine, atomType, lineNumber);
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                `未定义的原子类型: ${atomType}`,
                vscode.DiagnosticSeverity.Error
              )
            );
            console.log(`[TdbDiagnostic] ✗ 未定义的原子类型: ${atomType} (line ${lineNumber + 1})`);
          }
        }
        break;

      case TdbSectionType.Add:
        // [ add ] 段有两种行：
        // 第一行（不缩进或少量缩进）: nH geometry H atom1 atom2 atom3
        // 第二行（更多缩进）: atom_type mass charge chargegroup

        // 第一行的特征：前两个 token 是数字（nH 和 geometry）
        // 第二行的特征：第一个 token 是原子类型（字母开头），第二个是数字（mass）

        // 判断是否是第二行：以空格/制表符开头 且 第一个token是字母 且 第二个token是数字
        const isSecondLine = rawLine.match(/^\s+\S/) &&
                             tokens.length >= 2 &&
                             /^[A-Za-z]/.test(tokens[0]) &&
                             /^[-+]?\d+\.?\d*/.test(tokens[1]);

        if (isSecondLine) {
          // 第二行的第一列是原子类型
          const atomType = tokens[0];
          if (!index.atomTypes.has(atomType)) {
            const range = this.findTokenRange(rawLine, atomType, lineNumber);
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                `未定义的原子类型: ${atomType}`,
                vscode.DiagnosticSeverity.Error
              )
            );
            console.log(`[TdbDiagnostic] ✗ 未定义的原子类型: ${atomType} (line ${lineNumber + 1})`);
          }
        }
        // 第一行不检查，因为都是原子名称
        break;

      case TdbSectionType.Impropers:
      case TdbSectionType.Bonds:
      case TdbSectionType.Delete:
        // 这些段中都是原子名称，不是原子类型，不需要检查
        break;
    }

    return diagnostics;
  }

  /**
   * 查找 token 在行中的范围
   */
  private findTokenRange(line: string, token: string, lineNumber: number): vscode.Range {
    const index = line.indexOf(token);
    if (index === -1) {
      return new vscode.Range(lineNumber, 0, lineNumber, line.length);
    }
    return new vscode.Range(lineNumber, index, lineNumber, index + token.length);
  }

  /**
   * 获取段类型
   */
  private getSectionType(sectionName: string): TdbSectionType {
    switch (sectionName) {
      case 'replace':
        return TdbSectionType.Replace;
      case 'add':
        return TdbSectionType.Add;
      case 'delete':
        return TdbSectionType.Delete;
      case 'bonds':
        return TdbSectionType.Bonds;
      case 'impropers':
        return TdbSectionType.Impropers;
      case 'cmap':
        return TdbSectionType.Cmap;
      default:
        return TdbSectionType.Unknown;
    }
  }

  /**
   * 清除诊断
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
    console.log(`[TdbDiagnostic] 清除诊断: ${document.uri.fsPath}`);
  }
}
