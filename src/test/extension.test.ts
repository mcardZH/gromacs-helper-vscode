import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('gromacs-helper.gromacs-helper-vscode'));
  });

  test('Should activate extension', async () => {
    const extension = vscode.extensions.getExtension('gromacs-helper.gromacs-helper-vscode');
    if (extension) {
      await extension.activate();
      assert.ok(extension.isActive);
    }
  });

  test('Should register MDP language', () => {
    const languages = vscode.languages.getLanguages();
    return languages.then((langs) => {
      assert.ok(langs.includes('gromacs_mdp_file'));
    });
  });

  test('Should register GRO language', () => {
    const languages = vscode.languages.getLanguages();
    return languages.then((langs) => {
      assert.ok(langs.includes('gromacs_gro_file'));
    });
  });

  test('Should register TOP language', () => {
    const languages = vscode.languages.getLanguages();
    return languages.then((langs) => {
      assert.ok(langs.includes('gromacs_top_file'));
    });
  });

  test('Should register NDX language', () => {
    const languages = vscode.languages.getLanguages();
    return languages.then((langs) => {
      assert.ok(langs.includes('gromacs_ndx_file'));
    });
  });
});
