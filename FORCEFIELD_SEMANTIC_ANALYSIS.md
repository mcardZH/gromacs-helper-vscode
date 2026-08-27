# GROMACS 力场语义分析与验证需求文档

## 1. 力场语义模型概览

### 1.1 力场文件体系架构

```
forcefield.itp (入口点)
├── ffnonbonded.itp      # 非键参数 (atom types, LJ参数)
├── ffbonded.itp         # 键合参数 (bonds, angles, dihedrals, impropers)
├── gb.itp               # 广义玻恩参数
├── cmap.itp             # CMAP校正项
├── ffnanonbonded.itp    # 核酸非键参数
└── ffnabonded.itp       # 核酸键合参数

辅助数据库文件:
├── atomtypes.atp        # 原子类型名称和质量映射
├── {residue}.rtp        # 残基拓扑模板 (aminoacids.rtp, dna.rtp, rna.rtp, lipids.rtp)
├── {residue}.hdb        # 氢原子构建数据库
├── {residue}.n.tdb      # N端修饰模板
├── {residue}.c.tdb      # C端修饰模板
├── {residue}.r2b        # 残基到键类型映射
├── {residue}.arn        # 原子重命名规则
├── {residue}.vsd        # 虚拟位点定义
└── watermodels.dat      # 水模型列表
```

### 1.2 核心实体类型

#### A. **原子类型 (Atom Type)**
**定义位置**: `atomtypes.atp` + `ffnonbonded.itp`

**语义结构**:
```
atomtypes.atp:
  <type_name>  <atomic_number>  <mass>  ; <comment>

ffnonbonded.itp [ atomtypes ]:
  <type_name>  <atomic_num>  <mass>  <charge>  <ptype>  <sigma>  <epsilon>
```

**示例**:
```
atomtypes.atp:
  CT1   12.01100  ; aliphatic sp3 C for CH
  NH1   14.00700  ; peptide nitrogen

ffnonbonded.itp:
  CT1   6  12.01100  0.07   A  0.405358916754  0.08368
  NH1   7  14.00700  -0.47  A  0.329632525712  0.8368
```

**语义属性**:
- `type_name`: 唯一标识符，在整个力场中被引用
- `atomic_number`: 元素周期表序号
- `mass`: 原子质量 (amu)
- `charge`: 默认电荷（在 .rtp 中会被覆盖）
- `ptype`: 粒子类型 (A=atom, V=virtual site, S=shell)
- `sigma`, `epsilon`: Lennard-Jones 参数

---

#### B. **残基拓扑模板 (Residue Topology Template - .rtp)**
**定义位置**: `{molecule_class}.rtp` (如 `aminoacids.rtp`)

**语义结构**:
```
[ bondedtypes ]
  # 全局键合参数设置

[ <RESIDUE_NAME> ]
 [ atoms ]
   <atom_name>  <atom_type>  <charge>  <charge_group>
 
 [ bonds ]
   <atom1>  <atom2>
   
 [ angles ]      # 可选
   <atom1>  <atom2>  <atom3>
   
 [ dihedrals ]   # 可选
   <atom1>  <atom2>  <atom3>  <atom4>
   
 [ impropers ]
   <atom1>  <atom2>  <atom3>  <atom4>
   
 [ cmap ]        # CHARMM特有
   <atom1>  <atom2>  <atom3>  <atom4>  <atom5>
```

**示例 (ALA 残基)**:
```
[ ALA ]
 [ atoms ]
   N    NH1   -0.47  0
   HN   H      0.31  1
   CA   CT1    0.07  2
   HA   HB     0.09  3
   CB   CT3   -0.27  4
   HB1  HA     0.09  5
   HB2  HA     0.09  6
   HB3  HA     0.09  7
   C    C      0.51  8
   O    O     -0.51  9
   
 [ bonds ]
   CB   CA
   N    HN
   N    CA
   C    CA
   C    +N      ; +N 表示下一个残基的N原子
   CA   HA
   CB   HB1
   CB   HB2
   CB   HB3
   O    C
   
 [ impropers ]
   N   -C   CA   HN   ; -C 表示前一个残基的C原子
   C   CA   +N   O
   
 [ cmap ]
   -C  N  CA  C  +N
```

**语义关系**:
- `atom_type` → `atomtypes.atp` (必须存在)
- `atom_name` → 残基内唯一标识
- `+atom_name` / `-atom_name` → 跨残基引用（肽键连接）
- `bonds` 中的原子对 → `ffbonded.itp [ bondtypes ]` 查找参数
- `charge_group` → 用于长程静电计算分组

**电荷守恒约束**:
- 标准残基: ∑charges = 0.0 (中性)
- 带电残基: ARG(+1), LYS(+1), ASP(-1), GLU(-1)
- 端基修饰后需重新验证

---

#### C. **键合参数 (Bonded Parameters - ffbonded.itp)**

**[ bondtypes ]** - 键拉伸
```
<type1>  <type2>  <func>  <b0>  <kb>
  CT1     CT2        1    0.1538  186188.0
```
- `b0`: 平衡键长 (nm)
- `kb`: 力常数 (kJ·mol⁻¹·nm⁻²)

**[ angletypes ]** - 键角弯曲
```
<type1>  <type2>  <type3>  <func>  <th0>  <cth>  <ub0>  <cub>
  CT1     CT2      CT3       5     111.0  446.4   0.256  6694.4
```
- `th0`: 平衡角度 (度)
- `cth`: 角度力常数 (kJ·mol⁻¹·rad⁻²)
- `ub0`, `cub`: Urey-Bradley 项参数（CHARMM特有）

**[ dihedraltypes ]** - 二面角
```
<type1>  <type2>  <type3>  <type4>  <func>  <phi0>  <kphi>  <multiplicity>
  CT1     CT2      CT3      HA        9      0.0     1.5     3
```
- `func=9`: proper dihedral (多项式展开)
- `func=2`: improper dihedral (保持平面性)

**[ cmaptypes ]** - CMAP 校正
```
<type1>  <type2>  <type3>  <type4>  <type5>  <func>  <resolution>  <grid_data>...
```
- 用于蛋白质骨架二面角 φ-ψ 相关性校正

**引用关系验证**:
```
.rtp [ bonds ]        → ffbonded.itp [ bondtypes ] (按原子类型查找)
.rtp [ impropers ]    → ffbonded.itp [ dihedraltypes ] (func=2)
```

---

#### D. **端基修饰模板 (.tdb files)**

**语义操作类型**:

1. **[ replace ]** - 替换原子类型/电荷
```
[ NH3+ ]  ; N端带正电
 [ replace ]
   N    N    NH3   14.0027  -0.3    ; 原子名 → 新原子名 → 新类型 → 新质量 → 新电荷
   CA   CA   CT1   12.011   0.21
   HA   HA   HB    1.008    0.10
```

2. **[ add ]** - 添加新原子
```
 [ Add ]
   3  4  H  N  CA  C        ; 添加数量 构建拓扑 新原子名 连接原子1 2 3
      HC  1.008  0.33  -1   ; 新原子类型 质量 电荷 电荷组
```

3. **[ delete ]** - 删除原子
```
 [ delete ]
   HN    ; 删除原有的 HN 原子
```

4. **[ bonds ] / [ impropers ]** - 添加额外键/improper
```
 [ bonds ]
   NT  CAT   ; 在 CT3 修饰中添加新键
```

**修饰应用场景**:
- **N端**: `None`, `NH3+`, `NH2`, `PRO-NH2+`, `PRO-NH` 等
- **C端**: `None`, `COO-`, `COOH`, `CT2` (amide), `CT3` (N-methyl) 等

**验证规则**:
- 修饰后的原子类型必须存在于 `atomtypes.atp`
- 电荷守恒: ∑(original_charges + modifications) = expected_net_charge
- 新增的键必须在 `ffbonded.itp` 中有对应参数

---

#### E. **氢原子构建数据库 (.hdb)**

**语义结构**:
```
<RESIDUE_NAME>  <num_hydrogen_groups>
  <num_H>  <construction_type>  <H_names...>  <connected_atom>  <geo_atoms...>
```

**示例**:
```
ALA  3
  1  1  HN   N   -C  CA      ; 1个氢，类型1(单键)，命名HN，连到N，几何参考-C和CA
  1  5  HA   CA  N   C   CB  ; 1个氢，类型5(手性中心)，连到CA
  3  4  HB   CB  CA  N       ; 3个氢，类型4(甲基)，连到CB
```

**构建类型**:
- `1`: 单氢 (单键延伸)
- `2`: 平面双氢 (如 NH2)
- `3`: 四面体三氢 (如 CH3)
- `4`: 四面体三氢 (alternative)
- `5`: 手性中心单氢
- `6`: 双氢 (芳香/烯烃)

---

## 2. 实体间引用关系图谱

### 2.1 主引用链

```
┌─────────────────────┐
│  forcefield.itp     │  (入口)
│  #include ...       │
└──────────┬──────────┘
           │
           ├──→ ffnonbonded.itp [ atomtypes ]  ← atomtypes.atp (名称/质量对照)
           │         ↑
           │         │ 被引用
           │         │
           ├──→ ffbonded.itp [ bondtypes, angletypes, dihedraltypes, ... ]
           │         ↑
           │         │ 被查询
           │         │
           └──→ (其他 .itp 文件)

┌─────────────────────┐
│  {molecule}.rtp     │  (pdb2gmx 使用)
│  [ ALA ]            │
│    [ atoms ]        │
│      CA  CT1  ...   │──┐
│    [ bonds ]        │  │
│      CA  CB         │──┤
└─────────────────────┘  │
                         │
         ┌───────────────┴────────┐
         │                        │
         ↓                        ↓
   atomtypes.atp              ffbonded.itp
   (类型存在性检查)            (参数查找: CT1-CT2 键)

┌─────────────────────┐
│  {molecule}.n.tdb   │  (N端修饰)
│  [ NH3+ ]           │
│   [ replace ]       │
│     N  N  NH3  ...  │──→ atomtypes.atp (NH3 类型必须存在)
└─────────────────────┘

┌─────────────────────┐
│  {molecule}.hdb     │  (pdb2gmx 氢原子添加)
│  ALA  3             │
│    1 1 HN N -C CA   │──→ 引用 .rtp 中定义的原子名
└─────────────────────┘
```

### 2.2 详细引用矩阵

| 源文件/实体 | 引用目标 | 引用字段 | 验证类型 | 失败影响 |
|------------|---------|---------|---------|---------|
| `.rtp [ atoms ]` | `atomtypes.atp` | `atom_type` | 存在性 | 致命：pdb2gmx 失败 |
| `.rtp [ atoms ]` | `ffnonbonded.itp` | `atom_type` | 参数完整性 | 致命：LJ 参数缺失 |
| `.rtp [ bonds ]` | `ffbonded.itp [ bondtypes ]` | `(type1, type2)` | 参数查找 | 警告：使用默认参数或失败 |
| `.rtp [ angles ]` | `ffbonded.itp [ angletypes ]` | `(type1, type2, type3)` | 参数查找 | 警告：自动生成或失败 |
| `.rtp [ dihedrals ]` | `ffbonded.itp [ dihedraltypes ]` | `(t1, t2, t3, t4)` | 参数查找 | 警告：可能跳过 |
| `.rtp [ impropers ]` | `ffbonded.itp [ dihedraltypes ]` | `(t1, t2, t3, t4)` func=2 | 参数查找 | 警告：影响平面性 |
| `.rtp [ cmap ]` | `cmap.itp [ cmaptypes ]` | `(t1, t2, t3, t4, t5)` | 参数查找 | 警告：无 CMAP 校正 |
| `.tdb [ replace ]` | `atomtypes.atp` | `new_atom_type` | 存在性 | 致命：修饰失败 |
| `.tdb [ add ]` | `atomtypes.atp` | `new_atom_type` | 存在性 | 致命：修饰失败 |
| `.tdb [ bonds ]` | `ffbonded.itp [ bondtypes ]` | `(type1, type2)` | 参数查找 | 警告：新键缺参数 |
| `.hdb` | `.rtp [ atoms ]` | `atom_name` | 名称匹配 | 警告：氢原子放置失败 |
| `forcefield.itp` | 所有 `.itp` 文件 | `#include` 路径 | 文件存在性 | 致命：力场加载失败 |

---

## 3. 验证规则设计

### 3.1 原子类型验证

#### 规则 1.1: **原子类型存在性检查**
**触发条件**: 在 `.rtp` 或 `.tdb` 文件中使用了原子类型标识符

**验证逻辑**:
```typescript
function validateAtomTypeExists(
  atomType: string,
  atomTypesAtp: Set<string>,
  location: Location
): Diagnostic | null {
  if (!atomTypesAtp.has(atomType)) {
    return {
      severity: DiagnosticSeverity.Error,
      range: location.range,
      message: `原子类型 '${atomType}' 未在 atomtypes.atp 中定义`,
      code: 'ff-atom-type-undefined',
      source: 'gromacs-forcefield'
    };
  }
  return null;
}
```

**测试用例**:
```
[ ALA ]
 [ atoms ]
   CA  CT1X  0.07  2   ← 错误: CT1X 不存在，应为 CT1
```

---

#### 规则 1.2: **原子类型参数完整性**
**触发条件**: 原子类型在 `atomtypes.atp` 存在，但在 `ffnonbonded.itp [ atomtypes ]` 缺失

**验证逻辑**:
```typescript
function validateAtomTypeParameters(
  atomType: string,
  nonbondedParams: Map<string, AtomTypeParams>
): Diagnostic | null {
  if (!nonbondedParams.has(atomType)) {
    return {
      severity: DiagnosticSeverity.Warning,
      message: `原子类型 '${atomType}' 缺少非键参数 (sigma, epsilon)`,
      code: 'ff-atom-type-no-params'
    };
  }
  
  const params = nonbondedParams.get(atomType);
  if (params.sigma === 0 && params.epsilon === 0) {
    return {
      severity: DiagnosticSeverity.Information,
      message: `原子类型 '${atomType}' 使用零 LJ 参数 (虚拟位点或约束原子)`,
      code: 'ff-atom-type-zero-lj'
    };
  }
  
  return null;
}
```

---

#### 规则 1.3: **原子类型命名规范**
**CHARMM27 命名约定**:
- `C*`: 碳原子变体 (CT1, CT2, CT3, CA, CPH1, CPH2, ...)
- `N*`: 氮原子变体 (NH1, NH2, NH3, NC2, NR1, ...)
- `H*`: 氢原子变体 (H, HA, HB, HC, HP, ...)
- `O*`: 氧原子变体 (O, OC, OH1, OT, ...)
- `S*`: 硫原子变体 (S, SM, SS)

**验证**:
```typescript
function validateAtomTypeNamingConvention(
  atomType: string,
  atomicNumber: number
): Diagnostic | null {
  const expectedPrefix = ELEMENT_PREFIXES[atomicNumber]; // {6: 'C', 7: 'N', ...}
  if (!atomType.startsWith(expectedPrefix)) {
    return {
      severity: DiagnosticSeverity.Warning,
      message: `原子类型 '${atomType}' 的命名不符合惯例 (元素 ${atomicNumber} 通常以 '${expectedPrefix}' 开头)`,
      code: 'ff-atom-type-naming'
    };
  }
  return null;
}
```

---

### 3.2 残基定义完整性验证

#### 规则 2.1: **必需字段检查**
**要求**: 每个残基必须包含 `[ atoms ]` 和 `[ bonds ]` 部分

```typescript
function validateResidueStructure(residue: Residue): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  
  if (!residue.atoms || residue.atoms.length === 0) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      message: `残基 '${residue.name}' 缺少 [ atoms ] 定义`,
      code: 'ff-residue-no-atoms'
    });
  }
  
  if (!residue.bonds || residue.bonds.length === 0) {
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      message: `残基 '${residue.name}' 缺少 [ bonds ] 定义 (可能是单原子残基)`,
      code: 'ff-residue-no-bonds'
    });
  }
  
  return diagnostics;
}
```

---

#### 规则 2.2: **原子名称唯一性**
```typescript
function validateAtomNameUniqueness(residue: Residue): Diagnostic[] {
  const seen = new Set<string>();
  const duplicates: Diagnostic[] = [];
  
  for (const atom of residue.atoms) {
    if (seen.has(atom.name)) {
      duplicates.push({
        severity: DiagnosticSeverity.Error,
        range: atom.nameRange,
        message: `重复的原子名称 '${atom.name}' 在残基 '${residue.name}' 中`,
        code: 'ff-duplicate-atom-name'
      });
    }
    seen.add(atom.name);
  }
  
  return duplicates;
}
```

---

#### 规则 2.3: **键引用的原子必须存在**
```typescript
function validateBondAtomReferences(residue: Residue): Diagnostic[] {
  const atomNames = new Set(residue.atoms.map(a => a.name));
  const diagnostics: Diagnostic[] = [];
  
  for (const bond of residue.bonds) {
    for (const atomRef of [bond.atom1, bond.atom2]) {
      // 跨残基引用 (+N, -C) 不在此检查
      if (atomRef.startsWith('+') || atomRef.startsWith('-')) {
        continue;
      }
      
      if (!atomNames.has(atomRef)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: bond.range,
          message: `键引用了未定义的原子 '${atomRef}'`,
          code: 'ff-bond-undefined-atom'
        });
      }
    }
  }
  
  return diagnostics;
}
```

---

#### 规则 2.4: **跨残基引用合法性**
```typescript
function validateInterResidueReferences(
  residue: Residue,
  moleculeType: 'protein' | 'dna' | 'rna' | 'lipid'
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const allowedPrev = moleculeType === 'protein' ? ['C', 'O'] : ['O3\'', 'P'];
  const allowedNext = moleculeType === 'protein' ? ['N'] : ['O5\'', 'P'];
  
  for (const bond of residue.bonds) {
    if (bond.atom1.startsWith('-')) {
      const atomName = bond.atom1.substring(1);
      if (!allowedPrev.includes(atomName)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          message: `非常规的前残基引用 '-${atomName}' (常见: ${allowedPrev.join(', ')})`,
          code: 'ff-unusual-prev-ref'
        });
      }
    }
    
    if (bond.atom2.startsWith('+')) {
      const atomName = bond.atom2.substring(1);
      if (!allowedNext.includes(atomName)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          message: `非常规的后残基引用 '+${atomName}' (常见: ${allowedNext.join(', ')})`,
          code: 'ff-unusual-next-ref'
        });
      }
    }
  }
  
  return diagnostics;
}
```

---

### 3.3 电荷守恒验证

#### 规则 3.1: **残基净电荷检查**
```typescript
interface ChargeValidationConfig {
  expectedCharge: number;  // 期望的净电荷
  tolerance: number;       // 允许误差 (典型值: 0.01e)
}

const RESIDUE_CHARGES: Map<string, ChargeValidationConfig> = new Map([
  ['ALA', { expectedCharge: 0.0, tolerance: 0.01 }],
  ['ARG', { expectedCharge: 1.0, tolerance: 0.01 }],  // 带正电
  ['ASP', { expectedCharge: -1.0, tolerance: 0.01 }], // 带负电
  ['ASPP', { expectedCharge: 0.0, tolerance: 0.01 }], // 质子化的 ASP
  ['LYS', { expectedCharge: 1.0, tolerance: 0.01 }],
  // ... 其他残基
]);

function validateResidueCharge(residue: Residue): Diagnostic | null {
  const config = RESIDUE_CHARGES.get(residue.name);
  if (!config) {
    return null; // 未知残基类型，跳过检查
  }
  
  const totalCharge = residue.atoms.reduce((sum, atom) => sum + atom.charge, 0);
  const deviation = Math.abs(totalCharge - config.expectedCharge);
  
  if (deviation > config.tolerance) {
    return {
      severity: DiagnosticSeverity.Error,
      message: `残基 '${residue.name}' 的总电荷 ${totalCharge.toFixed(3)} 与期望值 ${config.expectedCharge} 偏差过大 (Δ=${deviation.toFixed(3)})`,
      code: 'ff-charge-imbalance',
      relatedInformation: residue.atoms.map(atom => ({
        location: atom.location,
        message: `${atom.name}: ${atom.charge.toFixed(3)}`
      }))
    };
  }
  
  return null;
}
```

---

#### 规则 3.2: **端基修饰后电荷验证**
```typescript
function validateTerminusCharge(
  residue: Residue,
  terminusMod: TerminusModification,
  terminusType: 'N' | 'C'
): Diagnostic | null {
  // 应用修饰
  const modifiedResidue = applyTerminusModification(residue, terminusMod);
  
  // 期望电荷根据修饰类型调整
  const baseCharge = RESIDUE_CHARGES.get(residue.name)?.expectedCharge ?? 0;
  let expectedCharge = baseCharge;
  
  if (terminusType === 'N') {
    if (terminusMod.name === 'NH3+') expectedCharge += 1.0;
    else if (terminusMod.name === 'NH2') expectedCharge += 0.0;
  } else if (terminusType === 'C') {
    if (terminusMod.name === 'COO-') expectedCharge -= 1.0;
    else if (terminusMod.name === 'COOH') expectedCharge += 0.0;
  }
  
  const actualCharge = modifiedResidue.atoms.reduce((sum, a) => sum + a.charge, 0);
  
  if (Math.abs(actualCharge - expectedCharge) > 0.01) {
    return {
      severity: DiagnosticSeverity.Error,
      message: `应用 ${terminusType} 端修饰 '${terminusMod.name}' 后，残基电荷 ${actualCharge.toFixed(3)} 不符合预期 ${expectedCharge.toFixed(3)}`,
      code: 'ff-terminus-charge-error'
    };
  }
  
  return null;
}
```

---

### 3.4 参数一致性验证

#### 规则 4.1: **键参数存在性**
```typescript
function validateBondParameters(
  bond: Bond,
  atomTypes: Map<string, string>,  // atom_name -> atom_type
  bondParams: Map<string, BondParams>  // "type1-type2" -> params
): Diagnostic | null {
  const type1 = atomTypes.get(bond.atom1);
  const type2 = atomTypes.get(bond.atom2);
  
  if (!type1 || !type2) return null; // 已在其他规则中报错
  
  const key1 = `${type1}-${type2}`;
  const key2 = `${type2}-${type1}`;  // 对称性
  
  if (!bondParams.has(key1) && !bondParams.has(key2)) {
    return {
      severity: DiagnosticSeverity.Warning,
      range: bond.range,
      message: `未找到键 ${bond.atom1}-${bond.atom2} (类型 ${type1}-${type2}) 的参数`,
      code: 'ff-bond-no-params',
      source: 'gromacs-forcefield'
    };
  }
  
  return null;
}
```

---

#### 规则 4.2: **键长合理性检查**
```typescript
const BOND_LENGTH_RANGES: Map<string, [number, number]> = new Map([
  ['C-C', [0.133, 0.154]],   // 芳香 ~ 单键
  ['C-N', [0.132, 0.149]],
  ['C-O', [0.121, 0.143]],
  ['C-H', [0.108, 0.111]],
  ['N-H', [0.098, 0.104]],
  ['O-H', [0.096, 0.097]],
  ['S-S', [0.203, 0.205]],
  // ...
]);

function validateBondLength(
  bondParam: BondParams,
  type1: string,
  type2: string
): Diagnostic | null {
  const element1 = getElementFromType(type1);  // CT1 -> C
  const element2 = getElementFromType(type2);  // NH1 -> N
  const key = `${element1}-${element2}`;
  
  const range = BOND_LENGTH_RANGES.get(key) || BOND_LENGTH_RANGES.get(`${element2}-${element1}`);
  if (!range) return null;
  
  const [min, max] = range;
  if (bondParam.b0 < min || bondParam.b0 > max) {
    return {
      severity: DiagnosticSeverity.Warning,
      message: `键长 ${bondParam.b0.toFixed(4)} nm 超出常规范围 [${min}-${max}] (${key})`,
      code: 'ff-bond-length-unusual'
    };
  }
  
  return null;
}
```

---

#### 规则 4.3: **二面角相位和周期性验证**
```typescript
function validateDihedralPeriodicity(dihedral: DihedralParams): Diagnostic | null {
  // 多重性通常为 1, 2, 3, 4, 6
  const validMultiplicities = [1, 2, 3, 4, 6];
  if (!validMultiplicities.includes(dihedral.multiplicity)) {
    return {
      severity: DiagnosticSeverity.Information,
      message: `不常见的二面角多重性: ${dihedral.multiplicity} (常见值: ${validMultiplicities.join(', ')})`,
      code: 'ff-dihedral-multiplicity'
    };
  }
  
  // 相位通常为 0 或 180 度
  if (dihedral.phase !== 0 && dihedral.phase !== 180) {
    return {
      severity: DiagnosticSeverity.Information,
      message: `不常见的二面角相位: ${dihedral.phase}° (常见值: 0, 180)`,
      code: 'ff-dihedral-phase'
    };
  }
  
  return null;
}
```

---

### 3.5 端基修饰适用性验证

#### 规则 5.1: **修饰与残基类型匹配**
```typescript
const TERMINUS_COMPATIBILITY: Map<string, {
  nTermini: string[],
  cTermini: string[]
}> = new Map([
  ['GLY', { 
    nTermini: ['None', 'NH3+', 'GLY-NH3+', 'NH2', 'GLY-NH2'], 
    cTermini: ['None', 'COO-', 'COOH', 'CT2', 'CT3'] 
  }],
  ['PRO', { 
    nTermini: ['None', 'PRO-NH2+', 'PRO-NH'], 
    cTermini: ['None', 'COO-', 'COOH', 'CT2', 'CT3'] 
  }],
  // 其他残基默认使用标准端基
]);

function validateTerminusCompatibility(
  residueName: string,
  terminusMod: string,
  terminusType: 'N' | 'C'
): Diagnostic | null {
  const compat = TERMINUS_COMPATIBILITY.get(residueName);
  if (!compat) return null; // 使用默认兼容性
  
  const allowedMods = terminusType === 'N' ? compat.nTermini : compat.cTermini;
  if (!allowedMods.includes(terminusMod)) {
    return {
      severity: DiagnosticSeverity.Warning,
      message: `残基 '${residueName}' 通常不使用 ${terminusType} 端修饰 '${terminusMod}' (建议: ${allowedMods.join(', ')})`,
      code: 'ff-terminus-incompatible'
    };
  }
  
  return null;
}
```

---

#### 规则 5.2: **修饰中原子替换的合法性**
```typescript
function validateTerminusAtomReplacement(
  modification: TerminusModification,
  originalResidue: Residue
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  
  for (const replacement of modification.replacements) {
    // 检查被替换的原子是否存在
    if (!originalResidue.atoms.find(a => a.name === replacement.oldAtomName)) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        message: `修饰 '${modification.name}' 试图替换不存在的原子 '${replacement.oldAtomName}'`,
        code: 'ff-terminus-replace-missing'
      });
    }
    
    // 检查新原子类型是否存在
    if (!atomTypesAtp.has(replacement.newAtomType)) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        message: `修饰 '${modification.name}' 使用了未定义的原子类型 '${replacement.newAtomType}'`,
        code: 'ff-terminus-type-undefined'
      });
    }
  }
  
  return diagnostics;
}
```

---

## 4. 智能提示需求设计

### 4.1 补全 (Completion)

#### 场景 1: `.rtp [ atoms ]` 中补全原子类型
**触发**: 输入原子名称后，键入空格进入类型字段

```typescript
provideCompletionItems(
  document: TextDocument,
  position: Position,
  context: CompletionContext
): CompletionItem[] {
  const line = document.lineAt(position.line).text;
  const atomNameMatch = line.match(/^\s+(\w+)\s+$/);
  
  if (atomNameMatch) {
    const atomName = atomNameMatch[1];
    
    // 根据原子名称推断可能的类型
    const suggestions = inferAtomTypes(atomName);
    
    return suggestions.map(type => ({
      label: type.name,
      kind: CompletionItemKind.Class,
      detail: type.description,  // "aliphatic sp3 C for CH"
      documentation: new MarkdownString(
        `**质量**: ${type.mass} amu\n` +
        `**默认电荷**: ${type.charge}\n` +
        `**LJ参数**: σ=${type.sigma} nm, ε=${type.epsilon} kJ/mol`
      ),
      sortText: type.priority.toString(),  // 常用类型优先
      insertText: `${type.name}  ${type.charge.toFixed(2)}  `
    }));
  }
  
  return [];
}

function inferAtomTypes(atomName: string): AtomTypeSuggestion[] {
  // 启发式推断
  if (atomName === 'CA') return [
    { name: 'CT1', priority: 1, description: 'α-碳 (蛋白质骨架)' },
    { name: 'CA', priority: 2, description: '芳香碳' }
  ];
  
  if (atomName.startsWith('C') && atomName.match(/^C[A-Z]$/)) {
    return [
      { name: 'CT1', priority: 1 },
      { name: 'CT2', priority: 2 },
      { name: 'CT3', priority: 3 }
    ];
  }
  
  if (atomName === 'N') return [{ name: 'NH1', priority: 1 }];
  if (atomName.startsWith('H')) return [
    { name: 'H', priority: 1 },
    { name: 'HA', priority: 2 },
    { name: 'HB', priority: 3 }
  ];
  
  // 返回所有原子类型，按字母顺序
  return getAllAtomTypes();
}
```

**补全效果**:
```
[ ALA ]
 [ atoms ]
   CA  CT1█  ← 补全后自动填充默认电荷
        ^^^
        Completion:
        ┌─────────────────────────────────────┐
        │ CT1  aliphatic sp3 C for CH         │
        │ CT2  aliphatic sp3 C for CH2        │
        │ CT3  aliphatic sp3 C for CH3        │
        │ CA   aromatic C                     │
        └─────────────────────────────────────┘
```

---

#### 场景 2: `.rtp [ bonds ]` 中补全原子名称
**触发**: 在 `[ bonds ]` 部分输入时

```typescript
provideCompletionItems(
  document: TextDocument,
  position: Position
): CompletionItem[] {
  const residue = getCurrentResidue(document, position);
  if (!residue) return [];
  
  const currentLine = document.lineAt(position.line).text;
  const atoms = residue.atoms.map(a => a.name);
  
  // 检查是否在第二个原子位置
  const isSecondAtom = currentLine.trim().split(/\s+/).length === 2;
  
  if (isSecondAtom) {
    const firstAtom = currentLine.trim().split(/\s+/)[0];
    
    // 优先建议与第一个原子"化学上合理"的键
    const bondSuggestions = suggestLikelyBonds(firstAtom, atoms, residue);
    
    return bondSuggestions.map(atom => ({
      label: atom.name,
      kind: CompletionItemKind.Field,
      detail: `${atom.type} (电荷: ${atom.charge.toFixed(2)})`,
      documentation: hasBondParameters(
        getAtomType(firstAtom), 
        atom.type
      ) ? '✓ 有键参数' : '⚠ 可能缺少键参数',
      sortText: atom.priority.toString()
    }));
  }
  
  // 第一个原子位置：列出所有原子
  return atoms.map(name => ({
    label: name,
    kind: CompletionItemKind.Field
  }));
}

function suggestLikelyBonds(
  atom1: string, 
  allAtoms: string[], 
  residue: Residue
): AtomSuggestion[] {
  // 使用化学知识排序
  // 例如: CA 应该连接 N, C, CB, HA
  const bondPatterns: Map<string, string[]> = new Map([
    ['CA', ['N', 'C', 'CB', 'HA']],
    ['N', ['CA', 'HN', '-C']],
    ['C', ['CA', 'O', '+N']],
    // ...
  ]);
  
  const preferred = bondPatterns.get(atom1) || [];
  
  return allAtoms
    .filter(a => a !== atom1)
    .map(name => ({
      name,
      type: getAtomType(name, residue),
      charge: getAtomCharge(name, residue),
      priority: preferred.includes(name) ? 1 : 10
    }))
    .sort((a, b) => a.priority - b.priority);
}
```

---

#### 场景 3: `.tdb` 修饰名称补全
**触发**: 在 pdb2gmx 配置或者编辑 .tdb 文件时

```typescript
provideCompletionItems(): CompletionItem[] {
  const nTermini = ['None', 'NH3+', 'NH2', 'GLY-NH3+', 'GLY-NH2', 'PRO-NH2+', 'PRO-NH'];
  const cTermini = ['None', 'COO-', 'COOH', 'CT2', 'CT3'];
  
  return [...nTermini.map(name => ({
    label: name,
    kind: CompletionItemKind.Constant,
    detail: 'N端修饰',
    documentation: getTerminusDocumentation(name, 'N')
  })), ...cTermini.map(name => ({
    label: name,
    kind: CompletionItemKind.Constant,
    detail: 'C端修饰',
    documentation: getTerminusDocumentation(name, 'C')
  }))];
}
```

---

### 4.2 悬浮文档 (Hover)

#### 场景 1: 原子类型悬浮显示
**触发**: 鼠标悬停在 `.rtp [ atoms ]` 中的原子类型上

```typescript
provideHover(
  document: TextDocument,
  position: Position
): Hover | null {
  const range = document.getWordRangeAtPosition(position);
  const atomType = document.getText(range);
  
  const atpEntry = atomTypesAtp.get(atomType);
  const nonbondedParams = ffnonbonded.get(atomType);
  
  if (!atpEntry && !nonbondedParams) return null;
  
  const markdown = new MarkdownString();
  markdown.appendMarkdown(`### 原子类型: \`${atomType}\`\n\n`);
  
  if (atpEntry) {
    markdown.appendMarkdown(`**描述**: ${atpEntry.comment}\n\n`);
    markdown.appendMarkdown(`**质量**: ${atpEntry.mass} amu\n\n`);
  }
  
  if (nonbondedParams) {
    markdown.appendMarkdown(`**非键参数**:\n`);
    markdown.appendMarkdown(`- 原子序数: ${nonbondedParams.atomicNumber}\n`);
    markdown.appendMarkdown(`- 默认电荷: ${nonbondedParams.charge.toFixed(3)}\n`);
    markdown.appendMarkdown(`- 粒子类型: ${nonbondedParams.ptype}\n`);
    markdown.appendMarkdown(`- Lennard-Jones:\n`);
    markdown.appendMarkdown(`  - σ = ${nonbondedParams.sigma.toFixed(6)} nm\n`);
    markdown.appendMarkdown(`  - ε = ${nonbondedParams.epsilon.toFixed(6)} kJ/mol\n\n`);
    
    // 显示等效直径和势阱深度的常用单位
    const sigma_angstrom = nonbondedParams.sigma * 10;
    const epsilon_kcal = nonbondedParams.epsilon / 4.184;
    markdown.appendMarkdown(`  - σ = ${sigma_angstrom.toFixed(3)} Å\n`);
    markdown.appendMarkdown(`  - ε = ${epsilon_kcal.toFixed(3)} kcal/mol\n`);
  }
  
  // 查找使用此类型的残基
  const usages = findAtomTypeUsages(atomType);
  if (usages.length > 0) {
    markdown.appendMarkdown(`\n**常见用法**: ${usages.slice(0, 5).join(', ')}`);
    if (usages.length > 5) {
      markdown.appendMarkdown(` ... (+${usages.length - 5})`);
    }
  }
  
  return new Hover(markdown, range);
}
```

**悬浮效果示例**:
```
[ ALA ]
 [ atoms ]
   CA  CT1  0.07  2
       ^^^
       ┌────────────────────────────────────────┐
       │ ### 原子类型: `CT1`                    │
       │                                        │
       │ **描述**: aliphatic sp3 C for CH       │
       │ **质量**: 12.011 amu                   │
       │                                        │
       │ **非键参数**:                          │
       │ - 原子序数: 6                          │
       │ - 默认电荷: 0.070                      │
       │ - Lennard-Jones:                       │
       │   - σ = 0.405359 nm (4.054 Å)          │
       │   - ε = 0.08368 kJ/mol (0.020 kcal/mol)│
       │                                        │
       │ **常见用法**: ALA.CA, VAL.CA, ILE.CA   │
       └────────────────────────────────────────┘
```

---

#### 场景 2: 残基名称悬浮显示
**触发**: 鼠标悬停在残基名称 (如 `[ ALA ]`) 上

```typescript
provideHover(
  document: TextDocument,
  position: Position
): Hover | null {
  const residueName = getCurrentResidueName(position);
  const residue = rtpDatabase.get(residueName);
  
  if (!residue) return null;
  
  const markdown = new MarkdownString();
  markdown.appendMarkdown(`### 残基: \`${residueName}\`\n\n`);
  
  // 显示残基全名
  const fullName = RESIDUE_FULL_NAMES[residueName];
  if (fullName) {
    markdown.appendMarkdown(`**全名**: ${fullName}\n\n`);
  }
  
  // 显示统计信息
  markdown.appendMarkdown(`**组成**:\n`);
  markdown.appendMarkdown(`- ${residue.atoms.length} 个原子\n`);
  markdown.appendMarkdown(`- ${residue.bonds.length} 个键\n`);
  markdown.appendMarkdown(`- ${residue.impropers?.length || 0} 个improper二面角\n\n`);
  
  // 显示净电荷
  const totalCharge = residue.atoms.reduce((sum, a) => sum + a.charge, 0);
  markdown.appendMarkdown(`**净电荷**: ${totalCharge.toFixed(3)}\n\n`);
  
  // 显示结构图（ASCII 或 SVG）
  markdown.appendMarkdown(`**结构骨架**:\n`);
  markdown.appendCodeblock(generateAsciiStructure(residue), 'text');
  
  return new Hover(markdown);
}

function generateAsciiStructure(residue: Residue): string {
  // 简化的 ASCII 结构图
  // 例如 ALA:
  //     HN
  //     |
  // HB--CB--CA--C=O
  //         |   |
  //         HA  +N
  
  return `
    ${residue.atoms.find(a => a.name === 'HN')?.name || '  '}
     |
  ${residue.atoms.find(a => a.name.startsWith('HB'))?.name || '  '}--CB--CA--C=O
         |   |
         HA  +N
  `;
}
```

---

#### 场景 3: 键参数悬浮显示
**触发**: 鼠标悬停在 `.rtp [ bonds ]` 行上

```typescript
provideHover(
  document: TextDocument,
  position: Position
): Hover | null {
  const bond = parseBondLine(document, position);
  if (!bond) return null;
  
  const type1 = getAtomType(bond.atom1);
  const type2 = getAtomType(bond.atom2);
  const params = findBondParameters(type1, type2);
  
  if (!params) {
    return new Hover(
      new MarkdownString(`⚠ 未找到键 ${type1}-${type2} 的参数`)
    );
  }
  
  const markdown = new MarkdownString();
  markdown.appendMarkdown(`### 键: \`${bond.atom1}-${bond.atom2}\`\n\n`);
  markdown.appendMarkdown(`**原子类型**: ${type1} - ${type2}\n\n`);
  markdown.appendMarkdown(`**参数** (function type ${params.func}):\n`);
  markdown.appendMarkdown(`- 平衡键长 (b₀): ${params.b0.toFixed(4)} nm\n`);
  markdown.appendMarkdown(`- 力常数 (kb): ${params.kb.toFixed(1)} kJ·mol⁻¹·nm⁻²\n\n`);
  
  // 能量曲线可视化 (简化)
  markdown.appendMarkdown(`**势能函数**: V(b) = ½kb(b - b₀)²\n\n`);
  
  return new Hover(markdown);
}
```

---

### 4.3 诊断信息 (Diagnostics)

#### 诊断严重性层级
```typescript
enum ForcefieldDiagnosticSeverity {
  Error = 'error',      // 致命错误，会导致 pdb2gmx/grompp 失败
  Warning = 'warning',  // 警告，可能导致模拟不准确
  Info = 'info',        // 信息性提示
  Hint = 'hint'         // 优化建议
}
```

#### 诊断信息示例
```typescript
const diagnosticExamples = [
  // 错误级别
  {
    severity: DiagnosticSeverity.Error,
    code: 'ff-atom-type-undefined',
    message: "原子类型 'CT1X' 未在 atomtypes.atp 中定义",
    range: { line: 15, startChar: 10, endChar: 14 },
    source: 'gromacs-forcefield',
    quickFix: [
      { title: "替换为 'CT1'", edit: replaceText('CT1') },
      { title: "替换为 'CT2'", edit: replaceText('CT2') }
    ]
  },
  
  // 警告级别
  {
    severity: DiagnosticSeverity.Warning,
    code: 'ff-charge-imbalance',
    message: "残基 'ALA' 的总电荷 0.023 与期望值 0.0 偏差过大",
    range: { line: 50, startChar: 0, endChar: 5 },
    relatedInformation: [
      { location: { line: 52 }, message: "N: -0.47" },
      { location: { line: 54 }, message: "CA: 0.07" },
      // ... 所有原子的电荷
    ]
  },
  
  // 信息级别
  {
    severity: DiagnosticSeverity.Information,
    code: 'ff-bond-no-params',
    message: "未找到键 CA-CB (类型 CT1-CT3) 的参数，将使用默认值",
    range: { line: 62, startChar: 2, endChar: 8 }
  },
  
  // 提示级别
  {
    severity: DiagnosticSeverity.Hint,
    code: 'ff-missing-improper',
    message: "建议为平面基团添加 improper 定义",
    range: { line: 73, startChar: 0, endChar: 10 },
    quickFix: [
      { 
        title: "添加标准 improper",
        edit: insertText(' [ impropers ]\n  C  CA  +N  O\n', { line: 74 })
      }
    ]
  }
];
```

---

### 4.4 跳转定义 (Go to Definition)

#### 场景 1: 从原子类型跳转到定义
**触发**: Ctrl+Click 或 F12 在原子类型上

```typescript
provideDefinition(
  document: TextDocument,
  position: Position
): Location[] {
  const range = document.getWordRangeAtPosition(position);
  const atomType = document.getText(range);
  
  const locations: Location[] = [];
  
  // 1. atomtypes.atp 定义
  const atpLocation = findInAtomTypesAtp(atomType);
  if (atpLocation) {
    locations.push(atpLocation);
  }
  
  // 2. ffnonbonded.itp [ atomtypes ] 定义
  const nonbondedLocation = findInFfnonbonded(atomType);
  if (nonbondedLocation) {
    locations.push(nonbondedLocation);
  }
  
  return locations;
}
```

**效果**:
```
[ ALA ]
 [ atoms ]
   CA  CT1  0.07  2
       ^^^
       按 Ctrl+Click 跳转到:
       
       1. atomtypes.atp:21
          CT1  12.01100  ; aliphatic sp3 C for CH
          
       2. ffnonbonded.itp:31
          CT1  6  12.01100  0.07  A  0.405358916754  0.08368
```

---

#### 场景 2: 从残基引用跳转到 .rtp 定义
**触发**: 在 .top 文件的 `[ molecules ]` 部分

```typescript
provideDefinition(
  document: TextDocument,
  position: Position
): Location | null {
  // 检查是否在 [ molecules ] 部分
  const residueName = getResidueNameAtPosition(document, position);
  if (!residueName) return null;
  
  // 查找对应的 .rtp 文件
  const rtpFile = findRtpFileForResidue(residueName);
  if (!rtpFile) return null;
  
  // 定位到残基定义行 [ RESIDUE_NAME ]
  const residueLine = findResidueDefinitionLine(rtpFile, residueName);
  
  return new Location(
    Uri.file(rtpFile),
    new Position(residueLine, 0)
  );
}
```

---

#### 场景 3: 从 .rtp 键跳转到参数定义
**触发**: 在 `.rtp [ bonds ]` 行上按 F12

```typescript
provideDefinition(
  document: TextDocument,
  position: Position
): Location | null {
  const bond = parseBondLine(document, position);
  if (!bond) return null;
  
  const type1 = getAtomType(bond.atom1);
  const type2 = getAtomType(bond.atom2);
  
  // 在 ffbonded.itp 中查找参数
  const paramLocation = findBondParameterLocation(type1, type2);
  
  if (!paramLocation) {
    vscode.window.showInformationMessage(
      `未找到键 ${type1}-${type2} 的参数定义`
    );
    return null;
  }
  
  return paramLocation;
}
```

---

### 4.5 代码重构 (Refactoring)

#### 重构 1: 批量重命名原子类型
**场景**: 需要将某个原子类型替换为另一个（例如 CT1 → CT1x）

```typescript
class RenameAtomTypeRefactoring implements CodeActionProvider {
  provideCodeActions(
    document: TextDocument,
    range: Range
  ): CodeAction[] {
    const atomType = document.getText(range);
    
    return [{
      title: `重命名原子类型 '${atomType}'`,
      kind: CodeActionKind.Refactor,
      command: {
        command: 'gromacs.renameAtomType',
        arguments: [atomType]
      }
    }];
  }
  
  async executeRename(atomType: string): Promise<void> {
    const newType = await vscode.window.showInputBox({
      prompt: `将原子类型 '${atomType}' 重命名为:`,
      validateInput: (value) => {
        if (!atomTypesAtp.has(value)) {
          return `原子类型 '${value}' 不存在`;
        }
        return null;
      }
    });
    
    if (!newType) return;
    
    // 查找所有引用
    const references = await findAllAtomTypeReferences(atomType);
    
    // 批量替换
    const edit = new WorkspaceEdit();
    for (const ref of references) {
      edit.replace(ref.uri, ref.range, newType);
    }
    
    await vscode.workspace.applyEdit(edit);
    vscode.window.showInformationMessage(
      `已将 ${references.length} 处 '${atomType}' 替换为 '${newType}'`
    );
  }
}
```

---

#### 重构 2: 自动修正电荷守恒
**场景**: 残基电荷不平衡，提供快速修复

```typescript
class BalanceChargeCodeAction implements CodeActionProvider {
  provideCodeActions(
    document: TextDocument,
    range: Range,
    context: CodeActionContext
  ): CodeAction[] {
    const chargeDiagnostic = context.diagnostics.find(
      d => d.code === 'ff-charge-imbalance'
    );
    
    if (!chargeDiagnostic) return [];
    
    const residue = getCurrentResidue(document, range);
    const totalCharge = residue.atoms.reduce((sum, a) => sum + a.charge, 0);
    const deviation = totalCharge - getExpectedCharge(residue.name);
    
    return [{
      title: `均摊电荷偏差到所有原子 (Δ=${deviation.toFixed(3)})`,
      kind: CodeActionKind.QuickFix,
      diagnostics: [chargeDiagnostic],
      edit: distributeChargeDeviation(residue, deviation)
    }, {
      title: `调整主链原子电荷`,
      kind: CodeActionKind.QuickFix,
      diagnostics: [chargeDiagnostic],
      edit: adjustBackboneCharges(residue, deviation)
    }];
  }
}
```

---

## 5. 实现优先级与技术路线

### 5.1 实现阶段划分

#### Phase 1: 基础解析与验证 (MVP)
**目标**: 建立力场文件的语义理解基础

- [ ] 解析 `atomtypes.atp` 和 `ffnonbonded.itp`
- [ ] 解析 `.rtp` 文件 (残基拓扑)
- [ ] 实现原子类型存在性检查 (规则 1.1)
- [ ] 实现残基原子名称唯一性检查 (规则 2.2)
- [ ] 实现电荷守恒验证 (规则 3.1)
- [ ] 基础悬浮文档: 原子类型信息显示

**交付成果**: 用户在编辑 `.rtp` 文件时能看到基本的错误提示和类型信息

---

#### Phase 2: 键合参数验证与补全
**目标**: 完善参数完整性检查和智能补全

- [ ] 解析 `ffbonded.itp` (bonds, angles, dihedrals)
- [ ] 实现键参数存在性检查 (规则 4.1)
- [ ] 实现键长合理性检查 (规则 4.2)
- [ ] 原子类型补全 (场景 1)
- [ ] 原子名称补全 (场景 2)
- [ ] 键参数悬浮显示 (场景 3)
- [ ] 跳转定义: 原子类型 → atomtypes.atp/ffnonbonded.itp

**交付成果**: 完整的键合参数验证和智能编辑体验

---

#### Phase 3: 端基修饰与高级验证
**目标**: 支持复杂的力场修饰和跨文件引用

- [ ] 解析 `.tdb` 文件 (N/C端修饰)
- [ ] 解析 `.hdb` 文件 (氢原子构建)
- [ ] 实现端基修饰适用性验证 (规则 5.1, 5.2)
- [ ] 实现修饰后电荷验证 (规则 3.2)
- [ ] 跨残基引用合法性检查 (规则 2.4)
- [ ] 端基修饰补全 (场景 3)
- [ ] 残基名称悬浮显示 (场景 2)

**交付成果**: 完整的力场修饰支持，覆盖 pdb2gmx 的主要功能

---

#### Phase 4: 高级功能与优化
**目标**: 提升用户体验和性能

- [ ] 代码重构功能 (重命名原子类型、电荷平衡)
- [ ] 力场文件格式化 (对齐列、排序)
- [ ] 力场差异对比 (不同力场版本对比)
- [ ] 残基结构可视化 (ASCII/SVG 图形)
- [ ] 性能优化 (增量解析、缓存)
- [ ] 多力场支持 (AMBER, OPLS, GROMOS)

---

### 5.2 技术架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     VSCode Extension Layer                   │
│  - Language Server Protocol (LSP) client                    │
│  - UI commands, code actions, diagnostics                   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              Forcefield Language Server                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Parser Layer                             │  │
│  │  - AtomTypesAtpParser                                │  │
│  │  - FfnonbondedParser                                 │  │
│  │  - FfbondedParser                                    │  │
│  │  - RtpParser (residue topology)                      │  │
│  │  - TdbParser (terminus database)                     │  │
│  │  - HdbParser (hydrogen database)                     │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────┴───────────────────────────────────┐  │
│  │            Semantic Model                             │  │
│  │  - ForcefieldContext                                 │  │
│  │    ├── atomTypes: Map<string, AtomType>              │  │
│  │    ├── residues: Map<string, Residue>                │  │
│  │    ├── bondParams: Map<string, BondParams>           │  │
│  │    ├── angleParams: ...                              │  │
│  │    └── terminusMods: Map<string, TerminusMod>        │  │
│  │                                                       │  │
│  │  - ReferenceResolver                                 │  │
│  │    ├── resolveAtomType(name) → AtomType              │  │
│  │    ├── resolveBondParams(type1, type2) → Params     │  │
│  │    └── resolveTerminus(name) → TerminusMod           │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────┴───────────────────────────────────┐  │
│  │            Validation Engine                          │  │
│  │  - AtomTypeValidator (rules 1.x)                     │  │
│  │  - ResidueStructureValidator (rules 2.x)             │  │
│  │  - ChargeValidator (rules 3.x)                       │  │
│  │  - ParameterValidator (rules 4.x)                    │  │
│  │  - TerminusValidator (rules 5.x)                     │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────┴───────────────────────────────────┐  │
│  │         Language Feature Providers                    │  │
│  │  - ForcefieldCompletionProvider                      │  │
│  │  - ForcefieldHoverProvider                           │  │
│  │  - ForcefieldDefinitionProvider                      │  │
│  │  - ForcefieldDiagnosticsProvider                     │  │
│  │  - ForcefieldCodeActionProvider                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 数据结构定义

```typescript
// 原子类型
interface AtomType {
  name: string;           // CT1, NH1, ...
  atomicNumber: number;   // 6, 7, 8, ...
  mass: number;           // amu
  charge: number;         // 默认电荷
  ptype: 'A' | 'V' | 'S'; // atom, virtual, shell
  sigma: number;          // nm
  epsilon: number;        // kJ/mol
  description?: string;   // 描述文本
  source: FileLocation;   // 定义位置
}

// 残基定义
interface Residue {
  name: string;
  atoms: Atom[];
  bonds: Bond[];
  angles?: Angle[];
  dihedrals?: Dihedral[];
  impropers?: Improper[];
  cmaps?: CMap[];
  bondedTypes?: BondedTypes;
  source: FileLocation;
}

interface Atom {
  name: string;           // CA, N, HB1, ...
  type: string;           // CT1, NH1, ...
  charge: number;
  chargeGroup: number;
  location: Location;
}

interface Bond {
  atom1: string;
  atom2: string;
  location: Location;
}

// 键参数
interface BondParams {
  type1: string;
  type2: string;
  func: number;
  b0: number;    // 平衡键长 (nm)
  kb: number;    // 力常数 (kJ·mol⁻¹·nm⁻²)
  source: FileLocation;
}

// 端基修饰
interface TerminusModification {
  name: string;
  replacements: AtomReplacement[];
  additions: AtomAddition[];
  deletions: string[];  // 删除的原子名称
  extraBonds?: Bond[];
  extraImpropers?: Improper[];
  source: FileLocation;
}

interface AtomReplacement {
  oldAtomName: string;
  newAtomName: string;
  newAtomType: string;
  newMass: number;
  newCharge: number;
}

interface AtomAddition {
  count: number;
  constructionType: number;
  names: string[];
  connectedAtom: string;
  geometryAtoms: string[];
  atomType: string;
  mass: number;
  charge: number;
  chargeGroup: number;
}

// 力场上下文 (全局单例)
class ForcefieldContext {
  atomTypes: Map<string, AtomType>;
  residues: Map<string, Residue>;
  bondParams: Map<string, BondParams>;      // "CT1-CT2" → params
  angleParams: Map<string, AngleParams>;    // "CT1-CT2-CT3" → params
  dihedralParams: Map<string, DihedralParams>;
  terminusMods: Map<string, TerminusModification>;
  
  // 引用解析
  resolveAtomType(name: string): AtomType | null;
  resolveBondParams(type1: string, type2: string): BondParams | null;
  resolveResidue(name: string): Residue | null;
  
  // 缓存管理
  invalidate(fileUri: Uri): void;
  rebuild(): Promise<void>;
}
```

---

## 6. 测试策略

### 6.1 单元测试

```typescript
describe('AtomTypeValidator', () => {
  test('检测未定义的原子类型', () => {
    const validator = new AtomTypeValidator(forcefieldContext);
    const diagnostic = validator.validateAtomTypeExists('CT1X', location);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic.code).toBe('ff-atom-type-undefined');
  });
  
  test('通过已定义的原子类型', () => {
    const diagnostic = validator.validateAtomTypeExists('CT1', location);
    expect(diagnostic).toBeNull();
  });
});

describe('ChargeValidator', () => {
  test('检测电荷不平衡', () => {
    const residue = parseResidue(`
      [ ALA ]
       [ atoms ]
         N   NH1  -0.47  0
         CA  CT1   0.10  1  ; 错误: 应为 0.07
         C   C     0.51  2
         O   O    -0.51  3
    `);
    
    const diagnostic = chargeValidator.validateResidueCharge(residue);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic.code).toBe('ff-charge-imbalance');
  });
});
```

### 6.2 集成测试

```typescript
describe('Forcefield Language Server Integration', () => {
  test('完整的 .rtp 文件验证', async () => {
    const document = await openTestDocument('aminoacids.rtp');
    const diagnostics = await languageServer.validateDocument(document);
    
    // 不应有致命错误
    const errors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
    expect(errors).toHaveLength(0);
  });
  
  test('原子类型补全', async () => {
    const document = await openTestDocument('test.rtp');
    const position = new Position(5, 10);  // 在原子类型位置
    const completions = await languageServer.provideCompletionItems(document, position);
    
    expect(completions).toContainEqual(
      expect.objectContaining({ label: 'CT1' })
    );
  });
});
```

### 6.3 回归测试

使用真实力场文件作为测试套件:
- CHARMM27
- AMBER99SB-ILDN
- OPLS-AA/L
- GROMOS54A7

确保解析器能正确处理所有变体。

---

## 7. 文档与用户指南

### 7.1 错误代码速查表

| 代码 | 严重性 | 含义 | 修复建议 |
|------|-------|------|---------|
| `ff-atom-type-undefined` | Error | 原子类型未定义 | 检查拼写，或在 atomtypes.atp 中添加 |
| `ff-atom-type-no-params` | Warning | 缺少非键参数 | 在 ffnonbonded.itp 中添加参数 |
| `ff-residue-no-atoms` | Error | 残基缺少原子定义 | 添加 [ atoms ] 部分 |
| `ff-duplicate-atom-name` | Error | 重复的原子名称 | 重命名冲突的原子 |
| `ff-bond-undefined-atom` | Error | 键引用了未定义的原子 | 检查原子名称拼写 |
| `ff-charge-imbalance` | Error | 电荷不守恒 | 调整原子电荷使总和符合预期 |
| `ff-bond-no-params` | Warning | 缺少键参数 | 在 ffbonded.itp 中添加参数 |
| `ff-terminus-incompatible` | Warning | 端基修饰不适用 | 使用推荐的修饰类型 |

### 7.2 最佳实践

1. **电荷分配**: 使用量子化学计算 (如 CHARMM CGenFF) 确定电荷
2. **参数来源**: 优先使用力场原生参数，避免混用不同力场
3. **命名规范**: 遵循力场的原子类型命名惯例
4. **测试流程**: 新残基定义后，先用 pdb2gmx 测试，再用 grompp 验证
5. **版本控制**: 修改后的力场文件应纳入版本控制

---

## 8. 总结与展望

本文档详细分析了 GROMACS 力场文件的语义结构，识别了关键的引用关系，设计了全面的验证规则，并提出了智能编辑功能的实现方案。

**核心价值**:
- 提前发现力场定义错误，避免运行时失败
- 提供上下文感知的智能补全和文档
- 通过跳转定义和引用查找加速力场开发
- 降低力场修改的学习曲线

**未来扩展方向**:
- 支持更多力场格式 (AMBER, OPLS, GROMOS)
- 力场参数优化工具集成
- 与量子化学工具 (Gaussian, ORCA) 的接口
- 力场兼容性分析 (跨力场迁移)
- 机器学习辅助的参数预测

通过系统化的语义分析和验证机制，本扩展将大幅提升 GROMACS 力场开发的效率和可靠性。
