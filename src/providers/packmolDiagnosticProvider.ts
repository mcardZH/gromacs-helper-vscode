import * as vscode from 'vscode';

/**
 * Packmol 诊断提供者
 * 提供语法检查和错误诊断功能
 */
export class PackmolDiagnosticProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];
  
  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('packmol');
  }
  
  public activate(context: vscode.ExtensionContext): void {
    // 监听文档变化
    const changeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document.languageId === 'packmol') {
        this.validateDocument(event.document);
      }
    });
    
    // 监听文档打开
    const openDisposable = vscode.workspace.onDidOpenTextDocument(document => {
      if (document.languageId === 'packmol') {
        this.validateDocument(document);
      }
    });
    
    // 监听文档关闭
    const closeDisposable = vscode.workspace.onDidCloseTextDocument(document => {
      this.diagnosticCollection.delete(document.uri);
    });
    
    this.disposables.push(changeDisposable, openDisposable, closeDisposable);
    
    // 验证当前打开的所有 Packmol 文档
    vscode.workspace.textDocuments.forEach(document => {
      if (document.languageId === 'packmol') {
        this.validateDocument(document);
      }
    });
  }
  
  private validateDocument(document: vscode.TextDocument): void {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');
    
    let hasOutput = false;
    let hasTolerance = false;
    let structureBlockDepth = 0;
    let structureStartLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 跳过注释和空行
      if (line.startsWith('#') || line === '') {
        continue;
      }
      
      const tokens = line.split(/\s+/);
      const firstToken = tokens[0].toLowerCase();
      
      // 检查必需的参数
      if (firstToken === 'output') {
        hasOutput = true;
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Output filename is required',
            vscode.DiagnosticSeverity.Error
          ));
        }
      }
      
      if (firstToken === 'tolerance') {
        hasTolerance = true;
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Tolerance value is required',
            vscode.DiagnosticSeverity.Error
          ));
        } else if (isNaN(parseFloat(tokens[1]))) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Tolerance must be a valid number',
            vscode.DiagnosticSeverity.Error
          ));
        }
      }
      
      // 检查结构块
      if (firstToken === 'structure') {
        if (structureBlockDepth > 0) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Nested structure blocks are not allowed',
            vscode.DiagnosticSeverity.Error
          ));
        }
        structureBlockDepth++;
        structureStartLine = i;
        
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Structure filename is required',
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          // 检查文件扩展名
          const filename = tokens[1];
          const validExtensions = ['.pdb', '.xyz', '.mol2', '.tinker'];
          const hasValidExtension = validExtensions.some(ext => 
            filename.toLowerCase().endsWith(ext)
          );
          if (!hasValidExtension) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              `Invalid file extension. Supported: ${validExtensions.join(', ')}`,
              vscode.DiagnosticSeverity.Warning
            ));
          }
        }
      }
      
      if (firstToken === 'end' && tokens.length > 1 && tokens[1].toLowerCase() === 'structure') {
        if (structureBlockDepth === 0) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Unexpected end structure without matching structure block',
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          structureBlockDepth--;
        }
      }
      
      // 在结构块内的命令检查
      if (structureBlockDepth > 0) {
        if (firstToken === 'number') {
          if (tokens.length < 2) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Number of molecules is required',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (isNaN(parseInt(tokens[1])) || parseInt(tokens[1]) <= 0) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Number must be a positive integer',
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
        
        if (firstToken === 'inside' || firstToken === 'outside') {
          this.validateGeometryCommand(line, tokens, i, diagnostics);
        }
        
        if (firstToken === 'fixed') {
          if (tokens.length < 7) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Fixed command requires 6 parameters: x y z alpha beta gamma',
              vscode.DiagnosticSeverity.Error
            ));
          } else {
            for (let j = 1; j <= 6; j++) {
              if (isNaN(parseFloat(tokens[j]))) {
                diagnostics.push(this.createDiagnostic(
                  i, 0, line.length,
                  `Parameter ${j} must be a valid number`,
                  vscode.DiagnosticSeverity.Error
                ));
              }
            }
          }
        }
      }
      
      // 检查在结构块外不应该出现的命令
      if (structureBlockDepth === 0) {
        const structureOnlyCommands = ['number', 'inside', 'outside', 'center', 'fixed', 'atoms'];
        if (structureOnlyCommands.includes(firstToken)) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            `Command '${firstToken}' can only be used inside a structure block`,
            vscode.DiagnosticSeverity.Error
          ));
        }
      }
      
      // 检查未知命令
      const validCommands = [
        'tolerance', 'seed', 'output', 'filetype', 'nloop', 'maxtry', 'writeout', 'writebad',
        'check', 'sidemax', 'randominitialpoint', 'avoid_overlap', 'discale',
        'structure', 'end', 'number', 'center', 'fixed', 'centerofmass', 'changechains',
        'resnumbers', 'chain', 'segid', 'constrain_rotation', 'atoms', 'radius', 'fscale',
        'short_radius', 'short_radius_scale', 'over', 'below', 'outside', 'inside'
      ];
      
      if (!validCommands.includes(firstToken)) {
        diagnostics.push(this.createDiagnostic(
          i, 0, firstToken.length,
          `Unknown command: ${firstToken}`,
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }
    
    // 检查未闭合的结构块
    if (structureBlockDepth > 0) {
      diagnostics.push(this.createDiagnostic(
        structureStartLine, 0, lines[structureStartLine].length,
        'Structure block is not closed with "end structure"',
        vscode.DiagnosticSeverity.Error
      ));
    }
    
    // 检查必需的全局参数
    if (!hasOutput) {
      diagnostics.push(this.createDiagnostic(
        0, 0, 1,
        'Missing required "output" command',
        vscode.DiagnosticSeverity.Error
      ));
    }
    
    if (!hasTolerance) {
      diagnostics.push(this.createDiagnostic(
        0, 0, 1,
        'Missing "tolerance" command (recommended)',
        vscode.DiagnosticSeverity.Information
      ));
    }
    
    this.diagnosticCollection.set(document.uri, diagnostics);
  }
  
  private validateGeometryCommand(line: string, tokens: string[], lineNumber: number, diagnostics: vscode.Diagnostic[]): void {
    if (tokens.length < 2) {
      diagnostics.push(this.createDiagnostic(
        lineNumber, 0, line.length,
        'Geometry type is required after inside/outside',
        vscode.DiagnosticSeverity.Error
      ));
      return;
    }
    
    const geometryType = tokens[1].toLowerCase();
    
    switch (geometryType) {
      case 'sphere':
        if (tokens.length < 6) {
          diagnostics.push(this.createDiagnostic(
            lineNumber, 0, line.length,
            'Sphere requires 4 parameters: x y z radius',
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          for (let i = 2; i <= 5; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              diagnostics.push(this.createDiagnostic(
                lineNumber, 0, line.length,
                `Sphere parameter ${i-1} must be a number`,
                vscode.DiagnosticSeverity.Error
              ));
            }
          }
        }
        break;
        
      case 'box':
        if (tokens.length < 8) {
          diagnostics.push(this.createDiagnostic(
            lineNumber, 0, line.length,
            'Box requires 6 parameters: xmin ymin zmin xmax ymax zmax',
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          for (let i = 2; i <= 7; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              diagnostics.push(this.createDiagnostic(
                lineNumber, 0, line.length,
                `Box parameter ${i-1} must be a number`,
                vscode.DiagnosticSeverity.Error
              ));
            }
          }
        }
        break;
        
      case 'cube':
        if (tokens.length < 6) {
          diagnostics.push(this.createDiagnostic(
            lineNumber, 0, line.length,
            'Cube requires 4 parameters: xmin ymin zmin size',
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          for (let i = 2; i <= 5; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              diagnostics.push(this.createDiagnostic(
                lineNumber, 0, line.length,
                `Cube parameter ${i-1} must be a number`,
                vscode.DiagnosticSeverity.Error
              ));
            }
          }
        }
        break;
        
      case 'plane':
        if (tokens.length < 6) {
          diagnostics.push(this.createDiagnostic(
            lineNumber, 0, line.length,
            'Plane requires 4 parameters: a b c d',
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          for (let i = 2; i <= 5; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              diagnostics.push(this.createDiagnostic(
                lineNumber, 0, line.length,
                `Plane parameter ${i-1} must be a number`,
                vscode.DiagnosticSeverity.Error
              ));
            }
          }
        }
        break;
        
      default:
        const validGeometries = ['sphere', 'box', 'cube', 'plane', 'cylinder', 'ellipsoid'];
        if (!validGeometries.includes(geometryType)) {
          diagnostics.push(this.createDiagnostic(
            lineNumber, 0, line.length,
            `Unknown geometry type: ${geometryType}. Valid types: ${validGeometries.join(', ')}`,
            vscode.DiagnosticSeverity.Error
          ));
        }
        break;
    }
  }
  
  private createDiagnostic(
    line: number,
    startChar: number,
    endChar: number,
    message: string,
    severity: vscode.DiagnosticSeverity
  ): vscode.Diagnostic {
    const range = new vscode.Range(line, startChar, line, endChar);
    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = 'packmol';
    return diagnostic;
  }
  
  public dispose(): void {
    this.diagnosticCollection.dispose();
    this.disposables.forEach(disposable => disposable.dispose());
  }
}
