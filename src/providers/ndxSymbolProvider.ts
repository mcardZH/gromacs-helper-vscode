import * as vscode from 'vscode';

export class NdxSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        const symbols: vscode.DocumentSymbol[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const groupMatch = line.match(/^\s*\[\s*([^\]]+)\s*\]/);

            if (groupMatch) {
                const groupName = groupMatch[1].trim();
                const range = new vscode.Range(i, 0, i, line.length);
                const selectionRange = new vscode.Range(i, groupMatch.index!, i, groupMatch.index! + groupMatch[0].length);

                // Find the end of this group (next group or end of file)
                let endLine = lines.length - 1;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].match(/^\s*\[\s*[^\]]+\s*\]/)) {
                        endLine = j - 1;
                        break;
                    }
                }

                const fullRange = new vscode.Range(i, 0, endLine, lines[endLine]?.length || 0);

                const symbol = new vscode.DocumentSymbol(
                    groupName,
                    'Index Group',
                    vscode.SymbolKind.Namespace,
                    fullRange,
                    selectionRange
                );

                // Add atom indices as children
                const atomIndices: vscode.DocumentSymbol[] = [];
                for (let j = i + 1; j <= endLine; j++) {
                    const atomLine = lines[j];
                    if (atomLine && !atomLine.match(/^\s*;/) && atomLine.trim()) {
                        const atomNumbers = atomLine.trim().split(/\s+/).filter(num => /^\d+$/.test(num));
                        if (atomNumbers.length > 0) {
                            const atomRange = new vscode.Range(j, 0, j, atomLine.length);
                            const atomSymbol = new vscode.DocumentSymbol(
                                `Atoms: ${atomNumbers.join(', ')}`,
                                `${atomNumbers.length} atoms`,
                                vscode.SymbolKind.Array,
                                atomRange,
                                atomRange
                            );
                            atomIndices.push(atomSymbol);
                        }
                    }
                }

                symbol.children = atomIndices;
                symbols.push(symbol);
            }
        }

        return symbols;
    }
}
