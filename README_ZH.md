# GROMACS Helper for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/mcardzh.gromacs-helper-vscode.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Installs](https://img.shields.io/vscode-marketplace/i/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Rating](https://img.shields.io/vscode-marketplace/r/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Build Status](https://img.shields.io/github/actions/workflow/status/mcardzh/gromacs-helper-vscode/build-and-release.yml?branch=master&style=flat-square&label=build)](https://github.com/mcardzh/gromacs-helper-vscode/actions)
[![License](https://img.shields.io/github/license/mcardzh/gromacs-helper-vscode.svg?style=flat-square)](https://github.com/mcardzh/gromacs-helper-vscode/blob/main/LICENSE)

一个为 GROMACS 分子动力学模拟提供全面支持的 VS Code 扩展。支持 `.mdp`、`.top`、`.itp`、`.gro`、`.ndx`、`.pdb`、`.pka` 等 GROMACS 文件格式，提供语法高亮、智能补全、参数提示、错误检查等功能。

## ✨ 主要功能

### 🎨 语法高亮
- **MDP 文件** (`.mdp`) - 分子动力学参数文件，支持不同参数的语义着色
- **TOP 文件** (`.top`, `.itp`) - 拓扑结构文件
- **STRUCTURE 文件** (`.gro`, `.pdb`) - 结构坐标文件，支持不同残基的语义着色
- **NDX 文件** (`.ndx`) - 索引组文件
- **PKA 文件** (`.pka`) - PROPKA pKa 预测结果文件，提供全面的分析支持
- **Packmol 文件** (`.packmol`, `.inp`) - Packmol 输入文件，支持语法高亮和结构预览

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

### 🧮 单位转换器
- **专业单位转换计算器** - 专为分子动力学模拟设计
  - 长度单位：nm、Å、pm、m、cm、mm
  - 时间单位：fs、ps、ns、μs、ms、s
  - 温度单位：K、°C（包含温度偏移转换）
  - 能量单位：J、kJ/mol、kJ/kg、J/g、eV、cal、kcal/mol
  - 面积单位：nm²、Å²、m²、cm²
  - 电势单位：V、mV、kV
  - 提供常用转换参考表和快速转换按钮
  - 现代化的WebView界面，支持VS Code主题
  - 通过命令面板 "GROMACS Helper: Open Unit Converter" 访问

### 🔍 GROMACS 进程监控
- **实时监控运行状态** - VS Code 状态栏显示 GROMACS 进程信息
  - 🖥️ **本地监控**：自动检测本地运行的 `gmx` 进程
  - 🌐 **远程监控**：通过 SSH 监控远程服务器上的 GROMACS 任务
  - 📊 **智能进度显示**：
    - mdrun 剩余时间倒计时（精确到秒）
    - 当前模拟时间（ns/μs）
    - 当前步数和进度百分比
  - 🔄 **多目标管理**：
    - 统一配置本地和远程监控目标
    - 支持多个目标自动轮转显示
    - 可为重要任务创建独立状态栏项
  - 💡 **智能交互**：
    - 鼠标悬浮显示详细信息（工作目录、日志文件、完整命令等）
    - 本地监控支持点击打开工作目录
    - 自动轮转时鼠标悬浮可暂停切换
  - ⚠️ **错误处理**：连接失败或解析错误时显示错误图标和详细原因
  - ⚙️ **灵活配置**：自定义刷新间隔、轮转间隔、SSH 连接参数等
  - 🚀 **开箱即用**：默认启用本地监控，无需配置即可使用
  - 🛠️ **交互式向导**：通过命令面板快速添加和管理监控目标

### 📝 代码片段
- 常用 MDP 配置模板
- 一键生成标准模拟流程配置
- **🆕 自定义片段管理** - 创建、编辑和管理个性化的 MDP 片段
  - 添加带有智能占位符的自定义片段
  - 编辑片段内容、前缀和描述
  - 从侧边栏视图或自动补全快速插入
  - 内置片段管理器，提供可视化界面

### 🎯 错误检查
- MDP 文件参数语法验证
- 增强的值范围检查
- 格式错误提示
- PDB 文件关键标记分析

## 🚀 支持的文件格式

| 文件类型 | 扩展名 | 描述 | 功能支持 |
|---------|--------|------|---------|
| MDP | `.mdp` | 分子动力学参数文件 | 语法高亮、智能补全、悬停提示、错误检查、语义着色 |
| Topology | `.top`, `.itp` | 拓扑结构文件 | 语法高亮、符号导航、代码折叠 |
| Structure | `.gro`、`.pdb` | 结构坐标文件 | 语法高亮、符号导航、残基语义着色 |
| Index | `.ndx` | 索引组文件 | 语法高亮、符号导航、代码折叠 |
| XVG Data | `.xvg` | 绘图数据文件 | 语法高亮显示、交互式图表预览、数据分析 |
| PKA Results | `.pka` | PROPKA pKa 预测文件 | 语法高亮、悬停提示、符号导航、代码折叠 |
| Packmol | `.packmol` | Packmol 输入文件 | 语法高亮、结构预览、格式化、智能补全 |

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

### PKA 文件支持
- **PROPKA 结果分析**：完整支持 PROPKA pKa 预测输出文件
- **智能解析**：自动识别不同部分（文件头、残基表格、摘要、能量分析）
- **智能悬停信息**：残基类型、pKa 值、相互作用贡献的详细说明
- **符号导航**：快速跳转到特定残基、分析部分和关键发现
- **代码折叠**：通过折叠部分（文件头、参考文献、残基条目、摘要）来组织复杂的 pKa 文件

**功能特点：**
- 残基名称、pKa 值、相互作用数据和节区标题的语法高亮
- 文档大纲，快速导航不同分析部分
- 悬停提示解释残基属性、pKa 意义和相互作用类型
- 代码折叠，更好地组织复杂的 PROPKA 输出文件

## ⚙️ 配置选项

### GROMACS 进程监控配置

#### 快速开始（推荐）

监控功能**默认已启用**并配置了本地监控，无需手动配置即可使用！

**使用交互式向导添加监控目标：**

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 搜索 "GROMACS Helper: Add GROMACS Monitor Target"
3. 根据提示选择监控类型（本地/远程）
4. 输入名称和连接信息
5. 完成！监控将自动开始

**管理现有监控目标：**

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 搜索 "GROMACS Helper: Manage GROMACS Monitor Targets"
3. 选择要管理的目标，可以删除、切换显示模式或编辑配置

#### 手动配置（高级用户）

在 VS Code 设置中（`settings.json`）配置 GROMACS 监控：

```json
{
  // 启用 GROMACS 监控
  "gromacsHelper.monitor.enabled": true,
  
  // 刷新间隔（毫秒）
  "gromacsHelper.monitor.refreshInterval": 5000,
  
  // 多目标轮转间隔（毫秒）
  "gromacsHelper.monitor.rotateInterval": 10000,
  
  // 监控目标配置
  "gromacsHelper.monitor.targets": [
    {
      // 默认本地监控（已预配置）
      "id": "local-default",
      "name": "Local",
      "type": "local",
      "independent": false
    },
    {
      // 本地监控示例
      "id": "local-1",
      "name": "本地GPU1",
      "type": "local",
      "independent": false  // false=合并显示，true=独立状态栏
    },
    {
      // 远程 SSH 监控示例
      "id": "remote-server1",
      "name": "服务器A",
      "type": "remote",
      "independent": false,
      "sshHost": "user@server.example.com",
      "sshPort": 22,  // 可选，默认 22
      "sshKey": "/home/user/.ssh/id_rsa",  // 可选，SSH 私钥路径
      "scriptPath": "~/.vscode/gromacs_monitor.sh"  // 可选，默认值
    },
    {
      // 重要任务使用独立状态栏
      "id": "important-job",
      "name": "关键任务",
      "type": "remote",
      "independent": true,  // 创建独立的状态栏项
      "sshHost": "user@hpc.example.com"
    }
  ]
}
```

**配置说明：**

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enabled` | boolean | `false` | 是否启用监控功能 |
| `refreshInterval` | number | `5000` | 刷新间隔（毫秒），范围 1000-60000 |
| `rotateInterval` | number | `10000` | 多目标轮转间隔（毫秒），范围 2000-60000 |
| `targets` | array | `[]` | 监控目标配置数组 |

**监控目标字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 |
| `name` | string | ✅ | 显示名称 |
| `type` | string | ✅ | 监控类型：`"local"` 或 `"remote"` |
| `independent` | boolean | ❌ | 是否独立显示（默认 `false`，合并显示） |
| `sshHost` | string | ⚠️ | SSH 主机（格式：`user@hostname`，remote 类型必填） |
| `sshPort` | number | ❌ | SSH 端口（默认 22） |
| `sshKey` | string | ❌ | SSH 私钥路径（可选） |
| `scriptPath` | string | ❌ | 远程监控脚本路径（默认 `~/.vscode/gromacs_monitor.sh`） |

**使用提示：**

1. **本地监控**：设置 `type: "local"`，无需其他配置，点击状态栏可打开工作目录
2. **远程监控**：设置 `type: "remote"` 和 `sshHost`，首次连接时会自动部署监控脚本
3. **合并显示**：多个 `independent: false` 的目标会合并到一个状态栏项，自动轮转
4. **独立显示**：设置 `independent: true` 为重要任务创建专属状态栏项
5. **SSH 认证**：支持密钥认证（推荐）或密码认证（需配置 SSH 免密登录）

**状态栏显示格式：**

- 运行中：`$(sync~spin) 服务器A: 2h15m` - 剩余时间
- 运行中：`$(sync~spin) 服务器A: 123.5ns` - 当前模拟时间
- 空闲：`$(circle-outline) 服务器A: Idle` - 无进程
- 错误：`$(error) 服务器A: Error` - 连接或解析错误

### 其他配置选项

更多配置选项请参考 VS Code 设置界面或 `package.json`。

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

### [0.2.3] - 2025-08-11

#### ✨ 新增
- **PROPKA pKa 结果文件支持** - 完整支持 PROPKA 程序输出文件
  - 支持 `.pka` 文件扩展名和文件名模式匹配
  - 详细的语法高亮，包括残基类型、pKa 值、相互作用数据、节区标题等
  - 智能悬停提示：残基信息、参数说明、数值含义解释
  - 文档符号导航：快速跳转到特定残基、摘要部分、能量分析等
  - 代码折叠支持：可折叠文件头部、参考文献、残基表格、摘要、能量和电荷分析等节区
  - 完整的语言支持集成到扩展主系统中

#### 🔧 改进
- 增强了扩展对生物信息学文件格式的支持范围
- 优化了语言支持系统的可扩展性

### [0.2.0] - 2025-06-24

#### ✨ 新增
- **Packmol 文件支持** - 完整支持 Packmol 输入文件
  - 关键字、结构和约束的语法高亮
  - 3D 可视化的交互式结构预览
  - Packmol 参数的智能代码补全
  - 自动格式化和错误检测
- **增强的语义着色** - 改进不同元素的视觉区分
  - MDP 参数现在具有单独的语义着色
  - GRO 和 PDB 文件支持残基特定着色
  - 复杂文件的更好视觉组织
- **高级错误检查** - 增强的验证和诊断
  - 全面的 MDP 参数语法验证
  - 跨参数关系验证
  - PDB 文件关键标记分析和验证
- 🧮 **专业单位转换器** - 专为分子动力学模拟设计的工具
  - 支持长度单位：nm、Å、pm、m、cm、mm
  - 支持时间单位：fs、ps、ns、μs、ms、s
  - 支持温度单位：K、°C（包含温度偏移转换）
  - 支持能量单位：J、kJ/mol、kJ/kg、J/g、eV、cal、kcal/mol
  - 支持面积单位：nm²、Å²、m²、cm²
  - 支持电势单位：V、mV、kV
  - 提供常用转换参考表和快速转换按钮
  - 现代化的WebView界面，支持VS Code主题
  - 通过命令面板 "GROMACS Helper: Open Unit Converter" 访问

#### 🐛 修复
- 修复各种错误和稳定性改进

### [0.1.2] - 2025-06-24

#### 🐛 修复
- 允许预览 xvg 文件时将标记大小设置为 0

### [0.1.1] - 2025-06-24

#### 🐛 修复
- 修复项目中各种错误命名的链接

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
