# VS Code Marketplace 发布配置指南

本指南将帮助你配置自动发布到 VS Code Marketplace 的功能。

## 🔑 配置步骤

### 1. 获取 Personal Access Token (PAT)

1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 点击右上角的用户头像，选择 "Personal access tokens"
3. 点击 "+ New Token"
4. 配置Token：
   - **Name**: `GROMACS Helper VSCE Token` (或其他描述性名称)
   - **Organization**: 选择 "All accessible organizations"
   - **Expiration**: 建议选择较长期限，如1年
   - **Scopes**: 选择 "Custom defined"，然后勾选：
     - **Marketplace**: 选择 "Acquire" 和 "Manage"
5. 点击 "Create"
6. **重要**: 复制生成的token，这是唯一一次可以看到完整token的机会

### 2. 在GitHub仓库中配置Secret

1. 打开你的GitHub仓库
2. 进入 **Settings** > **Secrets and variables** > **Actions**
3. 点击 **New repository secret**
4. 配置Secret：
   - **Name**: `VSCE_PAT`
   - **Secret**: 粘贴步骤1中获得的Personal Access Token
5. 点击 **Add secret**

### 3. 验证配置

确保你的 `package.json` 文件包含必要的发布信息：

```json
{
  "name": "gromacs-helper-vscode",
  "publisher": "your-publisher-name",
  "displayName": "GROMACS Helper",
  "description": "VS Code extension for GROMACS molecular dynamics files",
  "version": "0.0.2",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": [
    "Programming Languages",
    "Snippets",
    "Formatters"
  ],
  "keywords": [
    "gromacs",
    "molecular dynamics",
    "mdp",
    "top",
    "gro",
    "ndx"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/gromacs-helper-vscode.git"
  },
  "bugs": {
    "url": "https://github.com/your-username/gromacs-helper-vscode/issues"
  },
  "homepage": "https://github.com/your-username/gromacs-helper-vscode#readme"
}
```

### 4. 获取Publisher名称

如果你还没有VS Code Marketplace的Publisher账号：

1. 访问 [VS Code Marketplace管理页面](https://marketplace.visualstudio.com/manage)
2. 使用与Azure DevOps相同的Microsoft账号登录
3. 创建新的Publisher或使用现有的
4. 记录你的Publisher名称，需要在 `package.json` 中使用

## 🚀 使用方法

### 发布到Marketplace

1. 前往GitHub仓库的 **Actions** 页面
2. 选择 **Build and Release VS Code Extension** 工作流
3. 点击 **Run workflow**
4. 配置参数：
   - **版本号**: 输入新版本号
   - **发布类型**: 选择 `release` (只有正式发布才会上传到Marketplace)
   - **创建GitHub Release**: 选择 `true`
   - **发布到VS Code Marketplace**: 选择 `true` ✅
   - 其他参数按需配置
5. 点击 **Run workflow**

### 发布流程

工作流将按以下顺序执行：

1. **Build** - 构建和打包扩展
2. **Release** - 创建GitHub Release
3. **Marketplace** - 发布到VS Code Marketplace (仅当配置启用时)
4. **Summary** - 生成完整的构建和发布报告

## ⚠️ 重要注意事项

### 安全性
- 永远不要在代码中硬编码PAT token
- PAT token应该只通过GitHub Secrets传递
- 定期更新PAT token，避免过期

### 发布策略
- **prerelease** 和 **draft** 版本不会自动发布到Marketplace
- 只有 **release** 类型的版本才会发布到Marketplace
- 建议先创建 prerelease 进行测试，确认无误后再发布正式版本

### 版本管理
- Marketplace不允许重复发布相同版本号
- 如果发布失败，需要更新版本号后重新发布
- 遵循语义化版本控制 (SemVer) 规范

## 🛠️ 故障排除

### 常见错误及解决方案

#### 1. "Authentication failed"
- 检查 VSCE_PAT secret 是否正确配置
- 验证PAT token是否有效且未过期
- 确认token具有Marketplace的 "Acquire" 和 "Manage" 权限

#### 2. "Publisher not found"
- 检查 package.json 中的 publisher 字段
- 确认Publisher在VS Code Marketplace中存在
- 验证PAT token的账号与Publisher账号一致

#### 3. "Version already exists"
- VS Code Marketplace不允许覆盖已存在的版本
- 需要更新版本号后重新发布
- 可以在Marketplace管理页面中检查已发布的版本

#### 4. "Package validation failed"
- 检查 package.json 文件格式是否正确
- 确认所有必需字段都已填写
- 验证文件路径和引用是否正确

### 测试发布流程

在正式发布前，建议：

1. 先发布为 **prerelease** 到GitHub Release
2. 本地测试VSIX文件
3. 确认功能正常后，再启用Marketplace发布

## 📊 监控和分析

发布成功后，你可以：

1. 在 [VS Code Marketplace管理页面](https://marketplace.visualstudio.com/manage) 查看扩展状态
2. 监控下载和安装统计
3. 查看用户评价和反馈
4. 管理扩展的描述、图标等信息

## 🔗 相关资源

- [VS Code扩展发布官方文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce命令行工具文档](https://github.com/microsoft/vscode-vsce)
- [Azure DevOps Personal Access Tokens](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
