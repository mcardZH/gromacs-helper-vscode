import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('Build Verification Suite', () => {
  
  test('Extension package.json should be valid', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    assert.ok(packageJson.name);
    assert.ok(packageJson.version);
    assert.ok(packageJson.engines.vscode);
    assert.ok(packageJson.main);
  });

  test('Compiled extension should exist', () => {
    const distPath = path.join('dist', 'extension.js');
    assert.ok(fs.existsSync(distPath), 'Compiled extension file should exist');
  });

  test('Language configuration files should exist', () => {
    const languageFiles = [
      'syntaxes/mdp/mdp.tmLanguage.json',
      'syntaxes/gro/gro.tmLanguage.json',
      'syntaxes/top/top.tmLanguage.json',
      'syntaxes/ndx/ndx.tmLanguage.json'
    ];
    
    languageFiles.forEach(file => {
      assert.ok(fs.existsSync(file), `Language file ${file} should exist`);
    });
  });

  test('Snippet files should exist', () => {
    const snippetFiles = [
      'snippets/mdp.json',
      'snippets/gro.json',
      'snippets/ndx.json'
    ];
    
    snippetFiles.forEach(file => {
      assert.ok(fs.existsSync(file), `Snippet file ${file} should exist`);
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.ok(typeof content === 'object', `Snippet file ${file} should contain valid JSON`);
    });
  });

  test('README and LICENSE should exist', () => {
    assert.ok(fs.existsSync('README.md'), 'README.md should exist');
    assert.ok(fs.existsSync('LICENSE'), 'LICENSE should exist');
  });
});
