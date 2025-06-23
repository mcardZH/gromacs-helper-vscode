import * as vscode from 'vscode';

/**
 * Packmol 悬停提示提供者
 */
export class PackmolHoverProvider implements vscode.HoverProvider {
  
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return;
    }
    
    const word = document.getText(wordRange);
    const line = document.lineAt(position.line).text;
    
    const hoverContent = this.getHoverContent(word, line);
    if (hoverContent) {
      return new vscode.Hover(hoverContent, wordRange);
    }
    
    return;
  }
  
  private getHoverContent(word: string, line: string): vscode.MarkdownString | undefined {
    const content = new vscode.MarkdownString();
    content.isTrusted = true;
    
    // 关键字说明
    const keywordDocs = this.getKeywordDocumentation(word);
    if (keywordDocs) {
      content.appendMarkdown(`**${word}** *(keyword)*\n\n${keywordDocs}`);
      return content;
    }
    
    // 命令说明
    const commandDocs = this.getCommandDocumentation(word);
    if (commandDocs) {
      content.appendMarkdown(`**${word}** *(command)*\n\n${commandDocs}`);
      return content;
    }
    
    // 约束说明
    const constraintDocs = this.getConstraintDocumentation(word);
    if (constraintDocs) {
      content.appendMarkdown(`**${word}** *(constraint)*\n\n${constraintDocs}`);
      return content;
    }
    
    // 几何形状说明
    const geometryDocs = this.getGeometryDocumentation(word);
    if (geometryDocs) {
      content.appendMarkdown(`**${word}** *(geometry)*\n\n${geometryDocs}`);
      return content;
    }
    
    // 检查是否是文件名
    if (word.includes('.') && this.isFilename(word)) {
      content.appendMarkdown(`**${word}** *(file)*\n\nInput structure file for Packmol`);
      return content;
    }
    
    // 检查是否是数值
    if (this.isNumeric(word)) {
      const context = this.getNumericContext(word, line);
      if (context) {
        content.appendMarkdown(`**${word}** *(number)*\n\n${context}`);
        return content;
      }
    }
    
    return undefined;
  }
  
  private getKeywordDocumentation(keyword: string): string | undefined {
    const docs: { [key: string]: string } = {
      'tolerance': `Sets the tolerance for the packing algorithm.\n\n**Default:** 2.0 Å\n\n**Usage:** \`tolerance 2.0\`\n\nControls how close molecules can be to each other and to geometric constraints.`,
      'seed': `Sets the random seed for reproducible results.\n\n**Usage:** \`seed 12345\`\n\nUsing the same seed will produce identical results across runs.`,
      'output': `Specifies the output file name.\n\n**Usage:** \`output system.pdb\`\n\nThe output file will contain the final packed configuration.`,
      'filetype': `Sets the output file format.\n\n**Supported formats:** pdb, xyz, mol2, tinker\n\n**Usage:** \`filetype pdb\``,
      'nloop': `Maximum number of loops in the packing algorithm.\n\n**Default:** 20\n\n**Usage:** \`nloop 50\`\n\nIncreasing this may improve packing quality but increase runtime.`,
      'maxtry': `Maximum number of attempts to place each molecule.\n\n**Default:** 200\n\n**Usage:** \`maxtry 500\`\n\nIncrease for difficult packing problems.`,
      'writeout': `Write intermediate configurations during packing.\n\n**Usage:** \`writeout 100\`\n\nWrites configuration every N steps for monitoring progress.`,
      'writebad': `Write configurations that violate constraints.\n\n**Usage:** \`writebad\`\n\nUseful for debugging constraint problems.`,
      'check': `Check overlaps in the final configuration.\n\n**Usage:** \`check\`\n\nVerifies that the final configuration satisfies all constraints.`,
      'sidemax': `Maximum displacement in random moves.\n\n**Default:** 1000.0\n\n**Usage:** \`sidemax 50.0\`\n\nControls the maximum distance a molecule can move in one step.`,
      'add_box_sides': `Adds sides to the bounding box.\n\n**Usage:** \`add_box_sides 5.0\`\n\nExpands the bounding box by this amount on each side.`,
    };
    return docs[keyword];
  }
  
  private getCommandDocumentation(command: string): string | undefined {
    const docs: { [key: string]: string } = {
      'structure': `Begins a structure block definition.\n\n**Usage:**\n\`\`\`\nstructure filename.pdb\n  number 100\n  inside sphere 0. 0. 0. 20.\nend structure\n\`\`\`\n\nDefines a molecule type and its packing constraints.`,
      'end': `Ends the current structure block.\n\n**Usage:** \`end structure\`\n\nMust be used to close each structure block.`,
      'number': `Specifies the number of molecules to pack.\n\n**Usage:** \`number 100\`\n\nRequired for each structure block.`,
      'center': `Centers the molecule at the origin.\n\n**Usage:** \`center\`\n\nMoves the molecule's center of mass to (0,0,0) before packing.`,
      'fixed': `Fixes the molecule at a specific position and orientation.\n\n**Usage:** \`fixed x y z alpha beta gamma\`\n\nPosition (x,y,z) and Euler angles (alpha,beta,gamma) in degrees.`,
      'centerofmass': `Centers the molecule by its center of mass.\n\n**Usage:** \`centerofmass\`\n\nAlternative to 'center' command.`,
      'changechains': `Changes chain identifiers in the output.\n\n**Usage:** \`changechains\`\n\nAutomatically assigns different chain IDs to different molecules.`,
      'resnumbers': `Controls residue numbering scheme.\n\n**Usage:** \`resnumbers 3\`\n\nSets how residues are numbered in the output.`,
      'chain': `Sets the chain identifier.\n\n**Usage:** \`chain A\`\n\nAssigns a specific chain ID to this structure.`,
      'segid': `Sets the segment identifier.\n\n**Usage:** \`segid WAT\`\n\nUseful for organizing different molecule types.`,
      'restart_to': `From version 16.143 on, it is possible to build the system from multiple and independent executions of Packmol by the use of restart files. In order to write a restart file, the following keyword must be used: restart_to restart.pack where restart..pack is the name of the restart file to be created.`,
      'restart_from': ` It is possible to write restart files for the whole system, if the keyword is put outside structure...end structure sections, or to write a restart file for a specific part of the system.`
    };
    return docs[command];
  }
  
  private getConstraintDocumentation(constraint: string): string | undefined {
    const docs: { [key: string]: string } = {
      'constrain_rotation': `Constrains rotation around a specific axis.\n\n**Usage:** \`constrain_rotation x 180. 20.\`\n\nRestricts rotation angles around the specified axis (x, y, or z) to be within angle±tolerance degrees.\n\n**Example:**\n\`\`\`\nconstrain_rotation x 0. 20.\nconstrain_rotation y 0. 20.\n\`\`\`\n\nThis constrains the molecule to align along the z-axis.`,
      'atoms': `Specifies which atoms to consider for constraints.\n\n**Usage:** \`atoms 1 2 3\`\n\nOnly these atom indices will be checked for constraint violations.`,
      'radius': `Sets the atomic radius scaling factor.\n\n**Usage:** \`radius 2.5\`\n\nScales all atomic radii by this factor for overlap checking.`,
      'over': `Places molecules over a geometric constraint.\n\n**Usage:** \`over plane 0. 0. 1. 0.\`\n\nMolecules will be placed above the specified plane.`,
      'below': `Places molecules below a geometric constraint.\n\n**Usage:** \`below plane 0. 0. 1. 20.\`\n\nMolecules will be placed below the specified plane.`,
      'outside': `Places molecules outside a geometric region.\n\n**Usage:** \`outside sphere 0. 0. 0. 5.\`\n\nMolecules will be placed outside the specified region.`,
      'inside': `Places molecules inside a geometric region.\n\n**Usage:** \`inside sphere 0. 0. 0. 20.\`\n\nMolecules will be placed inside the specified region.`,
      'mindistance': `Minimum distance between molecules.\n\n**Usage:** \`mindistance 5.0\`\n\nEnsures molecules are at least this far apart.`
    };
    return docs[constraint];
  }
  
  private getGeometryDocumentation(geometry: string): string | undefined {
    const docs: { [key: string]: string } = {
      'sphere': `Spherical region defined by center and radius.\n\n**Usage:** \`sphere x y z radius\`\n\n**Example:** \`sphere 0. 0. 0. 20.\`\n\nDefines a sphere centered at (x,y,z) with given radius.`,
      'box': `Rectangular box defined by two corner points.\n\n**Usage:** \`box xmin ymin zmin xmax ymax zmax\`\n\n**Example:** \`box 0. 0. 0. 30. 30. 30.\`\n\nDefines a box from (xmin,ymin,zmin) to (xmax,ymax,zmax).`,
      'cube': `Cubic region defined by one corner and size.\n\n**Usage:** \`cube xmin ymin zmin size\`\n\n**Example:** \`cube 0. 0. 0. 25.\`\n\nDefines a cube starting at (xmin,ymin,zmin) with given size.`,
      'plane': `Plane defined by equation ax + by + cz = d.\n\n**Usage:** \`plane a b c d\`\n\n**Example:** \`plane 0. 0. 1. 0.\` (xy-plane)\n\nDefines a plane using the equation ax + by + cz = d.`,
      'cylinder': `Cylindrical region defined by parametric equation.\n\n**Usage:** \`cylinder a1 b1 c1 a2 b2 c2 d l\`\n\n**Parameters:**\n- (a1, b1, c1): Starting point of cylinder axis\n- (a2, b2, c2): Direction vector of cylinder axis\n- d: Radius of cylinder\n- l: Length of cylinder\n\n**Example:** \`cylinder 0. 0. 0. 1. 0. 0. 5. 20.\`\n(cylinder starting at origin, along x-axis, radius 5, length 20)\n\nThe cylinder is defined by the parametric equation:\np = (a1, b1, c1) + t × (a2, b2, c2)\nwhere t is the parameter, and the cylinder extends from t=0 to t=l/|(a2,b2,c2)|.`,
      'ellipsoid': `Ellipsoidal region with semi-axes.\n\n**Usage:** \`ellipsoid x y z a b c\`\n\nDefines an ellipsoid centered at (x,y,z) with semi-axes a, b, c.`,
      'xygauss': 'Parameters (*a_1*, *b_1*) define center of the gaussian, while *c* specifies the height in the *z* dimension. *a_2* and *b_2* set the width of the gaussian in *x*, and *y*, respectively, while *h* specifies its height. It is possible to restrict atoms to be over or below the gaussian plane. The gaussian surface as implemented is restricted to be over the *xy* plane.',
    };
    return docs[geometry];
  }
  
  private isFilename(word: string): boolean {
    const extensions = ['.pdb', '.xyz', '.mol2', '.tinker'];
    return extensions.some(ext => word.toLowerCase().endsWith(ext));
  }
  
  private isNumeric(word: string): boolean {
    return /^-?\\d+\\.?\\d*([eE][+-]?\\d+)?$/.test(word);
  }
  
  private getNumericContext(word: string, line: string): string | undefined {
    if (line.includes('tolerance')) {
      return 'Tolerance value in Ångströms for the packing algorithm';
    }
    if (line.includes('seed')) {
      return 'Random seed for reproducible results';
    }
    if (line.includes('number')) {
      return 'Number of molecules to pack';
    }
    if (line.includes('sphere')) {
      return 'Sphere parameter (center coordinates or radius)';
    }
    if (line.includes('box')) {
      return 'Box parameter (corner coordinates)';
    }
    if (line.includes('cube')) {
      return 'Cube parameter (corner coordinates or size)';
    }
    if (line.includes('plane')) {
      return 'Plane equation parameter (a, b, c, or d)';
    }
    if (line.includes('fixed')) {
      return 'Position coordinate or Euler angle for fixed placement';
    }
    if (line.includes('mindistance')) {
      return 'Minimum distance in Ångströms';
    }
    return 'Numeric parameter';
  }
}
