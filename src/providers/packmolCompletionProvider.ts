import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Packmol 代码补全提供者
 */
export class PackmolCompletionProvider implements vscode.CompletionItemProvider {
  
  private keywords = [
    'tolerance', 'seed', 'output', 'filetype', 'nloop', 'maxtry', 
    'writeout', 'writebad', 'check', 'sidemax', 'randominitialpoint', 
    'avoid_overlap', 'discale'
  ];
  
  private commands = [
    'structure', 'end', 'number', 'center', 'fixed', 'centerofmass',
    'changechains', 'resnumbers', 'chain', 'segid'
  ];
  
  private constraints = [
    'constrain_rotation', 'atoms', 'radius', 'fscale', 'short_radius',
    'short_radius_scale', 'over', 'below', 'outside', 'inside'
  ];
  
  private geometry = [
    'sphere', 'box', 'cube', 'plane', 'cylinder', 'ellipsoid'
  ];
  
  private fileTypes = [
    'pdb', 'xyz', 'mol2', 'tinker'
  ];

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    
    const lineText = document.lineAt(position).text;
    const linePrefix = lineText.substring(0, position.character);
    
    // 检查是否在 structure 命令后需要文件名补全
    const structureMatch = linePrefix.match(/^\s*structure\s+(.*)$/);
    if (structureMatch) {
      return this.getStructureFileCompletions(document, structureMatch[1]);
    }
    
    const completions: vscode.CompletionItem[] = [];
    
    // 关键字补全
    this.keywords.forEach(keyword => {
      const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
      item.detail = 'Packmol keyword';
      item.documentation = this.getKeywordDocumentation(keyword);
      completions.push(item);
    });
    
    // 命令补全
    this.commands.forEach(command => {
      const item = new vscode.CompletionItem(command, vscode.CompletionItemKind.Function);
      item.detail = 'Packmol command';
      item.documentation = this.getCommandDocumentation(command);
      
      // 添加片段
      if (command === 'structure') {
        item.insertText = new vscode.SnippetString('structure ${1:filename.pdb}\n  number ${2:100}\n  ${3:inside sphere 0. 0. 0. 20.}\nend structure');
        item.kind = vscode.CompletionItemKind.Snippet;
      } else if (command === 'fixed') {
        item.insertText = new vscode.SnippetString('fixed ${1:x} ${2:y} ${3:z} ${4:alpha} ${5:beta} ${6:gamma}');
        item.kind = vscode.CompletionItemKind.Snippet;
      }
      
      completions.push(item);
    });
    
    // 约束补全
    this.constraints.forEach(constraint => {
      const item = new vscode.CompletionItem(constraint, vscode.CompletionItemKind.Property);
      item.detail = 'Packmol constraint';
      item.documentation = this.getConstraintDocumentation(constraint);
      completions.push(item);
    });
    
    // 几何形状补全
    this.geometry.forEach(geom => {
      const item = new vscode.CompletionItem(geom, vscode.CompletionItemKind.Class);
      item.detail = 'Packmol geometry';
      item.documentation = this.getGeometryDocumentation(geom);
      
      // 添加几何形状的参数片段
      if (geom === 'sphere') {
        item.insertText = new vscode.SnippetString('sphere ${1:x} ${2:y} ${3:z} ${4:radius}');
        item.kind = vscode.CompletionItemKind.Snippet;
      } else if (geom === 'box') {
        item.insertText = new vscode.SnippetString('box ${1:xmin} ${2:ymin} ${3:zmin} ${4:xmax} ${5:ymax} ${6:zmax}');
        item.kind = vscode.CompletionItemKind.Snippet;
      } else if (geom === 'cube') {
        item.insertText = new vscode.SnippetString('cube ${1:xmin} ${2:ymin} ${3:zmin} ${4:size}');
        item.kind = vscode.CompletionItemKind.Snippet;
      } else if (geom === 'plane') {
        item.insertText = new vscode.SnippetString('plane ${1:a} ${2:b} ${3:c} ${4:d}');
        item.kind = vscode.CompletionItemKind.Snippet;
      } else if (geom === 'cylinder') {
        item.insertText = new vscode.SnippetString('cylinder ${1:x1} ${2:y1} ${3:z1} ${4:x2} ${5:y2} ${6:z2} ${7:radius}');
        item.kind = vscode.CompletionItemKind.Snippet;
      } else if (geom === 'ellipsoid') {
        item.insertText = new vscode.SnippetString('ellipsoid ${1:x} ${2:y} ${3:z} ${4:a} ${5:b} ${6:c}');
        item.kind = vscode.CompletionItemKind.Snippet;
      }
      
      completions.push(item);
    });
    
    // 如果当前行包含 "inside" 或 "outside"，优先显示几何形状
    if (linePrefix.includes('inside') || linePrefix.includes('outside')) {
      return completions.filter(item => this.geometry.includes(item.label as string));
    }
    
    return completions;
  }
  
  private getKeywordDocumentation(keyword: string): string {
    const docs: { [key: string]: string } = {
      'tolerance': 'Sets the tolerance for the packing algorithm (default: 2.0 Å)',
      'seed': 'Sets the random seed for reproducible results',
      'output': 'Specifies the output file name',
      'filetype': 'Sets the output file format (pdb, xyz, mol2, tinker)',
      'nloop': 'Maximum number of loops in the packing algorithm',
      'maxtry': 'Maximum number of attempts to place each molecule',
      'writeout': 'Write intermediate configurations during packing',
      'writebad': 'Write configurations that violate constraints',
      'check': 'Check overlaps in the final configuration',
      'sidemax': 'Maximum displacement in the random move',
      'randominitialpoint': 'Use random initial positions for molecules',
      'avoid_overlap': 'Avoid overlaps during initial placement',
      'discale': 'Scale factor for distance calculations'
    };
    return docs[keyword] || '';
  }
  
  private getCommandDocumentation(command: string): string {
    const docs: { [key: string]: string } = {
      'structure': 'Begins a structure block definition',
      'end': 'Ends the current structure block',
      'number': 'Specifies the number of molecules to pack',
      'center': 'Centers the molecule at the origin',
      'fixed': 'Fixes the molecule at a specific position and orientation',
      'centerofmass': 'Centers the molecule by its center of mass',
      'changechains': 'Changes chain identifiers in the output',
      'resnumbers': 'Controls residue numbering scheme',
      'chain': 'Sets the chain identifier',
      'segid': 'Sets the segment identifier'
    };
    return docs[command] || '';
  }
  
  private getConstraintDocumentation(constraint: string): string {
    const docs: { [key: string]: string } = {
      'constrain_rotation': 'Constrains rotation around a specific axis',
      'atoms': 'Specifies which atoms to consider for constraints',
      'radius': 'Sets the atomic radius scaling factor',
      'fscale': 'Scaling factor for the force field',
      'short_radius': 'Short-range radius for interactions',
      'short_radius_scale': 'Scaling factor for short-range radius',
      'over': 'Places molecules over a geometric constraint',
      'below': 'Places molecules below a geometric constraint',
      'outside': 'Places molecules outside a geometric region',
      'inside': 'Places molecules inside a geometric region'
    };
    return docs[constraint] || '';
  }
  
  private getGeometryDocumentation(geometry: string): string {
    const docs: { [key: string]: string } = {
      'sphere': 'Spherical region defined by center (x,y,z) and radius',
      'box': 'Rectangular box defined by two corner points (xmin,ymin,zmin) and (xmax,ymax,zmax)',
      'cube': 'Cubic region defined by one corner (xmin,ymin,zmin) and size',
      'plane': 'Plane defined by equation ax + by + cz = d',
      'cylinder': 'Cylindrical region with axis and radius',
      'ellipsoid': 'Ellipsoidal region with semi-axes'
    };
    return docs[geometry] || '';
  }

  /**
   * 获取结构文件的自动补全项
   * @param document 当前文档
   * @param partialFilename 部分文件名
   * @returns 补全项数组
   */
  private getStructureFileCompletions(
    document: vscode.TextDocument,
    partialFilename: string
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    
    try {
      // 获取当前文档所在目录
      const documentDir = path.dirname(document.uri.fsPath);
      
      // 读取目录中的文件
      const files = fs.readdirSync(documentDir);
      
      // 过滤出结构文件
      const structureFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return this.fileTypes.some(fileType => ext === `.${fileType}`);
      });
      
      // 创建补全项
      structureFiles.forEach(file => {
        // 检查文件名是否匹配部分输入
        if (file.toLowerCase().startsWith(partialFilename.toLowerCase()) || partialFilename === '') {
          const item = new vscode.CompletionItem(file, vscode.CompletionItemKind.File);
          item.detail = `Structure file (${path.extname(file)})`;
          item.documentation = `Structure file: ${file}`;
          
          // 添加文件存在标识
          const filePath = path.join(documentDir, file);
          try {
            const stats = fs.statSync(filePath);
            item.documentation = `Structure file: ${file}\nSize: ${(stats.size / 1024).toFixed(2)} KB\nModified: ${stats.mtime.toLocaleDateString()}`;
          } catch (error) {
            // 如果无法获取文件信息，使用基本信息
          }
          
          // 设置排序优先级，最近修改的文件优先
          try {
            const stats = fs.statSync(filePath);
            item.sortText = `${1000000000000 - stats.mtime.getTime()}_${file}`;
          } catch (error) {
            item.sortText = file;
          }
          
          completions.push(item);
        }
      });
      
      // 如果没有找到匹配的文件，提供一些常见的文件名模板
      if (completions.length === 0 && partialFilename.length > 0) {
        this.fileTypes.forEach(ext => {
          const suggestionName = `${partialFilename}.${ext}`;
          const item = new vscode.CompletionItem(suggestionName, vscode.CompletionItemKind.Text);
          item.detail = `New ${ext.toUpperCase()} file`;
          item.documentation = `Create new ${ext} structure file: ${suggestionName}`;
          item.sortText = `z_${suggestionName}`; // 放在最后
          completions.push(item);
        });
      }
      
    } catch (error) {
      // 如果读取目录失败，提供基本的文件扩展名建议
      this.fileTypes.forEach(ext => {
        const item = new vscode.CompletionItem(`structure.${ext}`, vscode.CompletionItemKind.Text);
        item.detail = `${ext.toUpperCase()} structure file`;
        item.documentation = `Structure file with ${ext} format`;
        completions.push(item);
      });
    }
    
    return completions;
  }
}
