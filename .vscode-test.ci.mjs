import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: './src/test/fixtures',
  mocha: {
    ui: 'tdd',
    timeout: 30000,
    color: true
  },
  version: 'stable',
  extensionDevelopmentPath: '.',
  env: {
    NODE_ENV: 'test',
    CI: 'true'
  }
});
