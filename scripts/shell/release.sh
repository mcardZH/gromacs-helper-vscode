#!/bin/bash

# 安全版本发布脚本
# 集成GitHub Actions自动化流程

set -e

echo "🚀 GROMACS Helper 版本发布工具"
echo "============================="

# 检查Git状态
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ 错误: 工作区有未提交的更改，请先提交或stash"
    git status --short
    exit 1
fi

# 检查当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    echo "⚠️  警告: 当前不在主分支 ($CURRENT_BRANCH)"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 当前版本: $CURRENT_VERSION"

# 获取版本历史
echo ""
echo "📚 最近的版本标签:"
git tag --sort=-version:refname | head -5

echo ""
echo "🎯 发布选项:"
echo "  1. 补丁版本 (bug修复): $CURRENT_VERSION -> $(npm version patch --dry-run)"
echo "  2. 次要版本 (新功能): $CURRENT_VERSION -> $(npm version minor --dry-run)"
echo "  3. 主要版本 (破坏性更改): $CURRENT_VERSION -> $(npm version major --dry-run)"
echo "  4. 预发布版本: $CURRENT_VERSION -> $(npm version prerelease --dry-run)"
echo "  5. 自定义版本"
echo "  6. 仅构建 (不更新版本)"

echo ""
read -p "请选择发布类型 (1-6): " RELEASE_TYPE

case $RELEASE_TYPE in
    1)
        NEW_VERSION=$(npm version patch --dry-run)
        VERSION_TYPE="patch"
        ;;
    2)
        NEW_VERSION=$(npm version minor --dry-run)
        VERSION_TYPE="minor"
        ;;
    3)
        NEW_VERSION=$(npm version major --dry-run)
        VERSION_TYPE="major"
        ;;
    4)
        NEW_VERSION=$(npm version prerelease --dry-run)
        VERSION_TYPE="prerelease"
        ;;
    5)
        read -p "请输入新版本号 (如 1.0.0): " CUSTOM_VERSION
        if [[ ! $CUSTOM_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-.*)?$ ]]; then
            echo "❌ 错误: 版本号格式不正确"
            exit 1
        fi
        NEW_VERSION="v$CUSTOM_VERSION"
        VERSION_TYPE="custom"
        ;;
    6)
        echo "🏗️ 仅构建模式 - 将触发GitHub Actions自动构建"
        git push origin $CURRENT_BRANCH
        echo "✅ 代码已推送，GitHub Actions将自动构建"
        echo "📊 查看构建状态: https://github.com/mcardzh/gromacs-helper-vscode/actions"
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🔄 发布计划:"
echo "  当前版本: $CURRENT_VERSION"
echo "  新版本: $NEW_VERSION"
echo "  发布类型: $VERSION_TYPE"

echo ""
read -p "确认发布? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 发布已取消"
    exit 1
fi

echo ""
echo "🚀 开始发布流程..."

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin $CURRENT_BRANCH

# 运行本地测试
echo "🧪 运行本地测试..."
npm ci
npm run lint
npm run compile

# 更新版本号
if [[ $VERSION_TYPE == "custom" ]]; then
    npm version $CUSTOM_VERSION --no-git-tag-version
else
    npm version $VERSION_TYPE --no-git-tag-version
fi

FINAL_VERSION=$(node -p "require('./package.json').version")
echo "✅ 版本已更新到: $FINAL_VERSION"

# 提交版本更改
echo "📝 提交版本更改..."
git add package.json
git commit -m "chore: bump version to $FINAL_VERSION"

# 推送到远程
echo "📤 推送到远程仓库..."
git push origin $CURRENT_BRANCH

echo ""
echo "🎯 选择发布类型:"
echo "  1. 正式发布 (release)"
echo "  2. 预发布 (prerelease)"
echo "  3. 草稿 (draft)"

read -p "请选择 (1-3): " GITHUB_RELEASE_TYPE

case $GITHUB_RELEASE_TYPE in
    1) RELEASE_TYPE_NAME="release" ;;
    2) RELEASE_TYPE_NAME="prerelease" ;;
    3) RELEASE_TYPE_NAME="draft" ;;
    *) RELEASE_TYPE_NAME="prerelease" ;;
esac

echo ""
echo "🤖 触发GitHub Actions发布..."

# 检查是否安装了gh CLI
if command -v gh &> /dev/null; then
    echo "📋 使用GitHub CLI触发工作流..."
    gh workflow run build-and-release.yml \
        -f version="$FINAL_VERSION" \
        -f release_type="$RELEASE_TYPE_NAME" \
        -f create_release="true"
    
    echo "✅ GitHub Actions工作流已触发"
    echo "📊 查看进度: https://github.com/mcardzh/gromacs-helper-vscode/actions"
else
    echo "⚠️  未安装GitHub CLI (gh)"
    echo "📋 请手动触发GitHub Actions:"
    echo "  1. 访问: https://github.com/mcardzh/gromacs-helper-vscode/actions"
    echo "  2. 选择 'Build and Release VS Code Extension' 工作流"
    echo "  3. 点击 'Run workflow'"
    echo "  4. 填写参数:"
    echo "     - 新版本号: $FINAL_VERSION"
    echo "     - 发布类型: $RELEASE_TYPE_NAME"
    echo "     - 创建GitHub Release: true"
fi

echo ""
echo "🎉 发布流程完成!"
echo "📋 发布信息:"
echo "  版本: $FINAL_VERSION"
echo "  类型: $RELEASE_TYPE_NAME"
echo "  分支: $CURRENT_BRANCH"
echo ""
echo "📊 监控发布进度:"
echo "  GitHub Actions: https://github.com/mcardzh/gromacs-helper-vscode/actions"
echo "  Releases: https://github.com/mcardzh/gromacs-helper-vscode/releases"
echo ""
echo "📱 发布完成后，可以通过以下方式安装:"
echo "  1. 从GitHub Releases下载VSIX文件"
echo "  2. 在VS Code中: Extensions -> Install from VSIX..."
echo ""
echo "✨ 感谢使用GROMACS Helper发布工具!"
