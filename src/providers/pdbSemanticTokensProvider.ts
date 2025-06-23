import * as vscode from 'vscode';
import { BaseSemanticTokensProvider, SemanticTokenTypes } from './baseSemanticTokensProvider';
import { getResidueType, isKnownResidue } from '../constants/residueTypes';
import { ResidueHighlightingManager } from './residueHighlightingManager';

/**
 * Semantic tokens provider for PDB files
 */
export class PdbSemanticTokensProvider extends BaseSemanticTokensProvider {
    
    provideDocumentSemanticTokens(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.SemanticTokens> {
        
        // Check if semantic highlighting is enabled
        const highlightingManager = ResidueHighlightingManager.getInstance();
        if (!highlightingManager.isSemanticHighlightingEnabled()) {
            return new vscode.SemanticTokens(new Uint32Array());
        }
        
        this.resetBuilder();
        
        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            if (token.isCancellationRequested) {
                return;
            }
            
            const line = document.lineAt(lineIndex);
            const lineText = line.text;
            
            // Skip empty lines
            if (lineText.trim().length === 0) {
                continue;
            }
            
            this.parsePdbLine(lineText, lineIndex);
        }
        
        return this.tokensBuilder.build();
    }
    
    /**
     * Parse a single line of PDB file
     */
    private parsePdbLine(lineText: string, lineIndex: number): void {
        if (lineText.length < 6) {
            return;
        }
        
        const recordType = lineText.substring(0, 6).trim();
        
        // Add record type token
        this.addToken(lineIndex, 0, recordType.length, SemanticTokenTypes.KEYWORD);
        
        switch (recordType) {
            case 'ATOM':
            case 'HETATM':
                this.parseAtomRecord(lineText, lineIndex);
                break;
            case 'REMARK':
            case 'HEADER':
            case 'TITLE':
            case 'COMPND':
            case 'SOURCE':
            case 'AUTHOR':
                this.parseCommentRecord(lineText, lineIndex);
                break;
            default:
                // Handle other record types if needed
                break;
        }
    }
    
    /**
     * Parse ATOM or HETATM record
     * Format according to PDB specification
     */
    private parseAtomRecord(lineText: string, lineIndex: number): void {
        if (lineText.length < 54) {
            return; // Too short for a valid ATOM record
        }
        
        try {
            // Atom serial number (7-11)
            const atomSerial = lineText.substring(6, 11).trim();
            if (atomSerial && this.isNumeric(atomSerial)) {
                this.addToken(lineIndex, 6, 5, SemanticTokenTypes.ATOM_INDEX);
            }
            
            // Atom name (13-16)
            const atomName = lineText.substring(12, 16).trim();
            if (atomName) {
                const startPos = 12;
                this.addToken(lineIndex, startPos, 4, SemanticTokenTypes.ATOM_NAME);
            }
            
            // Residue name (18-20)
            const residueName = lineText.substring(17, 20).trim();
            if (residueName) {
                const tokenType = this.getResidueTokenType(residueName);
                this.addToken(lineIndex, 17, 3, tokenType);
            }
            
            // Chain identifier (22)
            const chainId = lineText.substring(21, 22).trim();
            if (chainId) {
                this.addToken(lineIndex, 21, 1, SemanticTokenTypes.CHAIN_ID);
            }
            
            // Residue sequence number (23-26)
            const residueSeq = lineText.substring(22, 26).trim();
            if (residueSeq && this.isNumeric(residueSeq)) {
                this.addToken(lineIndex, 22, 4, SemanticTokenTypes.NUMBER);
            }
            
            // Coordinates (31-54)
            this.parseCoordinates(lineText, lineIndex);
            
            // Occupancy (55-60)
            if (lineText.length >= 60) {
                const occupancy = lineText.substring(54, 60).trim();
                if (occupancy && this.isNumeric(occupancy)) {
                    this.addToken(lineIndex, 54, 6, SemanticTokenTypes.NUMBER);
                }
            }
            
            // Temperature factor (61-66)
            if (lineText.length >= 66) {
                const tempFactor = lineText.substring(60, 66).trim();
                if (tempFactor && this.isNumeric(tempFactor)) {
                    this.addToken(lineIndex, 60, 6, SemanticTokenTypes.NUMBER);
                }
            }
            
            // Element symbol (77-78)
            if (lineText.length >= 78) {
                const element = lineText.substring(76, 78).trim();
                if (element) {
                    this.addToken(lineIndex, 76, 2, SemanticTokenTypes.KEYWORD);
                }
            }
            
        } catch (error) {
            // Ignore parsing errors for malformed lines
            console.warn('Error parsing PDB line:', error);
        }
    }
    
    /**
     * Parse coordinates from PDB ATOM record
     */
    private parseCoordinates(lineText: string, lineIndex: number): void {
        // X coordinate (31-38)
        const x = lineText.substring(30, 38).trim();
        if (x && this.isNumeric(x)) {
            this.addToken(lineIndex, 30, 8, SemanticTokenTypes.COORDINATE);
        }
        
        // Y coordinate (39-46)
        const y = lineText.substring(38, 46).trim();
        if (y && this.isNumeric(y)) {
            this.addToken(lineIndex, 38, 8, SemanticTokenTypes.COORDINATE);
        }
        
        // Z coordinate (47-54)
        const z = lineText.substring(46, 54).trim();
        if (z && this.isNumeric(z)) {
            this.addToken(lineIndex, 46, 8, SemanticTokenTypes.COORDINATE);
        }
    }
    
    /**
     * Parse comment records
     */
    private parseCommentRecord(lineText: string, lineIndex: number): void {
        // Mark the rest of the line as comment
        if (lineText.length > 6) {
            this.addToken(lineIndex, 6, lineText.length - 6, SemanticTokenTypes.COMMENT);
        }
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
