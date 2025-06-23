import * as vscode from 'vscode';
import { PdbSemanticTokensProvider } from '../../providers/pdbSemanticTokensProvider';
import { PdbDiagnosticProvider } from '../../providers/pdbDiagnosticProvider';
import { SEMANTIC_TOKENS_LEGEND } from '../../providers/baseSemanticTokensProvider';

export function registerPdbLanguageFeatures(context: vscode.ExtensionContext) {
    // Register semantic tokens provider for PDB files
    const pdbSemanticTokensProvider = new PdbSemanticTokensProvider();
    const pdbSemanticDisposable = vscode.languages.registerDocumentSemanticTokensProvider(
        { language: 'gromacs_pdb_file' },
        pdbSemanticTokensProvider,
        SEMANTIC_TOKENS_LEGEND
    );
    
    // Register diagnostic provider for PDB files
    const pdbDiagnosticProvider = new PdbDiagnosticProvider();
    
    // 监听文档变化以提供诊断
    const diagnosticDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId === 'gromacs_pdb_file') {
            pdbDiagnosticProvider.provideDiagnostics(e.document);
        }
    });
    
    // 监听文档打开事件
    const openDisposable = vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === 'gromacs_pdb_file') {
            pdbDiagnosticProvider.provideDiagnostics(document);
        }
    });
    
    // 对当前已打开的PDB文件立即提供诊断
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'gromacs_pdb_file') {
            pdbDiagnosticProvider.provideDiagnostics(document);
        }
    });
    
    context.subscriptions.push(
        pdbSemanticDisposable,
        diagnosticDisposable,
        openDisposable,
        pdbDiagnosticProvider
    );
    
    console.log('PDB language features registered with diagnostics');
}

// PDB记录类型定义
export interface PdbRecord {
    recordType: string;
    content: string;
    lineNumber: number;
}

// 解析PDB记录
export function parsePdbRecord(line: string, lineNumber: number): PdbRecord | null {
    if (line.length < 6) {
        return null;
    }
    
    const recordType = line.substring(0, 6).trim();
    const content = line.substring(6);
    
    return {
        recordType,
        content,
        lineNumber
    };
}

// PDB文件验证
export function validatePdbFile(document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split('\n');
    
    let hasHeader = false;
    let hasEnd = false;
    let modelCount = 0;
    let endModelCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const record = parsePdbRecord(line, i);
        
        if (!record) {
            continue;
        }
        
        switch (record.recordType) {
            case 'HEADER':
                hasHeader = true;
                break;
            case 'END':
                hasEnd = true;
                break;
            case 'MODEL':
                modelCount++;
                break;
            case 'ENDMDL':
                endModelCount++;
                break;
            case 'ATOM':
            case 'HETATM':
                // 验证ATOM/HETATM记录格式
                if (line.length < 54) {
                    const range = new vscode.Range(i, 0, i, line.length);
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        'ATOM/HETATM record is too short (minimum 54 characters required)',
                        vscode.DiagnosticSeverity.Error
                    ));
                }
                break;
        }
    }
    
    // 检查必需的记录
    if (!hasHeader) {
        const range = new vscode.Range(0, 0, 0, 0);
        diagnostics.push(new vscode.Diagnostic(
            range,
            'PDB file should start with a HEADER record',
            vscode.DiagnosticSeverity.Warning
        ));
    }
    
    if (!hasEnd) {
        const lastLine = lines.length - 1;
        const range = new vscode.Range(lastLine, 0, lastLine, lines[lastLine].length);
        diagnostics.push(new vscode.Diagnostic(
            range,
            'PDB file should end with an END record',
            vscode.DiagnosticSeverity.Warning
        ));
    }
    
    // 检查MODEL/ENDMDL配对
    if (modelCount !== endModelCount) {
        const range = new vscode.Range(0, 0, 0, 0);
        diagnostics.push(new vscode.Diagnostic(
            range,
            `Mismatched MODEL (${modelCount}) and ENDMDL (${endModelCount}) records`,
            vscode.DiagnosticSeverity.Error
        ));
    }
    
    return diagnostics;
}
