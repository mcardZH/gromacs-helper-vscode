# GROMACS Helper for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/mcardzh.gromacs-helper-vscode.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Installs](https://img.shields.io/vscode-marketplace/i/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Rating](https://img.shields.io/vscode-marketplace/r/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Build Status](https://img.shields.io/github/actions/workflow/status/mcardzh/gromacs-helper-vscode/build-and-release.yml?branch=master&style=flat-square&label=build)](https://github.com/mcardzh/gromacs-helper-vscode/actions)
[![License](https://img.shields.io/github/license/mcardzh/gromacs-helper-vscode.svg?style=flat-square)](https://github.com/mcardzh/gromacs-helper-vscode/blob/main/LICENSE)

一个为 GROMACS 分子动力学模拟提供全方位支持的 VS Code 扩展。支持 `.mdp`、`.top`、`.itp`、`.gro`、`.ndx`、`.pdb`、`.pka`、`.rtp`、`.atp`、`.tdb`、`.hdb` 以及二进制文件 `.xtc`、`.trr`、`.edr`、`.tpr` 等多种格式，提供语法高亮、语义着色、智能补全、参数提示、悬停文档、力场智能关联、二进制文件预览、Mol* 3D 轨迹可视化与播放控制、GROMACS 进程实时监控等丰富特性。

> [中文文档](README_ZH.md) | [English Documentation](README.md)

---

## ✨ 主要功能

### 🎨 语法高亮与语义着色
- **MDP 文件** (`.mdp`) - 分子动力学模拟参数文件，支持不同参数类别的语义高亮与着色
- **TOP / ITP 拓扑文件** (`.top`, `.itp`) - 拓扑结构与力场包含文件，支持段标记高亮、原子与键合语法着色
- **力场参数与数据库文件** - 完整支持 `.rtp`（残基拓扑）、`.atp`（原子类型）、`.tdb`（Terminus修饰）、`.hdb`（加氢数据库）以及 `ffbonded.itp` / `ffnonbonded.itp` 等力场参数文件
- **STRUCTURE 文件** (`.gro`, `.pdb`) - 结构坐标文件，支持不同氨基酸/核酸/水/离子残基类型的区分着色
- **NDX 索引文件** (`.ndx`) - 索引组文件，结构清晰区分各组序号
- **PKA 结果文件** (`.pka`) - PROPKA pKa 预测输出文件，提供残基、pKa 预测值与相互作用数据的高亮
- **Packmol 文件** (`.packmol`, `.inp`) - Packmol 建模输入文件高亮与结构关键词着色
- **XVG 数据文件** (`.xvg`) - GROMACS 绘图与分析数据文件高亮

### 🔍 GROMACS 二进制文件极速预览
- **双击即开**：直接在 VS Code 编辑器标签页中双击打开预览 `.xtc` / `.trr` / `.edr` / `.tpr` 文件，无需外部工具
- **XTC / TRR 轨迹信息**：显示帧数、原子数、模拟时长、时间步长、起止时间、精度、二进制元数据。采用高效 Head + Tail 探针算法，574MB XTC 文件解析仅需 35ms，3.7GB TRR 仅需 57ms
- **EDR 能量分析**：能量项统计（min / max / mean / std）、内嵌 Chart.js Sparkline 趋势图、点击弹出可交互完整时间序列图表、支持搜索过滤与一键导出 CSV
- **TPR 参数概览**：模拟运行参数（积分器、步数、时间步长、总时长）、折叠式参数分区（Simulation / Force Field / Cutoff / PME / Temp & Press Coupling 等），自动通过 `gmx dump` 精确解析现代 TPR

### 🎬 Mol* 3D 轨迹查看器与播放控制
- **专业 3D 分子可视化**：集成 Mol* 查看器，直接在 VS Code 内渲染 XTC / TRR 轨迹与 GRO / PDB 拓扑
- **流式轨迹加载 (Streaming)**：GB 级大型轨迹按需读取帧数据，大幅降低内存占用，原生支持 SSH 远程流式传输
- **交互式轨迹进度条**：自定义 Viewport 播放控制器，支持滑块拖动跳转、精确帧号输入跳转、单帧前进/后退/重置、当前帧/总帧数实时显示
- **多面板与状态持久化**：支持同时打开多个查看器，VS Code 重启后自动恢复状态

### 🧬 TOP/ITP 拓扑与力场文件智能支持
- **智能力场查找**：从 `#include "xxx.ff/forcefield.itp"` 自动识别引用的力场，支持工作区相对路径与系统 GROMACS 目录（通过 `gmx -version` 自动定位）
- **原子序号悬停卡片**：在 `[ bonds ]`、`[ angles ]`、`[ dihedrals ]`、`[ pairs ]` 等段中，悬停在原子序号上即可查看对应残基、原子名称、原子类型、电荷与质量
- **原子类型补全与诊断**：在 `[ atoms ]` 段第二列智能补全原子类型，实时标出未定义原子类型（支持 GROMACS 未安装时优雅降级）
- **TDB / HDB 增强辅助**：TDB `[ replace ]` / `[ add ]` 段原子类型补全；HDB 残基名称补全、氢原子数量与几何类型范围检查

### 🔍 GROMACS 进程实时监控
- **状态栏实时监控**：随时随地掌握模拟任务运行状态
- **本地与远程监控**：支持本地 `gmx` 进程检测与远程 SSH 任务监控（自动部署轻量监控脚本）
- **智能进度解析**：精确显示 mdrun 剩余时间倒计时、当前模拟时间（ns/μs）、步数与进度百分比
- **多目标轮转与独立模式**：多个任务支持自动轮转显示（鼠标悬浮暂停）或设置为独立状态栏项

### 🎯 GROMACS 命令视图
- **侧边栏命令管理**：按阶段（Structure Preparation、Simulation、Analysis 等）组织常用命令
- **智能占位符**：`{pdb|gro}` 自动列出工作区结构文件供选择，`{output.gro}`、`{basename}` 交互式提示输入
- **专用终端执行**：一键发送命令至专用 "GROMACS" 终端，自动使用相对路径避免出错

### 📊 XVG 交互式图表预览
- **侧边栏图表**：点击编辑器标题栏图表图标 (📊) 快速预览 XVG 折线图
- **多数据系列与交互**：支持缩放、平移、悬停查看具体数值、多曲线分色展示与统计摘要

### 📦 Packmol 建模与 3D 预览
- **实时 3D 预览**：在侧边面板直观预览分子排列与空间分布
- **智能格式化与补全**：自动对齐参数并提供 Packmol 关键字与约束条件补全

### 🧮 MD 专业单位转换器
- **专为分子动力学设计**：支持长度（nm, Å, pm...）、时间（fs, ps, ns...）、温度（K, °C）、能量（kJ/mol, kcal/mol, eV...）、面积、电势等多维度即时换算

---

## 🚀 支持的文件格式

| 文件类型 | 扩展名 / 模式 | 描述 | 功能支持 |
|---------|--------------|------|---------|
| **MDP** | `.mdp` | 分子动力学参数文件 | 语法高亮、语义着色、智能补全、悬停文档、值范围检查、格式化、代码片段 |
| **Topology** | `.top`, `.itp` | 拓扑结构文件 | 语法高亮、符号导航、代码折叠、智能力场关联、原子序号悬浮、原子类型补全与诊断 |
| **力场参数** | `ffbonded.itp`, `ffnonbonded.itp` 等 | 力场键合/非键参数 | 语法高亮、原子类型悬停提示与补全、预处理指令过滤 |
| **RTP** | `.rtp` | 残基拓扑数据库 | 语法高亮、残基大纲、原子类型补全、残基悬浮提示（原子数/键数/电荷） |
| **ATP** | `.atp` | 原子类型数据库 | 语法高亮、原子类型大纲、质量与参数提示 |
| **TDB** | `.tdb` | Terminus 修饰数据库 | 语法高亮、关键字悬停、原子类型智能补全、未定义类型诊断 |
| **HDB** | `.hdb` | 氢原子数据库 | 语法高亮、残基名称补全、氢原子条目数量与几何类型范围检查 |
| **Structure** | `.gro`, `.pdb` | 结构坐标文件 | 语法高亮、残基语义着色、符号导航、PDB REMARK 缺失残基与拉氏图异常分析 |
| **Index** | `.ndx` | 索引组文件 | 语法高亮、符号导航、索引组折叠 |
| **XVG Data** | `.xvg` | 绘图与分析数据 | 语法高亮、侧边栏交互式图表预览、多曲线支持、数据统计 |
| **PKA Results**| `.pka` | PROPKA pKa 预测文件 | 语法高亮、悬停提示、符号导航、代码折叠 |
| **Packmol** | `.packmol`, `.inp` | Packmol 建模文件 | 语法高亮、3D 结构交互式预览、自动格式化、智能补全 |
| **Trajectory** | `.xtc`, `.trr` | 轨迹二进制文件 | 双击极速元数据预览、Mol* 3D 轨迹渲染、流式加载、交互式进度条控制 |
| **Energy** | `.edr` | 能量二进制文件 | 能量项统计（min/max/mean/std）、Sparkline 趋势图、时间序列图表、CSV 导出 |
| **Run Input** | `.tpr` | 运行输入二进制文件 | 模拟运行参数结构化展示、折叠式参数分区、版本与精度元数据 |

---

## 📦 安装

1. 打开 VS Code
2. 按 `Ctrl+Shift+X`（macOS 为 `Cmd+Shift+X`）打开扩展面板
3. 搜索 **"GROMACS Helper"**
4. 点击 **Install** 安装

或从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode) 直接安装。

---

## 🎮 功能详解与使用指南

### 1. MDP 文件编辑与智能辅助

- **语法高亮与语义着色**：不同类别的 MDP 参数（运行控制、输出、温压控、电荷等）采用区分度极高的语义着色。
- **智能补全**：输入参数名称即刻获得补全建议，包含 GROMACS 2025.x 全部支持参数。
- **悬停文档与实时诊断**：鼠标悬停在参数上即可查看类型、单位、有效值范围与推荐配置；当输入非法参数值时实时给出错误诊断。
- **代码片段与自动格式化**：输入 `em`、`nvt`、`npt`、`md` 即可一键展开标准模拟配置，并支持一键规范对齐。

| MDP 语法高亮与语义着色 | MDP 悬停文档与错误检查 |
|:---:|:---:|
| ![MDP 语法高亮](imgs/5.png) | ![MDP 悬停提示与错误检查](imgs/6.png) |

| MDP 智能参数补全 | MDP 常用代码片段 | MDP 智能对齐格式化 |
|:---:|:---:|:---:|
| ![MDP 智能补全](imgs/7.gif) | ![MDP 代码片段](imgs/8.gif) | ![MDP 格式化](imgs/9.gif) |

---

### 2. TOP / ITP 拓扑与力场完整支持

- **智能力场关联**：自动从 `#include` 识别并定位力场文件（支持相对路径与系统 GROMACS 安装目录）。
- **原子序号悬浮提示**：在 `[ bonds ]`、`[ angles ]`、`[ dihedrals ]` 等段落中，将鼠标悬停在原子编号上，即可显示该原子的残基名称、原子名、原子类型、电荷与质量。
- **大纲视图与符号导航**：快速浏览拓扑中的 `defaults`、`moleculetype`、`atoms` 等段落结构。
- **力场参数文件支持**：完整支持 `.rtp`、`.atp`、`.tdb`、`.hdb` 以及 `ffbonded.itp` / `ffnonbonded.itp`，提供原子类型补全与诊断。

| TOP/ITP 语法高亮与结构 | TOP/ITP 符号大纲导航 | TOP/ITP 原子悬浮提示与补全 |
|:---:|:---:|:---:|
| ![TOP 语法高亮](imgs/10.png) | ![TOP 符号大纲](imgs/11.png) | ![TOP 原子悬浮与补全](imgs/12.gif) |

---

### 3. GRO / PDB 结构文件与分析

- **GRO 语义着色**：对残基名、原子名、序号与坐标分别着色，清晰直观。
- **PDB 标记深度分析**：智能解析 PDB 文件中的 `REMARK 465`（缺失残基）、`REMARK 500`（拉氏图异常）等关键结构标记。
- **PDB 二级结构导航**：在大纲视图中快速定位 Sheet、Chain、Residue 与 HETATM。

| GRO 结构坐标语义着色 | PDB 关键标记与异常分析 | PDB 符号大纲导航 |
|:---:|:---:|:---:|
| ![GRO 语义着色](imgs/13.png) | ![PDB 标记分析](imgs/14.png) | ![PDB 符号导航](imgs/15.png) |

---

### 4. NDX 索引文件支持

- 区分不同索引组并支持段落折叠。
- 大纲视图快速跳转至指定组（System、Protein、Backbone、SOL、CL 等）。

| NDX 索引文件语法高亮 | NDX 索引组大纲视图 |
|:---:|:---:|
| ![NDX 语法高亮](imgs/16.png) | ![NDX 符号大纲](imgs/17.png) |

---

### 5. XVG 数据文件交互式图表预览

- 支持在编辑器标题栏点击图表图标 (📊) 或右键选择 "Preview XVG Chart"。
- 侧边栏交互式图表展示，支持缩放、平移、悬停查看数据点、多曲线分色展示与实时统计（最大/最小/平均值）。

| XVG 语法高亮 | XVG 侧边栏交互式图表预览 |
|:---:|:---:|
| ![XVG 语法高亮](imgs/18.png) | ![XVG 图表预览](imgs/19.gif) |

---

### 6. Packmol 建模与 3D 实时预览

- 支持 `.packmol` 与 `.inp` 语法高亮、智能补全与格式化。
- 点击右上角 3D 预览图标，即可在侧边面板中实时渲染生成的分子体系三维结构。

| Packmol 建模语法高亮 | Packmol 补全与格式化 | Packmol 3D 结构预览 |
|:---:|:---:|:---:|
| ![Packmol 语法高亮](imgs/20.png) | ![Packmol 补全与格式化](imgs/21.gif) | ![Packmol 3D 预览](imgs/22.gif) |

---

### 7. GROMACS 进程实时监控

- **状态栏实时监控**：开箱即用，默认自动监控本地 GROMACS 运行任务。
- **远程 SSH 监控**：支持配置远程计算集群，状态栏显示当前模拟时间、步数、剩余时间倒计时。
- **悬停信息卡片**：鼠标悬停在状态栏上显示当前工作目录、日志路径、详细进度。

| 进程监控悬停信息卡片 | 状态栏任务指示 |
|:---:|:---:|
| ![进程监控卡片](imgs/1.png) | ![状态栏指示](imgs/2.png) |

---

### 8. GROMACS 二进制文件预览与 Mol* 3D 轨迹播放

- **二进制文件自动预览**：双击 `.xtc`、`.trr`、`.edr`、`.tpr` 文件即可在标签页中直接查看结构与统计信息。
- **Mol* 3D 轨迹查看器**：右键点击 `.xtc` / `.trr` 选择 "Open with Mol* Viewer"，搭配 `.gro` / `.pdb` 拓扑进行 3D 渲染。
- **超大轨迹流式加载**：大文件自动提示使用流式模式，秒级打开 GB 级轨迹。
- **自定义播放控制条**：支持拖动进度条、输入指定帧号、步进控制。

| 超大轨迹流式加载提示 | Mol* 3D 轨迹查看器与播放控制 |
|:---:|:---:|
| ![流式加载提示](imgs/3.png) | ![Mol* 3D 轨迹查看器](imgs/4.png) |

---

### 9. GROMACS 命令视图与单位转换器

- **GROMACS 命令视图**：在 VS Code 活动栏切换到 "GROMACS Commands"，通过树状视图快速执行常用命令（pdb2gmx, grompp, mdrun, energy 等），支持智能占位符自动匹配工作区文件。
- **专业单位转换器**：按 `Ctrl+Shift+P` 搜索 **"GROMACS Helper: Open Unit Converter"** 即可打开多功能单位换算面板。

---

## ⚙️ 配置选项

可在 VS Code `settings.json` 中自定义扩展行为：

### 进程监控配置
```json
{
  "gromacsHelper.monitor.enabled": true,
  "gromacsHelper.monitor.refreshInterval": 5000,
  "gromacsHelper.monitor.rotateInterval": 10000,
  "gromacsHelper.monitor.targets": [
    {
      "id": "local-default",
      "name": "Local",
      "type": "local",
      "independent": false
    },
    {
      "id": "remote-cluster",
      "name": "HPC-Server",
      "type": "remote",
      "sshHost": "user@hpc.example.com",
      "independent": true
    }
  ]
}
```

### 轨迹播放优化配置
```json
{
  "gromacsHelper.trajectoryPlayback.cacheSize": 256,
  "gromacsHelper.trajectoryPlayback.prefetchDepth": 2,
  "gromacsHelper.trajectoryPlayback.maxConcurrentReads": 4
}
```

---

## 🔧 开发与贡献

### 本地开发
```bash
# 克隆仓库
git clone https://github.com/mcardzh/gromacs-helper-vscode.git
cd gromacs-helper-vscode

# 安装依赖
npm install

# 编译扩展
npm run compile

# 启动开发监听
npm run watch
```

### 打包扩展
```bash
npm run package
```

---

## 🗂️ 更新日志

### [0.6.1] - 2026-08-27

#### 🔒 安全与维护
- **修复依赖安全漏洞 (CVE-2026-29063)**：升级 `immutable` 依赖至安全版本 `5.1.9`，修复原型污染风险
- **文档与资源完善**：更新中英文 README，集成 22 项核心特性的演示图片与动图

### [0.6.0] - 2026-08-27

#### ✨ 新增
- **GROMACS 力场文件完整智能支持** — 为所有力场文件类型提供 IDE 级别的编辑体验
  - **ITP 力场参数文件支持**：为 `ffbonded.itp`、`ffnonbonded.itp`、`ffnabonded.itp`、`ffnanonbonded.itp` 添加专用语法高亮、原子类型补全与悬浮提示，自动跳过预处理指令诊断
  - **TDB 文件增强**：在 `[ replace ]` 和 `[ add ]` 段提供原子类型补全，智能识别缩进行，提供未定义原子类型诊断
  - **HDB 文件增强**：残基名称智能补全，氢原子条目数量与几何类型（1-8）、氢原子数（1-4）范围校验
  - **TOP/ITP 拓扑文件完整支持**：
    - **智能力场查找系统**：自动识别 `#include` 力场路径，适配工作区相对路径与系统 GROMACS 目录（通过 `gmx -version` 获取）
    - **原子序号悬浮提示**：在 `[ bonds ]`、`[ angles ]`、`[ dihedrals ]`、`[ pairs ]` 等段落悬停在原子序号上显示残基、原子名、类型、电荷与质量
    - **原子类型补全与诊断**：在 `[ atoms ]` 段第二列智能补全原子类型，检测未定义类型并支持 GROMACS 未安装时优雅降级
    - **段标记悬浮提示**：为 `[ atoms ]`、`[ bonds ]`、`[ moleculetype ]` 等常见段提供格式说明

### [0.5.0] - 2026-08-27

#### ✨ 新增
- **GROMACS 力场文件支持**：`.rtp`、`.atp`、`.tdb`、`.hdb` 语法高亮、智能补全、悬浮文档、符号大纲与实时诊断
- **GROMACS 二进制文件自动预览**：双击 `.xtc` / `.trr` / `.edr` / `.tpr` 直接在编辑器标签页中打开预览
  - **XTC / TRR 轨迹预览**：帧数、原子数、模拟时长、时间步长、起止时间与二进制元数据
  - **EDR 能量分析**：能量项统计、Chart.js Sparkline 趋势图、可缩放时间序列图表、CSV 导出
  - **TPR 参数预览**：模拟参数结构化分区展示，现代 TPR 通过 `gmx dump` 解析
- **性能优化**：Head + Tail 探针解析，574MB XTC 文件解析从 145s 降至 35ms（4100x 加速）

### [0.4.1] - 2026-01-14

#### ✨ 新增与修复
- **轨迹进度条控制**：交互式滑块拖动、精确帧号输入、步进控制与当前帧实时显示
- **远程播放与防抖优化**：修复远程轨迹播放问题，扩展 LRU 缓存并引入预取管道

### [0.4.0] - 2025-12-25

#### ✨ 新增
- 🎬 **Mol* 轨迹查看器**：VS Code 内 3D 分子轨迹可视化、流式轨迹加载支持超大轨迹文件

### [0.3.4] - 2025-12-24

#### ✨ 新增
- 🎯 **GROMACS 命令视图**：侧边栏可视化命令管理、智能占位符与专有终端执行

### [0.3.0] - 2025-12-23

#### ✨ 新增
- 🔍 **GROMACS 进程监控**：本地及远程 SSH 任务实时监控，状态栏显示模拟时间与剩余倒计时

---

## 📄 许可证

本项目基于 [GPLv2](LICENSE) 许可证开源。

---

**享受您的 GROMACS 开发与模拟体验！** 🧬⚗️
