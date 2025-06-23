import * as vscode from 'vscode';
import { BaseSemanticTokensProvider, SemanticTokenTypes } from './baseSemanticTokensProvider';
import { getResidueType, isKnownResidue } from '../constants/residueTypes';
import { ResidueHighlightingManager } from './residueHighlightingManager';

/**
 * Semantic tokens provider for GRO files
 */
export class GroSemanticTokensProvider extends BaseSemanticTokensProvider {
    private highlightingManager: ResidueHighlightingManager;
    
    constructor() {
        super();
        this.highlightingManager = ResidueHighlightingManager.getInstance();
    }
    
    provideDocumentSemanticTokens(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.SemanticTokens> {
        
        // Check if semantic highlighting is enabled
        if (!this.highlightingManager.isSemanticHighlightingEnabled()) {
            return new vscode.SemanticTokens(new Uint32Array());
        }
        
        this.resetBuilder();
        
        console.log('GRO semantic tokens: Starting analysis for', document.fileName);
        let tokenCount = 0;
        
        // Skip the first two lines (title and atom count)
        for (let lineIndex = 2; lineIndex < document.lineCount - 1; lineIndex++) {
            if (token.isCancellationRequested) {
                return;
            }
            
            const line = document.lineAt(lineIndex);
            const lineText = line.text;
            
            // Skip empty lines
            if (lineText.trim().length === 0) {
                continue;
            }
            
            const lineTokens = this.parseGroLine(lineText, lineIndex);
            tokenCount += lineTokens;
        }
        
        console.log(`GRO semantic tokens: Generated ${tokenCount} tokens`);
        return this.tokensBuilder.build();
    }
    
    /**
     * Parse a single line of GRO file
     * Format: ResidueNumber ResidueName AtomName AtomNumber X Y Z [VX VY VZ]
     */
    private parseGroLine(lineText: string, lineIndex: number): number {
        let tokenCount = 0;
        // GRO format is fixed-width:
        // 1-5: residue number (integer)
        // 6-10: residue name (string, right-justified)
        // 11-15: atom name (string, right-justified)
        // 16-20: atom number (integer)
        // 21-28: position X (float, nm)
        // 29-36: position Y (float, nm)
        // 37-44: position Z (float, nm)
        // 45-52: velocity X (float, nm/ps) [optional]
        // 53-60: velocity Y (float, nm/ps) [optional]
        // 61-68: velocity Z (float, nm/ps) [optional]
        
        if (lineText.length < 44) {
            return 0; // Line too short to be valid
        }
        
        try {
            // Residue number (1-5)
            const residueNumStr = lineText.substring(0, 5).trim();
            if (residueNumStr) {
                this.addToken(lineIndex, 0, 5, SemanticTokenTypes.NUMBER);
                tokenCount++;
            }
            
            // Residue name (6-10)
            const residueName = lineText.substring(5, 10).trim();
            if (residueName) {
                const startPos = lineText.indexOf(residueName, 5);
                if (startPos !== -1) {
                    const tokenType = this.getResidueTokenType(residueName);
                    this.addToken(lineIndex, startPos, residueName.length, tokenType);
                    tokenCount++;
                }
            }
            
            // Atom name (11-15)
            const atomName = lineText.substring(10, 15).trim();
            if (atomName) {
                const startPos = lineText.indexOf(atomName, 10);
                if (startPos !== -1) {
                    this.addToken(lineIndex, startPos, atomName.length, SemanticTokenTypes.ATOM_NAME);
                    tokenCount++;
                }
            }
            
            // Atom number (16-20)
            const atomNumStr = lineText.substring(15, 20).trim();
            if (atomNumStr) {
                this.addToken(lineIndex, 15, 5, SemanticTokenTypes.ATOM_INDEX);
                tokenCount++;
            }
            
            // Coordinates (21-44)
            tokenCount += this.addCoordinateTokens(lineText, lineIndex, 20, 44);
            
            // Velocities (45-68, optional)
            if (lineText.length >= 68) {
                tokenCount += this.addCoordinateTokens(lineText, lineIndex, 44, 68);
            }
            
        } catch (error) {
            // Ignore parsing errors for malformed lines
            console.warn('Error parsing GRO line:', error);
        }
        
        return tokenCount;
    }
    
    /**
     * Add coordinate tokens
     */
    private addCoordinateTokens(lineText: string, lineIndex: number, startPos: number, endPos: number): number {
        const coordText = lineText.substring(startPos, endPos);
        let tokenCount = 0;
        
        // Split coordinates by whitespace
        const coords = coordText.trim().split(/\s+/);
        let currentPos = startPos;
        
        for (const coord of coords) {
            if (coord && this.isNumeric(coord)) {
                const coordStartPos = lineText.indexOf(coord, currentPos);
                if (coordStartPos !== -1) {
                    this.addToken(lineIndex, coordStartPos, coord.length, SemanticTokenTypes.COORDINATE);
                    tokenCount++;
                    currentPos = coordStartPos + coord.length;
                }
            }
        }
        
        return tokenCount;
    }
    
    /**
     * Get the appropriate token type for a residue
     */
    private getResidueTokenType(residueName: string): string {
        if (!isKnownResidue(residueName)) {
            return SemanticTokenTypes.RESIDUE_OTHER;
        }
        
        const residueType = getResidueType(residueName);
        
        switch (residueType) {
            case 'acidic':
                return SemanticTokenTypes.RESIDUE_ACIDIC;
            case 'basic':
                return SemanticTokenTypes.RESIDUE_BASIC;
            case 'polar':
                return SemanticTokenTypes.RESIDUE_POLAR;
            case 'nonpolar':
                return SemanticTokenTypes.RESIDUE_NONPOLAR;
            case 'aromatic':
                return SemanticTokenTypes.RESIDUE_AROMATIC;
            case 'special':
                return SemanticTokenTypes.RESIDUE_SPECIAL;
            case 'nucleotide':
                return SemanticTokenTypes.RESIDUE_NUCLEOTIDE;
            case 'ion':
                return SemanticTokenTypes.RESIDUE_ION;
            case 'water':
                return SemanticTokenTypes.RESIDUE_WATER;
            default:
                return SemanticTokenTypes.RESIDUE_OTHER;
        }
    }
    
    /**
     * Check if a string represents a number
     */
    private isNumeric(str: string): boolean {
        return !isNaN(Number(str)) && !isNaN(parseFloat(str));
    }
}
