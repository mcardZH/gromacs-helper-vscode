# GitHub Actions 配置完成总结

已为您的 GROMACS Helper VS Code 扩展项目成功配置了完整的 GitHub Actions 自动化流程！

## 📁 创建的文件

### GitHub Actions 工作流
```
.github/
├── workflows/
│   ├── build-and-release.yml    # 主要构建和发布工作流
│   ├── pr-check.yml             # Pull Request 质量检查
│   └── ci.yml                   # 持续集成工作流
└── ACTIONS_GUIDE.md             # 详细使用指南
```

### 辅助脚本
```
scripts/
├── test-actions.sh              # 本地测试Actions配置
└── release.sh                   # 智能发布脚本
```

## 🚀 工作流功能

### 1. 构建和发布工作流 (`build-and-release.yml`)

**触发条件:**
- ✋ **手动触发**: 支持版本号更新和创建 GitHub Release
- 🔄 **自动触发**: 推送到 main/master 分支时自动构建
- 🔍 **PR 触发**: Pull Request 时进行构建验证

**手动触发功能:**
- 📝 输入新版本号 (如: 0.0.3, 1.0.0-beta.1)
- 🎯 选择发布类型 (release/prerelease/draft)
- 📦 自动创建 GitHub Release
- 🏷️ 自动生成 Git 标签
- 📋 更新 package.json 版本号

**自动构建功能:**
- 🔢 生成带构建号的版本 (如: 0.0.2+build.123)
- 💾 保存为 GitHub Artifacts
- 🔄 不修改源代码版本号

### 2. PR 质量检查工作流 (`pr-check.yml`)

**功能:**
- 🔍 代码质量检查 (ESLint)
- 🏗️ 编译验证
- 🧪 自动化测试
- 📦 构建验证

### 3. 持续集成工作流 (`ci.yml`)

**功能:**
- 🔄 持续集成构建
- 📊 构建状态监控
- 🗃️ 短期产物存储 (7天)

## 🛠️ 使用方法

### 手动发布新版本

#### 方法一：使用 GitHub 网页界面
1. 进入仓库的 **Actions** 标签页
2. 选择 **"Build and Release VS Code Extension"**
3. 点击 **"Run workflow"**
4. 填写参数：
   - 新版本号: `0.0.3`
   - 发布类型: `prerelease`
   - 创建Release: `true`

#### 方法二：使用发布脚本
```bash
./scripts/release.sh
```

#### 方法三：使用 GitHub CLI
```bash
gh workflow run build-and-release.yml \
  -f version="0.0.3" \
  -f release_type="prerelease" \
  -f create_release="true"
```

### 自动构建
只需推送代码到 main 分支：
```bash
git push origin main
```

### 本地测试
```bash
./scripts/test-actions.sh
```

## 🎯 版本管理策略

### 自动构建版本格式
```
原版本号+build.构建号.提交哈希
例如: 0.0.2+build.123.a1b2c3d
```

### 发布版本格式 (语义化版本)
- **主版本**: 1.0.0 (破坏性更改)
- **次版本**: 0.1.0 (新功能)
- **修订版**: 0.0.1 (bug修复)
- **预发布**: 0.1.0-beta.1 (测试版本)

## 📊 构建产物

### 手动发布
- ✅ 更新 package.json 版本号
- 🏷️ 创建 Git 标签
- 📋 创建 GitHub Release
- 📎 包含 VSIX 安装文件
- 📝 自动生成发布说明

### 自动构建
- 📦 生成带构建号的 VSIX 文件
- 💾 保存为 GitHub Artifacts (30天)
- 🔄 不修改源代码

## 🔧 配置说明

### 环境要求
- Node.js 18.x
- npm 或 yarn
- @vscode/vsce (自动安装)

### 权限设置
- `GITHUB_TOKEN`: 自动提供，用于创建 Release
- Actions 权限: 需要启用仓库的 Actions 功能

### 忽略规则
自动构建忽略以下文件变更：
- `**.md` (文档文件)
- `.gitignore`
- `LICENSE`
- `.github/**` (工作流文件本身)

## 📚 监控和调试

### 查看构建状态
- GitHub Actions: https://github.com/[username]/gromacs-helper-vscode/actions
- Releases: https://github.com/[username]/gromacs-helper-vscode/releases

### 构建徽章
已添加到 README.md:
```markdown
[![Build Status](https://img.shields.io/github/actions/workflow/status/gromacs-helper/gromacs-helper-vscode/build-and-release.yml?branch=main&style=flat-square&label=build)](https://github.com/gromacs-helper/gromacs-helper-vscode/actions)
```

### 调试技巧
1. 查看 Actions 运行日志
2. 使用本地测试脚本验证
3. 检查 package.json 配置
4. 验证文件路径和权限

## 🎉 下一步

1. **推送配置**: 将所有文件推送到 GitHub 仓库
2. **测试自动构建**: 推送一个小改动到 main 分支
3. **测试手动发布**: 使用 GitHub 界面触发一次发布
4. **配置仓库设置**: 确保 Actions 权限已启用

## 📖 详细文档

更多详细信息请查看：
- `.github/ACTIONS_GUIDE.md` - 完整使用指南
- 各工作流文件中的注释说明

## 🎯 优势总结

✅ **完全自动化**: 从构建到发布的全流程自动化  
✅ **版本管理**: 智能版本号管理和标签创建  
✅ **质量保证**: 自动化测试和代码检查  
✅ **灵活发布**: 支持正式版、预发版、草稿版  
✅ **监控完善**: 详细的构建状态和日志记录  
✅ **易于使用**: 提供多种触发方式和辅助脚本  

现在您可以享受现代化的 CI/CD 流程，专注于代码开发而无需担心构建和发布的繁琐流程！
