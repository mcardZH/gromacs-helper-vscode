import * as vscode from 'vscode';

/**
 * 原子类型定义
 */
export interface AtomType {
  name: string;
  mass: number;
  atomicNumber?: number;
  description?: string;
  location: vscode.Location;
  // 来自 ffnonbonded.itp 的扩展参数
  charge?: number;
  ptype?: string; // A=atom, V=virtual, S=shell
  sigma?: number;
  epsilon?: number;
}

/**
 * 残基中的原子定义
 */
export interface ResidueAtom {
  name: string;           // 如 "CA"
  type: string;           // 如 "CT1"
  charge: number;
  chargeGroup: number;
  typeRef?: AtomType;     // 解析后的引用
  location: vscode.Location;
}

/**
 * 键定义
 */
export interface BondDefinition {
  atoms: string[];        // ["CA", "CB"] 或 ["-C", "N"]
  location: vscode.Location;
}

/**
 * Improper 定义
 */
export interface ImproperDefinition {
  atoms: [string, string, string, string];
  location: vscode.Location;
}

/**
 * CMAP 定义
 */
export interface CmapDefinition {
  atoms: [string, string, string, string, string];
  location: vscode.Location;
}

/**
 * 残基拓扑定义
 */
export interface ResidueTopology {
  name: string;
  atoms: ResidueAtom[];
  bonds: BondDefinition[];
  impropers: ImproperDefinition[];
  cmaps: CmapDefinition[];
  location: vscode.Location;
}

/**
 * Terminus 操作
 */
export interface TerminusOperation {
  type: 'replace' | 'add' | 'delete';
  data: any;
  location: vscode.Location;
}

/**
 * Terminus 修饰
 */
export interface TerminusModification {
  name: string;
  terminusType: 'n' | 'c';
  operations: TerminusOperation[];
  location: vscode.Location;
}

/**
 * 键参数
 */
export interface BondParameter {
  atomTypes: [string, string];
  funcType: number;
  b0: number;      // nm
  kb: number;      // kJ/mol/nm^2
  location: vscode.Location;
}

/**
 * 角参数
 */
export interface AngleParameter {
  atomTypes: [string, string, string];
  funcType: number;
  theta0: number;  // degrees
  kTheta: number;  // kJ/mol/rad^2
  ub0?: number;    // Urey-Bradley distance
  kUb?: number;    // Urey-Bradley force constant
  location: vscode.Location;
}

/**
 * 水模型定义
 */
export interface WaterModel {
  fileName: string;        // 如 "tip3p"
  displayName: string;     // 如 "TIP3P"
  description: string;     // 如 "TIP3P water model"
  location: vscode.Location;
}

/**
 * 力场索引（整个力场的所有数据）
 */
export interface ForceFieldIndex {
  // 核心数据
  atomTypes: Map<string, AtomType>;
  residues: Map<string, ResidueTopology>;
  terminus: Map<string, TerminusModification[]>;
  waterModels: Map<string, WaterModel>;  // 新增

  // 参数
  bondParams: Map<string, BondParameter[]>;  // key: "CT1-CT2"
  angleParams: Map<string, AngleParameter[]>; // key: "CT1-CT2-CT3"

  // 元数据
  forceFieldPath: string;
  forceFieldName: string;
  lastUpdated: Date;
}
