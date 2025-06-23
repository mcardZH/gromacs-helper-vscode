import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Packmol 输入文件的结构定义
 */
export interface PackmolStructure {
  id: string;
  filename: string;
  number: number;
  center?: [number, number, number];
  fixed?: [number, number, number, number, number, number];
  centerofmass?: boolean;
  changechains?: string;
  resnumbers?: number;
  chain?: string;
  segid?: string;
  constraints: PackmolConstraint[];
}

/**
 * Packmol 约束定义
 */
export interface PackmolConstraint {
  type: 'inside' | 'outside' | 'over' | 'below';
  geometry: PackmolGeometry;
}

/**
 * Packmol 几何体定义
 */
export interface PackmolGeometry {
  type: 'sphere' | 'box' | 'cube' | 'plane' | 'cylinder' | 'ellipsoid';
  parameters: number[];
}

/**
 * Packmol 全局配置
 */
export interface PackmolConfig {
  tolerance: number;
  output: string;
  filetype?: string;
  seed?: number;
  nloop?: number;
  maxtry?: number;
  writeout?: number;
  writebad?: number;
  check?: boolean;
  sidemax?: number;
  randominitialpoint?: boolean;
  avoid_overlap?: boolean;
  discale?: number;
  add_box_sides?: number;
}

/**
 * 完整的 Packmol 输入解析结果
 */
export interface PackmolInput {
  config: PackmolConfig;
  structures: PackmolStructure[];
}

/**
 * PDB 原子记录
 */
export interface PdbAtom {
  serial: number;
  name: string;
  altLoc?: string;
  resName: string;
  chainID: string;
  resSeq: number;
  iCode?: string;
  x: number;
  y: number;
  z: number;
  occupancy?: number;
  tempFactor?: number;
  element?: string;
  charge?: string;
}

/**
 * Packmol 结构解析器
 */
export class PackmolStructureParser {
  
  /**
   * 解析 Packmol 输入文件
   */
  public static async parsePackmolInput(uri: vscode.Uri): Promise<PackmolInput> {
    const content = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(content).toString('utf8');
    
    console.log('Parsing Packmol input file:', uri.fsPath);
    console.log('File content:', text);
    
    const input: PackmolInput = {
      config: { tolerance: 2.0, output: 'packed.pdb' },
      structures: []
    };
    
    const lines = text.split('\n');
    let currentStructure: Partial<PackmolStructure> | null = null;
    let structureId = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      console.log(`Line ${i + 1}: "${line}"`);
      
      // 跳过注释和空行
      if (line.startsWith('#') || line === '') {
        console.log('  -> Skipping comment or empty line');
        continue;
      }
      
      // 结构开始
      if (line.startsWith('structure')) {
        const parts = line.split(/\s+/);
        if (parts.length > 1) {
          currentStructure = {
            id: `structure_${structureId++}`,
            filename: parts[1],
            number: 1,
            constraints: []
          };
          console.log(`  -> Starting new structure: ${currentStructure.filename}`);
        }
        continue;
      }
      
      // 结构结束
      if (line === 'end structure' && currentStructure) {
        console.log(`  -> Ending structure: ${currentStructure.filename}`);
        console.log('    Structure details:', currentStructure);
        input.structures.push(currentStructure as PackmolStructure);
        currentStructure = null;
        continue;
      }
      
      // 解析全局配置或结构内的命令
      const configMatch = line.match(/^(\w+)\s+(.+)$/);
      if (configMatch) {
        const [, key, value] = configMatch;
        
        if (currentStructure) {
          // 在结构内部，解析结构命令
          console.log(`  -> Parsing structure command: ${key} = ${value}`);
          this.parseStructureLine(currentStructure, key, value);
        } else {
          // 在全局范围，解析全局配置
          console.log(`  -> Parsing global config: ${key} = ${value}`);
          this.parseConfigLine(input.config, key, value);
        }
      }
    }
    
    console.log('Final parsed input:', input);
    return input;
  }
  
  /**
   * 解析配置行
   */
  private static parseConfigLine(config: PackmolConfig, key: string, value: string): void {
    switch (key) {
      case 'tolerance':
        config.tolerance = parseFloat(value);
        break;
      case 'output':
        config.output = value;
        break;
      case 'filetype':
        config.filetype = value;
        break;
      case 'seed':
        config.seed = parseInt(value);
        break;
      case 'nloop':
        config.nloop = parseInt(value);
        break;
      case 'maxtry':
        config.maxtry = parseInt(value);
        break;
      case 'writeout':
        config.writeout = parseInt(value);
        break;
      case 'writebad':
        config.writebad = parseInt(value);
        break;
      case 'check':
        config.check = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
        break;
      case 'sidemax':
        config.sidemax = parseFloat(value);
        break;
      case 'randominitialpoint':
        config.randominitialpoint = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
        break;
      case 'avoid_overlap':
        config.avoid_overlap = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
        break;
      case 'discale':
        config.discale = parseFloat(value);
        break;
      case 'add_box_sides':
        config.add_box_sides = parseFloat(value);
        break;
    }
  }
  
  /**
   * 解析结构内的命令行
   */
  private static parseStructureLine(structure: Partial<PackmolStructure>, key: string, value: string): void {
    switch (key) {
      case 'number':
        structure.number = parseInt(value);
        break;
      case 'center':
        const centerParts = value.split(/\s+/).map(parseFloat);
        if (centerParts.length >= 3) {
          structure.center = [centerParts[0], centerParts[1], centerParts[2]];
        }
        break;
      case 'fixed':
        const fixedParts = value.split(/\s+/).map(parseFloat);
        if (fixedParts.length >= 6) {
          structure.fixed = [fixedParts[0], fixedParts[1], fixedParts[2], fixedParts[3], fixedParts[4], fixedParts[5]];
        }
        break;
      case 'centerofmass':
        structure.centerofmass = true;
        break;
      case 'changechains':
        structure.changechains = value;
        break;
      case 'resnumbers':
        structure.resnumbers = parseInt(value);
        break;
      case 'chain':
        structure.chain = value;
        break;
      case 'segid':
        structure.segid = value;
        break;
      case 'inside':
      case 'outside':
      case 'over':
      case 'below':
        const constraint = this.parseConstraint(key as any, value);
        if (constraint && structure.constraints) {
          structure.constraints.push(constraint);
        }
        break;
    }
  }
  
  /**
   * 解析约束
   */
  private static parseConstraint(type: 'inside' | 'outside' | 'over' | 'below', value: string): PackmolConstraint | null {
    const parts = value.split(/\s+/);
    if (parts.length === 0) {
      return null;
    }
    
    const geometryType = parts[0] as PackmolGeometry['type'];
    const parameters = parts.slice(1).map(parseFloat);
    
    return {
      type,
      geometry: {
        type: geometryType,
        parameters
      }
    };
  }
  
  /**
   * 解析 PDB 文件
   */
  public static async parsePdbFile(uri: vscode.Uri): Promise<PdbAtom[]> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf8');
      const lines = text.split('\n');
      const atoms: PdbAtom[] = [];
      
      for (const line of lines) {
        if (line.startsWith('ATOM  ') || line.startsWith('HETATM')) {
          const atom = this.parsePdbAtomLine(line);
          if (atom) {
            atoms.push(atom);
          }
        }
      }
      
      return atoms;
    } catch (error) {
      console.error('Error parsing PDB file:', error);
      return [];
    }
  }
  
  /**
   * 解析 PDB 原子行
   */
  private static parsePdbAtomLine(line: string): PdbAtom | null {
    if (line.length < 54) {
      return null;
    }
    
    try {
      return {
        serial: parseInt(line.substring(6, 11).trim()),
        name: line.substring(12, 16).trim(),
        altLoc: line.substring(16, 17).trim() || undefined,
        resName: line.substring(17, 20).trim(),
        chainID: line.substring(21, 22).trim(),
        resSeq: parseInt(line.substring(22, 26).trim()),
        iCode: line.substring(26, 27).trim() || undefined,
        x: parseFloat(line.substring(30, 38).trim()),
        y: parseFloat(line.substring(38, 46).trim()),
        z: parseFloat(line.substring(46, 54).trim()),
        occupancy: line.length > 54 ? parseFloat(line.substring(54, 60).trim()) : undefined,
        tempFactor: line.length > 60 ? parseFloat(line.substring(60, 66).trim()) : undefined,
        element: line.length > 76 ? line.substring(76, 78).trim() : undefined,
        charge: line.length > 78 ? line.substring(78, 80).trim() : undefined
      };
    } catch (error) {
      console.error('Error parsing PDB atom line:', line, error);
      return null;
    }
  }
  
  /**
   * 获取文件的绝对路径
   */
  public static async getStructureFilePath(packmolUri: vscode.Uri, filename: string): Promise<vscode.Uri | null> {
    const packmolDir = vscode.Uri.joinPath(packmolUri, '..');
    
    // 尝试直接路径
    if (path.isAbsolute(filename)) {
      try {
        const absoluteUri = vscode.Uri.file(filename);
        await vscode.workspace.fs.stat(absoluteUri);
        return absoluteUri;
      } catch {
        return null;
      }
    }
    
    // 尝试相对于 packmol 文件的路径
    try {
      const relativeUri = vscode.Uri.joinPath(packmolDir, filename);
      await vscode.workspace.fs.stat(relativeUri);
      return relativeUri;
    } catch {
      return null;
    }
  }
}
