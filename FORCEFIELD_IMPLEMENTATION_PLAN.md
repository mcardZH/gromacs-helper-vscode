# GROMACS 力场支持实现计划

> 基于深度技术分析的完整实现路线图
> 生成日期：2026-08-27

## 📋 项目概述

为 VS Code 扩展添加完整的 GROMACS 力场文件支持，包括语法高亮、语义分析、智能补全、诊断和可视化功能。

---

## 🎯 Phase 1: 基础设施（第1-2周）

### 1.1 文件类型注册

**文件**：`package.json`

```json
{
  "contributes": {
    "languages": [
      {
        "id": "gromacs_rtp_file",
        "extensions": [".rtp"],
        "aliases": ["GROMACS Residue Topology", "rtp"],
        "configuration": "./syntaxes/rtp/rtp-language-configuration.json"
      },
      {
        "id": "gromacs_atp_file",
        "extensions": [".atp"],
        "aliases": ["GROMACS Atom Types", "atp"],
        "configuration": "./syntaxes/atp/atp-language-configuration.json"
      },
      {
        "id": "gromacs_tdb_file",
        "extensions": [".tdb"],
        "aliases": ["GROMACS Terminus Database", "tdb"],
        "configuration": "./syntaxes/tdb/tdb-language-configuration.json"
      },
      {
        "id": "gromacs_hdb_file",
        "extensions": [".hdb"],
        "aliases": ["GROMACS Hydrogen Database", "hdb"],
        "configuration": "./syntaxes/hdb/hdb-language-configuration.json"
      },
      {
        "id": "gromacs_ffbonded_file",
        "patterns": ["**/ffbonded.itp", "**/ffnonbonded.itp"],
        "aliases": ["GROMACS Force Field Parameters"],
        "configuration": "./syntaxes/ffparams/ffparams-language-configuration.json"
      }
    ],
    "grammars": [
      {
        "language": "gromacs_rtp_file",
        "scopeName": "source.rtp",
        "path": "./syntaxes/rtp/rtp.tmLanguage.json"
      },
      {
        "language": "gromacs_atp_file",
        "scopeName": "source.atp",
        "path": "./syntaxes/atp/atp.tmLanguage.json"
      },
      {
        "language": "gromacs_tdb_file",
        "scopeName": "source.tdb",
        "path": "./syntaxes/tdb/tdb.tmLanguage.json"
      },
      {
        "language": "gromacs_hdb_file",
        "scopeName": "source.hdb",
        "path": "./syntaxes/hdb/hdb.tmLanguage.json"
      },
      {
        "language": "gromacs_ffbonded_file",
        "scopeName": "source.ffparams",
        "path": "./syntaxes/ffparams/ffparams.tmLanguage.json"
      }
    ]
  }
}
```

### 1.2 TextMate 语法文件

创建目录结构：
```
syntaxes/
├── rtp/
│   ├── rtp.tmLanguage.json
│   └── rtp-language-configuration.json
├── atp/
│   ├── atp.tmLanguage.json
│   └── atp-language-configuration.json
├── tdb/
│   ├── tdb.tmLanguage.json
│   └── tdb-language-configuration.json
├── hdb/
│   ├── hdb.tmLanguage.json
│   └── hdb-language-configuration.json
└── ffparams/
    ├── ffparams.tmLanguage.json
    └── ffparams-language-configuration.json
```

**优先级**：按顺序创建
1. `.atp` - 最简单（2列格式）
2. `.rtp` - 核心文件
3. `.tdb` - 中等复杂度
4. `.hdb` - 结构化
5. `ffparams` - 最复杂

### 1.3 核心数据结构

**文件**：`src/types/forcefield.ts`

```typescript
export interface AtomType {
  name: string;
  mass: number;
  atomicNumber?: number;
  description?: string;
  location: vscode.Location;
  // 来自 ffnonbonded.itp 的扩展参数
  charge?: number;
  sigma?: number;
  epsilon?: number;
}

export interface ResidueAtom {
  name: string;           // 如 "CA"
  type: string;           // 如 "CT1"
  charge: number;
  chargeGroup: number;
  typeRef?: AtomType;     // 解析后的引用
  location: vscode.Location;
}

export interface BondDefinition {
  atoms: string[];        // ["CA", "CB"] 或 ["-C", "N"]
  location: vscode.Location;
}

export interface ImproperDefinition {
  atoms: [string, string, string, string];
  location: vscode.Location;
}

export interface CmapDefinition {
  atoms: [string, string, string, string, string];
  location: vscode.Location;
}

export interface ResidueTopology {
  name: string;
  atoms: ResidueAtom[];
  bonds: BondDefinition[];
  impropers: ImproperDefinition[];
  cmaps: CmapDefinition[];
  location: vscode.Location;
}

export interface TerminusOperation {
  type: 'replace' | 'add' | 'delete';
  data: any;
  location: vscode.Location;
}

export interface TerminusModification {
  name: string;
  terminusType: 'n' | 'c';
  operations: TerminusOperation[];
  location: vscode.Location;
}

export interface BondParameter {
  atomTypes: [string, string];
  funcType: number;
  b0: number;      // nm
  kb: number;      // kJ/mol/nm^2
  location: vscode.Location;
}

export interface AngleParameter {
  atomTypes: [string, string, string];
  funcType: number;
  theta0: number;  // degrees
  kTheta: number;  // kJ/mol/rad^2
  ub0?: number;    // Urey-Bradley distance
  kUb?: number;    // Urey-Bradley force constant
  location: vscode.Location;
}

export interface ForceFieldIndex {
  // 核心数据
  atomTypes: Map<string, AtomType>;
  residues: Map<string, ResidueTopology>;
  terminus: Map<string, TerminusModification[]>;
  
  // 参数
  bondParams: Map<string, BondParameter[]>;  // key: "CT1-CT2"
  angleParams: Map<string, AngleParameter[]>; // key: "CT1-CT2-CT3"
  
  // 元数据
  forceFieldPath: string;
  forceFieldName: string;
  lastUpdated: Date;
}
```

---

## 🔧 Phase 2: 解析器（第3-4周）

### 2.1 解析器架构

**文件**：`src/parsers/forcefield/`

```
forcefield/
├── index.ts                    # 导出所有解析器
├── atpParser.ts               # atomtypes.atp
├── rtpParser.ts               # *.rtp
├── tdbParser.ts               # *.tdb
├── hdbParser.ts               # *.hdb
├── itpParamParser.ts          # ffbonded.itp, ffnonbonded.itp
├── forceFieldParser.ts        # forcefield.itp + 协调器
└── common.ts                  # 共享工具（段解析、注释剥离）
```

### 2.2 AtpParser 实现

**文件**：`src/parsers/forcefield/atpParser.ts`

```typescript
import * as vscode from 'vscode';
import { AtomType } from '../../types/forcefield';

export class AtpParser {
  /**
   * 解析 atomtypes.atp 文件
   * 格式：atom_name  mass  ; comment
   */
  public parse(document: vscode.TextDocument): Map<string, AtomType> {
    const atomTypes = new Map<string, AtomType>();
    
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = this.stripComment(line.text);
      
      if (!text.trim()) continue;
      
      const match = text.match(/^(\S+)\s+([\d.]+)/);
      if (match) {
        const [, name, massStr] = match;
        const mass = parseFloat(massStr);
        
        // 提取注释作为描述
        const commentMatch = line.text.match(/;\s*(.+)$/);
        const description = commentMatch ? commentMatch[1].trim() : undefined;
        
        atomTypes.set(name, {
          name,
          mass,
          description,
          location: new vscode.Location(
            document.uri,
            new vscode.Range(i, 0, i, line.text.length)
          )
        });
      }
    }
    
    return atomTypes;
  }
  
  private stripComment(line: string): string {
    const commentIndex = line.indexOf(';');
    return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
  }
}
```

### 2.3 RtpParser 实现

**文件**：`src/parsers/forcefield/rtpParser.ts`

```typescript
export class RtpParser {
  public parse(document: vscode.TextDocument): Map<string, ResidueTopology> {
    const residues = new Map<string, ResidueTopology>();
    const sections = this.splitIntoSections(document);
    
    let currentResidue: Partial<ResidueTopology> | null = null;
    let currentSection: string | null = null;
    
    for (const section of sections) {
      if (section.name.match(/^[A-Z][A-Z0-9]+$/)) {
        // 新残基定义
        if (currentResidue && currentResidue.name) {
          residues.set(currentResidue.name, this.finalizeResidue(currentResidue));
        }
        currentResidue = {
          name: section.name,
          atoms: [],
          bonds: [],
          impropers: [],
          cmaps: [],
          location: section.location
        };
      } else if (currentResidue) {
        // 子段
        switch (section.name) {
          case 'atoms':
            currentResidue.atoms = this.parseAtoms(section);
            break;
          case 'bonds':
            currentResidue.bonds = this.parseBonds(section);
            break;
          case 'impropers':
            currentResidue.impropers = this.parseImpropers(section);
            break;
          case 'cmap':
            currentResidue.cmaps = this.parseCmaps(section);
            break;
        }
      }
    }
    
    // 处理最后一个残基
    if (currentResidue && currentResidue.name) {
      residues.set(currentResidue.name, this.finalizeResidue(currentResidue));
    }
    
    return residues;
  }
  
  private parseAtoms(section: Section): ResidueAtom[] {
    const atoms: ResidueAtom[] = [];
    
    for (const line of section.lines) {
      const match = line.text.match(/^(\S+)\s+(\S+)\s+([-\d.]+)\s+(\d+)/);
      if (match) {
        const [, name, type, chargeStr, chargeGroupStr] = match;
        atoms.push({
          name,
          type,
          charge: parseFloat(chargeStr),
          chargeGroup: parseInt(chargeGroupStr, 10),
          location: line.location
        });
      }
    }
    
    return atoms;
  }
  
  private parseBonds(section: Section): BondDefinition[] {
    const bonds: BondDefinition[] = [];
    
    for (const line of section.lines) {
      const atoms = line.text.trim().split(/\s+/).filter(a => a);
      if (atoms.length >= 2) {
        bonds.push({
          atoms,
          location: line.location
        });
      }
    }
    
    return bonds;
  }
  
  // parseImpropers, parseCmaps 类似...
}
```

### 2.4 ForceFieldParser 主协调器

**文件**：`src/parsers/forcefield/forceFieldParser.ts`

```typescript
export class ForceFieldParser {
  private atpParser = new AtpParser();
  private rtpParser = new RtpParser();
  private tdbParser = new TdbParser();
  private itpParamParser = new ItpParamParser();
  
  /**
   * 解析完整的力场目录
   */
  public async parseForceField(forceFieldDir: vscode.Uri): Promise<ForceFieldIndex> {
    const index: ForceFieldIndex = {
      atomTypes: new Map(),
      residues: new Map(),
      terminus: new Map(),
      bondParams: new Map(),
      angleParams: new Map(),
      forceFieldPath: forceFieldDir.fsPath,
      forceFieldName: path.basename(forceFieldDir.fsPath),
      lastUpdated: new Date()
    };
    
    // 1. 读取 forcefield.itp 获取 include 列表
    const forceFieldItp = vscode.Uri.joinPath(forceFieldDir, 'forcefield.itp');
    const includes = await this.parseIncludes(forceFieldItp);
    
    // 2. 解析 atomtypes.atp
    const atpUri = vscode.Uri.joinPath(forceFieldDir, 'atomtypes.atp');
    const atpDoc = await vscode.workspace.openTextDocument(atpUri);
    index.atomTypes = this.atpParser.parse(atpDoc);
    
    // 3. 解析 *.rtp 文件
    const rtpFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(forceFieldDir, '*.rtp')
    );
    for (const rtpUri of rtpFiles) {
      const rtpDoc = await vscode.workspace.openTextDocument(rtpUri);
      const residues = this.rtpParser.parse(rtpDoc);
      for (const [name, residue] of residues) {
        index.residues.set(name, residue);
      }
    }
    
    // 4. 解析 *.tdb 文件
    const tdbFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(forceFieldDir, '*.tdb')
    );
    for (const tdbUri of tdbFiles) {
      const tdbDoc = await vscode.workspace.openTextDocument(tdbUri);
      const modifications = this.tdbParser.parse(tdbDoc);
      for (const [residueName, mods] of modifications) {
        index.terminus.set(residueName, mods);
      }
    }
    
    // 5. 解析参数文件
    if (includes.includes('ffbonded.itp')) {
      const bondedUri = vscode.Uri.joinPath(forceFieldDir, 'ffbonded.itp');
      const bondedDoc = await vscode.workspace.openTextDocument(bondedUri);
      const params = this.itpParamParser.parseBonded(bondedDoc);
      index.bondParams = params.bonds;
      index.angleParams = params.angles;
    }
    
    return index;
  }
  
  private async parseIncludes(itpUri: vscode.Uri): Promise<string[]> {
    const doc = await vscode.workspace.openTextDocument(itpUri);
    const includes: string[] = [];
    
    for (let i = 0; i < doc.lineCount; i++) {
      const line = doc.lineAt(i).text;
      const match = line.match(/^\s*#include\s+"([^"]+)"/);
      if (match) {
        includes.push(match[1]);
      }
    }
    
    return includes;
  }
}
```

---

## 🎨 Phase 3: 语义分析与提供者（第5-7周）

### 3.1 ForceFieldIndex 管理器

**文件**：`src/languages/forcefield/forceFieldIndexManager.ts`

```typescript
export class ForceFieldIndexManager {
  private indices = new Map<string, ForceFieldIndex>();
  private parser = new ForceFieldParser();
  
  /**
   * 获取或构建给定力场目录的索引
   */
  public async getIndex(forceFieldDir: vscode.Uri): Promise<ForceFieldIndex> {
    const key = forceFieldDir.toString();
    
    if (!this.indices.has(key)) {
      const index = await this.parser.parseForceField(forceFieldDir);
      this.indices.set(key, index);
    }
    
    return this.indices.get(key)!;
  }
  
  /**
   * 查找文档所属的力场目录
   */
  public async findForceFieldForDocument(
    document: vscode.TextDocument
  ): Promise<vscode.Uri | null> {
    const docDir = vscode.Uri.joinPath(document.uri, '..');
    
    // 检查是否在力场目录中
    const forceFieldItp = vscode.Uri.joinPath(docDir, 'forcefield.itp');
    try {
      await vscode.workspace.fs.stat(forceFieldItp);
      return docDir;
    } catch {
      return null;
    }
  }
  
  /**
   * 使索引失效（文件更改时）
   */
  public invalidate(forceFieldDir: vscode.Uri): void {
    this.indices.delete(forceFieldDir.toString());
  }
}
```

### 3.2 RTP Completion Provider

**文件**：`src/providers/forcefield/rtpCompletionProvider.ts`

```typescript
export class RtpCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private indexManager: ForceFieldIndexManager) {}
  
  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const line = document.lineAt(position.line).text;
    const linePrefix = line.substring(0, position.character);
    
    // 检查上下文
    const section = this.getCurrentSection(document, position);
    
    if (section === 'atoms') {
      // 在 [ atoms ] 段中，补全原子类型
      return this.provideAtomTypeCompletions(document);
    }
    
    if (section === 'bonds' || section === 'impropers') {
      // 在 [ bonds ] 或 [ impropers ] 中，补全原子名
      return this.provideAtomNameCompletions(document, position);
    }
    
    return [];
  }
  
  private async provideAtomTypeCompletions(
    document: vscode.TextDocument
  ): Promise<vscode.CompletionItem[]> {
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) return [];
    
    const index = await this.indexManager.getIndex(forceFieldDir);
    const items: vscode.CompletionItem[] = [];
    
    for (const [name, atomType] of index.atomTypes) {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
      item.detail = `mass: ${atomType.mass}`;
      item.documentation = atomType.description;
      items.push(item);
    }
    
    return items;
  }
  
  private provideAtomNameCompletions(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    // 解析当前残基的 [ atoms ] 段
    const residueAtoms = this.getCurrentResidueAtoms(document, position);
    const items: vscode.CompletionItem[] = [];
    
    for (const atom of residueAtoms) {
      const item = new vscode.CompletionItem(atom.name, vscode.CompletionItemKind.Variable);
      item.detail = `${atom.type} (charge: ${atom.charge})`;
      items.push(item);
    }
    
    // 添加跨残基引用
    items.push(
      new vscode.CompletionItem('-C', vscode.CompletionItemKind.Reference),
      new vscode.CompletionItem('+N', vscode.CompletionItemKind.Reference)
    );
    
    return items;
  }
  
  private getCurrentSection(
    document: vscode.TextDocument,
    position: vscode.Position
  ): string | null {
    // 向上搜索最近的 [ section ]
    for (let i = position.line; i >= 0; i--) {
      const line = document.lineAt(i).text;
      const match = line.match(/^\s*\[\s*(\w+)\s*\]/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }
  
  private getCurrentResidueAtoms(
    document: vscode.TextDocument,
    position: vscode.Position
  ): ResidueAtom[] {
    // 查找当前残基的 [ atoms ] 段
    // 简化实现：解析到 [ atoms ] 段
    const atoms: ResidueAtom[] = [];
    let inAtomsSection = false;
    
    for (let i = 0; i < document.lineCount && i < position.line; i++) {
      const line = document.lineAt(i).text.trim();
      
      if (line.match(/^\[\s*atoms\s*\]/)) {
        inAtomsSection = true;
        continue;
      }
      
      if (line.match(/^\[\s*\w+\s*\]/)) {
        inAtomsSection = false;
        continue;
      }
      
      if (inAtomsSection && line) {
        const match = line.match(/^(\S+)\s+(\S+)\s+([-\d.]+)\s+(\d+)/);
        if (match) {
          atoms.push({
            name: match[1],
            type: match[2],
            charge: parseFloat(match[3]),
            chargeGroup: parseInt(match[4], 10),
            location: new vscode.Location(document.uri, new vscode.Range(i, 0, i, 0))
          });
        }
      }
    }
    
    return atoms;
  }
}
```

### 3.3 Hover Provider

**文件**：`src/providers/forcefield/rtpHoverProvider.ts`

```typescript
export class RtpHoverProvider implements vscode.HoverProvider {
  constructor(private indexManager: ForceFieldIndexManager) {}
  
  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return null;
    
    const word = document.getText(range);
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) return null;
    
    const index = await this.indexManager.getIndex(forceFieldDir);
    
    // 检查是否是原子类型
    if (index.atomTypes.has(word)) {
      return this.createAtomTypeHover(index.atomTypes.get(word)!);
    }
    
    return null;
  }
  
  private createAtomTypeHover(atomType: AtomType): vscode.Hover {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**Atom Type**: \`${atomType.name}\`\n\n`);
    md.appendMarkdown(`- **Mass**: ${atomType.mass}\n`);
    if (atomType.description) {
      md.appendMarkdown(`- **Description**: ${atomType.description}\n`);
    }
    if (atomType.sigma !== undefined) {
      md.appendMarkdown(`- **σ (LJ)**: ${atomType.sigma} nm\n`);
    }
    if (atomType.epsilon !== undefined) {
      md.appendMarkdown(`- **ε (LJ)**: ${atomType.epsilon} kJ/mol\n`);
    }
    md.appendMarkdown(`\n---\n`);
    md.appendMarkdown(`[Go to definition](${atomType.location.uri.toString()}#L${atomType.location.range.start.line + 1})`);
    
    return new vscode.Hover(md);
  }
}
```

### 3.4 Diagnostic Provider

**文件**：`src/providers/forcefield/rtpDiagnosticProvider.ts`

```typescript
export class RtpDiagnosticProvider {
  constructor(
    private indexManager: ForceFieldIndexManager,
    private diagnosticCollection: vscode.DiagnosticCollection
  ) {}
  
  public async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) {
      this.diagnosticCollection.delete(document.uri);
      return;
    }
    
    const index = await this.indexManager.getIndex(forceFieldDir);
    const diagnostics: vscode.Diagnostic[] = [];
    
    // 解析当前文档
    const parser = new RtpParser();
    const residues = parser.parse(document);
    
    for (const residue of residues.values()) {
      // 检查1：未定义的原子类型
      for (const atom of residue.atoms) {
        if (!index.atomTypes.has(atom.type)) {
          diagnostics.push(new vscode.Diagnostic(
            atom.location.range,
            `Atom type "${atom.type}" not found in atomtypes.atp`,
            vscode.DiagnosticSeverity.Error
          ));
        }
      }
      
      // 检查2：键引用的原子不存在
      const atomNames = new Set(residue.atoms.map(a => a.name));
      for (const bond of residue.bonds) {
        for (const atomName of bond.atoms) {
          // 跳过跨残基引用
          if (atomName.startsWith('+') || atomName.startsWith('-')) continue;
          
          if (!atomNames.has(atomName)) {
            diagnostics.push(new vscode.Diagnostic(
              bond.location.range,
              `Atom "${atomName}" not defined in [ atoms ] section`,
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
      }
      
      // 检查3：电荷平衡
      const totalCharge = residue.atoms.reduce((sum, a) => sum + a.charge, 0);
      if (Math.abs(totalCharge - Math.round(totalCharge)) > 0.01) {
        diagnostics.push(new vscode.Diagnostic(
          residue.location.range,
          `Residue "${residue.name}" has non-integer total charge: ${totalCharge.toFixed(3)}`,
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }
    
    this.diagnosticCollection.set(document.uri, diagnostics);
  }
}
```

---

## 🌳 Phase 4: 可视化（第8-9周）

### 4.1 力场树视图

**文件**：`src/providers/forcefield/forceFieldTreeProvider.ts`

```typescript
export class ForceFieldTreeProvider implements vscode.TreeDataProvider<ForceFieldTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ForceFieldTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  
  constructor(private indexManager: ForceFieldIndexManager) {}
  
  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
  
  public getTreeItem(element: ForceFieldTreeItem): vscode.TreeItem {
    return element;
  }
  
  public async getChildren(element?: ForceFieldTreeItem): Promise<ForceFieldTreeItem[]> {
    if (!element) {
      // 根级别：扫描工作区中的力场
      return this.discoverForceFields();
    }
    
    if (element.contextValue === 'forcefield') {
      // 力场级别：显示类别
      return [
        new ForceFieldTreeItem(
          `⚛️ Atom Types (${element.index!.atomTypes.size})`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'atomTypes',
          element.index
        ),
        new ForceFieldTreeItem(
          `🧬 Residues (${element.index!.residues.size})`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'residues',
          element.index
        ),
        new ForceFieldTreeItem(
          `🔗 Bond Parameters (${element.index!.bondParams.size})`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'bondParams',
          element.index
        )
      ];
    }
    
    if (element.contextValue === 'atomTypes') {
      // 原子类型列表
      const items: ForceFieldTreeItem[] = [];
      for (const [name, atomType] of element.index!.atomTypes) {
        const item = new ForceFieldTreeItem(
          `${name} (${atomType.mass})`,
          vscode.TreeItemCollapsibleState.None,
          'atomType'
        );
        item.command = {
          command: 'gromacs-helper.goToDefinition',
          title: 'Go to Definition',
          arguments: [atomType.location]
        };
        item.tooltip = atomType.description;
        items.push(item);
      }
      return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
    
    if (element.contextValue === 'residues') {
      // 残基列表
      const items: ForceFieldTreeItem[] = [];
      for (const [name, residue] of element.index!.residues) {
        const item = new ForceFieldTreeItem(
          `${name} (${residue.atoms.length} atoms)`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'residue'
        );
        item.residue = residue;
        items.push(item);
      }
      return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
    
    if (element.contextValue === 'residue') {
      // 残基详情
      const residue = element.residue!;
      return [
        new ForceFieldTreeItem(
          `Atoms: ${residue.atoms.length}`,
          vscode.TreeItemCollapsibleState.None,
          'residueInfo'
        ),
        new ForceFieldTreeItem(
          `Bonds: ${residue.bonds.length}`,
          vscode.TreeItemCollapsibleState.None,
          'residueInfo'
        ),
        new ForceFieldTreeItem(
          `Charge: ${residue.atoms.reduce((s, a) => s + a.charge, 0).toFixed(3)}`,
          vscode.TreeItemCollapsibleState.None,
          'residueInfo'
        )
      ];
    }
    
    return [];
  }
  
  private async discoverForceFields(): Promise<ForceFieldTreeItem[]> {
    const forceFieldFiles = await vscode.workspace.findFiles('**/forcefield.itp');
    const items: ForceFieldTreeItem[] = [];
    
    for (const ffUri of forceFieldFiles) {
      const ffDir = vscode.Uri.joinPath(ffUri, '..');
      const index = await this.indexManager.getIndex(ffDir);
      
      const item = new ForceFieldTreeItem(
        `📁 ${index.forceFieldName}`,
        vscode.TreeItemCollapsibleState.Collapsed,
        'forcefield'
      );
      item.index = index;
      items.push(item);
    }
    
    return items;
  }
}

class ForceFieldTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public index?: ForceFieldIndex,
    public residue?: ResidueTopology
  ) {
    super(label, collapsibleState);
  }
}
```

**注册**：在 `package.json` 中添加视图：

```json
{
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "gromacsForceFields",
          "name": "GROMACS Force Fields"
        }
      ]
    }
  }
}
```

---

## 📝 Phase 5: 高级功能（第10-12周）

### 5.1 Definition Provider

```typescript
export class ForceFieldDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private indexManager: ForceFieldIndexManager) {}
  
  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Location | null> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return null;
    
    const word = document.getText(range);
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) return null;
    
    const index = await this.indexManager.getIndex(forceFieldDir);
    
    // 原子类型
    if (index.atomTypes.has(word)) {
      return index.atomTypes.get(word)!.location;
    }
    
    // 残基
    if (index.residues.has(word)) {
      return index.residues.get(word)!.location;
    }
    
    return null;
  }
}
```

### 5.2 Reference Provider

```typescript
export class ForceFieldReferenceProvider implements vscode.ReferenceProvider {
  constructor(private indexManager: ForceFieldIndexManager) {}
  
  public async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext
  ): Promise<vscode.Location[]> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return [];
    
    const word = document.getText(range);
    const forceFieldDir = await this.indexManager.findForceFieldForDocument(document);
    if (!forceFieldDir) return [];
    
    const index = await this.indexManager.getIndex(forceFieldDir);
    const references: vscode.Location[] = [];
    
    // 查找使用此原子类型的所有残基
    if (index.atomTypes.has(word)) {
      for (const residue of index.residues.values()) {
        for (const atom of residue.atoms) {
          if (atom.type === word) {
            references.push(atom.location);
          }
        }
      }
    }
    
    return references;
  }
}
```

### 5.3 Code Actions（快速修复）

```typescript
export class ForceFieldCodeActionProvider implements vscode.CodeActionProvider {
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.message.includes('not found in atomtypes.atp')) {
        // 快速修复：创建原子类型
        const action = new vscode.CodeAction(
          'Create atom type in atomtypes.atp',
          vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];
        action.command = {
          command: 'gromacs-helper.createAtomType',
          title: 'Create Atom Type',
          arguments: [document, range]
        };
        actions.push(action);
      }
      
      if (diagnostic.message.includes('non-integer total charge')) {
        // 快速修复：显示电荷详情
        const action = new vscode.CodeAction(
          'Show charge breakdown',
          vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];
        action.command = {
          command: 'gromacs-helper.showChargeBreakdown',
          title: 'Show Charge Breakdown',
          arguments: [document, range]
        };
        actions.push(action);
      }
    }
    
    return actions;
  }
}
```

---

## 🧪 Phase 6: 测试与文档（第13-14周）

### 6.1 单元测试

**文件**：`src/test/forcefield/`

```typescript
// atpParser.test.ts
suite('AtpParser Tests', () => {
  test('Parse simple atp file', async () => {
    const content = `H        1.00800 ; polar H\nC        12.01100 ; carbonyl C`;
    const doc = await createTestDocument(content, 'test.atp');
    
    const parser = new AtpParser();
    const result = parser.parse(doc);
    
    assert.strictEqual(result.size, 2);
    assert.strictEqual(result.get('H')?.mass, 1.008);
    assert.strictEqual(result.get('C')?.description, 'carbonyl C');
  });
});

// rtpParser.test.ts
suite('RtpParser Tests', () => {
  test('Parse ALA residue', async () => {
    const content = `
[ ALA ]
 [ atoms ]
    N    NH1    -0.47    0
    CA   CT1     0.07    1
    C    C       0.51    2
    O    O      -0.51    2
 [ bonds ]
    N   CA
    CA  C
`;
    const doc = await createTestDocument(content, 'test.rtp');
    
    const parser = new RtpParser();
    const result = parser.parse(doc);
    
    const ala = result.get('ALA');
    assert.ok(ala);
    assert.strictEqual(ala.atoms.length, 4);
    assert.strictEqual(ala.bonds.length, 2);
  });
});
```

### 6.2 集成测试

```typescript
suite('ForceField Integration Tests', () => {
  test('Load charmm27 force field', async () => {
    const ffDir = vscode.Uri.file('/opt/homebrew/Cellar/gromacs/2026.1/share/gromacs/top/charmm27.ff');
    
    const parser = new ForceFieldParser();
    const index = await parser.parseForceField(ffDir);
    
    assert.ok(index.atomTypes.size > 50);
    assert.ok(index.residues.size > 20);
    assert.ok(index.residues.has('ALA'));
  });
});
```

### 6.3 文档

创建 **`FORCEFIELD_SUPPORT.md`**：

```markdown
# GROMACS 力场文件支持

本扩展提供对 GROMACS 力场文件的完整语言支持。

## 支持的文件类型

- `.rtp` - 残基拓扑模板
- `.atp` - 原子类型定义
- `.tdb` - 末端修饰
- `.hdb` - 氢数据库
- `ffbonded.itp` - 键合参数
- `ffnonbonded.itp` - 非键参数

## 功能

### 语法高亮
所有力场文件类型都有完整的语法高亮。

### 智能补全
- 在 `.rtp` 的 `[ atoms ]` 段输入时自动补全原子类型
- 在 `[ bonds ]` 段补全残基内的原子名
- 支持跨残基引用（`-C`, `+N`）

### 悬浮文档
将鼠标悬停在原子类型上查看详细信息：
- 质量
- LJ 参数
- 描述

### 诊断
实时检测：
- 未定义的原子类型
- 缺失的原子引用
- 电荷不平衡
- 缺失的力场参数

### 跳转定义
Ctrl+Click（或 Cmd+Click）跳转到：
- 原子类型定义
- 残基定义

### 查找引用
右键 > "查找所有引用" 查看：
- 使用该原子类型的所有残基
- 引用该残基的所有位置

### 力场浏览器
侧边栏的 "GROMACS Force Fields" 视图展示：
- 工作区中的所有力场
- 原子类型列表
- 残基列表
- 参数统计

## 使用示例

### 创建新残基

1. 打开 `.rtp` 文件
2. 添加新残基段：
```
[ MYNEW ]
 [ atoms ]
    C1   CT1   0.07   0
```
3. 输入原子类型时会自动补全
4. 保存后自动验证

### 检查力场完整性

1. 打开力场目录中的任意文件
2. 查看 "问题" 面板查看所有诊断
3. 点击诊断跳转到问题位置

## 配置

```json
{
  "gromacsHelper.forcefield.validateOnSave": true,
  "gromacsHelper.forcefield.showChargeWarnings": true,
  "gromacsHelper.forcefield.customForceFieldPaths": [
    "/path/to/custom/ff"
  ]
}
```
```

---

## 📅 实施时间线

| 阶段 | 周数 | 里程碑 |
|------|------|--------|
| Phase 1: 基础设施 | 1-2 | 文件类型注册，TextMate 语法 |
| Phase 2: 解析器 | 3-4 | 所有文件类型的解析器 |
| Phase 3: 语义分析 | 5-7 | Completion, Hover, Diagnostics |
| Phase 4: 可视化 | 8-9 | 树视图，概览面板 |
| Phase 5: 高级功能 | 10-12 | Definition, Reference, CodeAction |
| Phase 6: 测试与文档 | 13-14 | 完整测试套件，用户文档 |

**总计：14 周（约 3.5 个月）**

---

## 🎯 优先级排序

### P0（必须有）
1. `.rtp` 和 `.atp` 的基本解析
2. 原子类型验证（最常见的错误）
3. Completion 和 Hover
4. 基础诊断

### P1（应该有）
5. `.tdb` 和 `.hdb` 支持
6. 力场树视图
7. Definition/Reference provider
8. 电荷平衡检查

### P2（可以有）
9. 参数文件完整支持
10. Code Actions
11. 高级可视化
12. 性能优化（大型力场缓存）

---

## 🚀 快速启动（MVP - 4周）

如果需要快速交付最小可行产品：

### Week 1
- [ ] `.atp` 和 `.rtp` TextMate 语法
- [ ] AtpParser 和 RtpParser
- [ ] ForceFieldIndexManager

### Week 2
- [ ] RtpCompletionProvider（原子类型补全）
- [ ] RtpHoverProvider（显示质量和描述）
- [ ] 基础诊断（未定义原子类型）

### Week 3
- [ ] 力场树视图（仅原子类型和残基列表）
- [ ] Definition provider

### Week 4
- [ ] 测试和 bug 修复
- [ ] 基础文档
- [ ] 发布 v0.6.0

---

这个计划提供了完整的路线图，可以根据实际需求和资源调整优先级！
