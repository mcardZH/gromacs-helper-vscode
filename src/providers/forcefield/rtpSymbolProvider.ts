import * as vscode from 'vscode';
import { RtpParser } from '../../parsers/forcefield/rtpParser';

/**
 * RtpSymbolProvider - .rtp 文件的大纲提供者
 * 在侧边栏显示残基列表和内部结构
 */
export class RtpSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    console.log(`[RtpSymbol] 提供大纲: ${document.uri.fsPath}`);

    const parser = new RtpParser();
    const residues = parser.parse(document);
    const symbols: vscode.DocumentSymbol[] = [];

    for (const residue of residues.values()) {
      // 创建残基符号
      const residueSymbol = new vscode.DocumentSymbol(
        residue.name,
        `${residue.atoms.length} atoms, ${residue.bonds.length} bonds`,
        vscode.SymbolKind.Class,
        residue.location.range,
        residue.location.range
      );

      // 添加 [ atoms ] 子符号
      if (residue.atoms.length > 0) {
        const atomsSymbol = new vscode.DocumentSymbol(
          '[ atoms ]',
          `${residue.atoms.length} atoms`,
          vscode.SymbolKind.Field,
          residue.atoms[0].location.range,
          residue.atoms[0].location.range
        );

        // 添加每个原子
        for (const atom of residue.atoms) {
          const atomSymbol = new vscode.DocumentSymbol(
            atom.name,
            `${atom.type} (charge: ${atom.charge})`,
            vscode.SymbolKind.Variable,
            atom.location.range,
            atom.location.range
          );
          atomsSymbol.children.push(atomSymbol);
        }

        residueSymbol.children.push(atomsSymbol);
      }

      // 添加 [ bonds ] 子符号
      if (residue.bonds.length > 0) {
        const bondsSymbol = new vscode.DocumentSymbol(
          '[ bonds ]',
          `${residue.bonds.length} bonds`,
          vscode.SymbolKind.Array,
          residue.bonds[0].location.range,
          residue.bonds[0].location.range
        );

        // 添加每个键（限制数量避免过多）
        const maxBonds = 10;
        for (let i = 0; i < Math.min(residue.bonds.length, maxBonds); i++) {
          const bond = residue.bonds[i];
          const bondSymbol = new vscode.DocumentSymbol(
            bond.atoms.join(' - '),
            '',
            vscode.SymbolKind.Property,
            bond.location.range,
            bond.location.range
          );
          bondsSymbol.children.push(bondSymbol);
        }

        if (residue.bonds.length > maxBonds) {
          const moreSymbol = new vscode.DocumentSymbol(
            `... (${residue.bonds.length - maxBonds} more)`,
            '',
            vscode.SymbolKind.Null,
            residue.bonds[maxBonds].location.range,
            residue.bonds[maxBonds].location.range
          );
          bondsSymbol.children.push(moreSymbol);
        }

        residueSymbol.children.push(bondsSymbol);
      }

      // 添加 [ impropers ] 子符号
      if (residue.impropers.length > 0) {
        const impropersSymbol = new vscode.DocumentSymbol(
          '[ impropers ]',
          `${residue.impropers.length} impropers`,
          vscode.SymbolKind.Array,
          residue.impropers[0].location.range,
          residue.impropers[0].location.range
        );

        // 添加每个 improper（限制数量）
        const maxImpropers = 5;
        for (let i = 0; i < Math.min(residue.impropers.length, maxImpropers); i++) {
          const improper = residue.impropers[i];
          const improperSymbol = new vscode.DocumentSymbol(
            improper.atoms.join(' - '),
            '',
            vscode.SymbolKind.Property,
            improper.location.range,
            improper.location.range
          );
          impropersSymbol.children.push(improperSymbol);
        }

        if (residue.impropers.length > maxImpropers) {
          const moreSymbol = new vscode.DocumentSymbol(
            `... (${residue.impropers.length - maxImpropers} more)`,
            '',
            vscode.SymbolKind.Null,
            residue.impropers[maxImpropers].location.range,
            residue.impropers[maxImpropers].location.range
          );
          impropersSymbol.children.push(moreSymbol);
        }

        residueSymbol.children.push(impropersSymbol);
      }

      // 添加 [ cmap ] 子符号
      if (residue.cmaps.length > 0) {
        const cmapsSymbol = new vscode.DocumentSymbol(
          '[ cmap ]',
          `${residue.cmaps.length} cmaps`,
          vscode.SymbolKind.Array,
          residue.cmaps[0].location.range,
          residue.cmaps[0].location.range
        );

        // 添加每个 cmap
        for (const cmap of residue.cmaps) {
          const cmapSymbol = new vscode.DocumentSymbol(
            cmap.atoms.join(' - '),
            '',
            vscode.SymbolKind.Property,
            cmap.location.range,
            cmap.location.range
          );
          cmapsSymbol.children.push(cmapSymbol);
        }

        residueSymbol.children.push(cmapsSymbol);
      }

      symbols.push(residueSymbol);
    }

    console.log(`[RtpSymbol] ✓ 生成 ${symbols.length} 个残基大纲`);
    return symbols;
  }
}
