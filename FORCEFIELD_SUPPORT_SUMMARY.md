# GROMACS 力场文件支持功能总结

本文档总结了新增的 GROMACS 力场文件智能支持功能。

## 🎯 功能概述

为 GROMACS 力场文件（RTP、ITP、TDB、HDB、ATP）和拓扑文件（TOP、ITP）提供了完整的 IDE 支持，包括：
- ✅ 语法高亮
- ✅ 智能补全
- ✅ 悬浮提示
- ✅ 错误诊断
- ✅ 跨文件引用

---

## 📁 支持的文件类型

### 1. **RTP 文件** (`aminoacids.rtp`)
残基拓扑数据库文件

**功能：**
- ✅ 原子类型补全（在 `[ atoms ]` 段）
- ✅ 原子类型悬浮提示（显示质量、描述等）
- ✅ 未定义原子类型诊断
- ✅ 语法高亮（段标记、原子类型、原子名称等）

**示例：**
```
[ GLY ]
 [ atoms ]
    N    NH1    -0.47   0
    H    H       0.31   1
    CA   CT2    -0.02   2
```

---

### 2. **ITP 力场参数文件**
仅针对以下四个特定文件：
- `ffbonded.itp` - 键参数
- `ffnonbonded.itp` - 非键参数
- `ffnabonded.itp` - 核酸键参数
- `ffnanonbonded.itp` - 核酸非键参数

**功能：**
- ✅ 语法高亮（段标记、原子类型、数值等）
- ✅ 原子类型补全
- ✅ 原子类型悬浮提示
- ✅ 未定义原子类型诊断
- ✅ 跳过预处理指令（`#ifdef`、`#else`、`#endif`）

---

### 3. **TDB 文件** (`aminoacids.c.tdb`, `aminoacids.n.tdb`)
末端数据库文件

**功能：**
- ✅ 原子类型补全（在 `[ add ]` 段的第二行）
- ✅ 未定义原子类型诊断
- ✅ 语法高亮（段标记、原子类型等）
- ✅ 智能识别缩进行（区分几何定义行和原子类型行）

**示例：**
```
[ COO- ]
[ add ]
2  8  OT  C   CA  N
    OC  15.9994  -0.67  -1
```

---

### 4. **HDB 文件** (`aminoacids.hdb`)
氢原子数据库文件

**功能：**
- ✅ 残基名称补全
- ✅ 氢原子条目数量验证
- ✅ 几何类型检查（1-8）
- ✅ 氢原子数检查（1-4）
- ✅ 语法高亮

**示例：**
```
ALA      3
1  1  HN   N    -C   CA
1  5  HA   CA   N    C    CB
3  4  HB   CB   CA   N
```

---

### 5. **ATP 文件** (`atomtypes.atp`)
原子类型定义文件

**功能：**
- ✅ 原子类型悬浮提示（显示质量）
- ✅ 语法高亮

---

### 6. **TOP/ITP 拓扑文件**
通用拓扑文件和包含文件

**核心功能：**
- ✅ **智能力场查找**：
  - 从 `#include "xxx.ff/forcefield.itp"` 自动识别力场
  - 相对路径查找（相对于 TOP/ITP 文件）
  - 系统路径查找（通过 `gmx -version` 获取 GROMACS 数据目录）
  - ITP 文件自动查找同目录的 `topol.top` 或 `forcefield.itp`

- ✅ **原子序号悬浮提示**：
  - 在 `[ bonds ]`、`[ angles ]`、`[ dihedrals ]` 等段中
  - 悬停在原子序号上，显示原子详细信息
  - 显示：残基名称、原子名称、原子类型、电荷、质量

- ✅ **原子类型补全和诊断**：
  - 在 `[ atoms ]` 段提供原子类型补全
  - 检查未定义的原子类型
  - 当 GROMACS 未安装时自动屏蔽诊断（避免误报）

- ✅ **段标记悬浮提示**：
  - `[ atoms ]`、`[ bonds ]`、`[ angles ]` 等段的格式说明

**示例：**
```top
#include "charmm27.ff/forcefield.itp"

[ moleculetype ]
Protein_chain_A     3

[ atoms ]
;   nr  type  resnr residue  atom  cgnr  charge  mass
     1   NH3      1    SER      N     1    -0.3   14.0027
     2    HC      1    SER     H1     2    0.33    1.008

[ bonds ]
;  ai   aj  func
    1    2     1    ; 悬停显示：原子 #1 (SER N) 和 原子 #2 (SER H1)
```

---

## 🔍 力场索引系统

### 核心组件

1. **ForceFieldParser**
   - 解析力场目录中的所有相关文件
   - 构建统一的力场索引

2. **ForceFieldIndexManager**
   - 缓存力场索引
   - 智能查找力场目录
   - 支持系统 GROMACS 目录

3. **TopologyParser**
   - 解析 TOP/ITP 文件结构
   - 提取 `#include` 指令
   - 识别各种段类型

### 力场查找策略

**对于 TOP 文件：**
1. 检查 `#include` 中是否引用了力场（如 `xxx.ff/forcefield.itp`）
2. 尝试相对路径查找
3. 尝试系统 GROMACS 目录（通过 `gmx -version` 获取）

**对于 ITP 文件：**
1. 检查同目录是否有 `forcefield.itp`
2. 检查同目录是否有 `topol.top`，并从中查找力场
3. 向上查找包含 `forcefield.itp` 的目录（最多 5 层）

**系统 GROMACS 目录：**
- 执行 `gmx -version` 获取 `Data prefix`
- 力场目录为：`{Data prefix}/share/gromacs/top/`

---

## 🛡️ 错误处理与容错

### 1. GROMACS 未安装
- 当执行 `gmx` 命令失败时，自动屏蔽语法检查
- 避免大量"未定义原子类型"的误报
- 悬浮提示和补全功能仍可用（基于本地文件）

### 2. 引用的力场不存在
- 如果用户明确引用了力场但找不到，仍然报错
- 区分"GROMACS 未安装"和"力场不存在"

### 3. 预处理指令
- 自动跳过 `#ifdef`、`#else`、`#endif` 等预处理指令
- 避免诊断器误报

---

## 📊 性能优化

1. **索引缓存**：力场索引构建后缓存，避免重复解析
2. **懒加载**：只在需要时才构建索引
3. **文件监听**：文件变化时自动使索引失效
4. **异步处理**：所有文件操作都是异步的

---

## 🎨 语法高亮特性

### ITP 力场参数文件
- 段标记：`[ atomtypes ]`、`[ bondtypes ]` 等
- 原子类型：高亮显示
- 预处理指令：`#ifdef`、`#include` 等
- 数值：整数、浮点数

### TDB 文件
- 段标记：`[ replace ]`、`[ add ]`、`[ impropers ]` 等
- 原子类型：高亮显示
- 原子名称：区分显示

### HDB 文件
- 残基名称：高亮显示
- 氢原子数量：数值高亮
- 几何类型：数值高亮

---

## 🚀 使用示例

### 1. 编辑 RTP 文件
```rtp
[ GLY ]
 [ atoms ]
    N    NH1    -0.47   0    ; 输入 "N" 后，自动补全原子类型
    H    H       0.31   1    ; 悬停在 "H" 上，显示原子类型信息
```

### 2. 编辑 TOP 文件
```top
#include "charmm27.ff/forcefield.itp"  ; 自动识别力场

[ atoms ]
     1   NH3      1    SER      N     1    -0.3   14.0027
     ; 输入原子类型时自动补全

[ bonds ]
    1    2     1    ; 悬停在 "1" 上，显示：原子 #1 (SER N, NH3, -0.3 e)
```

### 3. 编辑 TDB 文件
```
[ COO- ]
[ add ]
2  8  OT  C   CA  N
    OC  15.9994  -0.67  -1    ; 悬停在 "OC" 上，显示原子类型信息
```

---

## 📝 技术实现细节

### Providers 架构
- **CompletionProvider**：智能补全
- **HoverProvider**：悬浮提示
- **DiagnosticProvider**：错误诊断

### 文件解析器
- **RtpParser**：解析 RTP 文件
- **ItpParser**：解析 ITP 力场参数文件
- **TopologyParser**：解析 TOP/ITP 拓扑文件
- **ForceFieldParser**：统一力场解析

### 索引结构
```typescript
interface ForceFieldIndex {
  atomTypes: Map<string, AtomType>;
  residues: Map<string, Residue>;
  // ...
}
```

---

## 🔧 配置与扩展

### 未来可扩展功能
- [ ] 更多段类型的智能支持
- [ ] 键、角、二面角参数的补全
- [ ] 力场文件的重构工具
- [ ] 力场文件的格式化工具
- [ ] 力场兼容性检查

---

## 📚 相关文件

### 核心模块
- `src/languages/forcefield/index.ts` - 力场支持入口
- `src/languages/forcefield/forceFieldIndexManager.ts` - 索引管理器

### 解析器
- `src/parsers/forcefield/forceFieldParser.ts` - 力场解析器
- `src/parsers/forcefield/rtpParser.ts` - RTP 解析器
- `src/parsers/forcefield/itpParser.ts` - ITP 解析器
- `src/parsers/forcefield/topologyParser.ts` - TOP 解析器

### Providers
- `src/providers/forcefield/rtpCompletionProvider.ts`
- `src/providers/forcefield/rtpHoverProvider.ts`
- `src/providers/forcefield/rtpDiagnosticProvider.ts`
- `src/providers/forcefield/itpCompletionProvider.ts`
- `src/providers/forcefield/itpHoverProvider.ts`
- `src/providers/forcefield/itpDiagnosticProvider.ts`
- `src/providers/forcefield/tdbCompletionProvider.ts`
- `src/providers/forcefield/tdbDiagnosticProvider.ts`
- `src/providers/forcefield/hdbCompletionProvider.ts`
- `src/providers/forcefield/hdbDiagnosticProvider.ts`
- `src/providers/forcefield/topologyCompletionProvider.ts`
- `src/providers/forcefield/topologyHoverProvider.ts`
- `src/providers/forcefield/topologyDiagnosticProvider.ts`

### 语法文件
- `syntaxes/itp/itp-forcefield.tmLanguage.json` - ITP 语法高亮
- `syntaxes/itp/itp-language-configuration.json` - ITP 语言配置

---

## ✨ 总结

本次更新为 GROMACS Helper 插件添加了完整的力场文件支持，极大提升了编辑力场文件的体验。主要亮点：

1. **智能化**：自动识别力场、智能补全、错误诊断
2. **全面性**：支持所有常见力场文件类型
3. **容错性**：GROMACS 未安装时仍能正常工作
4. **高性能**：索引缓存、懒加载、异步处理

这些功能使得编辑 GROMACS 力场文件就像使用现代 IDE 编写代码一样便捷！
