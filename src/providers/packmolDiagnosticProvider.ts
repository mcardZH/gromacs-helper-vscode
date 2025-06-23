import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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
    let currentStructureHasNumber = false;
    let currentStructureFilename = '';
    
    for (let i = 0; i < lines.length; i++) {
      const originalLine = lines[i];
      const line = originalLine.trim();
      
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
          diagnostics.push(this.createLineDiagnostic(
            i, originalLine,
            'Output filename is required',
            vscode.DiagnosticSeverity.Error
          ));
        } else if (tokens.length > 2) {
          diagnostics.push(this.createLineDiagnostic(
            i, originalLine,
            `Output command has too many parameters. Expected 1 (filename), got ${tokens.length - 1}`,
            vscode.DiagnosticSeverity.Warning
          ));
        }
      }
      
      if (firstToken === 'tolerance') {
        hasTolerance = true;
        if (tokens.length < 2) {
          diagnostics.push(this.createLineDiagnostic(
            i, originalLine,
            'Tolerance value is required',
            vscode.DiagnosticSeverity.Error
          ));
        } else if (tokens.length > 2) {
          diagnostics.push(this.createLineDiagnostic(
            i, originalLine,
            `Tolerance command has too many parameters. Expected 1 (value), got ${tokens.length - 1}`,
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          const tolerance = parseFloat(tokens[1]);
          if (isNaN(tolerance)) {
            diagnostics.push(this.createLineDiagnostic(
              i, originalLine,
              'Tolerance must be a valid number',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (tolerance <= 0) {
            diagnostics.push(this.createLineDiagnostic(
              i, originalLine,
              'Tolerance must be a positive number',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (tolerance < 0.5) {
            diagnostics.push(this.createLineDiagnostic(
              i, originalLine,
              'Tolerance value is very small, may cause packing difficulties',
              vscode.DiagnosticSeverity.Warning
            ));
          } else if (tolerance > 10.0) {
            diagnostics.push(this.createLineDiagnostic(
              i, originalLine,
              'Tolerance value is very large, may result in poor packing',
              vscode.DiagnosticSeverity.Warning
            ));
          }
        }
      }
      
      // 验证其他全局参数
      if (firstToken === 'seed') {
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Seed value is required',
            vscode.DiagnosticSeverity.Error
          ));
        } else if (tokens.length > 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            `Seed command has too many parameters. Expected 1 (value), got ${tokens.length - 1}`,
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          const seed = parseInt(tokens[1]);
          if (isNaN(seed)) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Seed must be a valid integer',
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
      }
      
      if (firstToken === 'nloop') {
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Nloop value is required',
            vscode.DiagnosticSeverity.Error
          ));
        } else if (tokens.length > 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            `Nloop command has too many parameters. Expected 1 (value), got ${tokens.length - 1}`,
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          const nloop = parseInt(tokens[1]);
          if (isNaN(nloop) || nloop <= 0) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Nloop must be a positive integer',
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
      }
      
      if (firstToken === 'maxtry') {
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Maxtry value is required',
            vscode.DiagnosticSeverity.Error
          ));
        } else if (tokens.length > 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            `Maxtry command has too many parameters. Expected 1 (value), got ${tokens.length - 1}`,
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          const maxtry = parseInt(tokens[1]);
          if (isNaN(maxtry) || maxtry <= 0) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Maxtry must be a positive integer',
              vscode.DiagnosticSeverity.Error
            ));
          }
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
        currentStructureHasNumber = false;
        currentStructureFilename = tokens.length > 1 ? tokens[1] : '';
        
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Structure filename is required',
            vscode.DiagnosticSeverity.Error
          ));
        } else if (tokens.length > 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            `Structure command has too many parameters. Expected 1 (filename), got ${tokens.length - 1}`,
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
          
          // 检查文件是否存在
          this.checkFileExists(document, filename, i, diagnostics);
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
          // 检查结构块是否有必需的 number 命令
          if (!currentStructureHasNumber) {
            diagnostics.push(this.createDiagnostic(
              structureStartLine, 0, lines[structureStartLine].length,
              `Structure block '${currentStructureFilename}' is missing required 'number' command`,
              vscode.DiagnosticSeverity.Error
            ));
          }
          structureBlockDepth--;
        }
      }
      
      // 在结构块内的命令检查
      if (structureBlockDepth > 0) {
        if (firstToken === 'number') {
          currentStructureHasNumber = true;
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
          this.validateGeometryCommand(originalLine, tokens, i, diagnostics);
        }
        
        if (firstToken === 'above' || firstToken === 'below' || firstToken === 'over') {
          this.validateConstraintCommand(originalLine, tokens, i, diagnostics);
        }
        
        if (firstToken === 'fixed') {
          if (tokens.length < 7) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Fixed command requires exactly 6 parameters: x y z alpha beta gamma',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (tokens.length > 7) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              `Fixed command has too many parameters. Expected 6 (x y z alpha beta gamma), got ${tokens.length - 1}`,
              vscode.DiagnosticSeverity.Error
            ));
          } else {
            for (let j = 1; j <= 6; j++) {
              if (isNaN(parseFloat(tokens[j]))) {
                diagnostics.push(this.createDiagnostic(
                  i, 0, line.length,
                  `Fixed parameter ${j} must be a valid number`,
                  vscode.DiagnosticSeverity.Error
                ));
              }
            }
          }
        }
        
        // 验证 center 命令
        if (firstToken === 'center') {
          // center 命令不需要参数，只检查是否有多余参数
          if (tokens.length > 1) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              `Center command takes no parameters, got ${tokens.length - 1}`,
              vscode.DiagnosticSeverity.Warning
            ));
          }
        }
        
        // 验证 changechains 命令
        if (firstToken === 'changechains') {
          // changechains 命令不需要参数，只检查是否有多余参数
          if (tokens.length > 1) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              `Changechains command takes no parameters, got ${tokens.length - 1}`,
              vscode.DiagnosticSeverity.Warning
            ));
          }
        }
        
        // 验证 chain 命令
        if (firstToken === 'chain') {
          if (tokens.length < 2) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Chain command requires a chain identifier',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (tokens.length > 2) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              `Chain command has too many parameters. Expected 1 (chain ID), got ${tokens.length - 1}`,
              vscode.DiagnosticSeverity.Warning
            ));
          }
        }
        
        // 验证 resnumbers 命令
        if (firstToken === 'resnumbers') {
          if (tokens.length < 3) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Resnumbers command requires at least 2 parameters: start_number [step]',
              vscode.DiagnosticSeverity.Error
            ));
          } else {
            const startNum = parseInt(tokens[1]);
            if (isNaN(startNum)) {
              diagnostics.push(this.createDiagnostic(
                i, 0, line.length,
                'Resnumbers start number must be an integer',
                vscode.DiagnosticSeverity.Error
              ));
            }
            if (tokens.length > 2) {
              const step = parseInt(tokens[2]);
              if (isNaN(step)) {
                diagnostics.push(this.createDiagnostic(
                  i, 0, line.length,
                  'Resnumbers step must be an integer',
                  vscode.DiagnosticSeverity.Error
                ));
              }
            }
          }
        }
        
        // 验证 segid 命令
        if (firstToken === 'segid') {
          if (tokens.length < 2) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Segid command requires a segment identifier',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (tokens.length > 2) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              `Segid command has too many parameters. Expected 1 (segment ID), got ${tokens.length - 1}`,
              vscode.DiagnosticSeverity.Warning
            ));
          }
        }
        
        // 验证 restart_to 命令
        if (firstToken === 'restart_to') {
          if (tokens.length < 2) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Restart_to command requires a restart file name',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (tokens.length > 2) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              `Restart_to command has too many parameters. Expected 1 (filename), got ${tokens.length - 1}`,
              vscode.DiagnosticSeverity.Warning
            ));
          } else {
            // 检查文件扩展名建议
            const filename = tokens[1];
            if (!filename.endsWith('.pack')) {
              diagnostics.push(this.createDiagnostic(
                i, 0, line.length,
                'Restart file typically uses .pack extension',
                vscode.DiagnosticSeverity.Information
              ));
            }
          }
        }
        
        // 验证 restart_from 命令
        if (firstToken === 'restart_from') {
          if (tokens.length < 2) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Restart_from command requires a restart file name',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (tokens.length > 2) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              `Restart_from command has too many parameters. Expected 1 (filename), got ${tokens.length - 1}`,
              vscode.DiagnosticSeverity.Warning
            ));
          } else {
            // 检查文件是否存在
            const filename = tokens[1];
            this.checkFileExists(document, filename, i, diagnostics);
            
            // 检查文件扩展名
            if (!filename.endsWith('.pack')) {
              diagnostics.push(this.createDiagnostic(
                i, 0, line.length,
                'Restart file should typically use .pack extension',
                vscode.DiagnosticSeverity.Information
              ));
            }
          }
        }
      }
      
      // 检查在结构块外不应该出现的命令
      if (structureBlockDepth === 0) {
        const structureOnlyCommands = [
          'number', 'inside', 'outside', 'above', 'below', 'over', 'center', 'fixed', 'atoms',
          'mindistance', 'radius', 'constrain_rotation', 'changechains',
          'resnumbers', 'chain', 'segid', 'centerofmass', 'fscale', 'short_radius',
          'short_radius_scale', 'add_to_list', 'restart_to', 'restart_from'
        ];
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
        'check', 'sidemax', 'randominitialpoint', 'avoid_overlap', 'discale', 'pbc',
        'structure', 'end', 'number', 'center', 'fixed', 'centerofmass', 'changechains',
        'resnumbers', 'chain', 'segid', 'constrain_rotation', 'atoms', 'radius', 'fscale',
        'short_radius', 'short_radius_scale', 'over', 'below', 'outside', 'inside', 'above',
        'mindistance', 'add_box_sides', 'add_amber_ter', 'add_to_list', 'comment',
        'restart_to', 'restart_from'
      ];
      
      if (!validCommands.includes(firstToken)) {
        diagnostics.push(this.createDiagnostic(
          i, 0, firstToken.length,
          `Unknown command: ${firstToken}`,
          vscode.DiagnosticSeverity.Warning
        ));
      }
      
      // 验证 mindistance 命令
      if (firstToken === 'mindistance') {
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Mindistance command requires exactly 1 parameter: distance',
            vscode.DiagnosticSeverity.Error
          ));
        } else if (tokens.length > 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            `Mindistance command has too many parameters. Expected 1 (distance), got ${tokens.length - 1}`,
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          const distance = parseFloat(tokens[1]);
          if (isNaN(distance)) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Mindistance parameter must be a valid number',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (distance <= 0) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Mindistance must be a positive number',
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
      }
      
      // 验证 radius 命令
      if (firstToken === 'radius') {
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Radius command requires exactly 1 parameter: scale_factor',
            vscode.DiagnosticSeverity.Error
          ));
        } else if (tokens.length > 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            `Radius command has too many parameters. Expected 1 (scale_factor), got ${tokens.length - 1}`,
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          const scale = parseFloat(tokens[1]);
          if (isNaN(scale)) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Radius scale factor must be a valid number',
              vscode.DiagnosticSeverity.Error
            ));
          } else if (scale <= 0) {
            diagnostics.push(this.createDiagnostic(
              i, 0, line.length,
              'Radius scale factor must be positive',
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
      }
      
      // 验证 constrain_rotation 命令
      if (firstToken === 'constrain_rotation') {
        if (tokens.length < 3) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Constrain_rotation requires at least 2 parameters: axis value',
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          const validAxes = ['x', 'y', 'z'];
          let i_token = 1;
          while (i_token < tokens.length) {
            if (validAxes.includes(tokens[i_token].toLowerCase())) {
              if (i_token + 1 >= tokens.length) {
                diagnostics.push(this.createDiagnostic(
                  i, 0, line.length,
                  `Constrain_rotation axis '${tokens[i_token]}' requires a value`,
                  vscode.DiagnosticSeverity.Error
                ));
                break;
              } else if (isNaN(parseFloat(tokens[i_token + 1]))) {
                diagnostics.push(this.createDiagnostic(
                  i, 0, line.length,
                  `Constrain_rotation value for axis '${tokens[i_token]}' must be a number`,
                  vscode.DiagnosticSeverity.Error
                ));
              }
              i_token += 2;
            } else {
              diagnostics.push(this.createDiagnostic(
                i, 0, line.length,
                `Invalid axis '${tokens[i_token]}'. Valid axes are: x, y, z`,
                vscode.DiagnosticSeverity.Error
              ));
              break;
            }
          }
        }
      }
      
      // 验证 atoms 命令
      if (firstToken === 'atoms') {
        if (tokens.length < 2) {
          diagnostics.push(this.createDiagnostic(
            i, 0, line.length,
            'Atoms command requires at least 1 atom index',
            vscode.DiagnosticSeverity.Error
          ));
        } else {
          for (let j = 1; j < tokens.length; j++) {
            const atomIndex = parseInt(tokens[j]);
            if (isNaN(atomIndex) || atomIndex <= 0) {
              diagnostics.push(this.createDiagnostic(
                i, 0, line.length,
                `Atom index '${tokens[j]}' must be a positive integer`,
                vscode.DiagnosticSeverity.Error
              ));
            }
          }
        }
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
  
  private validateGeometryCommand(originalLine: string, tokens: string[], lineNumber: number, diagnostics: vscode.Diagnostic[]): void {
    if (tokens.length < 2) {
      diagnostics.push(this.createLineDiagnostic(
        lineNumber, originalLine,
        'Geometry type is required after inside/outside',
        vscode.DiagnosticSeverity.Error
      ));
      return;
    }
    
    const geometryType = tokens[1].toLowerCase();
    
    // 使用统一的错误报告方法
    const addError = (message: string) => {
      diagnostics.push(this.createLineDiagnostic(lineNumber, originalLine, message, vscode.DiagnosticSeverity.Error));
    };
    
    switch (geometryType) {
      case 'sphere':
        if (tokens.length < 6) {
          addError('Sphere requires exactly 4 parameters: x y z radius');
        } else if (tokens.length > 6) {
          addError(`Sphere has too many parameters. Expected 4 (x y z radius), got ${tokens.length - 2}`);
        } else {
          for (let i = 2; i <= 5; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              addError(`Sphere parameter ${i-1} must be a number`);
            }
          }
          const radius = parseFloat(tokens[5]);
          if (!isNaN(radius) && radius <= 0) {
            addError('Sphere radius must be a positive number');
          }
        }
        break;
        
      case 'box':
        if (tokens.length < 8) {
          addError('Box requires exactly 6 parameters: xmin ymin zmin xmax ymax zmax');
        } else if (tokens.length > 8) {
          addError(`Box has too many parameters. Expected 6 (xmin ymin zmin xmax ymax zmax), got ${tokens.length - 2}`);
        } else {
          for (let i = 2; i <= 7; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              addError(`Box parameter ${i-1} must be a number`);
            }
          }
          const coords = tokens.slice(2, 8).map(t => parseFloat(t));
          if (!isNaN(coords[0]) && !isNaN(coords[3]) && coords[0] >= coords[3]) {
            addError('Box constraint error: xmin must be less than xmax');
          }
          if (!isNaN(coords[1]) && !isNaN(coords[4]) && coords[1] >= coords[4]) {
            addError('Box constraint error: ymin must be less than ymax');
          }
          if (!isNaN(coords[2]) && !isNaN(coords[5]) && coords[2] >= coords[5]) {
            addError('Box constraint error: zmin must be less than zmax');
          }
        }
        break;
        
      case 'cube':
        if (tokens.length < 6) {
          addError('Cube requires exactly 4 parameters: xmin ymin zmin size');
        } else if (tokens.length > 6) {
          addError(`Cube has too many parameters. Expected 4 (xmin ymin zmin size), got ${tokens.length - 2}`);
        } else {
          for (let i = 2; i <= 5; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              addError(`Cube parameter ${i-1} must be a number`);
            }
          }
          const size = parseFloat(tokens[5]);
          if (!isNaN(size) && size <= 0) {
            addError('Cube size must be a positive number');
          }
        }
        break;
        
      case 'plane':
        if (tokens.length < 6) {
          addError('Plane requires exactly 4 parameters: a b c d');
        } else if (tokens.length > 6) {
          addError(`Plane has too many parameters. Expected 4 (a b c d), got ${tokens.length - 2}`);
        } else {
          for (let i = 2; i <= 5; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              addError(`Plane parameter ${i-1} must be a number`);
            }
          }
          const a = parseFloat(tokens[2]);
          const b = parseFloat(tokens[3]);
          const c = parseFloat(tokens[4]);
          if (!isNaN(a) && !isNaN(b) && !isNaN(c) && a === 0 && b === 0 && c === 0) {
            addError('Plane normal vector (a, b, c) cannot be zero vector');
          }
        }
        break;
        
      case 'cylinder':
        if (tokens.length < 10) {
          addError('Cylinder requires exactly 8 parameters: a1 b1 c1 a2 b2 c2 d l');
        } else if (tokens.length > 10) {
          addError(`Cylinder has too many parameters. Expected 8 (a1 b1 c1 a2 b2 c2 d l), got ${tokens.length - 2}`);
        } else {
          for (let i = 2; i <= 9; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              addError(`Cylinder parameter ${i-1} must be a number`);
            }
          }
          const radius = parseFloat(tokens[8]); // d parameter (radius)
          const length = parseFloat(tokens[9]); // l parameter (length)
          if (!isNaN(radius) && radius <= 0) {
            addError('Cylinder radius (d) must be a positive number');
          }
          if (!isNaN(length) && length <= 0) {
            addError('Cylinder length (l) must be a positive number');
          }
          const startPoint = tokens.slice(2, 5).map(t => parseFloat(t));
          const direction = tokens.slice(5, 8).map(t => parseFloat(t));
          if (direction.every(c => !isNaN(c))) {
            const [dx, dy, dz] = direction;
            if (dx === 0 && dy === 0 && dz === 0) {
              addError('Cylinder direction vector (a2, b2, c2) cannot be zero vector');
            }
          }
        }
        break;
        
      case 'xygauss':
        if (tokens.length < 8) {
          addError('Xygauss requires exactly 6 parameters: a1 b1 a2 b2 c h');
        } else if (tokens.length > 8) {
          addError(`Xygauss has too many parameters. Expected 6 (a1 b1 a2 b2 c h), got ${tokens.length - 2}`);
        } else {
          for (let i = 2; i <= 7; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              addError(`Xygauss parameter ${i-1} must be a number`);
            }
          }
          const a2 = parseFloat(tokens[4]); // a2 parameter (width in x)
          const b2 = parseFloat(tokens[5]); // b2 parameter (width in y)
          const h = parseFloat(tokens[7]);  // h parameter (height)
          if (!isNaN(a2) && a2 <= 0) {
            addError('Xygauss width parameter a2 must be positive');
          }
          if (!isNaN(b2) && b2 <= 0) {
            addError('Xygauss width parameter b2 must be positive');
          }
          if (!isNaN(h) && h <= 0) {
            addError('Xygauss height parameter h must be positive');
          }
        }
        break;
        
      case 'ellipsoid':
        if (tokens.length < 9) {
          addError('Ellipsoid requires at least 6 parameters: x y z a b c [phi theta psi]');
        } else if (tokens.length > 11) {
          addError(`Ellipsoid has too many parameters. Expected 6-9 parameters, got ${tokens.length - 2}`);
        } else {
          for (let i = 2; i < tokens.length; i++) {
            if (isNaN(parseFloat(tokens[i]))) {
              addError(`Ellipsoid parameter ${i-1} must be a number`);
            }
          }
          if (tokens.length >= 8) {
            const [, , , a, b, c] = tokens.slice(2, 8).map(t => parseFloat(t));
            if (!isNaN(a) && a <= 0) addError('Ellipsoid semi-axis a must be positive');
            if (!isNaN(b) && b <= 0) addError('Ellipsoid semi-axis b must be positive');
            if (!isNaN(c) && c <= 0) addError('Ellipsoid semi-axis c must be positive');
          }
        }
        break;
        
      default:
        const validGeometries = ['sphere', 'box', 'cube', 'plane', 'cylinder', 'ellipsoid', 'xygauss'];
        addError(`Unknown geometry type: ${geometryType}. Valid types: ${validGeometries.join(', ')}`);
        break;
    }
  }
  
  private validateConstraintCommand(originalLine: string, tokens: string[], lineNumber: number, diagnostics: vscode.Diagnostic[]): void {
    if (tokens.length < 2) {
      diagnostics.push(this.createLineDiagnostic(
        lineNumber, originalLine,
        `${tokens[0]} command requires parameters`,
        vscode.DiagnosticSeverity.Error
      ));
      return;
    }
    
    const commandType = tokens[0].toLowerCase();
    
    // 使用统一的错误报告方法
    const addError = (message: string) => {
      diagnostics.push(this.createLineDiagnostic(lineNumber, originalLine, message, vscode.DiagnosticSeverity.Error));
    };
    
    // 检查是否是 xygauss 类型
    if (tokens.length > 2 && tokens[1].toLowerCase() === 'xygauss') {
      // over/below xygauss 需要6个参数: a1 b1 a2 b2 c h
      if (tokens.length < 8) {
        addError(`${commandType} xygauss requires exactly 6 parameters: a1 b1 a2 b2 c h`);
      } else if (tokens.length > 8) {
        addError(`${commandType} xygauss has too many parameters. Expected 6 (a1 b1 a2 b2 c h), got ${tokens.length - 2}`);
      } else {
        for (let i = 2; i <= 7; i++) {
          if (isNaN(parseFloat(tokens[i]))) {
            addError(`${commandType} xygauss parameter ${i-1} must be a number`);
          }
        }
        const a2 = parseFloat(tokens[4]); // a2 parameter (width in x)
        const b2 = parseFloat(tokens[5]); // b2 parameter (width in y) 
        const h = parseFloat(tokens[7]);  // h parameter (height)
        if (!isNaN(a2) && a2 <= 0) {
          addError(`${commandType} xygauss width parameter a2 must be positive`);
        }
        if (!isNaN(b2) && b2 <= 0) {
          addError(`${commandType} xygauss width parameter b2 must be positive`);
        }
        if (!isNaN(h) && h <= 0) {
          addError(`${commandType} xygauss height parameter h must be positive`);
        }
      }
    } else if (tokens.length > 1 && tokens[1].toLowerCase() === 'plane') {
      // above/below/over plane 需要4个参数: a b c d
      if (tokens.length < 6) {
        addError(`${commandType} plane requires exactly 4 parameters: a b c d`);
      } else if (tokens.length > 6) {
        addError(`${commandType} plane has too many parameters. Expected 4 (a b c d), got ${tokens.length - 2}`);
      } else {
        for (let i = 2; i <= 5; i++) {
          if (isNaN(parseFloat(tokens[i]))) {
            addError(`${commandType} plane parameter ${i-1} must be a number`);
          }
        }
        
        // 检查平面法向量是否为零向量
        const a = parseFloat(tokens[2]);
        const b = parseFloat(tokens[3]);
        const c = parseFloat(tokens[4]);
        if (!isNaN(a) && !isNaN(b) && !isNaN(c) && a === 0 && b === 0 && c === 0) {
          addError(`${commandType} plane normal vector (a, b, c) cannot be zero vector`);
        }
      }
    } else {
      // above, below, over 命令默认需要平面方程参数 a b c d
      if (tokens.length < 5) {
        addError(`${commandType} command requires exactly 4 parameters: a b c d (plane equation)`);
      } else if (tokens.length > 5) {
        addError(`${commandType} command has too many parameters. Expected 4 (a b c d), got ${tokens.length - 1}`);
      } else {
        for (let i = 1; i <= 4; i++) {
          if (isNaN(parseFloat(tokens[i]))) {
            addError(`${commandType} parameter ${i} must be a number`);
          }
        }
        
        // 检查平面法向量是否为零向量
        const a = parseFloat(tokens[1]);
        const b = parseFloat(tokens[2]);
        const c = parseFloat(tokens[3]);
        if (!isNaN(a) && !isNaN(b) && !isNaN(c) && a === 0 && b === 0 && c === 0) {
          addError(`${commandType} plane normal vector (a, b, c) cannot be zero vector`);
        }
      }
    }
  }

  // 简化的诊断创建方法，自动处理行范围
  private createGeometryDiagnostic(
    lineNumber: number,
    originalLine: string,
    message: string,
    severity: vscode.DiagnosticSeverity
  ): vscode.Diagnostic {
    const trimmedLine = originalLine.trim();
    const startOffset = originalLine.indexOf(trimmedLine);
    const endOffset = startOffset + trimmedLine.length;
    return this.createDiagnostic(lineNumber, startOffset, endOffset, message, severity);
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

  private createLineDiagnostic(
    lineNumber: number,
    originalLine: string,
    message: string,
    severity: vscode.DiagnosticSeverity
  ): vscode.Diagnostic {
    const trimmedLine = originalLine.trim();
    const startOffset = originalLine.indexOf(trimmedLine);
    const endOffset = startOffset + trimmedLine.length;
    return this.createDiagnostic(lineNumber, startOffset, endOffset, message, severity);
  }
  
  /**
   * 检查指定的文件是否存在
   * @param document 当前文档
   * @param filename 要检查的文件名
   * @param lineNumber 行号
   * @param diagnostics 诊断数组
   */
  private checkFileExists(
    document: vscode.TextDocument,
    filename: string,
    lineNumber: number,
    diagnostics: vscode.Diagnostic[]
  ): void {
    try {
      // 获取当前文档的目录
      const documentDir = path.dirname(document.uri.fsPath);
      
      // 处理相对路径和绝对路径
      let filePath: string;
      if (path.isAbsolute(filename)) {
        filePath = filename;
      } else {
        filePath = path.resolve(documentDir, filename);
      }
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        diagnostics.push(this.createDiagnostic(
          lineNumber, 0, document.lineAt(lineNumber).text.length,
          `Structure file '${filename}' does not exist`,
          vscode.DiagnosticSeverity.Warning
        ));
      } else {
        // 检查文件是否可读
        try {
          fs.accessSync(filePath, fs.constants.R_OK);
        } catch (error) {
          diagnostics.push(this.createDiagnostic(
            lineNumber, 0, document.lineAt(lineNumber).text.length,
            `Structure file '${filename}' exists but is not readable`,
            vscode.DiagnosticSeverity.Error
          ));
        }
      }
    } catch (error) {
      // 如果路径处理出错，给出警告
      diagnostics.push(this.createDiagnostic(
        lineNumber, 0, document.lineAt(lineNumber).text.length,
        `Cannot validate structure file path '${filename}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        vscode.DiagnosticSeverity.Information
      ));
    }
  }
  
  public dispose(): void {
    this.diagnosticCollection.dispose();
    this.disposables.forEach(disposable => disposable.dispose());
  }
}
