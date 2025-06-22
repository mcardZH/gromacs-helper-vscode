import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: './src/test/fixtures',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
    color: true
  },
  // 指定要使用的 VS Code 版本
  version: 'stable',
  // 安装的扩展
  extensionDevelopmentPath: '.',
  // 环境变量
  env: {
    NODE_ENV: 'test'
  }
});
