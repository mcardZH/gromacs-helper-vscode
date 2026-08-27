import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { TopologyParser, TopologySectionType } from '../../parsers/forcefield/topologyParser';

/**
 * TopologyDiagnosticProvider - 为 TOP/ITP 文件提供诊断
 */
export class TopologyDiagnosticProvider {
  private topologyParser: TopologyParser;

  constructor(
    private indexManager: ForceFieldIndexManager,
    private diagnosticCollection: vscode.DiagnosticCollection
  ) {
    this.topologyParser = new TopologyParser();
  }

  /**
   * 提供诊断
   */
  public async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
    console.log(`[TopologyDiagnostic] 开始诊断: ${document.uri.fsPath}`);

    const diagnostics: vscode.Diagnostic[] = [];

    // 解析当前文档
    const parseResult = this.topologyParser.parse(document);

    // 获取力场索引
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      // 检查是否是因为引用了不存在的力场
      const hasForceFieldInclude = parseResult.includes.some(inc =>
        inc.match(/\.ff\/forcefield\.itp$/)
      );

      if (hasForceFieldInclude) {
        // 用户明确引用了力场，但找不到 -> 报错
        const gromacsInstalled = await this.indexManager.isGromacsInstalled();
        if (!gromacsInstalled) {
          console.log(`[TopologyDiagnostic] GROMACS 未安装，跳过诊断`);
        } else {
          // GROMACS 已安装但找不到引用的力场
          console.log(`[TopologyDiagnostic] 引用的力场不存在`);
          // 可以在这里添加针对 #include 行的错误提示
        }
      } else {
        console.log(`[TopologyDiagnostic] 未找到力场目录，跳过诊断`);
      }

      this.diagnosticCollection.set(document.uri, []);
      return;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);

    // 检查 [ atoms ] 段
    const atomsSections = parseResult.sections.get(TopologySectionType.Atoms) || [];
    for (const section of atomsSections) {
      for (const entry of section.entries) {
        // 格式: nr type resnr residue atom cgnr charge mass
        if (entry.tokens.length >= 2) {
          const atomType = entry.tokens[1];

          // 检查原子类型是否已定义
          if (!index.atomTypes.has(atomType)) {
            const range = this.findTokenRangeInLine(document, entry.line, atomType);
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                `未定义的原子类型: ${atomType}`,
                vscode.DiagnosticSeverity.Error
              )
            );
            console.log(`[TopologyDiagnostic] ✗ 未定义的原子类型: ${atomType} (line ${entry.line + 1})`);
          }
        }
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
    console.log(`[TopologyDiagnostic] ✓ 诊断完成: ${diagnostics.length} 个问题`);
  }

  /**
   * 查找 token 在行中的范围
   */
  private findTokenRangeInLine(document: vscode.TextDocument, lineNumber: number, token: string): vscode.Range {
    const line = document.lineAt(lineNumber);
    const lineText = line.text;
    const index = lineText.indexOf(token);

    if (index === -1) {
      return line.range;
    }

    return new vscode.Range(lineNumber, index, lineNumber, index + token.length);
  }

  /**
   * 清除诊断
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
    console.log(`[TopologyDiagnostic] 清除诊断: ${document.uri.fsPath}`);
  }
}
