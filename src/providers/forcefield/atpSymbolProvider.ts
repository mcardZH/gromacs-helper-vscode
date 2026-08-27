import * as vscode from 'vscode';
import { AtpParser } from '../../parsers/forcefield/atpParser';

/**
 * AtpSymbolProvider - .atp 文件的大纲提供者
 * 在侧边栏显示原子类型列表
 */
export class AtpSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    console.log(`[AtpSymbol] 提供大纲: ${document.uri.fsPath}`);

    const parser = new AtpParser();
    const atomTypes = parser.parse(document);
    const symbols: vscode.DocumentSymbol[] = [];

    for (const atomType of atomTypes.values()) {
      const detail = atomType.description
        ? `${atomType.mass} amu - ${atomType.description}`
        : `${atomType.mass} amu`;

      const symbol = new vscode.DocumentSymbol(
        atomType.name,
        detail,
        vscode.SymbolKind.Constant,
        atomType.location.range,
        atomType.location.range
      );

      symbols.push(symbol);
    }

    console.log(`[AtpSymbol] ✓ 生成 ${symbols.length} 个原子类型大纲`);
    return symbols;
  }
}
