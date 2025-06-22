import * as vscode from 'vscode';

export class PdbSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        const symbols: vscode.DocumentSymbol[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        
        let currentModel: vscode.DocumentSymbol | null = null;
        let currentChain: vscode.DocumentSymbol | null = null;
        let chainMap = new Map<string, vscode.DocumentSymbol>();
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const recordType = line.substring(0, 6).trim();
            
            switch (recordType) {
                case 'HEADER':
                    const headerSymbol = new vscode.DocumentSymbol(
                        'Header',
                        line.substring(6).trim(),
                        vscode.SymbolKind.Namespace,
                        new vscode.Range(i, 0, i, line.length),
                        new vscode.Range(i, 0, i, 6)
                    );
                    symbols.push(headerSymbol);
                    break;
                    
                case 'MODEL':
                    const modelNumber = line.substring(10, 14).trim();
                    currentModel = new vscode.DocumentSymbol(
                        `Model ${modelNumber}`,
                        '',
                        vscode.SymbolKind.Module,
                        new vscode.Range(i, 0, i, line.length),
                        new vscode.Range(i, 0, i, line.length)
                    );
                    symbols.push(currentModel);
                    chainMap.clear();
                    break;
                    
                case 'ENDMDL':
                    if (currentModel) {
                        currentModel.range = new vscode.Range(
                            currentModel.range.start.line,
                            currentModel.range.start.character,
                            i,
                            line.length
                        );
                    }
                    currentModel = null;
                    chainMap.clear();
                    break;
                    
                case 'ATOM':
                case 'HETATM':
                    if (line.length >= 22) {
                        const chainId = line.substring(21, 22).trim();
                        const resName = line.substring(17, 20).trim();
                        const resSeq = line.substring(22, 26).trim();
                        const atomName = line.substring(12, 16).trim();
                        
                        // 获取或创建链符号
                        if (!chainMap.has(chainId)) {
                            const chainSymbol = new vscode.DocumentSymbol(
                                `Chain ${chainId || 'Unknown'}`,
                                '',
                                vscode.SymbolKind.Class,
                                new vscode.Range(i, 0, i, line.length),
                                new vscode.Range(i, 21, i, 22)
                            );
                            
                            if (currentModel) {
                                currentModel.children.push(chainSymbol);
                            } else {
                                symbols.push(chainSymbol);
                            }
                            chainMap.set(chainId, chainSymbol);
                        }
                        
                        const chainSymbol = chainMap.get(chainId)!;
                        
                        // 创建残基符号
                        const residueKey = `${resName}_${resSeq}`;
                        let residueSymbol = chainSymbol.children.find(
                            s => s.name === `${resName} ${resSeq}`
                        );
                        
                        if (!residueSymbol) {
                            residueSymbol = new vscode.DocumentSymbol(
                                `${resName} ${resSeq}`,
                                recordType === 'HETATM' ? 'Heterogen' : 'Residue',
                                recordType === 'HETATM' ? vscode.SymbolKind.Object : vscode.SymbolKind.Struct,
                                new vscode.Range(i, 0, i, line.length),
                                new vscode.Range(i, 17, i, 26)
                            );
                            chainSymbol.children.push(residueSymbol);
                        }
                        
                        // 创建原子符号
                        const atomSymbol = new vscode.DocumentSymbol(
                            atomName,
                            `${recordType} atom`,
                            vscode.SymbolKind.Variable,
                            new vscode.Range(i, 0, i, line.length),
                            new vscode.Range(i, 12, i, 16)
                        );
                        residueSymbol.children.push(atomSymbol);
                        
                        // 更新范围
                        chainSymbol.range = new vscode.Range(
                            chainSymbol.range.start.line,
                            chainSymbol.range.start.character,
                            i,
                            line.length
                        );
                        
                        residueSymbol.range = new vscode.Range(
                            residueSymbol.range.start.line,
                            residueSymbol.range.start.character,
                            i,
                            line.length
                        );
                    }
                    break;
                    
                case 'HELIX':
                    const helixId = line.substring(7, 10).trim();
                    const helixSymbol = new vscode.DocumentSymbol(
                        `Helix ${helixId}`,
                        line.substring(15).trim(),
                        vscode.SymbolKind.Function,
                        new vscode.Range(i, 0, i, line.length),
                        new vscode.Range(i, 0, i, line.length)
                    );
                    symbols.push(helixSymbol);
                    break;
                    
                case 'SHEET':
                    const strandId = line.substring(7, 10).trim();
                    const sheetId = line.substring(11, 14).trim();
                    const sheetSymbol = new vscode.DocumentSymbol(
                        `Sheet ${sheetId} Strand ${strandId}`,
                        line.substring(15).trim(),
                        vscode.SymbolKind.Function,
                        new vscode.Range(i, 0, i, line.length),
                        new vscode.Range(i, 0, i, line.length)
                    );
                    symbols.push(sheetSymbol);
                    break;
            }
        }
        
        return symbols;
    }
}
