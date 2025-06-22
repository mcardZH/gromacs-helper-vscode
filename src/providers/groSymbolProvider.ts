import * as vscode from 'vscode';

export class GroSymbolProvider implements vscode.DocumentSymbolProvider {
    
    provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        const symbols: vscode.DocumentSymbol[] = [];
        const residueGroups = new Map<string, { atoms: vscode.DocumentSymbol[], range: vscode.Range }>();
        
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const lineText = line.text;
            
            // Skip empty lines, comments, title line, atom count line, and box vector line
            if (this.isAtomLine(lineText, i, document.lineCount)) {
                const atomSymbol = this.parseAtomLine(lineText, line.range);
                if (atomSymbol) {
                    const residueName = this.extractResidueName(lineText);
                    const residueNumber = this.extractResidueNumber(lineText);
                    const residueKey = `${residueNumber}_${residueName}`;
                    
                    if (!residueGroups.has(residueKey)) {
                        residueGroups.set(residueKey, {
                            atoms: [],
                            range: line.range
                        });
                    }
                    
                    residueGroups.get(residueKey)!.atoms.push(atomSymbol);
                    // Extend the range to include this atom
                    const currentGroup = residueGroups.get(residueKey)!;
                    currentGroup.range = new vscode.Range(
                        currentGroup.range.start,
                        line.range.end
                    );
                }
            }
        }
        
        // Convert residue groups to symbols
        for (const [residueKey, group] of residueGroups) {
            const [residueNumber, residueName] = residueKey.split('_');
            const residueSymbol = new vscode.DocumentSymbol(
                `${residueName} (${residueNumber})`,
                `${group.atoms.length} atoms`,
                vscode.SymbolKind.Class,
                group.range,
                group.range
            );
            
            residueSymbol.children = group.atoms;
            symbols.push(residueSymbol);
        }
        
        return symbols;
    }
    
    private isAtomLine(lineText: string, lineIndex: number, totalLines: number): boolean {
        // Skip first line (title)
        if (lineIndex === 0) {
            return false;
        }
        
        // Skip second line (atom count)
        if (lineIndex === 1) {
            return false;
        }
        
        // Skip last line (box vectors)
        if (lineIndex === totalLines - 1) {
            return false;
        }
        
        // Skip empty lines and comments
        if (lineText.trim() === '' || lineText.trim().startsWith(';')) {
            return false;
        }
        
        // Check if line has the right length for an atom line (at least 44 characters for coordinates)
        if (lineText.length < 44) {
            return false;
        }
        
        return true;
    }
    
    private parseAtomLine(lineText: string, lineRange: vscode.Range): vscode.DocumentSymbol | null {
        try {
            const atomName = this.extractAtomName(lineText);
            const atomNumber = this.extractAtomNumber(lineText);
            const coordinates = this.extractCoordinates(lineText);
            
            if (atomName && atomNumber && coordinates) {
                const symbol = new vscode.DocumentSymbol(
                    `${atomName} (${atomNumber})`,
                    `x:${coordinates.x} y:${coordinates.y} z:${coordinates.z}`,
                    vscode.SymbolKind.Variable,
                    lineRange,
                    lineRange
                );
                
                return symbol;
            }
        } catch (error) {
            // If parsing fails, skip this line
        }
        
        return null;
    }
    
    private extractResidueName(lineText: string): string {
        // Column 5-10: residue name (5 characters)
        return lineText.substring(5, 10).trim();
    }
    
    private extractResidueNumber(lineText: string): string {
        // Column 0-5: residue number (5 characters)
        return lineText.substring(0, 5).trim();
    }
    
    private extractAtomName(lineText: string): string {
        // Column 10-15: atom name (5 characters)
        return lineText.substring(10, 15).trim();
    }
    
    private extractAtomNumber(lineText: string): string {
        // Column 15-20: atom number (5 characters)
        return lineText.substring(15, 20).trim();
    }
    
    private extractCoordinates(lineText: string): { x: string, y: string, z: string } | null {
        try {
            // Column 20-28: x coordinate (8 characters)
            // Column 28-36: y coordinate (8 characters)  
            // Column 36-44: z coordinate (8 characters)
            const x = lineText.substring(20, 28).trim();
            const y = lineText.substring(28, 36).trim();
            const z = lineText.substring(36, 44).trim();
            
            return { x, y, z };
        } catch (error) {
            return null;
        }
    }
}
