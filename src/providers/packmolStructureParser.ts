import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 结构的可视化信息
 */
export interface StructureVisualizationInfo {
  type: 'single_molecule' | 'multiple_molecules';
  geometry?: PackmolGeometry;
  atomCount?: number;
  bounds?: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

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
  visualInfo?: StructureVisualizationInfo; // 新增：可视化信息，包含多球几何体
}

/**
 * Packmol 约束定义
 */
export interface PackmolConstraint {
  type: 'inside' | 'outside' | 'over' | 'below' | 'above';
  geometry: PackmolGeometry;
}

/**
 * Packmol 几何体定义
 */
export interface PackmolGeometry {
  type: 'sphere' | 'box' | 'cube' | 'plane' | 'cylinder' | 'ellipsoid' | 'multi_sphere' | 'xygauss';
  parameters: number[];
  // 多球拟合时的球体列表
  spheres?: { center: [number, number, number], radius: number }[];
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
 * 多球拟合配置
 */
export interface MultisphereConfig {
  maxSpheres: number;        // 最大球体数量
  minRadius: number;         // 最小球体半径
  tolerance: number;         // 拟合容差
  method: 'kmeans' | 'hierarchical' | 'adaptive';  // 聚类方法
}

/**
 * 球体信息
 */
export interface SphereInfo {
  center: [number, number, number];
  radius: number;
  atomCount: number;  // 包含的原子数量
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
    
    // 为每个结构生成可视化信息
    console.log('🎨 Generating visualization info for all structures...');
    for (const structure of input.structures) {
      try {
        console.log(`🎯 Generating visualization info for: ${structure.filename}`);
        const visualInfo = await this.getStructureVisualizationInfo(structure, uri);
        structure.visualInfo = visualInfo;
        console.log(`✅ Generated visualization info for ${structure.filename}:`, {
          type: visualInfo.type,
          hasGeometry: !!visualInfo.geometry,
          geometryType: visualInfo.geometry?.type,
          sphereCount: visualInfo.geometry?.spheres?.length,
          atomCount: visualInfo.atomCount
        });
      } catch (error) {
        console.warn(`❌ Failed to generate visualization info for ${structure.filename}:`, error);
        // 设置默认可视化信息
        structure.visualInfo = {
          type: structure.number === 1 ? 'single_molecule' : 'multiple_molecules',
          atomCount: 0
        };
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
      case 'above':
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
  private static parseConstraint(type: 'inside' | 'outside' | 'over' | 'below' | 'above', value: string): PackmolConstraint | null {
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
    console.log(`Looking for structure file: ${filename} relative to ${packmolUri.fsPath}`);
    
    const packmolDir = vscode.Uri.joinPath(packmolUri, '..');
    
    // 尝试直接路径
    if (path.isAbsolute(filename)) {
      try {
        const absoluteUri = vscode.Uri.file(filename);
        await vscode.workspace.fs.stat(absoluteUri);
        console.log(`Found structure file at absolute path: ${absoluteUri.fsPath}`);
        return absoluteUri;
      } catch {
        console.log(`Structure file not found at absolute path: ${filename}`);
      }
    }
    
    // 尝试相对于 packmol 文件的路径
    try {
      const relativeUri = vscode.Uri.joinPath(packmolDir, filename);
      await vscode.workspace.fs.stat(relativeUri);
      console.log(`Found structure file at relative path: ${relativeUri.fsPath}`);
      return relativeUri;
    } catch {
      console.log(`Structure file not found at relative path: ${vscode.Uri.joinPath(packmolDir, filename).fsPath}`);
    }
    
    // 尝试在工作区根目录查找
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      for (const workspaceFolder of vscode.workspace.workspaceFolders) {
        try {
          const workspaceUri = vscode.Uri.joinPath(workspaceFolder.uri, filename);
          await vscode.workspace.fs.stat(workspaceUri);
          console.log(`Found structure file in workspace: ${workspaceUri.fsPath}`);
          return workspaceUri;
        } catch {
          // 继续查找
        }
      }
    }
    
    // 尝试在当前文件夹及其子文件夹中递归查找
    try {
      const foundUri = await this.findFileRecursively(packmolDir, filename);
      if (foundUri) {
        console.log(`Found structure file recursively: ${foundUri.fsPath}`);
        return foundUri;
      }
    } catch (error) {
      console.log(`Error during recursive search: ${error}`);
    }
    
    console.warn(`Cannot find structure file: ${filename}`);
    return null;
  }
  
  /**
   * 递归查找文件
   */
  private static async findFileRecursively(dir: vscode.Uri, filename: string): Promise<vscode.Uri | null> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(dir);
      
      // 首先在当前目录查找文件
      for (const [name, type] of entries) {
        if (type === vscode.FileType.File && name === filename) {
          return vscode.Uri.joinPath(dir, name);
        }
      }
      
      // 然后递归查找子目录（限制深度避免无限递归）
      const maxDepth = 3;
      const currentDepth = dir.path.split('/').length;
      
      if (currentDepth < maxDepth) {
        for (const [name, type] of entries) {
          if (type === vscode.FileType.Directory && !name.startsWith('.')) {
            const subDir = vscode.Uri.joinPath(dir, name);
            const found = await this.findFileRecursively(subDir, filename);
            if (found) {
              return found;
            }
          }
        }
      }
    } catch (error) {
      // 忽略访问错误，继续查找
    }
    
    return null;
  }
  
  /**
   * 为单分子结构生成多球拟合几何体
   */
  public static async generateMultisphereGeometry(
    structure: PackmolStructure, 
    packmolUri: vscode.Uri,
    config: MultisphereConfig = {
      maxSpheres: 5000,
      minRadius: 0.001,
      tolerance: 0.1,
      method: 'hierarchical'
    }
  ): Promise<PackmolGeometry | null> {
    
    console.log(`🔮 === generateMultisphereGeometry START ===`);
    console.log(`Structure: ${structure.filename}, Number: ${structure.number}`);
    console.log(`Config: ${JSON.stringify(config)}`);
    
    // 只对number为1的结构进行多球拟合
    if (structure.number !== 1) {
      console.log(`❌ Skipping multisphere for structure with number=${structure.number} (not 1)`);
      return null;
    }
    
    console.log(`✅ Processing single molecule structure: ${structure.filename}`);
    
    // 获取PDB文件路径
    const pdbUri = await this.getStructureFilePath(packmolUri, structure.filename);
    if (!pdbUri) {
      console.warn(`❌ Cannot find PDB file: ${structure.filename}`);
      // 创建一个测试多球几何体，以便验证渲染逻辑
      console.log(`🧪 Creating test multisphere geometry for testing`);
      return this.createTestMultisphereGeometry(structure);
    }
    
    console.log(`📁 Found PDB file: ${pdbUri.fsPath}`);
    
    // 解析PDB文件获取原子坐标
    const atoms = await this.parsePdbFile(pdbUri);
    if (atoms.length === 0) {
      console.warn(`❌ No atoms found in PDB file: ${structure.filename}`);
      // 创建测试几何体
      return this.createTestMultisphereGeometry(structure);
    }
    
    console.log(`✅ Found ${atoms.length} atoms in ${structure.filename}`);
    
    // 提取原子坐标
    const coordinates: [number, number, number][] = atoms.map(atom => [atom.x, atom.y, atom.z]);
    console.log(`📊 Coordinate range: X[${Math.min(...coordinates.map(c => c[0])).toFixed(1)}, ${Math.max(...coordinates.map(c => c[0])).toFixed(1)}]`);
    console.log(`📊 Coordinate range: Y[${Math.min(...coordinates.map(c => c[1])).toFixed(1)}, ${Math.max(...coordinates.map(c => c[1])).toFixed(1)}]`);
    console.log(`📊 Coordinate range: Z[${Math.min(...coordinates.map(c => c[2])).toFixed(1)}, ${Math.max(...coordinates.map(c => c[2])).toFixed(1)}]`);
    
    // 应用结构的center和fixed变换
    const transformedCoords = this.transformCoordinates(coordinates, structure);
    console.log(`🔄 Applied coordinate transformation`);
    
    // 生成多球拟合
    const spheres = this.fitMultipleSpheres(transformedCoords, config);
    
    if (spheres.length === 0) {
      console.warn(`❌ Failed to generate spheres for ${structure.filename}`);
      return this.createTestMultisphereGeometry(structure);
    }
    
    console.log(`🎯 Generated ${spheres.length} spheres for ${structure.filename}`);
    spheres.forEach((sphere, i) => {
      console.log(`  Sphere ${i+1}: center=(${sphere.center.map(c => c.toFixed(1)).join(', ')}), radius=${sphere.radius.toFixed(1)}, atoms=${sphere.atomCount}`);
    });
    
    const result = {
      type: 'multi_sphere' as const,
      parameters: [], // 对于多球，参数存储在spheres中
      spheres: spheres.map(sphere => ({
        center: sphere.center,
        radius: sphere.radius
      }))
    };
    
    console.log(`🔮 === generateMultisphereGeometry END ===`);
    return result;
  }
  
  /**
   * 创建测试用的多球几何体（当PDB文件不存在时）
   */
  private static createTestMultisphereGeometry(structure: PackmolStructure): PackmolGeometry {
    console.log(`🧪 Creating test multisphere geometry for ${structure.filename}`);
    
    // 根据结构的center或fixed属性确定位置
    let centerPos: [number, number, number] = [0, 0, 0];
    
    if (structure.center) {
      centerPos = structure.center;
    } else if (structure.fixed) {
      const [x1, y1, z1, x2, y2, z2] = structure.fixed;
      centerPos = [(x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2];
    }
    
    // 创建一些测试球体来模拟分子形状
    const testSpheres: { center: [number, number, number], radius: number }[] = [
      { center: [centerPos[0] - 3, centerPos[1], centerPos[2]], radius: 2.0 },
      { center: [centerPos[0] - 1, centerPos[1], centerPos[2]], radius: 1.8 },
      { center: [centerPos[0] + 1, centerPos[1], centerPos[2]], radius: 1.9 },
      { center: [centerPos[0] + 3, centerPos[1], centerPos[2]], radius: 2.1 }
    ];
    
    console.log(`✅ Created ${testSpheres.length} test spheres`);
    
    return {
      type: 'multi_sphere',
      parameters: [],
      spheres: testSpheres
    };
  }
  
  /**
   * 应用坐标变换（center和fixed）
   */
  private static transformCoordinates(
    coordinates: [number, number, number][],
    structure: PackmolStructure
  ): [number, number, number][] {
    
    let transformed = [...coordinates];
    
    // 如果有center约束，将分子中心移动到指定位置
    if (structure.center) {
      // 计算当前质心
      const centroid = this.calculateCentroid(transformed);
      const offset: [number, number, number] = [
        structure.center[0] - centroid[0],
        structure.center[1] - centroid[1],
        structure.center[2] - centroid[2]
      ];
      
      // 应用平移
      transformed = transformed.map(coord => [
        coord[0] + offset[0],
        coord[1] + offset[1],
        coord[2] + offset[2]
      ]);
    }
    
    // 如果有fixed约束，保持分子在指定区域内
    if (structure.fixed) {
      const [x1, y1, z1, x2, y2, z2] = structure.fixed;
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      const centerZ = (z1 + z2) / 2;
      
      // 将分子中心移动到fixed区域中心
      const centroid = this.calculateCentroid(transformed);
      const offset: [number, number, number] = [
        centerX - centroid[0],
        centerY - centroid[1],
        centerZ - centroid[2]
      ];
      
      transformed = transformed.map(coord => [
        coord[0] + offset[0],
        coord[1] + offset[1],
        coord[2] + offset[2]
      ]);
    }
    
    return transformed;
  }
  
  /**
   * 计算坐标质心
   */
  private static calculateCentroid(coordinates: [number, number, number][]): [number, number, number] {
    const sum = coordinates.reduce(
      (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1], acc[2] + coord[2]],
      [0, 0, 0] as [number, number, number]
    );
    
    const count = coordinates.length;
    return [sum[0] / count, sum[1] / count, sum[2] / count];
  }
  
  /**
   * 多球拟合算法
   */
  private static fitMultipleSpheres(
    coordinates: [number, number, number][],
    config: MultisphereConfig
  ): SphereInfo[] {
    
    if (coordinates.length === 0) {
      return [];
    }
    
    console.log(`Fitting spheres for ${coordinates.length} atoms with method: ${config.method}`);

    if (coordinates.length > 500) {
      config.method = 'adaptive'; // 如果原子数量过多，使用自适应方法
      config.maxSpheres = Math.min(100, Math.ceil(coordinates.length / 10)); // 不适合使用太多球，避免性能问题
    }
    
    switch (config.method) {
      case 'adaptive':
        return this.adaptiveSphereFitting(coordinates, config);
      case 'kmeans':
        return this.kmeansSphereFitting(coordinates, config);
      case 'hierarchical':
        return this.hierarchicalSphereFitting(coordinates, config);
      default:
        return this.adaptiveSphereFitting(coordinates, config);
    }
  }
  
  /**
   * 自适应球体拟合（推荐方法）
   */
  private static adaptiveSphereFitting(
    coordinates: [number, number, number][],
    config: MultisphereConfig
  ): SphereInfo[] {
    
    const spheres: SphereInfo[] = [];
    let remainingCoords = [...coordinates];
    
    while (remainingCoords.length > 0 && spheres.length < config.maxSpheres) {
      // 找到密度最高的区域作为球心
      const center = this.findDensestRegion(remainingCoords);
      
      // 计算合适的半径
      let radius = config.minRadius;
      let atomsInSphere: [number, number, number][] = [];
      
      // 逐步增加半径，直到包含足够的原子或达到容差限制
      for (let r = config.minRadius; r <= 20.0; r += 0.5) {
        const atoms = remainingCoords.filter(coord => 
          this.calculateDistance(coord, center) <= r
        );
        
        if (atoms.length >= Math.max(3, remainingCoords.length / config.maxSpheres * 0.8)) {
          radius = r;
          atomsInSphere = atoms;
          break;
        }
      }
      
      if (atomsInSphere.length === 0) {
        // 如果没有找到合适的球，包含最近的几个原子
        const distances = remainingCoords.map(coord => ({
          coord,
          distance: this.calculateDistance(coord, center)
        }));
        distances.sort((a, b) => a.distance - b.distance);
        
        const numAtoms = Math.min(5, remainingCoords.length);
        atomsInSphere = distances.slice(0, numAtoms).map(d => d.coord);
        radius = Math.max(config.minRadius, distances[numAtoms - 1]?.distance || config.minRadius);
      }
      
      spheres.push({
        center,
        radius: radius + config.tolerance, // 添加容差
        atomCount: atomsInSphere.length
      });
      
      // 移除已包含的原子
      remainingCoords = remainingCoords.filter(coord => 
        !atomsInSphere.some(atom => 
          Math.abs(atom[0] - coord[0]) < 0.001 && 
          Math.abs(atom[1] - coord[1]) < 0.001 && 
          Math.abs(atom[2] - coord[2]) < 0.001
        )
      );
      
      console.log(`Generated sphere ${spheres.length}: center=(${center.join(', ')}), radius=${radius.toFixed(2)}, atoms=${atomsInSphere.length}`);
    }
    
    return spheres;
  }
  
  /**
   * 找到密度最高的区域
   */
  private static findDensestRegion(coordinates: [number, number, number][]): [number, number, number] {
    if (coordinates.length <= 3) {
      return this.calculateCentroid(coordinates);
    }
    
    let maxDensity = 0;
    let bestCenter: [number, number, number] = coordinates[0];
    
    // 采样一些候选中心点
    const sampleSize = Math.min(20, coordinates.length);
    const step = Math.max(1, Math.floor(coordinates.length / sampleSize));
    
    for (let i = 0; i < coordinates.length; i += step) {
      const candidate = coordinates[i];
      
      // 计算候选点周围的密度
      const density = coordinates.filter(coord => 
        this.calculateDistance(coord, candidate) <= 5.0
      ).length;
      
      if (density > maxDensity) {
        maxDensity = density;
        bestCenter = candidate;
      }
    }
    
    return bestCenter;
  }
  
  /**
   * K-means球体拟合
   */
  private static kmeansSphereFitting(
    coordinates: [number, number, number][],
    config: MultisphereConfig
  ): SphereInfo[] {
    
    const k = Math.min(config.maxSpheres, Math.ceil(coordinates.length / 10));
    
    // 初始化聚类中心
    let centers: [number, number, number][] = [];
    for (let i = 0; i < k; i++) {
      const idx = Math.floor((i * coordinates.length) / k);
      centers.push([...coordinates[idx]]);
    }
    
    // K-means迭代
    for (let iter = 0; iter < 50; iter++) {
      const clusters: [number, number, number][][] = Array(k).fill(null).map(() => []);
      
      // 分配点到最近的聚类中心
      for (const coord of coordinates) {
        let minDist = Infinity;
        let bestCluster = 0;
        
        for (let j = 0; j < centers.length; j++) {
          const dist = this.calculateDistance(coord, centers[j]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }
        
        clusters[bestCluster].push(coord);
      }
      
      // 更新聚类中心
      let converged = true;
      for (let j = 0; j < centers.length; j++) {
        if (clusters[j].length > 0) {
          const newCenter = this.calculateCentroid(clusters[j]);
          if (this.calculateDistance(centers[j], newCenter) > 0.01) {
            converged = false;
          }
          centers[j] = newCenter;
        }
      }
      
      if (converged) break;
    }
    
    // 生成球体
    const spheres: SphereInfo[] = [];
    for (let j = 0; j < centers.length; j++) {
      const cluster = coordinates.filter(coord => {
        let minDist = Infinity;
        let bestCenter = 0;
        for (let k = 0; k < centers.length; k++) {
          const dist = this.calculateDistance(coord, centers[k]);
          if (dist < minDist) {
            minDist = dist;
            bestCenter = k;
          }
        }
        return bestCenter === j;
      });
      
      if (cluster.length > 0) {
        // 计算包围半径
        const center = centers[j];
        const maxDist = Math.max(...cluster.map(coord => this.calculateDistance(coord, center)));
        const radius = Math.max(config.minRadius, maxDist + config.tolerance);
        
        spheres.push({
          center,
          radius,
          atomCount: cluster.length
        });
      }
    }
    
    return spheres;
  }
  
  /**
   * 层次聚类球体拟合
   */
  private static hierarchicalSphereFitting(
    coordinates: [number, number, number][],
    config: MultisphereConfig
  ): SphereInfo[] {
    
    // 简化的层次聚类实现
    let clusters = coordinates.map(coord => [coord]);
    
    while (clusters.length > config.maxSpheres && clusters.length > 1) {
      let minDist = Infinity;
      let mergeI = 0, mergeJ = 1;
      
      // 找到最近的两个聚类
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const dist = this.calculateClusterDistance(clusters[i], clusters[j]);
          if (dist < minDist) {
            minDist = dist;
            mergeI = i;
            mergeJ = j;
          }
        }
      }
      
      // 合并聚类
      clusters[mergeI] = [...clusters[mergeI], ...clusters[mergeJ]];
      clusters.splice(mergeJ, 1);
    }
    
    // 生成球体
    return clusters.map(cluster => {
      const center = this.calculateCentroid(cluster);
      const maxDist = Math.max(...cluster.map(coord => this.calculateDistance(coord, center)));
      const radius = Math.max(config.minRadius, maxDist + config.tolerance);
      
      return {
        center,
        radius,
        atomCount: cluster.length
      };
    });
  }
  
  /**
   * 计算两个聚类之间的距离
   */
  private static calculateClusterDistance(
    cluster1: [number, number, number][],
    cluster2: [number, number, number][]
  ): number {
    const center1 = this.calculateCentroid(cluster1);
    const center2 = this.calculateCentroid(cluster2);
    return this.calculateDistance(center1, center2);
  }
  
  /**
   * 计算两点之间的欧几里得距离
   */
  private static calculateDistance(
    point1: [number, number, number],
    point2: [number, number, number]
  ): number {
    const dx = point1[0] - point2[0];
    const dy = point1[1] - point2[1];
    const dz = point1[2] - point2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * 检测是否为单分子结构（number为1）
   */
  public static isSingleMoleculeStructure(structure: PackmolStructure): boolean {
    return structure.number === 1;
  }
  
  /**
   * 获取结构的可视化信息
   */
  public static async getStructureVisualizationInfo(
    structure: PackmolStructure,
    packmolUri: vscode.Uri
  ): Promise<StructureVisualizationInfo> {
    
    const info = {
      type: structure.number === 1 ? 'single_molecule' as const : 'multiple_molecules' as const,
      geometry: undefined as PackmolGeometry | undefined,
      atomCount: 0,
      bounds: undefined as any
    };
    
    // 尝试读取PDB文件获取详细信息
    try {
      const pdbUri = await this.getStructureFilePath(packmolUri, structure.filename);
      if (pdbUri) {
        const atoms = await this.parsePdbFile(pdbUri);
        info.atomCount = atoms.length;
        
        if (atoms.length > 0) {
          // 计算边界框
          const xs = atoms.map(a => a.x);
          const ys = atoms.map(a => a.y);
          const zs = atoms.map(a => a.z);
          
          info.bounds = {
            min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)],
            max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)]
          };
          
          // 对于单分子，生成多球拟合几何体
          if (structure.number === 1) {
            const geometry = await this.generateMultisphereGeometry(structure, packmolUri);
            if (geometry) {
              info.geometry = geometry;
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to get visualization info for ${structure.filename}:`, error);
    }
    
    return info;
  }
  
  /**
   * 生成Packmol预览的3D场景数据
   */
  public static async generateSceneData(input: PackmolInput, packmolUri: vscode.Uri): Promise<{
    structures: Array<{
      id: string;
      filename: string;
      number: number;
      type: 'single_molecule' | 'multiple_molecules';
      geometry?: PackmolGeometry;
      constraints: PackmolConstraint[];
      visualInfo: StructureVisualizationInfo;
    }>;
    globalBounds: {
      min: [number, number, number];
      max: [number, number, number];
    };
  }> {
    
    const sceneStructures = [];
    let globalMin: [number, number, number] = [Infinity, Infinity, Infinity];
    let globalMax: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    
    for (const structure of input.structures) {
      // 使用结构中已有的可视化信息，如果没有则生成新的
      let visualInfo = structure.visualInfo;
      if (!visualInfo) {
        console.log(`⚠️ No visualInfo found for ${structure.filename}, generating...`);
        visualInfo = await this.getStructureVisualizationInfo(structure, packmolUri);
      }
      
      sceneStructures.push({
        id: structure.id,
        filename: structure.filename,
        number: structure.number,
        type: visualInfo.type,
        geometry: visualInfo.geometry,
        constraints: structure.constraints,
        visualInfo
      });
      
      // 更新全局边界
      if (visualInfo.bounds) {
        for (let i = 0; i < 3; i++) {
          globalMin[i] = Math.min(globalMin[i], visualInfo.bounds.min[i]);
          globalMax[i] = Math.max(globalMax[i], visualInfo.bounds.max[i]);
        }
      }
    }
    
    // 如果没有有效边界，使用默认值
    if (globalMin[0] === Infinity) {
      globalMin = [-50, -50, -50];
      globalMax = [50, 50, 50];
    }
    
    return {
      structures: sceneStructures,
      globalBounds: {
        min: globalMin,
        max: globalMax
      }
    };
  }
}
