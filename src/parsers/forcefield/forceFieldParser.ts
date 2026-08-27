import * as vscode from 'vscode';
import * as path from 'path';
import { ForceFieldIndex } from '../../types/forcefield';
import { AtpParser } from './atpParser';
import { RtpParser } from './rtpParser';
import { WaterModelsParser } from './waterModelsParser';

/**
 * ForceFieldParser - 力场主协调器
 * 负责解析整个力场目录
 */
export class ForceFieldParser {
  private atpParser = new AtpParser();
  private rtpParser = new RtpParser();
  private waterModelsParser = new WaterModelsParser();

  /**
   * 解析完整的力场目录
   */
  public async parseForceField(forceFieldDir: vscode.Uri): Promise<ForceFieldIndex> {
    console.log(`[ForceFieldParser] ========================================`);
    console.log(`[ForceFieldParser] 开始解析力场: ${forceFieldDir.fsPath}`);

    const index: ForceFieldIndex = {
      atomTypes: new Map(),
      residues: new Map(),
      terminus: new Map(),
      waterModels: new Map(),
      bondParams: new Map(),
      angleParams: new Map(),
      forceFieldPath: forceFieldDir.fsPath,
      forceFieldName: path.basename(forceFieldDir.fsPath),
      lastUpdated: new Date(),
    };

    try {
      // 1. 检查 forcefield.itp 是否存在
      const forceFieldItp = vscode.Uri.joinPath(forceFieldDir, 'forcefield.itp');
      try {
        await vscode.workspace.fs.stat(forceFieldItp);
        console.log(`[ForceFieldParser] ✓ 找到 forcefield.itp`);
      } catch {
        console.log(`[ForceFieldParser] ✗ 未找到 forcefield.itp，可能不是有效的力场目录`);
        return index;
      }

      // 2. 解析 atomtypes.atp
      await this.parseAtomTypes(forceFieldDir, index);

      // 3. 解析所有 .rtp 文件
      await this.parseRtpFiles(forceFieldDir, index);

      // 4. 解析 watermodels.dat
      await this.parseWaterModels(forceFieldDir, index);

      console.log(`[ForceFieldParser] ========================================`);
      console.log(`[ForceFieldParser] 解析完成！`);
      console.log(`[ForceFieldParser]   - 原子类型: ${index.atomTypes.size}`);
      console.log(`[ForceFieldParser]   - 残基: ${index.residues.size}`);
      console.log(`[ForceFieldParser]   - 水模型: ${index.waterModels.size}`);
      console.log(`[ForceFieldParser] ========================================`);
    } catch (error) {
      console.error(`[ForceFieldParser] 解析失败:`, error);
    }

    return index;
  }

  /**
   * 解析 atomtypes.atp
   */
  private async parseAtomTypes(forceFieldDir: vscode.Uri, index: ForceFieldIndex): Promise<void> {
    const atpUri = vscode.Uri.joinPath(forceFieldDir, 'atomtypes.atp');

    try {
      const atpDoc = await vscode.workspace.openTextDocument(atpUri);
      const atomTypes = this.atpParser.parse(atpDoc);

      for (const [name, atomType] of atomTypes) {
        index.atomTypes.set(name, atomType);
      }

      console.log(`[ForceFieldParser] ✓ 解析 atomtypes.atp: ${atomTypes.size} 个类型`);
    } catch (error) {
      console.log(`[ForceFieldParser] ✗ 未找到 atomtypes.atp`);
    }
  }

  /**
   * 解析所有 .rtp 文件
   */
  private async parseRtpFiles(forceFieldDir: vscode.Uri, index: ForceFieldIndex): Promise<void> {
    try {
      const rtpFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(forceFieldDir, '*.rtp')
      );

      console.log(`[ForceFieldParser] 找到 ${rtpFiles.length} 个 .rtp 文件`);

      for (const rtpUri of rtpFiles) {
        const rtpDoc = await vscode.workspace.openTextDocument(rtpUri);
        const residues = this.rtpParser.parse(rtpDoc);

        for (const [name, residue] of residues) {
          index.residues.set(name, residue);
        }
      }

      console.log(`[ForceFieldParser] ✓ 解析所有 .rtp 文件: ${index.residues.size} 个残基`);
    } catch (error) {
      console.log(`[ForceFieldParser] ✗ 解析 .rtp 文件失败:`, error);
    }
  }

  /**
   * 解析 watermodels.dat
   */
  private async parseWaterModels(forceFieldDir: vscode.Uri, index: ForceFieldIndex): Promise<void> {
    const waterModelsUri = vscode.Uri.joinPath(forceFieldDir, 'watermodels.dat');

    try {
      const waterModelsDoc = await vscode.workspace.openTextDocument(waterModelsUri);
      const waterModels = this.waterModelsParser.parse(waterModelsDoc);

      for (const [name, model] of waterModels) {
        index.waterModels.set(name, model);
      }

      console.log(`[ForceFieldParser] ✓ 解析 watermodels.dat: ${waterModels.size} 个水模型`);
    } catch (error) {
      console.log(`[ForceFieldParser] ✗ 未找到 watermodels.dat`);
    }
  }
}
