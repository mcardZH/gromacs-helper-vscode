import * as vscode from 'vscode';
import { ForceFieldIndexManager } from '../../languages/forcefield/forceFieldIndexManager';
import { RtpParser } from '../../parsers/forcefield/rtpParser';

/**
 * RtpDiagnosticProvider - .rtp 文件的诊断提供者
 */
export class RtpDiagnosticProvider {
  constructor(
    private indexManager: ForceFieldIndexManager,
    private diagnosticCollection: vscode.DiagnosticCollection
  ) {}

  /**
   * 提供诊断信息
   */
  public async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
    console.log(`[RtpDiagnostic] 开始诊断: ${document.uri.fsPath}`);

    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      console.log(`[RtpDiagnostic] ✗ 未找到力场目录，跳过诊断`);
      this.diagnosticCollection.delete(document.uri);
      return;
    }

    const index = await this.indexManager.getIndex(forceFieldDir);
    const diagnostics: vscode.Diagnostic[] = [];

    // 解析当前文档
    const parser = new RtpParser();
    const residues = parser.parse(document);

    console.log(`[RtpDiagnostic] 检查 ${residues.size} 个残基...`);

    for (const residue of residues.values()) {
      // 检查1：未定义的原子类型
      for (const atom of residue.atoms) {
        if (!index.atomTypes.has(atom.type)) {
          const diagnostic = new vscode.Diagnostic(
            atom.location.range,
            `Atom type "${atom.type}" not found in atomtypes.atp`,
            vscode.DiagnosticSeverity.Error
          );
          diagnostic.source = 'gromacs-forcefield';
          diagnostics.push(diagnostic);
          console.log(`[RtpDiagnostic]   ✗ ${residue.name}: 未定义的原子类型 "${atom.type}"`);
        }
      }

      // 检查2：键引用的原子不存在
      const atomNames = new Set(residue.atoms.map(a => a.name));
      for (const bond of residue.bonds) {
        for (const atomName of bond.atoms) {
          // 跳过跨残基引用
          if (atomName.startsWith('+') || atomName.startsWith('-')) {
            continue;
          }

          if (!atomNames.has(atomName)) {
            const diagnostic = new vscode.Diagnostic(
              bond.location.range,
              `Atom "${atomName}" not defined in [ atoms ] section`,
              vscode.DiagnosticSeverity.Error
            );
            diagnostic.source = 'gromacs-forcefield';
            diagnostics.push(diagnostic);
            console.log(`[RtpDiagnostic]   ✗ ${residue.name}: 未定义的原子 "${atomName}" 在键中`);
          }
        }
      }

      // 检查3：impropers 引用的原子不存在
      for (const improper of residue.impropers) {
        for (const atomName of improper.atoms) {
          // 跳过跨残基引用
          if (atomName.startsWith('+') || atomName.startsWith('-')) {
            continue;
          }

          if (!atomNames.has(atomName)) {
            const diagnostic = new vscode.Diagnostic(
              improper.location.range,
              `Atom "${atomName}" not defined in [ atoms ] section`,
              vscode.DiagnosticSeverity.Error
            );
            diagnostic.source = 'gromacs-forcefield';
            diagnostics.push(diagnostic);
            console.log(`[RtpDiagnostic]   ✗ ${residue.name}: 未定义的原子 "${atomName}" 在improper中`);
          }
        }
      }

      // 检查4：电荷平衡
      const totalCharge = residue.atoms.reduce((sum, a) => sum + a.charge, 0);
      const roundedCharge = Math.round(totalCharge);
      if (Math.abs(totalCharge - roundedCharge) > 0.01) {
        const diagnostic = new vscode.Diagnostic(
          residue.location.range,
          `Residue "${residue.name}" has non-integer total charge: ${totalCharge.toFixed(3)} (expected: ${roundedCharge})`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'gromacs-forcefield';
        diagnostics.push(diagnostic);
        console.log(`[RtpDiagnostic]   ⚠ ${residue.name}: 电荷不平衡 ${totalCharge.toFixed(3)}`);
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
    console.log(`[RtpDiagnostic] ✓ 诊断完成，发现 ${diagnostics.length} 个问题`);
  }

  /**
   * 清除诊断
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }
}
