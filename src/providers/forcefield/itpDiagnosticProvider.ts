import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { ItpParser, ItpSectionType } from '../../parsers/forcefield/itpParser';

/**
 * ItpDiagnosticProvider - 为 ITP 力场参数文件提供诊断
 */
export class ItpDiagnosticProvider {
  private itpParser: ItpParser;

  constructor(
    private indexManager: ForceFieldIndexManager,
    private diagnosticCollection: vscode.DiagnosticCollection
  ) {
    this.itpParser = new ItpParser();
  }

  /**
   * 提供诊断
   */
  public async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
    console.log(`[ItpDiagnostic] 开始诊断: ${document.uri.fsPath}`);

    const diagnostics: vscode.Diagnostic[] = [];

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[ItpDiagnostic] 未找到力场目录，跳过诊断`);
      this.diagnosticCollection.set(document.uri, []);
      return;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 解析当前文档
    const parseResult = this.itpParser.parse(document);

    // 检查每个段
    for (const [sectionType, section] of parseResult.sections) {
      // 跳过 atomtypes 段（它定义原子类型，不需要检查）
      if (sectionType === ItpSectionType.AtomTypes) {
        continue;
      }

      // 检查每个条目
      for (const entry of section.entries) {
        // 检查原子类型是否已定义
        for (const atomType of entry.atomTypes) {
          // 跳过通配符
          if (atomType === 'X' || atomType === '*') {
            continue;
          }

          if (!index.atomTypes.has(atomType)) {
            const diagnostic = new vscode.Diagnostic(
              entry.location.range,
              `未定义的原子类型: ${atomType}`,
              vscode.DiagnosticSeverity.Error
            );
            diagnostic.source = 'gromacs-forcefield';
            diagnostic.code = 'undefined-atom-type';
            diagnostics.push(diagnostic);

            console.log(`[ItpDiagnostic] ✗ 未定义的原子类型: ${atomType} (line ${entry.line + 1})`);
          }
        }
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
    console.log(`[ItpDiagnostic] ✓ 诊断完成: ${diagnostics.length} 个问题`);
  }

  /**
   * 清除诊断
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
    console.log(`[ItpDiagnostic] 清除诊断: ${document.uri.fsPath}`);
  }
}
