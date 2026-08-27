import * as vscode from 'vscode';
import { ParserUtils } from './common';

/**
 * TOP/ITP 文件中的段类型
 */
export enum TopologySectionType {
  Defaults = 'defaults',
  AtomTypes = 'atomtypes',
  MoleculeType = 'moleculetype',
  Atoms = 'atoms',
  Bonds = 'bonds',
  Pairs = 'pairs',
  Angles = 'angles',
  Dihedrals = 'dihedrals',
  Exclusions = 'exclusions',
  Constraints = 'constraints',
  SettleS = 'settles',
  VirtualSites = 'virtual_sites',
  Position_Restraints = 'position_restraints',
  System = 'system',
  Molecules = 'molecules',
  Unknown = 'unknown',
}

/**
 * TOP/ITP 段数据
 */
export interface TopologySection {
  type: TopologySectionType;
  name: string;
  startLine: number;
  endLine: number;
  entries: TopologyEntry[];
}

/**
 * TOP/ITP 段内的条目
 */
export interface TopologyEntry {
  line: number;
  tokens: string[];
  comment?: string;
  location: vscode.Location;
}

/**
 * TOP/ITP 文件解析结果
 */
export interface TopologyParseResult {
  includes: string[];  // #include 的文件列表
  sections: Map<TopologySectionType, TopologySection[]>;
  currentMoleculeType?: string;  // 当前分子类型
}

/**
 * TopologyParser - 解析 TOP/ITP 文件
 */
export class TopologyParser {
  /**
   * 解析 TOP/ITP 文件
   */
  public parse(document: vscode.TextDocument): TopologyParseResult {
    console.log(`[TopologyParser] 开始解析: ${document.uri.fsPath}`);

    const includes: string[] = [];
    const sections = new Map<TopologySectionType, TopologySection[]>();
    let currentSection: TopologySection | null = null;
    let currentMoleculeType: string | undefined;

    const lines = document.getText().split('\n');

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const line = ParserUtils.stripComment(rawLine).trim();

      // 空行
      if (!line) {
        continue;
      }

      // #include 指令
      if (line.startsWith('#include')) {
        const includeMatch = line.match(/#include\s+["<]([^">]+)[">]/);
        if (includeMatch) {
          includes.push(includeMatch[1]);
          console.log(`[TopologyParser]   #include: ${includeMatch[1]}`);
        }
        continue;
      }

      // 预处理指令
      if (line.startsWith('#')) {
        continue;
      }

      // 段标记：[ atoms ]、[ bonds ] 等
      const sectionMatch = line.match(/^\[\s*(\w+)\s*\]$/);
      if (sectionMatch) {
        // 保存前一个段
        if (currentSection) {
          currentSection.endLine = i - 1;
          this.addSection(sections, currentSection);
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

        // 如果是 moleculetype 段，记录分子类型名称
        if (sectionType === TopologySectionType.MoleculeType) {
          // 下一行应该是分子名称
          if (i + 1 < lines.length) {
            const nextLine = ParserUtils.stripComment(lines[i + 1]).trim();
            const tokens = nextLine.split(/\s+/).filter(t => t);
            if (tokens.length > 0) {
              currentMoleculeType = tokens[0];
              console.log(`[TopologyParser]   分子类型: ${currentMoleculeType}`);
            }
          }
        }

        console.log(`[TopologyParser]   段: [${sectionName}] (line ${i + 1})`);
        continue;
      }

      // 段内容
      if (currentSection) {
        const entry = this.parseEntry(document, i, rawLine, line);
        if (entry) {
          currentSection.entries.push(entry);
        }
      }
    }

    // 保存最后一个段
    if (currentSection) {
      currentSection.endLine = lines.length - 1;
      this.addSection(sections, currentSection);
    }

    console.log(`[TopologyParser] ✓ 解析完成: ${includes.length} 个 include, ${sections.size} 种段类型`);
    return { includes, sections, currentMoleculeType };
  }

  /**
   * 添加段到 map（支持同一类型的多个段）
   */
  private addSection(sections: Map<TopologySectionType, TopologySection[]>, section: TopologySection): void {
    if (!sections.has(section.type)) {
      sections.set(section.type, []);
    }
    sections.get(section.type)!.push(section);
  }

  /**
   * 获取段类型
   */
  private getSectionType(sectionName: string): TopologySectionType {
    const normalized = sectionName.toLowerCase().replace(/[-_]/g, '');

    if (normalized === 'defaults') return TopologySectionType.Defaults;
    if (normalized === 'atomtypes') return TopologySectionType.AtomTypes;
    if (normalized === 'moleculetype') return TopologySectionType.MoleculeType;
    if (normalized === 'atoms') return TopologySectionType.Atoms;
    if (normalized === 'bonds') return TopologySectionType.Bonds;
    if (normalized === 'pairs') return TopologySectionType.Pairs;
    if (normalized === 'angles') return TopologySectionType.Angles;
    if (normalized === 'dihedrals') return TopologySectionType.Dihedrals;
    if (normalized === 'exclusions') return TopologySectionType.Exclusions;
    if (normalized === 'constraints') return TopologySectionType.Constraints;
    if (normalized === 'settles') return TopologySectionType.SettleS;
    if (normalized.startsWith('virtualsites')) return TopologySectionType.VirtualSites;
    if (normalized === 'positionrestraints') return TopologySectionType.Position_Restraints;
    if (normalized === 'system') return TopologySectionType.System;
    if (normalized === 'molecules') return TopologySectionType.Molecules;

    return TopologySectionType.Unknown;
  }

  /**
   * 解析段内条目
   */
  private parseEntry(
    document: vscode.TextDocument,
    lineNumber: number,
    rawLine: string,
    line: string
  ): TopologyEntry | null {
    const tokens = line.split(/\s+/).filter(t => t);
    if (tokens.length === 0) {
      return null;
    }

    // 提取注释
    const commentMatch = rawLine.match(/;(.*)$/);
    const comment = commentMatch ? commentMatch[1].trim() : undefined;

    const location = new vscode.Location(
      document.uri,
      new vscode.Range(lineNumber, 0, lineNumber, rawLine.length)
    );

    return {
      line: lineNumber,
      tokens,
      comment,
      location,
    };
  }
}
