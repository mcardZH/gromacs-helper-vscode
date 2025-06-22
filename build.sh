#!/bin/bash

# GROMACS Helper VS Code Extension 一键打包脚本
# 作者: mcardzh
# 日期: 2025-06-22

set -e  # 遇到错误时退出

echo "🚀 GROMACS Helper VS Code Extension 打包工具"
echo "============================================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查必要的依赖
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 请先安装 npm"
    exit 1
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 当前版本: $CURRENT_VERSION"

# 提示版本号格式
echo ""
echo "版本号格式说明:"
echo "  - 主版本.次版本.修订版本 (例如: 1.0.0)"
echo "  - 预发布版本 (例如: 1.0.0-beta.1)"
echo "  - 开发版本 (例如: 0.1.0)"
echo ""

# 询问新版本号
while true; do
    read -p "🔢 请输入新版本号 (当前: $CURRENT_VERSION): " NEW_VERSION
    
    # 如果用户直接回车，使用当前版本
    if [ -z "$NEW_VERSION" ]; then
        NEW_VERSION=$CURRENT_VERSION
        echo "✅ 使用当前版本: $NEW_VERSION"
        break
    fi
    
    # 验证版本号格式 (简单的正则验证)
    if [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9\.-]+)?$ ]]; then
        echo "✅ 版本号格式正确: $NEW_VERSION"
        break
    else
        echo "❌ 版本号格式错误，请使用 x.y.z 格式 (例如: 1.0.0)"
    fi
done

# 询问是否要更新版本号
if [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
    echo ""
    echo "📝 将要进行的操作:"
    echo "  - 更新版本: $CURRENT_VERSION → $NEW_VERSION"
    echo "  - 编译 TypeScript 代码"
    echo "  - 打包为 VSIX 文件"
    echo ""
    
    read -p "❓ 确认继续? (y/N): " CONFIRM
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        echo "❌ 操作已取消"
        exit 0
    fi
    
    # 更新 package.json 中的版本号
    echo "📝 更新版本号..."
    if command -v sed &> /dev/null; then
        # macOS 使用 BSD sed
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
        else
            # Linux 使用 GNU sed
            sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
        fi
        echo "✅ 版本号已更新为: $NEW_VERSION"
    else
        echo "❌ 错误: 无法找到 sed 命令，请手动更新 package.json 中的版本号"
        exit 1
    fi
fi

echo ""
echo "🔧 开始构建过程..."

# 安装依赖 (如果需要)
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查是否有 vsce
if ! npm list @vscode/vsce &> /dev/null; then
    echo "📦 安装 vsce 打包工具..."
    npm install @vscode/vsce --save-dev
fi

# 清理之前的构建文件
echo "🧹 清理旧文件..."
rm -f *.vsix
rm -rf dist

# 编译项目
echo "⚙️  编译 TypeScript..."
npm run compile

# 打包扩展
echo "📦 打包扩展..."
npx vsce package --allow-star-activation

# 获取生成的文件名
VSIX_FILE="gromacs-helper-vscode-$NEW_VERSION.vsix"

if [ -f "$VSIX_FILE" ]; then
    FILE_SIZE=$(ls -lh "$VSIX_FILE" | awk '{print $5}')
    echo ""
    echo "🎉 打包成功!"
    echo "============================================="
    echo "📁 生成文件: $VSIX_FILE"
    echo "📏 文件大小: $FILE_SIZE"
    echo "📍 文件路径: $(pwd)/$VSIX_FILE"
    echo ""
    echo "🔧 安装命令:"
    echo "  code --install-extension $VSIX_FILE"
    echo ""
    echo "📤 分享文件:"
    echo "  将 $VSIX_FILE 发送给其他用户即可安装"
    echo ""
    
    # 询问是否立即安装
    read -p "❓ 是否立即安装到当前编辑器? (y/N): " INSTALL_NOW
    if [[ $INSTALL_NOW =~ ^[Yy]$ ]]; then
        echo "🔧 安装扩展..."
        if code --install-extension "$VSIX_FILE"; then
            echo "✅ 扩展安装成功!"
            echo "💡 重启编辑器以确保扩展正常工作"
        else
            echo "❌ 扩展安装失败，请手动安装"
        fi
    fi
    
    # 询问是否创建发布说明
    echo ""
    read -p "❓ 是否创建发布说明文件? (y/N): " CREATE_CHANGELOG
    if [[ $CREATE_CHANGELOG =~ ^[Yy]$ ]]; then
        CHANGELOG_FILE="RELEASE-$NEW_VERSION.md"
        cat > "$CHANGELOG_FILE" << EOF
# GROMACS Helper v$NEW_VERSION 发布说明

发布日期: $(date '+%Y年%m月%d日')

## 🆕 新功能
- [ ] 添加新功能描述

## 🐛 问题修复
- [ ] 修复问题描述

## 🔧 改进
- [ ] 改进描述

## 📦 安装方法

### 直接安装
\`\`\`bash
code --install-extension $VSIX_FILE
\`\`\`

### 从 VS Code 界面安装
1. 打开 VS Code
2. 按 \`Ctrl+Shift+P\` (macOS: \`Cmd+Shift+P\`)
3. 输入 "Extensions: Install from VSIX..."
4. 选择 \`$VSIX_FILE\` 文件

## 💾 下载
- 文件: \`$VSIX_FILE\`
- 大小: $FILE_SIZE
- 校验: \`md5sum $VSIX_FILE\`

EOF
        echo "📝 已创建发布说明: $CHANGELOG_FILE"
    fi
    
else
    echo "❌ 打包失败!"
    exit 1
fi

echo ""
echo "🎊 所有操作完成!"
