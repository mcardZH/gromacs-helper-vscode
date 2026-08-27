import * as vscode from 'vscode';
import * as path from 'path';

/**
 * IncludeDefinitionProvider - 为 #include 语句提供跳转支持
 * 支持 .itp、.top、.rtp 等文件中的 #include 指令
 */
export class IncludeDefinitionProvider implements vscode.DefinitionProvider {
  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | null> {
    const line = document.lineAt(position.line);
    const lineText = line.text;

    console.log(`[IncludeDefinition] 请求定义: line ${position.line}`);

    // 匹配 #include "filename" 或 #include <filename>
    const includeMatch = lineText.match(/^\s*#include\s+["<]([^">]+)[">]/);
    if (!includeMatch) {
      return null;
    }

    const includePath = includeMatch[1];
    console.log(`[IncludeDefinition] 检测到 include: ${includePath}`);

    // 检查光标是否在文件名上
    const includeStart = lineText.indexOf(includePath);
    const includeEnd = includeStart + includePath.length;

    if (position.character < includeStart || position.character > includeEnd) {
      console.log(`[IncludeDefinition] 光标不在文件名上`);
      return null;
    }

    // 解析文件路径
    const targetUri = await this.resolveIncludePath(document, includePath);
    if (!targetUri) {
      console.log(`[IncludeDefinition] ✗ 无法解析路径: ${includePath}`);
      return null;
    }

    console.log(`[IncludeDefinition] ✓ 跳转到: ${targetUri.fsPath}`);
    return new vscode.Location(targetUri, new vscode.Position(0, 0));
  }

  /**
   * 解析 include 路径
   */
  private async resolveIncludePath(
    document: vscode.TextDocument,
    includePath: string
  ): Promise<vscode.Uri | null> {
    // 1. 相对于当前文件的路径
    const currentDir = vscode.Uri.joinPath(document.uri, '..');
    let targetUri = vscode.Uri.joinPath(currentDir, includePath);

    try {
      await vscode.workspace.fs.stat(targetUri);
      console.log(`[IncludeDefinition] 找到相对路径: ${targetUri.fsPath}`);
      return targetUri;
    } catch {
      // 文件不存在，继续尝试其他路径
    }

    // 2. 相对于力场目录（查找 forcefield.itp 所在目录）
    const forceFieldDir = await this.findForceFieldDir(document);
    if (forceFieldDir) {
      targetUri = vscode.Uri.joinPath(forceFieldDir, includePath);
      try {
        await vscode.workspace.fs.stat(targetUri);
        console.log(`[IncludeDefinition] 找到力场目录路径: ${targetUri.fsPath}`);
        return targetUri;
      } catch {
        // 继续
      }
    }

    // 3. 相对于工作区根目录
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      for (const folder of vscode.workspace.workspaceFolders) {
        targetUri = vscode.Uri.joinPath(folder.uri, includePath);
        try {
          await vscode.workspace.fs.stat(targetUri);
          console.log(`[IncludeDefinition] 找到工作区路径: ${targetUri.fsPath}`);
          return targetUri;
        } catch {
          // 继续
        }
      }
    }

    // 4. GROMACS 系统力场目录（常见安装路径）
    const systemPaths = [
      '/opt/homebrew/Cellar/gromacs/2026.1/share/gromacs/top',
      '/usr/local/gromacs/share/gromacs/top',
      '/usr/share/gromacs/top',
    ];

    for (const systemPath of systemPaths) {
      try {
        targetUri = vscode.Uri.file(path.join(systemPath, includePath));
        await vscode.workspace.fs.stat(targetUri);
        console.log(`[IncludeDefinition] 找到系统路径: ${targetUri.fsPath}`);
        return targetUri;
      } catch {
        // 继续
      }
    }

    return null;
  }

  /**
   * 查找力场目录（包含 forcefield.itp 的目录）
   */
  private async findForceFieldDir(document: vscode.TextDocument): Promise<vscode.Uri | null> {
    let currentDir = vscode.Uri.joinPath(document.uri, '..');

    // 向上查找，最多5层
    for (let i = 0; i < 5; i++) {
      const forceFieldItp = vscode.Uri.joinPath(currentDir, 'forcefield.itp');
      try {
        await vscode.workspace.fs.stat(forceFieldItp);
        console.log(`[IncludeDefinition] 找到力场目录: ${currentDir.fsPath}`);
        return currentDir;
      } catch {
        // 继续向上
        currentDir = vscode.Uri.joinPath(currentDir, '..');
      }
    }

    return null;
  }
}
