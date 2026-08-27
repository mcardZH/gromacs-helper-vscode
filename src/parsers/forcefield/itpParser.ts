import * as vscode from 'vscode';
import { ParserUtils } from './common';

/**
 * ITP 文件中的段类型
 */
export enum ItpSectionType {
  AtomTypes = 'atomtypes',
  BondTypes = 'bondtypes',
  AngleTypes = 'angletypes',
  DihedralTypes = 'dihedraltypes',
  ImproperTypes = 'impropers',
  PairTypes = 'pairtypes',
  NonbondParams = 'nonbond_params',
  Unknown = 'unknown',
}

/**
 * ITP 段数据
 */
export interface ItpSection {
  type: ItpSectionType;
  name: string;
  startLine: number;
  endLine: number;
  entries: ItpEntry[];
}

/**
 * ITP 段内的条目
 */
export interface ItpEntry {
  line: number;
  atomTypes: string[];  // 涉及的原子类型
  parameters: string[]; // 参数列表
  comment?: string;
  location: vscode.Location;
}

/**
 * ITP 文件解析结果
 */
export interface ItpParseResult {
  sections: Map<ItpSectionType, ItpSection>;
  atomTypes: Set<string>; // 文件中提到的所有原子类型
}

/**
 * ItpParser - 解析 ffbonded.itp、ffnonbonded.itp 等力场参数文件
 */
export class ItpParser {
  /**
   * 解析 ITP 文件
   */
  public parse(document: vscode.TextDocument): ItpParseResult {
    console.log(`[ItpParser] 开始解析: ${document.uri.fsPath}`);

    const sections = new Map<ItpSectionType, ItpSection>();
    const atomTypes = new Set<string>();

    const lines = document.getText().split('\n');
    let currentSection: ItpSection | null = null;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const line = ParserUtils.stripComment(rawLine).trim();

      // 空行
      if (!line) {
        continue;
      }

      // 段标记：[ atomtypes ]、[ bondtypes ] 等
      const sectionMatch = line.match(/^\[\s*(\w+)\s*\]$/);
      if (sectionMatch) {
        // 保存前一个段
        if (currentSection) {
          currentSection.endLine = i - 1;
          sections.set(currentSection.type, currentSection);
        }

        // 开始新段
        const sectionName = sectionMatch[1];
        const sectionType = this.getSectionType(sectionName);
        currentSection = {
          type: sectionType,
          name: sectionName,
          startLine: i,
          endLine: i,
          entries: [],
        };

        console.log(`[ItpParser]   段: [${sectionName}] (line ${i + 1})`);
        continue;
      }

      // 段内容
      if (currentSection) {
        const entry = this.parseEntry(document, i, rawLine, line, currentSection.type);
        if (entry) {
          currentSection.entries.push(entry);
          // 收集原子类型
          entry.atomTypes.forEach(at => atomTypes.add(at));
        }
      }
    }

    // 保存最后一个段
    if (currentSection) {
      currentSection.endLine = lines.length - 1;
      sections.set(currentSection.type, currentSection);
    }

    console.log(`[ItpParser] ✓ 解析完成: ${sections.size} 个段, ${atomTypes.size} 个原子类型`);
    return { sections, atomTypes };
  }

  /**
   * 获取段类型
   */
  private getSectionType(sectionName: string): ItpSectionType {
    const normalized = sectionName.toLowerCase().replace(/[-_]/g, '');

    if (normalized === 'atomtypes') return ItpSectionType.AtomTypes;
    if (normalized === 'bondtypes') return ItpSectionType.BondTypes;
    if (normalized === 'angletypes') return ItpSectionType.AngleTypes;
    if (normalized === 'dihedraltypes') return ItpSectionType.DihedralTypes;
    if (normalized === 'impropers') return ItpSectionType.ImproperTypes;
    if (normalized === 'pairtypes') return ItpSectionType.PairTypes;
    if (normalized === 'nonbondparams') return ItpSectionType.NonbondParams;

    return ItpSectionType.Unknown;
  }

  /**
   * 解析段内条目
   */
  private parseEntry(
    document: vscode.TextDocument,
    lineNumber: number,
    rawLine: string,
    line: string,
    sectionType: ItpSectionType
  ): ItpEntry | null {
    const tokens = line.split(/\s+/).filter(t => t);
    if (tokens.length === 0) {
      return null;
    }

    // 跳过预处理指令
    if (line.startsWith('#')) {
      return null;
    }

    // 提取注释
    const commentMatch = rawLine.match(/;(.*)$/);
    const comment = commentMatch ? commentMatch[1].trim() : undefined;

    let atomTypes: string[] = [];
    let parameters: string[] = [];

    switch (sectionType) {
      case ItpSectionType.AtomTypes:
        // 格式: name  mass  charge  ptype  sigma  epsilon
        // 或: name  at.num  mass  charge  ptype  sigma  epsilon
        if (tokens.length >= 5) {
          atomTypes = [tokens[0]];
          parameters = tokens.slice(1);
        }
        break;

      case ItpSectionType.BondTypes:
        // 格式: i  j  func  b0  kb
        if (tokens.length >= 3) {
          atomTypes = [tokens[0], tokens[1]];
          parameters = tokens.slice(2);
        }
        break;

      case ItpSectionType.AngleTypes:
        // 格式: i  j  k  func  th0  cth
        if (tokens.length >= 4) {
          atomTypes = [tokens[0], tokens[1], tokens[2]];
          parameters = tokens.slice(3);
        }
        break;

      case ItpSectionType.DihedralTypes:
        // 格式: i  j  k  l  func  [parameters...]
        if (tokens.length >= 5) {
          atomTypes = [tokens[0], tokens[1], tokens[2], tokens[3]];
          parameters = tokens.slice(4);
        }
        break;

      case ItpSectionType.NonbondParams:
        // 格式: i  j  func  sigma  epsilon
        if (tokens.length >= 3) {
          atomTypes = [tokens[0], tokens[1]];
          parameters = tokens.slice(2);
        }
        break;

      default:
        // 通用处理：第一列作为原子类型
        atomTypes = [tokens[0]];
        parameters = tokens.slice(1);
        break;
    }

    const location = new vscode.Location(
      document.uri,
      new vscode.Range(lineNumber, 0, lineNumber, rawLine.length)
    );

    return {
      line: lineNumber,
      atomTypes,
      parameters,
      comment,
      location,
    };
  }
}
