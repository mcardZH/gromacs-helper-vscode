import * as vscode from 'vscode';

export interface PdbIssue {
    lineNumber: number;
    message: string;
    severity: vscode.DiagnosticSeverity;
    code: string;
    category: 'missing-residue' | 'structure-issue' | 'format-error' | 'validation-warning';
}

export class PdbDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('pdb');
    }

    public provideDiagnostics(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // 分析文件内容
        const issues = this.analyzePdbFile(lines);
        
        // 转换为VS Code诊断
        for (const issue of issues) {
            const line = Math.min(issue.lineNumber, document.lineCount - 1);
            const range = new vscode.Range(line, 0, line, lines[line]?.length || 0);
            
            const diagnostic = new vscode.Diagnostic(
                range,
                issue.message,
                issue.severity
            );
            diagnostic.code = issue.code;
            diagnostic.source = 'GROMACS PDB Helper';
            
            // 添加相关信息和标签
            if (issue.category === 'missing-residue') {
                diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
            }
            
            diagnostics.push(diagnostic);
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private analyzePdbFile(lines: string[]): PdbIssue[] {
        const issues: PdbIssue[] = [];
        
        // 分析REMARK记录中的关键信息
        this.analyzeMissingResidues(lines, issues);
        this.analyzeStructuralIssues(lines, issues);
        this.analyzeExperimentalData(lines, issues);
        this.validateFileStructure(lines, issues);
        
        return issues;
    }

    private analyzeMissingResidues(lines: string[], issues: PdbIssue[]): void {
        const missingResiduePatterns = [
            /REMARK\s+465\s+MISSING\s+RESIDUES?/i,
            /REMARK\s+465\s+THE\s+FOLLOWING\s+RESIDUES?\s+WERE\s+NOT\s+LOCATED/i,
            /REMARK\s+465\s+M\s+RES\s+C\s+SSSEQI/i, // PDB格式的missing residue头部
            /REMARK\s+465\s+MISSING\s+ATOMS?/i,
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检测MISSING RESIDUES相关的REMARK记录
            for (const pattern of missingResiduePatterns) {
                if (pattern.test(line)) {
                    issues.push({
                        lineNumber: i,
                        message: '⚠️ 该PDB文件包含缺失的残基信息。这可能影响分子动力学模拟的准确性。',
                        severity: vscode.DiagnosticSeverity.Warning,
                        code: 'missing-residues-detected',
                        category: 'missing-residue'
                    });
                    
                    // 查找具体的缺失残基详情
                    this.parseSpecificMissingResidues(lines, i, issues);
                    break;
                }
            }

            // 检测具体的缺失残基记录
            if (/^REMARK\s+465\s+[A-Z]{3}\s+[A-Z]\s+\d+/i.test(line)) {
                const match = line.match(/REMARK\s+465\s+([A-Z]{3})\s+([A-Z])\s+(\d+)/i);
                if (match) {
                    const [, resName, chainId, resNum] = match;
                    issues.push({
                        lineNumber: i,
                        message: `❌ 缺失残基: ${resName} ${resNum} (链 ${chainId})`,
                        severity: vscode.DiagnosticSeverity.Error,
                        code: 'specific-missing-residue',
                        category: 'missing-residue'
                    });
                }
            }
        }
    }

    private parseSpecificMissingResidues(lines: string[], startIndex: number, issues: PdbIssue[]): void {
        // 向下查找具体的缺失残基列表
        for (let i = startIndex + 1; i < Math.min(startIndex + 20, lines.length); i++) {
            const line = lines[i];
            
            // 如果不再是REMARK 465，停止查找
            if (!line.startsWith('REMARK 465')) {
                break;
            }
            
            // 解析残基信息格式，如: "REMARK 465   ARG A 123"
            const residueMatch = line.match(/REMARK\s+465\s+([A-Z]{3})\s+([A-Z])\s+(\d+)/);
            if (residueMatch) {
                const [, resName, chainId, resNum] = residueMatch;
                issues.push({
                    lineNumber: i,
                    message: `缺失残基详情: ${resName}-${resNum} 在链 ${chainId}`,
                    severity: vscode.DiagnosticSeverity.Information,
                    code: 'missing-residue-detail',
                    category: 'missing-residue'
                });
            }
        }
    }

    private analyzeStructuralIssues(lines: string[], issues: PdbIssue[]): void {
        const structuralIssuePatterns = [
            { pattern: /REMARK\s+500\s+GEOMETRY\s+AND\s+STEREOCHEMISTRY/i, message: '结构几何和立体化学问题' },
            { pattern: /REMARK\s+500\s+CLOSE\s+CONTACTS/i, message: '原子间距离过近问题' },
            { pattern: /REMARK\s+470\s+ZERO\s+OCCUPANCY/i, message: '零占有率原子' },
            { pattern: /REMARK\s+475\s+ZERO\s+OCCUPANCY/i, message: '零占有率原子详情' },
            { pattern: /REMARK\s+610\s+MISSING\s+HETEROGENS/i, message: '缺失杂原子/配体' },
            { pattern: /REMARK\s+620\s+METAL\s+COORDINATION/i, message: '金属配位问题' },
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const { pattern, message } of structuralIssuePatterns) {
                if (pattern.test(line)) {
                    issues.push({
                        lineNumber: i,
                        message: `🔍 结构质量问题: ${message}`,
                        severity: vscode.DiagnosticSeverity.Information,
                        code: 'structural-issue',
                        category: 'structure-issue'
                    });
                }
            }
        }
    }

    private analyzeExperimentalData(lines: string[], issues: PdbIssue[]): void {
        let resolution: number | null = null;
        let rFactor: number | null = null;
        let rFree: number | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 解析分辨率
            const resolutionMatch = line.match(/REMARK\s+2\s+RESOLUTION\.\s*([\d.]+)\s*ANGSTROMS/i);
            if (resolutionMatch) {
                resolution = parseFloat(resolutionMatch[1]);
                
                let severity = vscode.DiagnosticSeverity.Information;
                let message = `📊 实验分辨率: ${resolution}Å`;
                
                if (resolution > 3.0) {
                    severity = vscode.DiagnosticSeverity.Warning;
                    message += ' (低分辨率，可能影响模拟精度)';
                } else if (resolution <= 1.5) {
                    message += ' (高分辨率，结构质量很好)';
                }
                
                issues.push({
                    lineNumber: i,
                    message,
                    severity,
                    code: 'resolution-info',
                    category: 'validation-warning'
                });
            }

            // 解析R因子
            const rFactorMatch = line.match(/REMARK\s+3\s+R\s+VALUE\s+\(WORKING\s+SET\)\s*:\s*([\d.]+)/i);
            if (rFactorMatch) {
                rFactor = parseFloat(rFactorMatch[1]);
                
                let severity = vscode.DiagnosticSeverity.Information;
                let message = `📈 R因子: ${rFactor}`;
                
                if (rFactor > 0.25) {
                    severity = vscode.DiagnosticSeverity.Warning;
                    message += ' (R因子较高，结构精度可能有问题)';
                }
                
                issues.push({
                    lineNumber: i,
                    message,
                    severity,
                    code: 'r-factor-info',
                    category: 'validation-warning'
                });
            }

            // 解析R-free
            const rFreeMatch = line.match(/REMARK\s+3\s+R\s+VALUE\s+\(FREE\)\s*:\s*([\d.]+)/i);
            if (rFreeMatch) {
                rFree = parseFloat(rFreeMatch[1]);
                
                let message = `📊 R-free: ${rFree}`;
                if (rFactor && rFree) {
                    const diff = rFree - rFactor;
                    if (diff > 0.1) {
                        message += ' (R-free与R因子差值过大，可能存在过拟合)';
                    }
                }
                
                issues.push({
                    lineNumber: i,
                    message,
                    severity: vscode.DiagnosticSeverity.Information,
                    code: 'r-free-info',
                    category: 'validation-warning'
                });
            }
        }
    }

    private validateFileStructure(lines: string[], issues: PdbIssue[]): void {
        let hasHeader = false;
        let hasEnd = false;
        let modelCount = 0;
        let endModelCount = 0;
        let chainBreaks: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const recordType = line.substring(0, 6).trim();

            switch (recordType) {
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
                case 'TER':
                    // 检测链终止
                    if (line.length >= 22) {
                        const chainId = line.substring(21, 22).trim();
                        if (chainId && !chainBreaks.includes(chainId)) {
                            chainBreaks.push(chainId);
                        }
                    }
                    break;
            }
        }

        // 验证文件结构
        if (!hasHeader) {
            issues.push({
                lineNumber: 0,
                message: '📄 建议添加HEADER记录以提供PDB文件基本信息',
                severity: vscode.DiagnosticSeverity.Hint,
                code: 'missing-header',
                category: 'format-error'
            });
        }

        if (!hasEnd) {
            issues.push({
                lineNumber: lines.length - 1,
                message: '📄 PDB文件应以END记录结束',
                severity: vscode.DiagnosticSeverity.Warning,
                code: 'missing-end',
                category: 'format-error'
            });
        }

        if (modelCount !== endModelCount) {
            issues.push({
                lineNumber: 0,
                message: `❌ MODEL记录(${modelCount})与ENDMDL记录(${endModelCount})数量不匹配`,
                severity: vscode.DiagnosticSeverity.Error,
                code: 'model-mismatch',
                category: 'format-error'
            });
        }

        if (chainBreaks.length > 0) {
            issues.push({
                lineNumber: 0,
                message: `🔗 检测到链终止标记(TER)在链: ${chainBreaks.join(', ')}`,
                severity: vscode.DiagnosticSeverity.Information,
                code: 'chain-breaks',
                category: 'structure-issue'
            });
        }
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}
