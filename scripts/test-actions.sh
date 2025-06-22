#!/bin/bash

# GitHub Actions 本地测试脚本
# 用于验证Actions配置是否正确

set -e

echo "🧪 GitHub Actions 本地测试"
echo "=========================="

# 检查必要的工具
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ 错误: 未找到 $1，请先安装"
        exit 1
    fi
}

echo "🔍 检查依赖..."
check_dependency "node"
check_dependency "npm"

# 检查项目结构
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 模拟Actions环境
echo "📋 当前环境信息:"
echo "  Node.js版本: $(node --version)"
echo "  npm版本: $(npm --version)"
echo "  当前版本: $(node -p "require('./package.json').version")"

echo ""
echo "🔧 模拟Actions步骤..."

# 步骤1: 安装依赖
echo "📦 安装依赖..."
npm ci

# 步骤2: 代码检查
echo "🔍 代码检查..."
npm run lint

# 步骤3: 编译项目
echo "🏗️ 编译项目..."
npm run compile

# 步骤4: 运行测试 (如果存在)
echo "🧪 运行测试..."
if npm run | grep -q "test"; then
    npm test
else
    echo "⏭️ 跳过测试 - 未配置测试命令"
fi

# 步骤5: 打包扩展
echo "📦 打包扩展..."
if ! command -v vsce &> /dev/null; then
    echo "📥 安装vsce..."
    npm install -g @vscode/vsce
fi

# 获取版本信息
CURRENT_VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_VERSION="${CURRENT_VERSION}+test.${TIMESTAMP}"

echo "🏷️ 测试版本: $TEST_VERSION"

# 创建测试构建
vsce package --out "gromacs-helper-vscode-${TEST_VERSION}.vsix"

echo ""
echo "✅ 本地测试完成!"
echo "📄 生成的测试包: gromacs-helper-vscode-${TEST_VERSION}.vsix"
echo ""
echo "🧪 可以通过以下方式安装测试:"
echo "  code --install-extension gromacs-helper-vscode-${TEST_VERSION}.vsix"
echo ""
echo "🗑️ 清理测试文件:"
echo "  rm gromacs-helper-vscode-${TEST_VERSION}.vsix"

# 验证Actions配置文件
echo ""
echo "🔧 验证Actions配置..."
ACTIONS_DIR=".github/workflows"

if [ -d "$ACTIONS_DIR" ]; then
    echo "✅ Actions目录存在"
    
    for file in "$ACTIONS_DIR"/*.yml "$ACTIONS_DIR"/*.yaml; do
        if [ -f "$file" ]; then
            echo "✅ 发现工作流: $(basename "$file")"
        fi
    done
else
    echo "❌ 未找到Actions配置目录"
fi

echo ""
echo "📚 下一步:"
echo "  1. 将代码推送到GitHub仓库"
echo "  2. 在GitHub Actions页面查看自动构建"
echo "  3. 使用手动触发进行版本发布"
echo ""
echo "📖 详细说明请查看: .github/ACTIONS_GUIDE.md"
