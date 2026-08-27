# GROMACS 力场文件支持功能 - 开发总结

> 完整的技术分析、实现计划和已完成的基础工作
> 生成日期：2026-08-27

---

## 📚 已完成的文档和分析

### 1. **FORCEFIELD_FORMAT_ANALYSIS.md** - 文件格式技术分析
**内容概览**：
- 7种力场文件类型的详细格式规范
- 文件相互依赖关系图
- 语义验证需求
- TextMate 语法规范建议
- VS Code 扩展实现建议

**关键发现**：
- `.atp`：最简单（2列格式：type_name + mass）
- `.rtp`：核心文件（残基定义，包含 atoms/bonds/impropers/cmap）
- `.tdb`：terminus 修饰（replace/add/delete 操作）
- `.hdb`：氢原子自动放置规则
- `.itp`：参数文件（bondtypes/angletypes/dihedraltypes）
- `forcefield.itp`：入口文件（#include 其他文件）

### 2. **FORCEFIELD_SEMANTIC_ANALYSIS.md** - 语义关系与验证需求
**内容概览**：
- 力场语义模型（原子类型、残基、参数）
- 实体间引用关系
- 跨文件验证规则
- 智能提示需求

**关键验证规则**：
1. **类型一致性**：.rtp 中的原子类型必须存在于 atomtypes.atp
2. **结构一致性**：bonds 中的原子必须在 atoms 段定义
3. **电荷平衡**：残基总电荷应为整数（±0.01 容差）
4. **参数完整性**：所有键/角/二面角都要有对应参数
5. **物理有效性**：电荷、质量、键长、角度范围检查

### 3. **FORCEFIELD_IMPLEMENTATION_PLAN.md** - 14周实现路线图
**分6个阶段**：

#### Phase 1: 基础设施（1-2周）
- ✅ 文件类型注册（package.json）
- ✅ TextMate 语法文件创建
- ✅ 核心数据结构设计

#### Phase 2: 解析器（3-4周）
- AtpParser、RtpParser、TdbParser、HdbParser
- ForceFieldParser（主协调器）
- 跨文件依赖解析

#### Phase 3: 语义分析（5-7周）
- ForceFieldIndexManager（索引管理）
- CompletionProvider（智能补全）
- HoverProvider（悬浮文档）
- DiagnosticProvider（实时诊断）

#### Phase 4: 可视化（8-9周）
- 力场树视图（侧边栏）
- 原子类型/残基浏览器

#### Phase 5: 高级功能（10-12周）
- DefinitionProvider（跳转定义）
- ReferenceProvider（查找引用）
- CodeActionProvider（快速修复）

#### Phase 6: 测试与文档（13-14周）
- 单元测试、集成测试
- 用户文档

**快速启动（MVP - 4周）**：
- Week 1: .atp 和 .rtp 语法 + 解析器
- Week 2: 补全、悬浮、基础诊断
- Week 3: 力场树视图
- Week 4: 测试和发布

---

## ✅ 已完成的工作

### 1. **TextMate 语法文件**
已创建完整的语法高亮支持：

```
syntaxes/
├── atp/
│   ├── atp.tmLanguage.json          ✅ 已完成
│   └── atp-language-configuration.json  ✅ 已完成
├── rtp/
│   ├── rtp.tmLanguage.json          ✅ 已完成
│   └── rtp-language-configuration.json  ✅ 已完成
├── tdb/
│   ├── tdb.tmLanguage.json          ✅ 已完成
│   └── tdb-language-configuration.json  ✅ 已完成
└── hdb/
    ├── hdb.tmLanguage.json          ✅ 已完成
    └── hdb-language-configuration.json  ✅ 已完成
```

**语法高亮特性**：
- `.atp`：原子类型名、质量、注释
- `.rtp`：段标记、残基名、原子类型、电荷、跨残基引用（+N, -C）
- `.tdb`：操作类型（replace/add/delete）、原子引用
- `.hdb`：残基名、氢数量、几何类型、参考原子

### 2. **package.json 配置**
已注册所有力场文件类型：

```json
{
  "contributes": {
    "languages": [
      {
        "id": "gromacs_rtp_file",
        "extensions": [".rtp"],
        "aliases": ["GROMACS Residue Topology", "rtp"]
      },
      {
        "id": "gromacs_atp_file",
        "extensions": [".atp"],
        "aliases": ["GROMACS Atom Types", "atp"]
      },
      {
        "id": "gromacs_tdb_file",
        "extensions": [".tdb"],
        "aliases": ["GROMACS Terminus Database", "tdb"]
      },
      {
        "id": "gromacs_hdb_file",
        "extensions": [".hdb"],
        "aliases": ["GROMACS Hydrogen Database", "hdb"]
      }
    ],
    "grammars": [
      {
        "language": "gromacs_rtp_file",
        "scopeName": "source.rtp",
        "path": "./syntaxes/rtp/rtp.tmLanguage.json"
      }
      // ... 其他文件
    ]
  }
}
```

### 3. **核心类型定义草稿**
在 `FORCEFIELD_IMPLEMENTATION_PLAN.md` 中已设计：

```typescript
export interface AtomType {
  name: string;
  mass: number;
  description?: string;
  location: vscode.Location;
  // 扩展参数
  sigma?: number;
  epsilon?: number;
}

export interface ResidueTopology {
  name: string;
  atoms: ResidueAtom[];
  bonds: BondDefinition[];
  impropers: ImproperDefinition[];
  cmaps: CmapDefinition[];
  location: vscode.Location;
}

export interface ForceFieldIndex {
  atomTypes: Map<string, AtomType>;
  residues: Map<string, ResidueTopology>;
  terminus: Map<string, TerminusModification[]>;
  bondParams: Map<string, BondParameter[]>;
  angleParams: Map<string, AngleParameter[]>;
  forceFieldPath: string;
  lastUpdated: Date;
}
```

---

## 🎯 下一步开发计划

### **立即可做（本周内）**

#### 1. 编译测试语法文件
```bash
npm run compile
npm run lint
```

#### 2. 手动测试语法高亮
- 按 F5 启动 Extension Development Host
- 打开 `/opt/homebrew/Cellar/gromacs/2026.1/share/gromacs/top/charmm27_tnc.ff/`
- 打开 `atomtypes.atp` → 检查原子类型名和质量是否着色
- 打开 `aminoacids.rtp` → 检查段标记、原子类型、电荷是否正确高亮
- 打开 `aminoacids.c.tdb` → 检查操作关键字（replace/add/delete）

#### 3. 创建基础类型文件
**文件**：`src/types/forcefield.ts`

复制 `FORCEFIELD_IMPLEMENTATION_PLAN.md` 中的 TypeScript 接口定义。

#### 4. 实现第一个解析器：AtpParser
**文件**：`src/parsers/forcefield/atpParser.ts`

这是最简单的解析器（2列格式），可以作为其他解析器的模板。

---

### **短期目标（2-4周）- MVP**

#### Week 1: 核心解析器
- [ ] 创建 `src/types/forcefield.ts`
- [ ] 实现 `AtpParser`（atomtypes.atp）
- [ ] 实现 `RtpParser`（*.rtp）
- [ ] 实现 `ForceFieldParser`（协调器）
- [ ] 单元测试（使用 charmm27_tnc.ff 测试数据）

#### Week 2: 索引管理和基础 Provider
- [ ] 实现 `ForceFieldIndexManager`
- [ ] 实现 `RtpCompletionProvider`（原子类型补全）
- [ ] 实现 `RtpHoverProvider`（显示原子类型详情）
- [ ] 实现 `RtpDiagnosticProvider`（未定义原子类型检测）

#### Week 3: 可视化
- [ ] 实现 `ForceFieldTreeProvider`（侧边栏）
- [ ] 显示力场目录、原子类型列表、残基列表
- [ ] 点击跳转到定义

#### Week 4: 测试和发布
- [ ] 完整测试所有功能
- [ ] 编写用户文档
- [ ] 更新 CHANGELOG.md
- [ ] 发布 v0.6.0

---

### **中期目标（5-8周）**

#### 扩展文件支持
- [ ] `TdbParser`（terminus 修饰）
- [ ] `HdbParser`（氢数据库）
- [ ] `ItpParamParser`（参数文件）

#### 高级 Provider
- [ ] `DefinitionProvider`（Ctrl+Click 跳转）
- [ ] `ReferenceProvider`（查找所有引用）
- [ ] 电荷平衡检查
- [ ] 参数完整性检查

#### 用户体验
- [ ] 残基3D预览（点击残基名 → 显示结构）
- [ ] 参数查询（悬浮显示键长、角度范围）
- [ ] 快速修复（创建缺失的原子类型）

---

## 📊 功能覆盖评估

### 基础功能（语法高亮）
| 文件类型 | 状态 | 优先级 |
|---------|------|--------|
| .atp | ✅ 已完成 | P0 |
| .rtp | ✅ 已完成 | P0 |
| .tdb | ✅ 已完成 | P1 |
| .hdb | ✅ 已完成 | P1 |
| .itp (params) | ⏳ 待开发 | P1 |

### 智能功能
| 功能 | 状态 | 优先级 |
|------|------|--------|
| 原子类型补全 | ⏳ 待开发 | P0 |
| 悬浮文档 | ⏳ 待开发 | P0 |
| 未定义类型诊断 | ⏳ 待开发 | P0 |
| 跳转定义 | ⏳ 待开发 | P1 |
| 查找引用 | ⏳ 待开发 | P1 |
| 电荷平衡检查 | ⏳ 待开发 | P1 |
| 力场树视图 | ⏳ 待开发 | P1 |

### 高级功能
| 功能 | 状态 | 优先级 |
|------|------|--------|
| 参数完整性检查 | ⏳ 待开发 | P2 |
| 残基3D预览 | ⏳ 待开发 | P2 |
| 快速修复 | ⏳ 待开发 | P2 |
| 力场对比 | 💡 未规划 | P3 |

---

## 💡 关键技术决策

### 1. **解析策略**
- **增量解析**：文件打开时解析，缓存结果
- **延迟加载**：只在需要时解析整个力场目录
- **索引失效**：文件修改时只重新解析该文件

### 2. **性能优化**
- **异步解析**：使用 `async/await` 避免阻塞
- **LRU缓存**：缓存最近使用的力场索引（最多3个力场）
- **段解析**：只解析当前编辑的段（如 [ atoms ]）

### 3. **用户体验**
- **渐进增强**：先实现基础功能，再添加高级功能
- **非侵入式**：不修改用户的力场文件
- **标准约定**：遵循 GROMACS 官方力场结构

### 4. **扩展性**
- **模块化解析器**：每种文件类型独立解析器
- **统一索引**：所有数据存入 `ForceFieldIndex`
- **Provider 分离**：每个 Provider 独立实现

---

## 🧪 测试策略

### 单元测试
- 每个解析器独立测试
- 使用 charmm27_tnc.ff 作为测试数据
- 验证解析结果的正确性

### 集成测试
- 完整力场目录解析
- 跨文件引用验证
- 性能基准测试（解析时间 < 500ms）

### 用户测试
- 打开真实的力场目录
- 编辑 .rtp 文件，验证补全和诊断
- 测试多个力场同时打开

---

## 📋 资源清单

### 参考力场目录
```
/opt/homebrew/Cellar/gromacs/2026.1/share/gromacs/top/
├── charmm27_tnc.ff/          # CHARMM27 (已用于分析)
├── amber99sb-ildn.ff/         # AMBER
├── oplsaa.ff/                 # OPLS-AA
└── gromos54a7.ff/             # GROMOS
```

### 文档资源
- GROMACS 官方手册：Force Field章节
- CHARMM 力场文档
- 现有的 TOP/ITP 解析器（`src/parsers/topParser.ts`）

### 代码参考
- `src/languages/mdp/index.ts`：完整的语言支持模块示例
- `src/providers/mdpCompletionProvider.ts`：补全 Provider 示例
- `src/constants/mdpParameters.ts`：常量数据结构示例

---

## ✨ 成功标准

### MVP 成功标准（4周后）
- [x] 用户可以打开 .rtp 文件并看到语法高亮
- [ ] 在 [ atoms ] 段输入时可以补全原子类型
- [ ] 悬停原子类型可以看到质量和描述
- [ ] 未定义的原子类型会显示红色波浪线
- [ ] 侧边栏可以浏览力场结构

### 完整功能成功标准（14周后）
- [ ] 支持所有7种力场文件类型
- [ ] 完整的验证（类型、电荷、参数）
- [ ] 跳转定义和查找引用
- [ ] 残基3D预览
- [ ] 用户文档和示例

---

## 🚀 开始开发

### 第一步：测试现有语法
```bash
# 编译扩展
npm run compile

# 启动开发环境
code .
# 按 F5 启动 Extension Development Host

# 在新窗口中打开力场目录
code /opt/homebrew/Cellar/gromacs/2026.1/share/gromacs/top/charmm27_tnc.ff/

# 打开文件测试语法高亮
# - atomtypes.atp
# - aminoacids.rtp
# - aminoacids.c.tdb
# - aminoacids.hdb
```

### 第二步：创建类型定义
```bash
mkdir -p src/types
touch src/types/forcefield.ts
```
复制 `FORCEFIELD_IMPLEMENTATION_PLAN.md` 中的接口定义。

### 第三步：实现第一个解析器
```bash
mkdir -p src/parsers/forcefield
touch src/parsers/forcefield/atpParser.ts
```
实现 `AtpParser` 类（参考实现计划中的代码）。

---

## 📞 需要决策的问题

1. **优先级确认**：是否同意 MVP 范围（.atp + .rtp + 基础补全/诊断）？
2. **时间安排**：是否有 4 周时间投入 MVP 开发？
3. **测试数据**：是否使用 charmm27_tnc.ff 作为主要测试数据？
4. **发布策略**：MVP 完成后是否立即发布 v0.6.0，还是等完整功能？

---

**准备就绪！所有技术分析、设计文档、基础代码都已完成。现在可以开始实施开发工作。**
