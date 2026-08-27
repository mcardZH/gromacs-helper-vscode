import * as vscode from 'vscode';
import { WaterModel } from '../../types/forcefield';
import { ParserUtils } from './common';

/**
 * WaterModelsParser - 解析 watermodels.dat 文件
 * 格式：filename  DisplayName  Description
 * 示例：tip3p  TIP3P  TIP3P water model
 */
export class WaterModelsParser {
  /**
   * 解析 watermodels.dat 文件
   */
  public parse(document: vscode.TextDocument): Map<string, WaterModel> {
    console.log(`[WaterModelsParser] 开始解析: ${document.uri.fsPath}`);
    const waterModels = new Map<string, WaterModel>();

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = ParserUtils.stripComment(line.text);

      if (!text.trim()) {
        continue;
      }

      // 匹配格式：filename  DisplayName  Description
      // 使用正则匹配三个字段（第三个字段可能包含空格）
      const match = text.match(/^(\S+)\s+(\S+)\s+(.+)$/);
      if (match) {
        const [, fileName, displayName, description] = match;

        const waterModel: WaterModel = {
          fileName,
          displayName,
          description: description.trim(),
          location: new vscode.Location(
            document.uri,
            new vscode.Range(i, 0, i, line.text.length)
          ),
        };

        waterModels.set(fileName, waterModel);
        console.log(`[WaterModelsParser]   发现水模型: ${fileName} (${displayName})`);
      }
    }

    console.log(`[WaterModelsParser] 解析完成，共 ${waterModels.size} 个水模型`);
    return waterModels;
  }
}
