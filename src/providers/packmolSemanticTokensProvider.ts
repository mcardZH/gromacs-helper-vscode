import * as vscode from 'vscode';

/**
 * Packmol 语义标记提供者
 */
export class PackmolSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  
  static readonly legend = new vscode.SemanticTokensLegend([
    'packmol_keyword',
    'packmol_command', 
    'packmol_constraint',
    'packmol_geometry',
    'packmol_number',
    'packmol_filename',
    'packmol_comment'
  ]);
  
  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    
    const tokensBuilder = new vscode.SemanticTokensBuilder(PackmolSemanticTokensProvider.legend);
    const text = document.getText();
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 处理注释
      const commentMatch = line.match(/#.*/);
      if (commentMatch) {
        const commentStart = line.indexOf('#');
        tokensBuilder.push(
          new vscode.Range(i, commentStart, i, line.length),
          'packmol_comment'
        );
        // 如果整行都是注释，跳过其他处理
        if (commentStart === 0 || line.substring(0, commentStart).trim() === '') {
          continue;
        }
      }
      
      const cleanLine = line.split('#')[0].trim(); // 移除注释部分
      if (cleanLine === '') {
        continue;
      }
      
      const tokens = cleanLine.split(/\s+/);
      const firstToken = tokens[0].toLowerCase();
      
      // 处理关键字
      const keywords = [
        'tolerance', 'seed', 'output', 'filetype', 'nloop', 'maxtry',
        'writeout', 'writebad', 'check', 'sidemax', 'randominitialpoint',
        'avoid_overlap', 'discale'
      ];
      
      if (keywords.includes(firstToken)) {
        const tokenStart = line.indexOf(tokens[0]);
        tokensBuilder.push(
          new vscode.Range(i, tokenStart, i, tokenStart + tokens[0].length),
          'packmol_keyword'
        );
      }
      
      // 处理命令
      const commands = [
        'structure', 'end', 'number', 'center', 'fixed', 'centerofmass',
        'changechains', 'resnumbers', 'chain', 'segid', 'atoms'
      ];
      
      if (commands.includes(firstToken)) {
        const tokenStart = line.indexOf(tokens[0]);
        tokensBuilder.push(
          new vscode.Range(i, tokenStart, i, tokenStart + tokens[0].length),
          'packmol_command'
        );
      }
      
      // 处理约束
      const constraints = [
        'constrain_rotation', 'atoms', 'radius', 'fscale', 'short_radius',
        'short_radius_scale', 'over', 'below', 'outside', 'inside'
      ];
      
      if (constraints.includes(firstToken)) {
        const tokenStart = line.indexOf(tokens[0]);
        tokensBuilder.push(
          new vscode.Range(i, tokenStart, i, tokenStart + tokens[0].length),
          'packmol_constraint'
        );
      }
      
      // 处理几何形状
      const geometries = ['sphere', 'box', 'cube', 'plane', 'cylinder', 'ellipsoid'];
      
      for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j].toLowerCase();
        if (geometries.includes(token)) {
          const tokenStart = line.indexOf(tokens[j]);
          tokensBuilder.push(
            new vscode.Range(i, tokenStart, i, tokenStart + tokens[j].length),
            'packmol_geometry'
          );
        }
      }
      
      // 处理数字
      for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j];
        if (/^-?\d+\.?\d*([eE][+-]?\d+)?$/.test(token)) {
          const tokenStart = line.indexOf(token);
          tokensBuilder.push(
            new vscode.Range(i, tokenStart, i, tokenStart + token.length),
            'packmol_number'
          );
        }
      }
      
      // 处理文件名
      if (firstToken === 'structure' && tokens.length > 1) {
        const filename = tokens[1];
        const validExtensions = ['.pdb', '.xyz', '.mol2', '.tinker'];
        const hasValidExtension = validExtensions.some(ext => 
          filename.toLowerCase().endsWith(ext)
        );
        
        if (hasValidExtension) {
          const tokenStart = line.indexOf(filename);
          tokensBuilder.push(
            new vscode.Range(i, tokenStart, i, tokenStart + filename.length),
            'packmol_filename'
          );
        }
      }
      
      if (firstToken === 'output' && tokens.length > 1) {
        const filename = tokens[1];
        const tokenStart = line.indexOf(filename);
        tokensBuilder.push(
          new vscode.Range(i, tokenStart, i, tokenStart + filename.length),
          'packmol_filename'
        );
      }

      if (firstToken === 'filetype' && tokens.length > 1) {
        const fileType = tokens[1].toLowerCase();
        if (['pdb', 'xyz', 'mol2', 'tinker'].includes(fileType)) {
          const tokenStart = line.indexOf(fileType);
          tokensBuilder.push(
            new vscode.Range(i, tokenStart, i, tokenStart + fileType.length),
            'packmol_filename'
          );
        }
      }

      if (firstToken === 'end') {
        // 如果是 end，第二个 token 为 structure 或 atoms 则标记为command
        if (tokens.length > 1 && (tokens[1].toLowerCase() === 'structure' || tokens[1].toLowerCase() === 'atoms')) {
          const tokenStart = line.indexOf(tokens[1]);
          tokensBuilder.push(
            new vscode.Range(i, tokenStart, i, tokenStart + tokens[1].length),
            'packmol_command'
          );
        }
      }
    }
    
    return tokensBuilder.build();
  }
}
