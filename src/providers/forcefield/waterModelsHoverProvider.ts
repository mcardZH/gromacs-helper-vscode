import * as vscode from 'vscode';
import { WaterModel } from '../../types/forcefield';

/**
 * WaterModelsHoverProvider - watermodels.dat 文件的悬浮提示提供者
 */
export class WaterModelsHoverProvider implements vscode.HoverProvider {
  constructor(private waterModels: Map<string, WaterModel>) {}

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const range = document.getWordRangeAtPosition(position, /[a-z0-9_-]+/i);
    if (!range) {
      return null;
    }

    const word = document.getText(range);
    console.log(`[WaterModelsHover] 悬浮请求: ${word}`);

    // 检查是否是水模型文件名
    if (this.waterModels.has(word)) {
      const model = this.waterModels.get(word)!;
      console.log(`[WaterModelsHover] ✓ 显示水模型信息: ${word}`);
      return this.createWaterModelHover(model);
    }

    // 检查是否是显示名称
    for (const model of this.waterModels.values()) {
      if (model.displayName === word) {
        console.log(`[WaterModelsHover] ✓ 显示水模型信息（通过显示名称）: ${word}`);
        return this.createWaterModelHover(model);
      }
    }

    return null;
  }

  /**
   * 创建水模型悬浮信息
   */
  private createWaterModelHover(model: WaterModel): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### Water Model: \`${model.displayName}\`\n\n`);
    md.appendMarkdown(`**File Name:** ${model.fileName}\n\n`);
    md.appendMarkdown(`**Description:** ${model.description}\n\n`);

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`**Usage:**\n`);
    md.appendMarkdown('```bash\n');
    md.appendMarkdown(`gmx pdb2gmx -water ${model.fileName}\n`);
    md.appendMarkdown('```\n\n');

    md.appendMarkdown(
      `[Go to definition](${model.location.uri.toString()}#L${model.location.range.start.line + 1})`
    );

    return new vscode.Hover(md);
  }

  /**
   * 更新水模型列表
   */
  public updateWaterModels(waterModels: Map<string, WaterModel>): void {
    this.waterModels = waterModels;
    console.log(`[WaterModelsHover] 更新水模型列表: ${waterModels.size} 个`);
  }
}
