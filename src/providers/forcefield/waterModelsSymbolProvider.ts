import * as vscode from 'vscode';
import { WaterModelsParser } from '../../parsers/forcefield/waterModelsParser';

/**
 * WaterModelsSymbolProvider - watermodels.dat 文件的大纲提供者
 * 在侧边栏显示所有水模型列表
 */
export class WaterModelsSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    console.log(`[WaterModelsSymbol] 提供大纲: ${document.uri.fsPath}`);

    const parser = new WaterModelsParser();
    const waterModels = parser.parse(document);
    const symbols: vscode.DocumentSymbol[] = [];

    for (const model of waterModels.values()) {
      const symbol = new vscode.DocumentSymbol(
        model.displayName,
        `${model.fileName} - ${model.description}`,
        vscode.SymbolKind.Constant,
        model.location.range,
        model.location.range
      );

      symbols.push(symbol);
    }

    console.log(`[WaterModelsSymbol] ✓ 生成 ${symbols.length} 个水模型大纲`);
    return symbols;
  }
}
