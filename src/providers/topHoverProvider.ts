import * as vscode from "vscode";

export class TopHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const line = document.lineAt(position.line);
    const lineText = line.text;

    // 跳过注释行和空行
    const trimmedLine = lineText.trim();
    if (
      trimmedLine === "" ||
      trimmedLine.startsWith(";") ||
      trimmedLine.match(/^\[\s*[^\]]+\s*\]$/)
    ) {
      return null;
    }

    // 找到当前所在的节区
    const currentSection = this.getCurrentSection(document, position.line);
    if (!currentSection) {
      return null;
    }

    // 计算当前光标所在的列
    const columnIndex = this.getColumnIndex(lineText, position.character);
    if (columnIndex === -1) {
      return null;
    }

    // 获取列信息
    const columnInfo = this.getColumnInfo(currentSection, columnIndex);
    if (!columnInfo) {
      return null;
    }

    // 创建悬停内容
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    markdown.appendMarkdown(`### ${columnInfo.name}\n\n`);
    markdown.appendMarkdown(`**Section:** \`${currentSection}\`\n\n`);
    markdown.appendMarkdown(`**Column:** ${columnIndex + 1}\n\n`);
    markdown.appendMarkdown(`**Description:** ${columnInfo.description}\n\n`);

    if (columnInfo.type) {
      markdown.appendMarkdown(`**Type:** \`${columnInfo.type}\`\n\n`);
    }

    if (columnInfo.unit) {
      markdown.appendMarkdown(`**Unit:** ${columnInfo.unit}\n\n`);
    }

    if (columnInfo.example) {
      markdown.appendMarkdown(`**Example:** \`${columnInfo.example}\`\n\n`);
    }

    return new vscode.Hover(markdown);
  }

  private getCurrentSection(
    document: vscode.TextDocument,
    currentLineNumber: number
  ): string | null {
    // 从当前行向上查找最近的节区标题
    for (let i = currentLineNumber; i >= 0; i--) {
      const line = document.lineAt(i).text.trim();
      const sectionMatch = line.match(/^\[\s*([^\]]+)\s*\]$/);
      if (sectionMatch) {
        return sectionMatch[1].trim().toLowerCase();
      }
    }
    return null;
  }

  private getColumnIndex(lineText: string, characterPosition: number): number {
    // 将行按空白字符分割，找到光标所在的列
    const beforeCursor = lineText.substring(0, characterPosition);
    const afterCursor = lineText.substring(characterPosition);

    // 计算当前光标前有多少个完整的字段
    const beforeParts = beforeCursor
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0);

    // 检查光标是否在一个字段的中间
    const remainingText = beforeCursor.trimStart();
    const lastSpaceIndex = remainingText.lastIndexOf(" ");
    const lastTabIndex = remainingText.lastIndexOf("\t");
    const lastWhitespaceIndex = Math.max(lastSpaceIndex, lastTabIndex);

    if (lastWhitespaceIndex === -1) {
      // 光标在第一个字段中
      return 0;
    }

    // 检查光标后是否还有字符（不是空白）
    const currentFieldStart = lastWhitespaceIndex + 1;
    const currentFieldText = lineText.substring(
      currentFieldStart,
      characterPosition
    );

    if (currentFieldText.trim().length > 0 || afterCursor.match(/^\S/)) {
      // 光标在一个字段中间或开始
      return beforeParts.length - 1;
    } else {
      // 光标在空白处
      return beforeParts.length;
    }
  }

  private getColumnInfo(
    section: string,
    columnIndex: number
  ): ColumnInfo | null {
    const sectionColumns = this.getSectionColumns(section);
    if (!sectionColumns || columnIndex >= sectionColumns.length) {
      return null;
    }

    return sectionColumns[columnIndex];
  }

  private getSectionColumns(section: string): ColumnInfo[] | null {
    const columnDefinitions: { [key: string]: ColumnInfo[] } = {
      molecules: [
        {
          name: "molecule",
          description: "分子名称，对应 [moleculetype] 节区中定义的分子类型",
          type: "string",
          example: "Protein_A",
        },
        {
          name: "nmol",
          description: "该分子类型的分子数量",
          type: "integer",
          example: "1",
        },
      ],

      atoms: [
        {
          name: "nr",
          description: "原子序号，从1开始的连续整数",
          type: "integer",
          example: "1",
        },
        {
          name: "type",
          description: "原子类型名称，对应力场文件中定义的原子类型",
          type: "string",
          example: "CA",
        },
        {
          name: "resnr",
          description: "残基序号",
          type: "integer",
          example: "1",
        },
        {
          name: "residue",
          description: "残基名称",
          type: "string",
          example: "ALA",
        },
        {
          name: "atom",
          description: "原子名称",
          type: "string",
          example: "CA",
        },
        {
          name: "cgnr",
          description: "电荷组序号",
          type: "integer",
          example: "1",
        },
        {
          name: "charge",
          description: "原子电荷",
          type: "real",
          unit: "e (elementary charge)",
          example: "-0.12345",
        },
        {
          name: "mass",
          description: "原子质量",
          type: "real",
          unit: "amu",
          example: "12.01100",
        },
      ],

      bonds: [
        {
          name: "ai",
          description: "第一个原子的序号",
          type: "integer",
          example: "1",
        },
        {
          name: "aj",
          description: "第二个原子的序号",
          type: "integer",
          example: "2",
        },
        {
          name: "func",
          description:
            "键合函数类型\n1: 谐振子势\n2: G96键势\n3: Morse势\n4: 立方键势\n6: 表格势",
          type: "integer",
          example: "1",
        },
        {
          name: "b0",
          description: "平衡键长",
          type: "real",
          unit: "nm",
          example: "0.15300",
        },
        {
          name: "kb",
          description: "键合力常数",
          type: "real",
          unit: "kJ mol⁻¹ nm⁻²",
          example: "334720.0",
        },
      ],

      angles: [
        {
          name: "ai",
          description: "第一个原子的序号",
          type: "integer",
          example: "1",
        },
        {
          name: "aj",
          description: "中心原子的序号",
          type: "integer",
          example: "2",
        },
        {
          name: "ak",
          description: "第三个原子的序号",
          type: "integer",
          example: "3",
        },
        {
          name: "func",
          description:
            "角度函数类型\n1: 谐振子势\n2: G96角度势\n5: Urey-Bradley势",
          type: "integer",
          example: "1",
        },
        {
          name: "th0",
          description: "平衡键角",
          type: "real",
          unit: "degrees",
          example: "120.00",
        },
        {
          name: "cth",
          description: "角度力常数",
          type: "real",
          unit: "kJ mol⁻¹ rad⁻²",
          example: "527.184",
        },
      ],

      dihedrals: [
        {
          name: "ai",
          description: "第一个原子的序号",
          type: "integer",
          example: "1",
        },
        {
          name: "aj",
          description: "第二个原子的序号",
          type: "integer",
          example: "2",
        },
        {
          name: "ak",
          description: "第三个原子的序号",
          type: "integer",
          example: "3",
        },
        {
          name: "al",
          description: "第四个原子的序号",
          type: "integer",
          example: "4",
        },
        {
          name: "func",
          description:
            "二面角函数类型\n1: 周期性二面角\n2: 不当二面角\n3: Ryckaert-Bellemans\n4: 周期性不当二面角\n9: 多重二面角",
          type: "integer",
          example: "9",
        },
        {
          name: "phi0",
          description: "平衡二面角",
          type: "real",
          unit: "degrees",
          example: "180.00",
        },
        {
          name: "cp",
          description: "力常数",
          type: "real",
          unit: "kJ mol⁻¹",
          example: "4.60240",
        },
        {
          name: "mult",
          description: "周期数（多重性）",
          type: "integer",
          example: "2",
        },
      ],
        cmap: [{
          "name": "ai",
          "description": "第一个原子的序号",
          "type": "integer",
          "example": "1"
        },
        {
          "name": "aj",
          "description": "第二个原子的序号",
            "type": "integer",
            "example": "2"
        },
        {
          "name": "ak",
          "description": "第三个原子的序号",
          "type": "integer",
          "example": "3"
        },
        {
          "name": "al",
          "description": "第四个原子的序号",
          "type": "integer",
          "example": "4"
        },
        {
          "name": "am",
          "description": "第五个原子的序号",
          "type": "integer",
          "example": "5"
        },
        {
            "name": "funct",
            "description": "函数类型, 原子 1-4 定义 phi，原子 2-5 定义 psi",
            "type": "integer",
            "example": "9"
        }
      ],
    };

    return columnDefinitions[section] || null;
  }
}

interface ColumnInfo {
  name: string;
  description: string;
  type: string;
  unit?: string;
  example?: string;
}
