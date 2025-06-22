# 发布流程说明

本文档说明如何使用GitHub Actions工作流进行版本发布和管理发布说明。

## 🚀 发布方式

### 1. 手动发布（推荐）

1. 前往项目的 **Actions** 页面
2. 选择 **Build and Release VS Code Extension** 工作流
3. 点击 **Run workflow** 按钮
4. 填写发布参数：
   - **版本号**: 新的版本号（如 0.0.3, 0.1.0, 1.0.0-beta.1）
   - **发布类型**: release/prerelease/draft
   - **创建GitHub Release**: 是否创建发布页面
   - **自定义发布说明**: 可选，输入自定义发布说明
   - **自动变更日志**: 是否从CHANGELOG.md读取变更信息
   - **发布到VS Code Marketplace**: 是否同时发布到扩展市场 🆕

### 2. 自动构建

推送到 `main` 或 `master` 分支时会自动触发构建，但不会创建正式发布。

## 📝 发布说明管理

### 自动读取CHANGELOG.md

工作流会自动从 `CHANGELOG.md` 文件中提取对应版本的变更信息。支持以下格式：

```markdown
## [0.0.3] - 2024-01-01
### 新增
- 新功能A
- 新功能B

### 修复
- 修复问题X
- 修复问题Y
```

或：

```markdown
## 0.0.3
- 新增功能A
- 修复问题X
```

或：

```markdown
# v0.0.3
- 改进了XXX
- 修复了XXX
```

### 自定义发布说明

如果需要为特定版本添加自定义发布说明：

1. 在运行工作流时，在"自定义发布说明"字段中输入内容
2. 自定义内容会显示在发布说明的最前面
3. 后面会自动附加标准的安装说明和功能特性

### 发布说明优先级

1. **自定义发布说明** - 如果提供了自定义内容，会优先使用
2. **CHANGELOG.md** - 如果启用自动变更日志且找到对应版本，会提取相关内容
3. **默认模板** - 使用标准的功能特性描述

## 📋 CHANGELOG.md 格式建议

为了确保工作流能正确提取变更信息，建议按以下格式维护CHANGELOG.md：

```markdown
# 更新日志

## [未发布]
### 新增
- 待发布的新功能

## [0.0.3] - 2024-01-15
### 新增
- 新增功能A
- 新增功能B

### 改进
- 改进了功能C
- 优化了性能

### 修复
- 修复了问题X
- 修复了问题Y

## [0.0.2] - 2024-01-01
### 新增
- 初始功能实现
```

### 版本号格式支持

- `## [0.0.3] - 日期` （推荐）
- `## 0.0.3`
- `# v0.0.3`

## 🔄 发布流程最佳实践

1. **开发阶段**: 在 `## [未发布]` 部分记录变更
2. **准备发布**: 将未发布的内容移动到新版本号下
3. **配置Marketplace**: 首次发布需要配置VS Code Marketplace (参见 [MARKETPLACE_SETUP.md](./MARKETPLACE_SETUP.md))
4. **测试发布**: 先创建prerelease进行测试
5. **正式发布**: 运行工作流，选择release类型
6. **验证结果**: 检查GitHub Release和Marketplace页面

## 🏪 VS Code Marketplace 发布

### 首次配置

在使用Marketplace自动发布功能前，需要完成一次性配置：

1. 创建VS Code Marketplace Publisher账号
2. 获取Personal Access Token (PAT)  
3. 在GitHub仓库中配置 `VSCE_PAT` secret

详细配置步骤请参见: [MARKETPLACE_SETUP.md](./MARKETPLACE_SETUP.md)

### 发布规则

- 🟢 **Release**: 会同时发布到GitHub Release和VS Code Marketplace
- 🟡 **Prerelease**: 只发布到GitHub Release，不发布到Marketplace  
- 🔵 **Draft**: 创建草稿Release，不发布到Marketplace

### 安装方式对比

发布到Marketplace后，用户有多种安装方式：

| 方式 | 命令/步骤 | 适用场景 |
|------|-----------|----------|
| **Marketplace安装** | 在VS Code中搜索"GROMACS Helper" | 🌟 推荐给普通用户 |
| **命令行安装** | `code --install-extension publisher.extension-name` | 开发者和自动化 |
| **VSIX文件安装** | 下载.vsix文件手动安装 | 测试版本或离线环境 |

## 🛠️ 故障排除

### CHANGELOG.md 无法解析

如果工作流无法从CHANGELOG.md提取内容：

1. 检查版本号格式是否正确
2. 确保CHANGELOG.md文件存在于根目录
3. 可以手动输入自定义发布说明作为备选方案

### 发布说明格式问题

- 自定义发布说明支持Markdown格式
- 注意特殊字符的转义
- 建议先在本地预览Markdown格式

### Marketplace发布失败

常见问题及解决方案：

1. **Authentication failed**: 检查 `VSCE_PAT` secret配置
2. **Publisher not found**: 验证package.json中的publisher字段
3. **Version already exists**: 版本号重复，需要更新版本号
4. **Package validation failed**: 检查package.json格式和必需字段

详细故障排除指南: [MARKETPLACE_SETUP.md](./MARKETPLACE_SETUP.md#故障排除)

## 📖 参考示例

查看项目的实际发布页面了解发布说明的最终效果：
[Releases页面](https://github.com/gromacs-helper/gromacs-helper-vscode/releases)
