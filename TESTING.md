# 测试说明

## 本地开发环境测试

在本地开发环境中，你可以运行完整的 VS Code 扩展测试：

```bash
# 运行所有测试（包括 VS Code 扩展测试）
npm test

# 编译测试文件
npm run compile-tests

# 监听模式编译测试
npm run watch-tests
```

## CI/CD 环境

在 GitHub Actions 等 CI 环境中，由于无头模式的限制，我们运行轻量级的构建验证测试：

- ✅ 验证 package.json 配置
- ✅ 验证编译产物存在
- ✅ 验证语言配置文件
- ✅ 验证代码片段文件格式

这确保了扩展能够正确构建和打包，而完整的功能测试在本地环境中进行。

## 测试文件结构

```
src/test/
├── extension.test.ts          # 基本扩展功能测试
├── languageFeatures.test.ts   # 语言特性测试  
├── build.test.ts              # 构建验证测试
├── runTest.ts                 # 测试运行器
└── fixtures/                  # 测试夹具文件
    ├── test.mdp              # MDP 文件示例
    ├── test.gro              # GRO 文件示例
    └── test.ndx              # NDX 文件示例
```

## 故障排除

如果在本地遇到测试问题：

1. 确保 VS Code 已安装
2. 检查 TypeScript 编译是否成功：`npm run compile-tests`
3. 验证测试配置：`.vscode-test.mjs` 文件是否存在
4. 如果测试超时，可以增加 `.vscode-test.mjs` 中的 timeout 值
