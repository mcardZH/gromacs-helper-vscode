import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Language Features Test Suite', () => {
  
  test('MDP file should have correct language ID', async () => {
    // 使用源码目录中的测试文件
    const mdpFile = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures', 'test.mdp');
    const document = await vscode.workspace.openTextDocument(mdpFile);
    assert.strictEqual(document.languageId, 'gromacs_mdp_file');
  });

  test('GRO file should have correct language ID', async () => {
    const groFile = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures', 'test.gro');
    const document = await vscode.workspace.openTextDocument(groFile);
    assert.strictEqual(document.languageId, 'gromacs_gro_file');
  });

  test('NDX file should have correct language ID', async () => {
    const ndxFile = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures', 'test.ndx');
    const document = await vscode.workspace.openTextDocument(ndxFile);
    assert.strictEqual(document.languageId, 'gromacs_ndx_file');
  });

  test('Should provide completions for MDP file', async () => {
    const mdpFile = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures', 'test.mdp');
    const document = await vscode.workspace.openTextDocument(mdpFile);
    
    // 测试在文件末尾获取补全
    const position = new vscode.Position(document.lineCount, 0);
    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      document.uri,
      position
    );
    
    if (completions) {
      assert.ok(completions.items.length > 0, 'Should provide completion items for MDP files');
    }
  });
});
