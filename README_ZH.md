# GROMACS Helper for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/mcardzh.gromacs-helper-vscode.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Installs](https://img.shields.io/vscode-marketplace/i/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Rating](https://img.shields.io/vscode-marketplace/r/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Build Status](https://img.shields.io/github/actions/workflow/status/mcardzh/gromacs-helper-vscode/build-and-release.yml?branch=master&style=flat-square&label=build)](https://github.com/mcardzh/gromacs-helper-vscode/actions)
[![License](https://img.shields.io/github/license/mcardzh/gromacs-helper-vscode.svg?style=flat-square)](https://github.com/mcardzh/gromacs-helper-vscode/blob/main/LICENSE)

一个为 GROMACS 分子动力学模拟提供全面支持的 VS Code 扩展。支持 `.mdp`、`.top`、`.itp`、`.gro`、`.ndx`、`.pdb` 等 GROMACS 文件格式，提供语法高亮、智能补全、参数提示、错误检查等功能。

## ✨ 主要功能

### 🎨 语法高亮
- **MDP 文件** (`.mdp`) - 分子动力学参数文件
- **TOP 文件** (`.top`, `.itp`) - 拓扑结构文件
- **GRO 文件** (`.gro`, `.pdb`) - 结构坐标文件
- **NDX 文件** (`.ndx`) - 索引组文件

### 💡 智能补全
- MDP 参数自动补全，包含所有 GROMACS 2025.2 支持的参数
- 预设模板快速插入（能量最小化、NVT、NPT、MD 等）
- 参数值智能建议

### 📖 悬停提示
- 详细的 MDP 参数说明
- 参数类型、单位、有效值范围
- 默认值和使用建议

### 🔍 符号导航
- 文档大纲视图
- 快速跳转到特定参数
- 代码折叠支持

### 📝 代码片段
- 常用 MDP 配置模板
- 一键生成标准模拟流程配置
- **🆕 自定义片段管理** - 创建、编辑和管理个性化的 MDP 片段
  - 添加带有智能占位符的自定义片段
  - 编辑片段内容、前缀和描述
  - 从侧边栏视图或自动补全快速插入
  - 内置片段管理器，提供可视化界面

### 🎯 错误检查
- 参数语法验证
- 值范围检查
- 格式错误提示

## 🚀 支持的文件格式

| 文件类型 | 扩展名 | 描述 | 功能支持 |
|---------|--------|------|---------|
| MDP | `.mdp` | 分子动力学参数文件 | 语法高亮、智能补全、悬停提示、错误检查 |
| Topology | `.top`, `.itp` | 拓扑结构文件 | 语法高亮、符号导航、代码折叠 |
| Structure | `.gro`、`.pdb` | 结构坐标文件 | 语法高亮、符号导航 |
| Index | `.ndx` | 索引组文件 | 语法高亮、符号导航、代码折叠 |
| XVG Data | `.xvg` | 绘图数据文件 | 语法高亮显示、交互式图表预览、数据分析 |

## 📦 安装

1. 打开 VS Code
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 "GROMACS Helper"
4. 点击安装

或者从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode) 直接安装。

## 🎮 使用方法

### MDP 文件编辑
1. 创建或打开 `.mdp` 文件
2. 输入参数名，扩展会自动提供补全建议
3. 悬停在参数上查看详细说明
4. 使用代码片段快速插入模板

**示例：**
```mdp
; 能量最小化参数
integrator = steep
emtol = 1000.0
emstep = 0.01
nsteps = 50000

; 输出控制
nstxout = 0
nstvout = 0
nstenergy = 100
nstlog = 100
```

### 使用代码片段
- 输入 `em` + Tab - 插入能量最小化模板
- 输入 `nvt` + Tab - 插入 NVT 平衡模板  
- 输入 `md` + Tab - 插入生产性 MD 模板

### 🆕 自定义 MDP 片段
- **管理片段**：按 `Ctrl+Shift+P` 搜索 "Manage MDP Snippets"
- **创建自定义模板**：添加带有占位符的自定义 MDP 配置模板
- **快速访问**：从资源管理器中的 "MDP Snippets" 面板查看和插入片段
- **智能编辑**：使用 VS Code 片段语法，如 `${1:default}` 和 `${1|选项1,选项2|}`

**创建自定义片段：**
1. 打开命令面板 (`Ctrl+Shift+P`)
2. 搜索 "Manage MDP Snippets"
3. 选择 "Add New Snippet"
4. 填写名称、前缀和描述
5. 在带有语法高亮的 MDP 编辑器中编辑内容
6. 保存并在自动补全中使用

参见 [自定义片段指南](CUSTOM_SNIPPETS_GUIDE.md) 获取详细使用说明。

### TOP/ITP 文件支持
- 自动识别分子类型、原子类型、键合参数等
- 提供文档大纲和符号导航
- 支持代码折叠

### GRO 文件支持
- 结构化显示原子坐标
- 符号导航快速定位
- 语法高亮区分不同字段

### NDX 文件支持
- 索引组语法高亮
- 代码折叠支持
- 组名悬停提示

### XVG文件预览
- **交互式图表可视化**：点击图表图标(📊) 在标题栏中，或右键单击XVG文件并选择“预览XVG图表”
- **实时数据分析**：查看统计信息，包括数据点计数、值范围和平均值
- **多系列支持**：自动检测并显示多个不同颜色的数据系列
- **响应式图表**：缩放、平移和悬停在数据点上以获取详细值
- **GROMACS元数据支持**：自动解析XVG文件中的标题、轴标签和图例信息

**支持的XVG功能：**
- 能量图（势能、动能、总能量）
- 温度和压力数据
- RMSD和距离测量
- GROMACS工具的自定义分析输出

**用途：**
1. 在VS Code中打开任何“.xvg”文件
2. 单击图表图标(📊) 在编辑器标题栏中
3. 在侧面板中查看交互式绘图
4. 将鼠标悬停在数据点上以查看确切值

## ⚙️ 配置选项

目前扩展使用默认配置，未来版本将添加更多自定义选项。

## 🔧 开发和贡献

### 本地开发
```bash
# 克隆仓库
git clone https://github.com/mcardzh/gromacs-helper-vscode.git
cd gromacs-helper-vscode

# 安装依赖
npm install

# 编译项目
npm run compile

# 启动监听模式
npm run watch
```

### 构建扩展包
```bash
npm run package
```

## 📋 系统要求

- Visual Studio Code 版本 1.101.0 或更高
- 无其他特殊依赖

## 🐛 已知问题

- 大型 TOP 文件的解析性能有待优化
- 复杂嵌套 #include 指令的支持有限

如发现问题，请在 [GitHub Issues](https://github.com/mcardzh/gromacs-helper-vscode/issues) 中报告。

## 🗂️ 更新日志

### [0.0.5] - 2025-06-22

#### ✨ 新增 
- **XVG文件可视化预览功能** - 为GROMACS数据文件提供交互式图表预览
  - 支持点击图表图标在侧边栏预览XVG数据为折线图
  - 自动解析XVG文件中的元数据（标题、坐标轴标签、图例等）
  - 多数据系列支持，使用不同颜色区分
  - 实时数据统计显示（数据点数量、数值范围、平均值等）
  - 支持图表缩放、平移和悬停显示具体数值
- 新增XVG文件语法高亮支持
- 新增XVG文件悬停提示功能
- 新增XVG文件代码片段模板
- 提供对`.pdb`文件语法高亮的支持

#### 🔧 修订
- 修改部分文件名，使命名更规范
- 优化项目结构，增强可维护性

### [0.0.4] - 2025-06-22

#### ✨ 新增
- 新增GitHub Actions工作流支持自定义发布说明
- 支持从CHANGELOG.md自动读取版本变更信息

#### 🔧 改进
- 优化构建和发布流程

### [0.0.2] - 2025-06-22

#### ✨ 新增
- 完整的MDP文件语法高亮支持
- TOP文件语法高亮和符号导航
- GRO文件格式支持和悬停提示
- NDX文件语法高亮和折叠功能
- 智能代码补全和参数提示
- 代码片段支持

#### 🔧 改进
- 优化语法高亮规则
- 改进悬停提示信息
- 增强符号导航功能

#### 🐛 修复
- 修复某些情况下的语法解析错误
- 改进文件格式检测

### [0.0.1] - 2025-06-22

#### ✨ 新增
- 初始版本发布
- 基础的GROMACS文件支持
- MDP参数语法高亮
- 基本的代码补全功能

## 📚 相关资源

- [GROMACS 官方文档](https://manual.gromacs.org/)
- [GROMACS MDP 选项参考](https://manual.gromacs.org/current/user-guide/mdp-options.html)
- [分子动力学模拟教程](https://tutorials.gromacs.org/)

## 🤝 贡献

欢迎提交问题报告、功能请求和代码贡献！

## 📄 许可证

本项目基于 GPLv2 许可证开源

## 👨‍💻 作者

- 项目维护者：[mcardzh](https://github.com/mcardzh)

## 🙏 致谢

- 感谢 GROMACS 开发团队提供优秀的分子动力学模拟软件
- 感谢 VS Code 团队提供强大的编辑器平台

## 📞 支持

如果这个扩展对您有帮助，请给我们一个 ⭐️！

有问题或建议？请通过以下方式联系：
- [GitHub Issues](https://github.com/mcardzh/gromacs-helper-vscode/issues)
- [Email](mailto:mcardzh@gmail.com)

---

**享受您的 GROMACS 开发体验！** 🧬⚗️
