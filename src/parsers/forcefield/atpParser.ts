import * as vscode from 'vscode';
import { AtomType } from '../../types/forcefield';
import { ParserUtils } from './common';

/**
 * AtpParser - 解析 atomtypes.atp 文件
 * 格式：atom_name  mass  ; comment
 */
export class AtpParser {
  /**
   * 解析 atomtypes.atp 文件
   */
  public parse(document: vscode.TextDocument): Map<string, AtomType> {
    console.log(`[AtpParser] 开始解析: ${document.uri.fsPath}`);
    const atomTypes = new Map<string, AtomType>();

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = ParserUtils.stripComment(line.text);

      if (!text.trim()) {
        continue;
      }

      // 匹配格式：atom_name  mass
      const match = text.match(/^(\S+)\s+([\d.]+)/);
      if (match) {
        const [, name, massStr] = match;
        const mass = parseFloat(massStr);

        // 提取注释作为描述
        const description = ParserUtils.extractComment(line.text);

        const atomType: AtomType = {
          name,
          mass,
          description,
          location: new vscode.Location(
            document.uri,
            new vscode.Range(i, 0, i, line.text.length)
          ),
        };

        atomTypes.set(name, atomType);
        console.log(`[AtpParser]   发现原子类型: ${name} (${mass})`);
      }
    }

    console.log(`[AtpParser] 解析完成，共 ${atomTypes.size} 个原子类型`);
    return atomTypes;
  }
}
