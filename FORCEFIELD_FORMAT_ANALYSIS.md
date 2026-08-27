# GROMACS 力场文件格式技术分析报告

> 基于 CHARMM27 力场 (`charmm27_tnc.ff`) 的深度分析
> 生成日期：2026-08-27

## 执行摘要

本报告详细分析了 GROMACS 力场文件格式，涵盖 7 种主要文件类型及其相互依赖关系、语法规则和验证需求。

---

## 1. 文件类型分析

### 1.1 `forcefield.itp` - 力场入口文件

**用途**：定义力场参数并包含所有其他拓扑文件的主入口点。

**结构**：
```
[ defaults ]
; nbfunc  comb-rule  gen-pairs  fudgeLJ  fudgeQQ
1         2          yes        1.0      1.0

#include "ffnonbonded.itp"
#include "ffbonded.itp"
#include "gb.itp"
#include "cmap.itp"
```

**关键组件**：
- **注释**：以 `;` 或 `*` 开头的行
- **预处理指令**：`#define`, `#include`, `#ifdef`, `#endif`
- **段标记**：`[ section_name ]`
- **defaults 段**：定义全局力场参数（5列）
  - 列1：非键函数类型（1 = LJ）
  - 列2：组合规则（2 = Lorentz-Berthelot）
  - 列3：生成对（yes/no）
  - 列4：LJ 1-4 缩放因子
  - 列5：库仑 1-4 缩放因子

**验证点**：
- 所有 `#include` 路径必须解析到存在的文件
- 段标记必须是有效的 GROMACS 拓扑段
- 组合规则必须与原子类型参数一致

---

### 1.2 `atomtypes.atp` - 原子类型定义

**用途**：简单的原子类型到质量的映射（2列格式）。

**格式**：
```
H        1.00800 ;  polar H
HC       1.00800 ;  N-ter H
HA       1.00800 ;  nonpolar H
C        12.01100 ; carbonyl C, peptide backbone
CT1      12.01100 ; aliphatic sp3 C for CH
```

**结构**：
- 列1：原子类型名称（字母数字，区分大小写）
- 列2：原子质量（浮点数）
- 可选：`;` 后的注释

**验证点**：
- 原子类型名称必须唯一
- 质量必须是正浮点数
- `.rtp` 中引用的每个原子类型必须在此定义
- 常见类型：H 变体 (H, HC, HA, HB, HP, HR1-3, HS, HT)、C 变体 (C, CA, CT1-3, CP1-3, CPH1-2)、N 变体 (N, NH1-3, NP, NR1-3, NY)、O 变体 (O, OB, OC, OH1, OT)、S、P

---

### 1.3 `*.rtp` - 残基拓扑数据库

**用途**：定义完整的残基模板，包括原子、键、角、二面角、improper 和 CMAP 校正。

**结构**：
```
[ bondedtypes ]
; bonds  angles  dihedrals  impropers all_dihedrals nrexcl HH14 RemoveDih
     1       5          9        2        1           3      1     0

[ RESIDUE_NAME ]
 [ atoms ]
    atom_name  atom_type  charge  charge_group
 [ bonds ]
    atom1  atom2
 [ impropers ]
    atom1  atom2  atom3  atom4
 [ cmap ]
    atom1  atom2  atom3  atom4  atom5
```

**Bondedtypes 头**（适用于所有残基）：
- 列1：键函数类型（1 = 谐振）
- 列2：角函数类型（5 = Urey-Bradley）
- 列3：正常二面角类型（9 = 多重傅里叶）
- 列4：improper 二面角类型（2 = 谐振）
- 列5：生成所有二面角（1 = 是，0 = 仅重原子）
- 列6：排除邻居数量（3 标准）
- 列7：生成 1-4 H-H 相互作用（1 = 是）
- 列8：移除 improper 键上的正常二面角（0 = 否）

**Atoms 段**：
- 4列：`atom_name atom_type charge charge_group`
- 原子名：残基内部命名（如 CA, N, C, O, CB）
- 原子类型：必须存在于 `atomtypes.atp`
- 电荷：部分电荷（浮点数，通常 -2.0 到 +2.0）
- 电荷组：电荷组的整数标识符

**Bonds 段**：
- 2+ 列：`atom1 atom2 [atom3...]`
- 特殊符号：
  - `+N`：下一个（+1）残基中的原子
  - `-C`：前一个（-1）残基中的原子
  - 用于肽键骨架连接

**Impropers 段**：
- 4列：`atom1 atom2 atom3 atom4`
- 强制平面性（如肽键、芳香环）
- 典型模式：
  - 骨架：`N -C CA HN`（NH 平面性）
  - 骨架：`C CA +N O`（CO 平面性）
  - 侧链：芳香/酰胺基团

**CMAP 段**（CHARMM 特定）：
- 5列：`atom1 atom2 atom3 atom4 atom5`
- 骨架 φ/ψ 二面角的校正图
- 标准：`-C N CA C +N`（骨架 CMAP）

**验证点**：
- 所有原子类型必须存在于 `atomtypes.atp`
- 引用的原子（±残基）必须是有效的原子名
- 每个残基的总电荷应匹配预期（中性为 0，带电为 ±1）
- 键必须引用 `[ atoms ]` 中定义的原子
- Impropers 通常涉及 4 个共面原子

---

### 1.4 `*.tdb` - 末端数据库

**用途**：定义 N 端和 C 端对残基的修饰。

**文件命名**：
- `*.n.tdb`：N 端修饰
- `*.c.tdb`：C 端修饰

**结构**：
```
[ TERMINUS_NAME ]
[ replace ]
 atom_old  atom_new  type_new  mass_new  charge_new
[ add ]
 nh  type  name  ref1  ref2  ref3
     atom_type  mass  charge  charge_group
[ delete ]
 atom_name
[ bonds ]
 atom1  atom2
[ impropers ]
 atom1  atom2  atom3  atom4
```

**Replace 段**：
- 修改现有原子的属性
- 5列：`atom_old atom_new type_new mass_new charge_new`
- 更改原子类型、质量和/或电荷

**Add 段**：
- 向末端添加新原子
- 行1：`nh type name ref1 ref2 ref3`
  - `nh`：要添加的氢数量
  - `type`：生成类型（1-4，依赖几何）
  - `name`：新原子的基本名称
  - `ref1-3`：定位的参考原子
- 行2：`atom_type mass charge charge_group`
- 类型代码：
  - 1：单个原子，特定几何
  - 2：两个原子（如 NH2 氢）
  - 3：三个原子（如 CH3, NH3）
  - 4：相对于 3 个参考原子定位

**Delete 段**：
- 从残基中移除原子
- 每行一个原子名

**示例**：
- **N 端 NH3+**：替换 N 类型，添加 3 个 HC 氢，删除原始 HN
- **C 端 COO-**：替换 C 和 O 类型，添加第三个氧（OT）
- **C 端 COOH**：向羧基氧添加羟基 H

**验证点**：
- 被替换的原子必须存在于父 `.rtp` 残基中
- 添加的原子类型必须存在于 `atomtypes.atp`
- 定位的参考原子必须在替换/删除后存在
- 电荷平衡：末端电荷应在物理上有意义

---

### 1.5 `*.hdb` - 氢数据库

**用途**：定义残基上自动氢放置的规则。

**格式**：
```
RESIDUE_NAME  num_entries
nh  type  name  ref1  ref2  ref3  [ref4]
```

**结构**：
- 头：`RESIDUE_NAME num_entries`
- 每个条目：氢添加规则
  - `nh`：要添加的氢数量
  - `type`：几何类型（1-11）
  - `name`：氢名称模式（如 HB, HG1）
  - `ref1-3`：定位的参考原子
  - `ref4`：可选的第 4 个参考

**几何类型**：
- `1`：1个H，特定几何（如 OH, NH）
- `2`：2个H，特定角度（如 NH2, -CH2-）
- `3`：3个H，四面体（如 CH3, NH3+）
- `4`：芳香 H
- `5`：1个H，improper/4-ref 定位
- `6`：sp3 碳上的 2个H
- `7`：水上的 2个H
- `10`：水上的 3个H（TIP4P/5P）
- `11`：水上的 4个H

**示例**：
```
ALA     3
1	1	HN	N	-C	CA          ; 骨架 NH
1	5	HA	CA	N	C	CB      ; alpha H
3	4	HB	CB	CA	N           ; 甲基 CH3
```

**验证点**：
- 残基名必须匹配 `.rtp` 定义
- 参考原子必须存在于残基中
- 氢名称应遵循约定（H + 父原子）
- 几何类型必须有效（1-11）

---

### 1.6 `*.itp` - 包含拓扑文件

**用途**：包含参数或分子定义的模块化拓扑文件。

**常见段**：

**`[ atomtypes ]`**（在 `ffnonbonded.itp` 中）：
```
;name  at.num  mass  charge  ptype  sigma  epsilon
C      6       12.011  0.51   A      0.3564  0.4602
```
- 7列：name, atomic_number, mass, charge, particle_type, sigma(LJ), epsilon(LJ)
- `ptype`：A（原子）、D（dummy）、S（shell）、V（virtual）
- Lennard-Jones 12-6 势的参数

**`[ bondtypes ]`**（在 `ffbonded.itp` 中）：
```
; i    j    func  b0      kb
C      N    1     0.1335  502080.0
```
- 5列：atom_type1, atom_type2, function_type, b0(长度), kb(力常数)
- `func=1`：谐振键

**`[ angletypes ]`**（在 `ffbonded.itp` 中）：
```
; i    j    k    func  th0     cth       ub0     cub
C      N    CA   5     120.00  334.72    0.2416  29288.0
```
- 函数类型 5：Urey-Bradley（角 + 1-3 距离约束）
- 列5-6：angle_0, force_constant_angle
- 列7-8：ub_distance_0, force_constant_ub

**`[ dihedraltypes ]`**（在 `ffbonded.itp` 中）：
```
; i    j    k    l    func  phase  kd      pn
C      N    CA   C    9     180.0  1.6736  1
```
- 函数类型 9：多重正常二面角（傅里叶级数）
- 函数类型 2：Improper 二面角（谐振）

**`[ cmaptypes ]`**（在 `cmap.itp` 中）：
- CHARMM 校正图（φ/ψ 骨架的 2D 网格）
- 网格大小通常 24×24

**`[ moleculetype ]`**（如在 `ions.itp`, `tip3p.itp` 中）：
```
[ moleculetype ]
; molname  nrexcl
SOL        2

[ atoms ]
; id  at_type  res_nr  residu_name  at_name  cg_nr  charge
1     OWT3     1       SOL          OW       1      -0.834
2     HWT3     1       SOL          HW1      1       0.417
3     HWT3     1       SOL          HW2      1       0.417
```

**验证点**：
- `[ bondtypes ]`、`[ angletypes ]` 中的原子类型必须存在于 `[ atomtypes ]`
- 函数类型必须是有效的 GROMACS 类型
- 参数必须有正确的单位（nm, kJ/mol 等）
- 分子定义必须自洽

---

### 1.7 辅助文件

**`*.arn`（原子重命名）**：
```
; residue  gromacs  forcefield
*          H        HN
```
- 将标准名称映射到力场特定名称
- 通配符 `*` 适用于所有残基

**`*.r2b`（残基到构建块）**：
```
;GMX   Force-field
HISD   HSD
HISE   HSE
HISH   HSP
```
- 将替代残基名称映射到规范 `.rtp` 名称
- 常见于质子化状态（HIS, ASP, GLU, LYS）

**`*.vsd`（虚拟位点数据）**：
- 定义虚拟位点构造（几何）

**`watermodels.dat`**：
```
tip3p   TIP3P   TIP 3-point, recommended
tip4p   TIP4P   TIP 4-point
```
- 制表符分隔：file_prefix, display_name, description
- pdb2gmx 用于水模型选择

---

## 2. 文件相互依赖关系

### 2.1 依赖图

```
forcefield.itp (入口点)
├── ffnonbonded.itp
│   └── [ atomtypes ] → atomtypes.atp (参考)
├── ffbonded.itp
│   ├── [ bondtypes ] → 使用 atomtypes 中的原子类型
│   ├── [ angletypes ] → 使用原子类型
│   └── [ dihedraltypes ] → 使用原子类型
├── cmap.itp
│   └── [ cmaptypes ] → 骨架校正网格
└── gb.itp
    └── 广义玻恩参数

残基构建（pdb2gmx）：
aminoacids.rtp
├── [ atoms ] → atomtypes.atp 中的原子类型
├── [ bonds ] → ffbonded.itp [ bondtypes ] 中的参数
└── [ impropers ] → ffbonded.itp 中的参数

末端修饰：
aminoacids.n.tdb → 修改 .rtp 残基（N端）
aminoacids.c.tdb → 修改 .rtp 残基（C端）

氢添加：
aminoacids.hdb → 向 .rtp 残基添加氢

名称映射：
aminoacids.arn → 原子名称翻译
aminoacids.r2b → 残基名称翻译
```

### 2.2 解析顺序（pdb2gmx）

1. 读取力场入口点（`forcefield.itp`）
2. 加载原子类型（`atomtypes.atp`）
3. 加载键合参数（`ffbonded.itp`）
4. 加载残基模板（`.rtp`）
5. 应用残基名称映射（`.r2b`）
6. 选择末端类型（`.n.tdb`, `.c.tdb`）
7. 添加氢（`.hdb`）
8. 应用原子名称映射（`.arn`）
9. 从模板生成键/角/二面角
10. 从参数文件查找参数

---

## 3. 语义验证需求

### 3.1 类型一致性

**原子类型引用**：
- `.rtp [ atoms ]` 中的每个原子类型必须存在于 `atomtypes.atp`
- `[ bondtypes ]` 中的每个原子类型对必须存在于 `[ atomtypes ]`
- 错误模式：`原子类型 X 在 atomtypes.atp 中未找到`

**残基名称引用**：
- `.tdb` 末端名称必须对应于 `.rtp` 中的残基
- `.hdb` 残基名称必须匹配 `.rtp` 条目
- `.r2b` 映射必须指向有效的 `.rtp` 残基

### 3.2 结构一致性

**残基内键**：
- `[ bonds ]` 中的所有原子必须在 `[ atoms ]` 中定义
- 残基间键（`-C`、`+N`）必须引用有效的邻居原子

**电荷平衡**：
- 部分电荷之和应匹配残基总电荷
- 容差：通常 ±0.001 e
- 示例：中性 ALA sum = 0.0，质子化 LYS sum = +1.0

**缺失参数**：
- 残基中的每个键必须有对应的 `[ bondtypes ]` 条目
- 生成的角必须有 `[ angletypes ]` 参数
- 缺失参数导致模拟设置失败

### 3.3 物理有效性

**电荷范围**：
- 部分电荷通常 -2.0 到 +2.0
- 极端值可能表示错误

**质量值**：
- 必须匹配元素（C ≈ 12, N ≈ 14, O ≈ 16, H ≈ 1）
- 虚拟位点可以有 mass = 0

**键长**：
- 典型范围（nm）：
  - C-C: 0.14-0.16
  - C-N: 0.13-0.15
  - C-O: 0.12-0.14
  - C-H: 0.10-0.11
  - O-H: 0.095-0.10

**角度**：
- 范围：0-180 度
- 常见：四面体 ≈ 109.5°，平面 ≈ 120°，线性 ≈ 180°

### 3.4 跨文件验证

**末端修饰**：
- `[ replace ]` 中引用的原子必须存在于基本残基中
- `[ add ]` 中的原子引用列表必须在删除后存在
- 最终原子集必须在化学上有效

**氢数据库**：
- 参考原子必须存在于残基中（末端修饰后）
- 氢数量 + 几何类型必须兼容

---

## 4. 常见语法模式

### 4.1 注释语法

- **行注释**：`;` 在行的任何位置
- **块注释**：多行以 `;` 或 `*` 开头
- **内联注释**：空格 + `;` + 文本

### 4.2 预处理指令

```cpp
#define _FF_CHARMM
#ifdef FLEXIBLE
  ...
#else
  ...
#endif
#include "filename.itp"
```

### 4.3 段标记

- 格式：`[ section_name ]`
- 区分大小写
- 括号内没有前导/尾随空格
- 常见段：`defaults`, `atomtypes`, `bondtypes`, `angletypes`, `dihedraltypes`, `moleculetype`, `atoms`, `bonds`, `angles`, `dihedrals`, `impropers`, `cmap`

### 4.4 数据格式

**空格**：
- 字段由空格分隔（空格/制表符）
- 多个空格视为单个分隔符
- 忽略前导/尾随空格

**数值**：
- 整数：`0`, `1`, `-1`, `12`
- 浮点数：`0.5`, `-0.47`, `1.008`, `0.09572`
- 科学计数法：`1.0e-5`, `3.14159e+2`

**字符串值**：
- 未引用的字母数字标记
- 区分大小写
- 没有嵌入空格（使用下划线）

---

## 5. 文件格式汇总表

| 文件类型 | 扩展名 | 主要内容 | 关键段 | 引用 |
|---------|--------|---------|--------|------|
| 入口点 | `.itp` | 力场设置 | `defaults` | 所有其他文件 |
| 原子类型 | `.atp` | 类型→质量映射 | N/A（2列） | 被所有引用 |
| 残基模板 | `.rtp` | 残基定义 | `atoms`, `bonds`, `impropers`, `cmap` | `.atp` 中的原子类型 |
| 末端数据库 | `.tdb` | 末端修饰 | `replace`, `add`, `delete` | `.rtp` 中的残基 |
| 氢数据库 | `.hdb` | H 放置规则 | N/A（结构化行） | `.rtp` 中的残基 |
| 参数 | `.itp` | 键合/非键参数 | `bondtypes`, `angletypes`, `dihedraltypes` | 原子类型 |
| 分子 | `.itp` | 完整分子 | `moleculetype`, `atoms`, `bonds` | 原子类型 |

---

## 6. 实现建议（VS Code 扩展）

### 6.1 语言 ID

建议添加：
- `gromacs_rtp_file`：残基拓扑（`.rtp`）
- `gromacs_tdb_file`：末端数据库（`.tdb`）
- `gromacs_atp_file`：原子类型（`.atp`）
- `gromacs_hdb_file`：氢数据库（`.hdb`）
- `gromacs_ff_itp_file`：力场 ITP（区分分子 ITP）

### 6.2 Provider 功能

**Completion Provider**：
- 原子类型：从 `atomtypes.atp` 上下文感知
- 残基名称：从力场中的 `.rtp` 文件
- 原子名称：特定于当前残基的上下文
- 段名称：有效的 GROMACS 段

**Hover Provider**：
- 原子类型：显示质量、LJ 参数
- 残基：显示电荷、原子数
- 原子：显示类型、电荷、质量
- 参数：显示函数类型、单位

**Diagnostics**：
- 未定义的原子类型引用
- 缺失的键合参数
- 电荷不平衡警告
- 无效的几何引用
- 参数值超出范围

**Definition Provider**：
- 原子类型 → `atomtypes.atp` 定义
- 残基名称 → `.rtp` 条目
- 跳转到键合文件中的参数定义

**Reference Provider**：
- 查找原子类型的所有使用
- 查找使用特定原子类型的残基

### 6.3 验证架构

**多文件上下文**：
- 激活时解析力场目录
- 从 `.atp` 构建原子类型注册表
- 从 `.rtp` 文件索引所有残基
- 从 `.itp` 文件缓存参数查找

**验证层**：
1. **语法验证**：格式良好的段、有效的标记
2. **本地语义**：文件内引用（键中的原子）
3. **跨文件语义**：原子类型、残基名称
4. **参数验证**：所有键/角都有参数
5. **物理验证**：电荷、质量、范围

---

这份综合分析为在 VS Code 扩展中实现 GROMACS 力场文件的完整语言支持提供了基础，包括语法高亮、智能补全、诊断和语义验证。
