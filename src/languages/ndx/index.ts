import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register language support for NDX files
    const ndxLanguageSupport = vscode.languages.createLanguageStatusItem('ndx-language-status', 'gromacs_ndx_file');
    ndxLanguageSupport.text = 'NDX Language Support';
    ndxLanguageSupport.detail = 'GROMACS Index File Language Support';
    ndxLanguageSupport.severity = vscode.LanguageStatusSeverity.Information;
    
    context.subscriptions.push(ndxLanguageSupport);
}

export function deactivate() {
    // Cleanup when extension is deactivated
}
