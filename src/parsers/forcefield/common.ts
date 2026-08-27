import * as vscode from 'vscode';

/**
 * 段信息
 */
export interface Section {
  name: string;
  startLine: number;
  endLine: number;
  lines: LineInfo[];
  location: vscode.Location;
}

/**
 * 行信息
 */
export interface LineInfo {
  lineNumber: number;
  text: string;
  location: vscode.Location;
}

/**
 * 解析器通用工具类
 */
export class ParserUtils {
  /**
   * 去除注释
   */
  public static stripComment(line: string): string {
    const commentIndex = line.indexOf(';');
    return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
  }

  /**
   * 提取注释内容
   */
  public static extractComment(line: string): string | undefined {
    const commentMatch = line.match(/;\s*(.+)$/);
    return commentMatch ? commentMatch[1].trim() : undefined;
  }

  /**
   * 检查行是否为空（去除注释后）
   */
  public static isEmptyLine(line: string): boolean {
    return this.stripComment(line).trim().length === 0;
  }

  /**
   * 将文档分割成段（sections）
   * 段格式：[ section_name ]
   */
  public static splitIntoSections(document: vscode.TextDocument): Section[] {
    const sections: Section[] = [];
    let currentSection: Partial<Section> | null = null;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text;

      // 检查是否是段标记
      const sectionMatch = text.match(/^\s*\[\s*([A-Za-z0-9_-]+)\s*\]/);

      if (sectionMatch) {
        // 完成前一个段
        if (currentSection && currentSection.name) {
          currentSection.endLine = i - 1;
          sections.push(currentSection as Section);
        }

        // 开始新段
        currentSection = {
          name: sectionMatch[1],
          startLine: i,
          endLine: i,
          lines: [],
          location: new vscode.Location(
            document.uri,
            new vscode.Range(i, 0, i, text.length)
          ),
        };
      } else if (currentSection) {
        // 添加行到当前段
        if (!this.isEmptyLine(text)) {
          const cleanText = this.stripComment(text).trim();
          if (cleanText) {
            currentSection.lines!.push({
              lineNumber: i,
              text: cleanText,
              location: new vscode.Location(
                document.uri,
                new vscode.Range(i, 0, i, text.length)
              ),
            });
          }
        }
      }
    }

    // 完成最后一个段
    if (currentSection && currentSection.name) {
      currentSection.endLine = document.lineCount - 1;
      sections.push(currentSection as Section);
    }

    return sections;
  }

  /**
   * 查找特定名称的段
   */
  public static findSection(sections: Section[], name: string): Section | undefined {
    return sections.find(s => s.name === name);
  }

  /**
   * 查找所有匹配模式的段
   */
  public static findSectionsByPattern(sections: Section[], pattern: RegExp): Section[] {
    return sections.filter(s => pattern.test(s.name));
  }
}
