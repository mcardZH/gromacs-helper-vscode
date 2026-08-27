import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ForceFieldIndex } from '../../types/forcefield';
import { ForceFieldParser } from '../../parsers/forcefield/forceFieldParser';
import { TopologyParser } from '../../parsers/forcefield/topologyParser';

const execAsync = promisify(exec);

/**
 * ForceFieldIndexManager - 力场索引管理器
 * 负责缓存和管理力场索引
 */
export class ForceFieldIndexManager {
  private indices = new Map<string, ForceFieldIndex>();
  private parser = new ForceFieldParser();
  private topologyParser = new TopologyParser();
  private gmxDataPrefix: string | null = null;
  private gmxDataPrefixChecked = false;

  /**
   * 获取或构建给定力场目录的索引
   */
  public async getIndex(forceFieldDir: vscode.Uri): Promise<ForceFieldIndex> {
    const key = forceFieldDir.toString();

    console.log(`[IndexManager] 请求索引: ${forceFieldDir.fsPath}`);

    if (this.indices.has(key)) {
      console.log(`[IndexManager] ✓ 使用缓存的索引`);
      return this.indices.get(key)!;
    }

    console.log(`[IndexManager] ⚡ 构建新索引...`);
    const index = await this.parser.parseForceField(forceFieldDir);
    this.indices.set(key, index);

    return index;
  }

  /**
   * 查找文档所属的力场目录
   * 向上查找包含 forcefield.itp 的目录
   */
  public async findForceFieldForDocument(
    document: vscode.TextDocument
  ): Promise<vscode.Uri | null> {
    console.log(`[IndexManager] 查找力场目录: ${document.uri.fsPath}`);

    // 对于 TOP/ITP 文件，尝试通过 #include 查找力场
    if (document.uri.fsPath.endsWith('.top') || document.uri.fsPath.endsWith('.itp')) {
      const forceFieldFromInclude = await this.findForceFieldFromIncludes(document);
      if (forceFieldFromInclude) {
        return forceFieldFromInclude;
      }

      // 对于 ITP 文件，尝试在同目录查找 topol.top 或 forcefield.itp
      if (document.uri.fsPath.endsWith('.itp')) {
        const forceFieldFromSiblings = await this.findForceFieldFromSiblings(document);
        if (forceFieldFromSiblings) {
          return forceFieldFromSiblings;
        }
      }
    }

    // 获取文档所在目录
    let currentDir = vscode.Uri.joinPath(document.uri, '..');

    // 向上查找，最多5层
    for (let i = 0; i < 5; i++) {
      const forceFieldItp = vscode.Uri.joinPath(currentDir, 'forcefield.itp');

      try {
        await vscode.workspace.fs.stat(forceFieldItp);
        console.log(`[IndexManager] ✓ 找到力场目录: ${currentDir.fsPath}`);
        return currentDir;
      } catch {
        // 继续向上查找
        currentDir = vscode.Uri.joinPath(currentDir, '..');
      }
    }

    console.log(`[IndexManager] ✗ 未找到力场目录`);
    return null;
  }

  /**
   * 从 TOP/ITP 文件的 #include 指令中查找力场
   */
  private async findForceFieldFromIncludes(document: vscode.TextDocument): Promise<vscode.Uri | null> {
    const parseResult = this.topologyParser.parse(document);

    for (const includePath of parseResult.includes) {
      // 查找形如 "xxx.ff/forcefield.itp" 的 include
      const ffMatch = includePath.match(/^(.+\.ff)\/forcefield\.itp$/);
      if (ffMatch) {
        const ffName = ffMatch[1];
        console.log(`[IndexManager] 检测到力场 include: ${ffName}`);

        // 尝试相对于当前文件的路径
        const docDir = vscode.Uri.joinPath(document.uri, '..');
        const relativeFFDir = vscode.Uri.joinPath(docDir, ffName);

        try {
          const ffItp = vscode.Uri.joinPath(relativeFFDir, 'forcefield.itp');
          await vscode.workspace.fs.stat(ffItp);
          console.log(`[IndexManager] ✓ 找到力场目录（相对路径）: ${relativeFFDir.fsPath}`);
          return relativeFFDir;
        } catch {
          // 继续尝试系统路径
        }

        // 尝试 GROMACS 系统力场目录
        const systemFFDir = await this.findSystemForceField(ffName);
        if (systemFFDir) {
          return systemFFDir;
        }
      }
    }

    return null;
  }

  /**
   * 从 ITP 文件的同目录兄弟文件中查找力场
   */
  private async findForceFieldFromSiblings(document: vscode.TextDocument): Promise<vscode.Uri | null> {
    const docDir = vscode.Uri.joinPath(document.uri, '..');

    // 1. 检查同目录是否有 forcefield.itp
    try {
      const ffItp = vscode.Uri.joinPath(docDir, 'forcefield.itp');
      await vscode.workspace.fs.stat(ffItp);
      console.log(`[IndexManager] ✓ 找到同目录 forcefield.itp: ${docDir.fsPath}`);
      return docDir;
    } catch {
      // 继续
    }

    // 2. 检查同目录是否有 topol.top，并从中查找 include
    try {
      const topolTop = vscode.Uri.joinPath(docDir, 'topol.top');
      await vscode.workspace.fs.stat(topolTop);

      const topolDoc = await vscode.workspace.openTextDocument(topolTop);
      const forceFieldFromTopol = await this.findForceFieldFromIncludes(topolDoc);
      if (forceFieldFromTopol) {
        console.log(`[IndexManager] ✓ 从 topol.top 找到力场: ${forceFieldFromTopol.fsPath}`);
        return forceFieldFromTopol;
      }
    } catch {
      // 继续
    }

    return null;
  }

  /**
   * 查找 GROMACS 系统力场目录
   */
  private async findSystemForceField(ffName: string): Promise<vscode.Uri | null> {
    // 获取 GROMACS 数据目录
    const dataPrefix = await this.getGmxDataPrefix();
    if (!dataPrefix) {
      console.log(`[IndexManager] ✗ GROMACS 未安装或未找到`);
      return null;
    }

    const topDir = path.join(dataPrefix, 'share', 'gromacs', 'top');
    const ffDir = vscode.Uri.file(path.join(topDir, ffName));

    try {
      const ffItp = vscode.Uri.joinPath(ffDir, 'forcefield.itp');
      await vscode.workspace.fs.stat(ffItp);
      console.log(`[IndexManager] ✓ 找到系统力场: ${ffDir.fsPath}`);
      return ffDir;
    } catch {
      console.log(`[IndexManager] ✗ 未找到系统力场: ${ffName}`);
      return null;
    }
  }

  /**
   * 获取 GROMACS 数据目录前缀
   * 通过执行 `gmx` 命令获取 Data prefix
   */
  private async getGmxDataPrefix(): Promise<string | null> {
    // 如果已经检查过，直接返回缓存结果
    if (this.gmxDataPrefixChecked) {
      return this.gmxDataPrefix;
    }

    this.gmxDataPrefixChecked = true;

    try {
      console.log(`[IndexManager] 执行 gmx 命令获取数据目录...`);
      const { stdout } = await execAsync('gmx -version', { timeout: 5000 });

      // 查找 "Data prefix:" 行
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/Data prefix:\s+(.+)/);
        if (match) {
          this.gmxDataPrefix = match[1].trim();
          console.log(`[IndexManager] ✓ GROMACS 数据目录: ${this.gmxDataPrefix}`);
          return this.gmxDataPrefix;
        }
      }

      console.log(`[IndexManager] ✗ 未找到 Data prefix 行`);
      return null;
    } catch (error) {
      console.log(`[IndexManager] ✗ 执行 gmx 命令失败: ${error}`);
      return null;
    }
  }

  /**
   * 检查是否安装了 GROMACS
   */
  public async isGromacsInstalled(): Promise<boolean> {
    const dataPrefix = await this.getGmxDataPrefix();
    return dataPrefix !== null;
  }

  /**
   * 使索引失效（文件更改时）
   */
  public invalidate(forceFieldDir: vscode.Uri): void {
    const key = forceFieldDir.toString();
    if (this.indices.has(key)) {
      console.log(`[IndexManager] 使索引失效: ${forceFieldDir.fsPath}`);
      this.indices.delete(key);
    }
  }

  /**
   * 清空所有缓存
   */
  public clearAll(): void {
    console.log(`[IndexManager] 清空所有索引缓存`);
    this.indices.clear();
  }
}
