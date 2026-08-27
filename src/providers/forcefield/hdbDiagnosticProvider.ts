import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { ParserUtils } from '../../parsers/forcefield/common';

/**
 * HdbDiagnosticProvider - 为 HDB 文件提供诊断
 *
 * HDB 文件格式:
 * 残基名  氢原子总数
 * nH  geometry  H  atom1  atom2  atom3
 */
export class HdbDiagnosticProvider {
  constructor(
    private indexManager: ForceFieldIndexManager,
    private diagnosticCollection: vscode.DiagnosticCollection
  ) {}

  /**
   * 提供诊断
   */
  public async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
    console.log(`[HdbDiagnostic] 开始诊断: ${document.uri.fsPath}`);

    const diagnostics: vscode.Diagnostic[] = [];

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[HdbDiagnostic] 未找到力场目录，跳过诊断`);
      this.diagnosticCollection.set(document.uri, []);
      return;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    let currentResidue: string | null = null;
    let expectedEntries = 0;
    let actualEntries = 0;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text;
      const cleanLine = ParserUtils.stripComment(lineText).trim();

      // 空行或注释
      if (!cleanLine) {
        continue;
      }

      const tokens = cleanLine.split(/\s+/).filter(t => t);
      if (tokens.length === 0) {
        continue;
      }

      // 残基头行: RES_NAME  count
      if (tokens.length === 2 && /^[A-Z][A-Z0-9]+$/.test(tokens[0]) && /^\d+$/.test(tokens[1])) {
        // 检查上一个残基的条目数
        if (currentResidue && actualEntries !== expectedEntries) {
          const headerLine = this.findResidueHeaderLine(document, currentResidue, i);
          if (headerLine !== -1) {
            const range = document.lineAt(headerLine).range;
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                `残基 ${currentResidue} 声明了 ${expectedEntries} 个氢原子条目，但实际只有 ${actualEntries} 个`,
                vscode.DiagnosticSeverity.Warning
              )
            );
          }
        }

        currentResidue = tokens[0];
        expectedEntries = parseInt(tokens[1], 10);
        actualEntries = 0;

        // 检查残基是否已定义
        if (!index.residues.has(currentResidue)) {
          const range = this.findTokenRange(lineText, currentResidue, i);
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              `未定义的残基: ${currentResidue}`,
              vscode.DiagnosticSeverity.Warning
            )
          );
          console.log(`[HdbDiagnostic] ⚠ 未定义的残基: ${currentResidue} (line ${i + 1})`);
        }

        continue;
      }

      // 氢原子条目行: nH  geometry  H  atom1  atom2  atom3
      // 有时候后面的参考原子可能少于3个，所以至少需要3个token
      if (tokens.length >= 3 && /^\d+$/.test(tokens[0]) && /^\d+$/.test(tokens[1])) {
        actualEntries++;

        // 检查 geometry 类型（1-8）
        const geometry = parseInt(tokens[1], 10);
        if (geometry < 1 || geometry > 8) {
          const range = this.findTokenRange(lineText, tokens[1], i);
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              `无效的几何类型: ${geometry}，应为 1-8`,
              vscode.DiagnosticSeverity.Error
            )
          );
          console.log(`[HdbDiagnostic] ✗ 无效的几何类型: ${geometry} (line ${i + 1})`);
        }

        // 检查氢原子数（1-4）
        const nH = parseInt(tokens[0], 10);
        if (nH < 1 || nH > 4) {
          const range = this.findTokenRange(lineText, tokens[0], i);
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              `无效的氢原子数: ${nH}，应为 1-4`,
              vscode.DiagnosticSeverity.Error
            )
          );
          console.log(`[HdbDiagnostic] ✗ 无效的氢原子数: ${nH} (line ${i + 1})`);
        }

        continue;
      }
    }

    // 检查最后一个残基
    if (currentResidue && actualEntries !== expectedEntries) {
      const headerLine = this.findResidueHeaderLine(document, currentResidue, document.lineCount);
      if (headerLine !== -1) {
        const range = document.lineAt(headerLine).range;
        diagnostics.push(
          new vscode.Diagnostic(
            range,
            `残基 ${currentResidue} 声明了 ${expectedEntries} 个氢原子条目，但实际只有 ${actualEntries} 个`,
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
    console.log(`[HdbDiagnostic] ✓ 诊断完成: ${diagnostics.length} 个问题`);
  }

  /**
   * 查找残基头行的行号
   */
  private findResidueHeaderLine(document: vscode.TextDocument, residueName: string, beforeLine: number): number {
    for (let i = beforeLine - 1; i >= 0; i--) {
      const line = document.lineAt(i);
      const cleanLine = ParserUtils.stripComment(line.text).trim();
      if (cleanLine.startsWith(residueName + ' ')) {
        return i;
      }
    }
    return -1;
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
   * 清除诊断
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
    console.log(`[HdbDiagnostic] 清除诊断: ${document.uri.fsPath}`);
  }
}
