import * as path from 'path';
import { glob } from 'glob';

export async function run(): Promise<void> {
  const testsRoot = path.resolve(__dirname, '..');

  try {
    const files = await glob('**/**.test.js', { cwd: testsRoot });
    
    if (files.length === 0) {
      console.log('No test files found.');
      return;
    }
    
    console.log(`Found ${files.length} test file(s)`);
    
    // 对于基本设置，我们只是确保测试文件可以被找到
    // 实际的测试运行将由 @vscode/test-cli 处理
    files.forEach((f: string) => {
      console.log(`Test file: ${f}`);
    });
    
  } catch (err) {
    console.error('Error finding test files:', err);
    throw err;
  }
}
