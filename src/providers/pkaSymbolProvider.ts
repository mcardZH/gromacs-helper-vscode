import * as vscode from 'vscode';

export class PkaSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        const symbols: vscode.DocumentSymbol[] = [];
        const lines = document.getText().split('\n');

        this.addHeaderSymbols(lines, symbols);
        this.addResidueSymbols(lines, symbols);
        this.addSummarySymbols(lines, symbols);
        this.addEnergySymbols(lines, symbols);
        this.addChargeSymbols(lines, symbols);

        return symbols;
    }

    private addHeaderSymbols(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // PROPKA version
            const versionMatch = line.match(/^(propka\d+\.\d+)/);
            if (versionMatch) {
                const range = new vscode.Range(i, 0, i, line.length);
                const symbol = new vscode.DocumentSymbol(
                    `PROPKA ${versionMatch[1]}`,
                    '',
                    vscode.SymbolKind.Namespace,
                    range,
                    range
                );
                symbols.push(symbol);
            }

            // References section
            if (line.startsWith('References:')) {
                const range = new vscode.Range(i, 0, i, line.length);
                const symbol = new vscode.DocumentSymbol(
                    'References',
                    '',
                    vscode.SymbolKind.Module,
                    range,
                    range
                );
                symbols.push(symbol);
            }
        }
    }

    private addResidueSymbols(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        const residueTableSymbol = new vscode.DocumentSymbol(
            'pKa Predictions',
            'Detailed residue pKa predictions',
            vscode.SymbolKind.Class,
            new vscode.Range(0, 0, 0, 0), // Will be updated
            new vscode.Range(0, 0, 0, 0)  // Will be updated
        );

        const residueSymbols: vscode.DocumentSymbol[] = [];
        let tableStartLine = -1;
        let tableEndLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Table header
            if (line.match(/^-{9}\s+-{5}\s+-{6}/)) {
                tableStartLine = i;
            }

            // End of table
            if (tableStartLine !== -1 && (line.trim() === '' || line.startsWith('SUMMARY'))) {
                tableEndLine = i - 1;
                break;
            }

            // Residue entry
            const residueMatch = line.match(/^([A-Z]{3})\s+(\d+)\s+([A-Z])\s+([+-]?\d+\.\d+)/);
            if (residueMatch && tableStartLine !== -1) {
                const residueName = `${residueMatch[1]}${residueMatch[2]}${residueMatch[3]}`;
                const pkaValue = residueMatch[4];
                
                const range = new vscode.Range(i, 0, i, line.length);
                const symbol = new vscode.DocumentSymbol(
                    residueName,
                    `pKa: ${pkaValue}`,
                    this.getResidueSymbolKind(residueMatch[1]),
                    range,
                    range
                );
                residueSymbols.push(symbol);
            }
        }

        if (residueSymbols.length > 0) {
            const firstResidue = residueSymbols[0];
            const lastResidue = residueSymbols[residueSymbols.length - 1];
            
            residueTableSymbol.range = new vscode.Range(
                firstResidue.range.start,
                lastResidue.range.end
            );
            residueTableSymbol.selectionRange = residueTableSymbol.range;
            residueTableSymbol.children.push(...residueSymbols);
            symbols.push(residueTableSymbol);
        }
    }

    private addSummarySymbols(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        let summaryStartLine = -1;
        const summarySymbols: vscode.DocumentSymbol[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('SUMMARY OF THIS PREDICTION')) {
                summaryStartLine = i;
                continue;
            }

            if (summaryStartLine !== -1) {
                // Summary entry
                const summaryMatch = line.match(/^\s*([A-Z]{3})\s+(\d+)\s+([A-Z])\s+([+-]?\d+\.\d+)\s+([+-]?\d+\.\d+)/);
                if (summaryMatch) {
                    const residueName = `${summaryMatch[1]}${summaryMatch[2]}${summaryMatch[3]}`;
                    const pkaValue = summaryMatch[4];
                    const modelPka = summaryMatch[5];
                    
                    const range = new vscode.Range(i, 0, i, line.length);
                    const symbol = new vscode.DocumentSymbol(
                        residueName,
                        `pKa: ${pkaValue} (model: ${modelPka})`,
                        this.getResidueSymbolKind(summaryMatch[1]),
                        range,
                        range
                    );
                    summarySymbols.push(symbol);
                }

                // End of summary
                if (line.match(/^-{40,}$/)) {
                    break;
                }
            }
        }

        if (summarySymbols.length > 0 && summaryStartLine !== -1) {
            const summaryTableSymbol = new vscode.DocumentSymbol(
                'Summary',
                'Final pKa predictions',
                vscode.SymbolKind.Interface,
                new vscode.Range(summaryStartLine, 0, summarySymbols[summarySymbols.length - 1].range.end.line, 0),
                new vscode.Range(summaryStartLine, 0, summaryStartLine, lines[summaryStartLine].length)
            );
            summaryTableSymbol.children.push(...summarySymbols);
            symbols.push(summaryTableSymbol);
        }
    }

    private addEnergySymbols(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('Free energy of') && line.includes('folding')) {
                // Find optimal pH
                for (let j = i + 1; j < lines.length; j++) {
                    const optimumMatch = lines[j].match(/The pH of optimum stability is\s+([\d.]+)/);
                    if (optimumMatch) {
                        const range = new vscode.Range(j, 0, j, lines[j].length);
                        const symbol = new vscode.DocumentSymbol(
                            'Optimal pH',
                            `pH ${optimumMatch[1]}`,
                            vscode.SymbolKind.Constant,
                            range,
                            range
                        );
                        symbols.push(symbol);
                        break;
                    }
                    
                    if (lines[j].startsWith('Protein charge of')) {
                        break;
                    }
                }
                
                const range = new vscode.Range(i, 0, i, line.length);
                const symbol = new vscode.DocumentSymbol(
                    'Free Energy Analysis',
                    'pH-dependent folding energy',
                    vscode.SymbolKind.Method,
                    range,
                    range
                );
                symbols.push(symbol);
                break;
            }
        }
    }

    private addChargeSymbols(lines: string[], symbols: vscode.DocumentSymbol[]): void {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('Protein charge of folded and unfolded state')) {
                const range = new vscode.Range(i, 0, i, line.length);
                const symbol = new vscode.DocumentSymbol(
                    'Charge Analysis',
                    'pH-dependent protein charge',
                    vscode.SymbolKind.Method,
                    range,
                    range
                );
                symbols.push(symbol);
            }

            // pI values
            const piMatch = line.match(/The pI is\s+([\d.]+)\s+\(folded\)\s+and\s+([\d.]+)\s+\(unfolded\)/);
            if (piMatch) {
                const range = new vscode.Range(i, 0, i, line.length);
                const symbol = new vscode.DocumentSymbol(
                    'Isoelectric Point',
                    `pI: ${piMatch[1]} (folded), ${piMatch[2]} (unfolded)`,
                    vscode.SymbolKind.Constant,
                    range,
                    range
                );
                symbols.push(symbol);
            }
        }
    }

    private getResidueSymbolKind(residueType: string): vscode.SymbolKind {
        const acidic = ['ASP', 'GLU'];
        const basic = ['HIS', 'LYS', 'ARG'];
        const aromatic = ['PHE', 'TYR', 'TRP'];
        
        if (acidic.includes(residueType)) {
            return vscode.SymbolKind.Event;  // Red icon
        } else if (basic.includes(residueType)) {
            return vscode.SymbolKind.Constructor;  // Blue icon
        } else if (aromatic.includes(residueType)) {
            return vscode.SymbolKind.Property;  // Purple icon
        } else {
            return vscode.SymbolKind.Field;  // Default
        }
    }
}
