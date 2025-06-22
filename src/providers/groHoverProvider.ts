import * as vscode from 'vscode';

export class GroHoverProvider implements vscode.HoverProvider {
  
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    
    const lineNumber = position.line;
    const character = position.character;
    const lineText = document.lineAt(lineNumber).text;
    
    // 检查是否是注释行
    if (lineText.trim().startsWith(';')) {
      return new vscode.Hover(new vscode.MarkdownString('**Comment line**'));
    }
    
    // 获取总行数来判断文件结构
    const totalLines = document.lineCount;
    
    // 第一行通常是标题
    if (lineNumber === 0) {
      return new vscode.Hover(new vscode.MarkdownString('**Title line** - Description of the structure'));
    }
    
    // 第二行通常是原子数量
    if (lineNumber === 1) {
      return new vscode.Hover(new vscode.MarkdownString('**Atom count** - Total number of atoms in the structure'));
    }
    
    // 最后一行通常是盒子向量
    if (lineNumber === totalLines - 1) {
      return this.getBoxVectorHover(character);
    }
    
    // 中间的行是原子行
    if (lineNumber > 1 && lineNumber < totalLines - 1) {
      return this.getAtomLineHover(character);
    }
    
    return null;
  }
  
  private getAtomLineHover(character: number): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    let fieldInfo = '';
    let fieldDescription = '';
    
    if (character >= 0 && character < 5) {
      fieldInfo = 'Residue Number';
      fieldDescription = 'Sequential number of the residue (columns 0-5)';
    } else if (character >= 5 && character < 10) {
      fieldInfo = 'Residue Name';
      fieldDescription = 'Name of the residue/molecule (columns 5-10)';
    } else if (character >= 10 && character < 15) {
      fieldInfo = 'Atom Name';
      fieldDescription = 'Name of the atom (columns 10-15)';
    } else if (character >= 15 && character < 20) {
      fieldInfo = 'Atom Number';
      fieldDescription = 'Sequential number of the atom (columns 15-20)';
    } else if (character >= 20 && character < 28) {
      fieldInfo = 'X Coordinate';
      fieldDescription = 'X position in nm (columns 20-28, 3 decimal precision)';
    } else if (character >= 28 && character < 36) {
      fieldInfo = 'Y Coordinate';
      fieldDescription = 'Y position in nm (columns 28-36, 3 decimal precision)';
    } else if (character >= 36 && character < 44) {
      fieldInfo = 'Z Coordinate';
      fieldDescription = 'Z position in nm (columns 36-44, 3 decimal precision)';
    } else if (character >= 44 && character < 52) {
      fieldInfo = 'X Velocity';
      fieldDescription = 'X velocity in nm/ps (columns 44-52, optional)';
    } else if (character >= 52 && character < 60) {
      fieldInfo = 'Y Velocity';
      fieldDescription = 'Y velocity in nm/ps (columns 52-60, optional)';
    } else if (character >= 60 && character < 68) {
      fieldInfo = 'Z Velocity';
      fieldDescription = 'Z velocity in nm/ps (columns 60-68, optional)';
    } else {
      fieldInfo = 'Atom Line';
      fieldDescription = 'Fixed-width format atom information';
    }
    
    markdown.appendMarkdown(`### ${fieldInfo}\n\n`);
    markdown.appendMarkdown(`${fieldDescription}\n\n`);
    
    // 添加格式表格
    markdown.appendMarkdown('#### GRO Format Layout\n');
    markdown.appendMarkdown('| Field | Columns | Type | Description |\n');
    markdown.appendMarkdown('|-------|---------|------|-------------|\n');
    markdown.appendMarkdown('| Residue # | 0-5 | Integer | Sequential residue number |\n');
    markdown.appendMarkdown('| Residue Name | 5-10 | String | Molecule/residue name |\n');
    markdown.appendMarkdown('| Atom Name | 10-15 | String | Atom name |\n');
    markdown.appendMarkdown('| Atom # | 15-20 | Integer | Sequential atom number |\n');
    markdown.appendMarkdown('| X | 20-28 | Float | X coordinate (nm) |\n');
    markdown.appendMarkdown('| Y | 28-36 | Float | Y coordinate (nm) |\n');
    markdown.appendMarkdown('| Z | 36-44 | Float | Z coordinate (nm) |\n');
    markdown.appendMarkdown('| VX | 44-52 | Float | X velocity (nm/ps) |\n');
    markdown.appendMarkdown('| VY | 52-60 | Float | Y velocity (nm/ps) |\n');
    markdown.appendMarkdown('| VZ | 60-68 | Float | Z velocity (nm/ps) |\n');
    
    return new vscode.Hover(markdown);
  }
  
  private getBoxVectorHover(character: number): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    markdown.appendMarkdown('### Box Vectors\n\n');
    markdown.appendMarkdown('Defines the simulation box dimensions in nm.\n\n');
    
    markdown.appendMarkdown('#### Format\n');
    markdown.appendMarkdown('- **3 values**: `xx yy zz` (rectangular box)\n');
    markdown.appendMarkdown('- **9 values**: `xx yy zz xy xz yx yz zx zy` (triclinic box)\n\n');
    
    markdown.appendMarkdown('#### Typical Usage\n');
    markdown.appendMarkdown('- `xx yy zz`: Box dimensions along X, Y, Z axes\n');
    markdown.appendMarkdown('- Additional values: Off-diagonal elements for non-rectangular boxes\n');
    
    return new vscode.Hover(markdown);
  }
}
