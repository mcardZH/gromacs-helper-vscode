import * as vscode from 'vscode';

export class PkaHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const line = document.lineAt(position).text;
        const wordRange = document.getWordRangeAtPosition(position);
        
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange);

        // Provide hover information for residue types
        if (this.isResidueType(word)) {
            return this.getResidueHover(word);
        }

        // Provide hover information for sections
        if (this.isSectionKeyword(word, line)) {
            return this.getSectionHover(word, line);
        }

        // Provide hover information for numeric values in specific contexts
        const numericHover = this.getNumericHover(word, line, position);
        if (numericHover) {
            return numericHover;
        }

        return null;
    }

    private isResidueType(word: string): boolean {
        const residueTypes = [
            'ASP', 'GLU', 'HIS', 'LYS', 'ARG', 'TYR', 'CYS', 'SER', 'THR',
            'ASN', 'GLN', 'ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TRP',
            'PRO', 'GLY', 'C-', 'N+'
        ];
        return residueTypes.includes(word.toUpperCase());
    }

    private getResidueHover(residue: string): vscode.Hover {
        const residueInfo: { [key: string]: string } = {
            'ASP': 'Aspartic acid - Acidic residue with carboxyl side chain',
            'GLU': 'Glutamic acid - Acidic residue with carboxyl side chain',
            'HIS': 'Histidine - Basic residue with imidazole side chain, pKa ~6',
            'LYS': 'Lysine - Basic residue with amino side chain',
            'ARG': 'Arginine - Basic residue with guanidino side chain',
            'TYR': 'Tyrosine - Aromatic residue with phenolic hydroxyl group',
            'CYS': 'Cysteine - Polar residue with sulfhydryl side chain',
            'SER': 'Serine - Polar residue with hydroxyl side chain',
            'THR': 'Threonine - Polar residue with hydroxyl side chain',
            'ASN': 'Asparagine - Polar residue with amide side chain',
            'GLN': 'Glutamine - Polar residue with amide side chain',
            'ALA': 'Alanine - Nonpolar residue with methyl side chain',
            'VAL': 'Valine - Nonpolar residue with branched side chain',
            'LEU': 'Leucine - Nonpolar residue with branched side chain',
            'ILE': 'Isoleucine - Nonpolar residue with branched side chain',
            'MET': 'Methionine - Nonpolar residue with sulfur-containing side chain',
            'PHE': 'Phenylalanine - Aromatic residue with benzyl side chain',
            'TRP': 'Tryptophan - Aromatic residue with indole side chain',
            'PRO': 'Proline - Special residue forming ring structure',
            'GLY': 'Glycine - Special residue with no side chain',
            'C-': 'C-terminus - Carboxyl terminal of peptide chain',
            'N+': 'N-terminus - Amino terminal of peptide chain'
        };

        const info = residueInfo[residue.toUpperCase()];
        if (info) {
            return new vscode.Hover(
                new vscode.MarkdownString(`**${residue.toUpperCase()}**: ${info}`)
            );
        }

        return new vscode.Hover(
            new vscode.MarkdownString(`**${residue.toUpperCase()}**: Amino acid residue`)
        );
    }

    private isSectionKeyword(word: string, line: string): boolean {
        const sectionKeywords = [
            'DESOLVATION', 'EFFECTS', 'SIDECHAIN', 'BACKBONE', 'COULOMBIC',
            'SUMMARY', 'PREDICTION', 'References', 'PROPKA', 'PKA', 'PREDICTOR'
        ];
        return sectionKeywords.some(keyword => 
            word.toUpperCase().includes(keyword) || line.toUpperCase().includes(keyword)
        );
    }

    private getSectionHover(word: string, line: string): vscode.Hover | null {
        if (line.includes('DESOLVATION')) {
            return new vscode.Hover(
                new vscode.MarkdownString(
                    '**Desolvation Effects**: Contribution to pKa shift due to burial of ionizable groups from water'
                )
            );
        }
        
        if (line.includes('SIDECHAIN')) {
            return new vscode.Hover(
                new vscode.MarkdownString(
                    '**Sidechain Hydrogen Bond**: pKa shift due to hydrogen bonding with side chains'
                )
            );
        }
        
        if (line.includes('BACKBONE')) {
            return new vscode.Hover(
                new vscode.MarkdownString(
                    '**Backbone Hydrogen Bond**: pKa shift due to hydrogen bonding with backbone atoms'
                )
            );
        }
        
        if (line.includes('COULOMBIC')) {
            return new vscode.Hover(
                new vscode.MarkdownString(
                    '**Coulombic Interaction**: Electrostatic interaction between charged groups'
                )
            );
        }

        if (line.includes('SUMMARY')) {
            return new vscode.Hover(
                new vscode.MarkdownString(
                    '**Summary Section**: Final predicted pKa values for all ionizable residues'
                )
            );
        }

        if (word.toUpperCase().includes('PROPKA')) {
            return new vscode.Hover(
                new vscode.MarkdownString(
                    '**PROPKA**: Empirical method for predicting pKa values of ionizable groups in proteins'
                )
            );
        }

        return null;
    }

    private getNumericHover(word: string, line: string, position: vscode.Position): vscode.Hover | null {
        const number = parseFloat(word);
        if (isNaN(number)) {
            return null;
        }

        // Check if this is a pKa value in the main table
        const residueMatch = line.match(/^([A-Z]{3})\s+(\d+)\s+([A-Z])\s+([+-]?\d+\.\d+)/);
        if (residueMatch && Math.abs(number - parseFloat(residueMatch[4])) < 0.01) {
            return new vscode.Hover(
                new vscode.MarkdownString(
                    `**Predicted pKa**: ${number}\n\nThis is the calculated pKa value for this ionizable residue.`
                )
            );
        }

        // Check if this is a percentage value
        if (line.includes('%') && number >= 0 && number <= 100) {
            return new vscode.Hover(
                new vscode.MarkdownString(
                    `**Burial**: ${number}%\n\nPercentage of the ionizable group buried from solvent.`
                )
            );
        }

        // Check if this is in the energy section
        if (line.match(/^\s*\d+\.\d+\s+[+-]?\d+\.\d+$/)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length === 2) {
                if (Math.abs(number - parseFloat(parts[0])) < 0.01) {
                    return new vscode.Hover(
                        new vscode.MarkdownString(
                            `**pH**: ${number}\n\nThe pH value for this free energy calculation.`
                        )
                    );
                } else if (Math.abs(number - parseFloat(parts[1])) < 0.01) {
                    return new vscode.Hover(
                        new vscode.MarkdownString(
                            `**Free Energy**: ${number} kcal/mol\n\nFree energy of folding at the corresponding pH.`
                        )
                    );
                }
            }
        }

        // Check if this is in the charge section
        if (line.match(/^\s*\d+\.\d+\s+[+-]?\d+\.\d+\s+[+-]?\d+\.\d+$/)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length === 3) {
                if (Math.abs(number - parseFloat(parts[0])) < 0.01) {
                    return new vscode.Hover(
                        new vscode.MarkdownString(
                            `**pH**: ${number}\n\nThe pH value for this charge calculation.`
                        )
                    );
                } else if (Math.abs(number - parseFloat(parts[1])) < 0.01) {
                    return new vscode.Hover(
                        new vscode.MarkdownString(
                            `**Unfolded Charge**: ${number}\n\nNet charge of the protein in unfolded state.`
                        )
                    );
                } else if (Math.abs(number - parseFloat(parts[2])) < 0.01) {
                    return new vscode.Hover(
                        new vscode.MarkdownString(
                            `**Folded Charge**: ${number}\n\nNet charge of the protein in folded state.`
                        )
                    );
                }
            }
        }

        return null;
    }
}
