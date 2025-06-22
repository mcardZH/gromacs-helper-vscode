# GROMACS Helper VS Code Extension Installation Guide

## 📦 安装扩展

恭喜！您的 GROMACS Helper VS Code 扩展已经成功编译并打包。

### 生成的文件
- `gromacs-helper-vscode-0.0.1.vsix` - 可安装的扩展包 (74.87 KB)

### 安装方法

#### 方法 1: 命令行安装
```bash
code --install-extension gromacs-helper-vscode-0.0.1.vsix
```

#### 方法 2: VS Code 界面安装
1. 打开 VS Code
2. 按 `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`) 打开命令面板
3. 输入 "Extensions: Install from VSIX..."
4. 选择 `gromacs-helper-vscode-0.0.1.vsix` 文件

#### 方法 3: 拖拽安装
直接将 `.vsix` 文件拖拽到 VS Code 窗口中

### 验证安装
1. 创建一个测试文件 `test.mdp`
2. 输入 GROMACS 参数，应该能看到语法高亮和自动补全
3. 悬停在参数上应该显示参数说明

### 支持的功能
✅ MDP 文件语法高亮和智能补全
✅ TOP/ITP 文件支持  
✅ GRO 文件语法高亮
✅ NDX 文件支持
✅ 代码片段和模板
✅ 悬停提示和参数文档

### 下一步
- 可以将 `.vsix` 文件分享给其他用户安装
- 如需发布到 VS Code Marketplace，需要创建发布者账号
- 建议为项目创建 Git 仓库并推送到 GitHub

## 🔧 开发者工具

### 一键打包脚本
项目提供了自动化构建脚本，可以方便地更新版本号并打包扩展：

#### macOS/Linux 系统
```bash
./build.sh
```

#### Windows 系统
```cmd
build.bat
```

### 构建脚本功能
- ✅ 自动询问并更新版本号
- ✅ 验证版本号格式
- ✅ 自动编译 TypeScript 代码
- ✅ 清理旧文件
- ✅ 打包为 VSIX 文件
- ✅ 可选择立即安装
- ✅ 自动生成发布说明

### 手动构建步骤
如果不使用自动化脚本，也可以手动执行以下步骤：

1. **更新版本号** - 修改 `package.json` 中的 `version` 字段
2. **安装依赖** - `npm install`
3. **编译代码** - `npm run compile`
4. **打包扩展** - `npx vsce package --allow-star-activation`

### 开发环境
- VS Code 版本要求: ^1.60.0 或更高
- 兼容 Cursor 编辑器
- 文件大小: 74.87 KB
- 包含 24 个文件

🎉 享受您的 GROMACS 开发体验！
