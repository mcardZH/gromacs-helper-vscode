import * as vscode from 'vscode';

export class PkaFoldingProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        const foldingRanges: vscode.FoldingRange[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        this.addHeaderSectionFolding(lines, foldingRanges);
        this.addReferencesSectionFolding(lines, foldingRanges);
        this.addResidueTableFolding(lines, foldingRanges);
        this.addSummarySectionFolding(lines, foldingRanges);
        this.addEnergySectionFolding(lines, foldingRanges);
        this.addChargeSectionFolding(lines, foldingRanges);

        return foldingRanges;
    }

    private addHeaderSectionFolding(lines: string[], foldingRanges: vscode.FoldingRange[]): void {
        // Find PROPKA header section
        let startLine = -1;
        let endLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for PROPKA version line
            if (line.match(/^propka\d+\.\d+/)) {
                startLine = i;
            }
            
            // Look for first separator after header
            if (startLine !== -1 && line.match(/^-{10,}$/)) {
                endLine = i - 1;
                break;
            }
        }

        if (startLine !== -1 && endLine !== -1 && endLine > startLine) {
            foldingRanges.push(new vscode.FoldingRange(
                startLine, 
                endLine, 
                vscode.FoldingRangeKind.Region
            ));
        }
    }

    private addReferencesSectionFolding(lines: string[], foldingRanges: vscode.FoldingRange[]): void {
        let startLine = -1;
        let endLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('References:')) {
                startLine = i;
            }
            
            if (startLine !== -1 && line.match(/^-{10,}$/)) {
                endLine = i - 1;
                break;
            }
        }

        if (startLine !== -1 && endLine !== -1 && endLine > startLine) {
            foldingRanges.push(new vscode.FoldingRange(
                startLine, 
                endLine, 
                vscode.FoldingRangeKind.Region
            ));
        }
    }

    private addResidueTableFolding(lines: string[], foldingRanges: vscode.FoldingRange[]): void {
        let startLine = -1;
        let endLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for table header with dashes
            if (line.match(/^-{9}\s+-{5}\s+-{6}\s+-{21}\s+-{14}\s+-{14}\s+-{14}$/)) {
                startLine = i;
            }
            
            // Look for end of table (empty line or summary section)
            if (startLine !== -1 && (line.trim() === '' || line.startsWith('SUMMARY OF THIS PREDICTION'))) {
                endLine = i - 1;
                break;
            }
        }

        if (startLine !== -1 && endLine !== -1 && endLine > startLine) {
            foldingRanges.push(new vscode.FoldingRange(
                startLine, 
                endLine, 
                vscode.FoldingRangeKind.Region
            ));
        }

        // Also add folding for individual residue entries with multiple lines
        this.addResidueEntryFolding(lines, foldingRanges);
    }

    private addResidueEntryFolding(lines: string[], foldingRanges: vscode.FoldingRange[]): void {
        let currentResidueStart = -1;
        let previousResidue = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Match residue entry line
            const residueMatch = line.match(/^([A-Z]{3})\s+(\d+)\s+([A-Z])\s+/);
            
            if (residueMatch) {
                const currentResidue = `${residueMatch[1]} ${residueMatch[2]} ${residueMatch[3]}`;
                
                // If we have a previous residue and this is a different one, end the previous folding
                if (currentResidueStart !== -1 && currentResidue !== previousResidue) {
                    // Look back to find the last line of the previous residue
                    let endLine = i - 1;
                    while (endLine > currentResidueStart && !lines[endLine].trim()) {
                        endLine--;
                    }
                    
                    if (endLine > currentResidueStart) {
                        foldingRanges.push(new vscode.FoldingRange(
                            currentResidueStart, 
                            endLine, 
                            vscode.FoldingRangeKind.Region
                        ));
                    }
                }
                
                // Check if this residue has continuation lines
                let hasMultipleLines = false;
                for (let j = i + 1; j < lines.length && j < i + 5; j++) {
                    if (lines[j].match(/^([A-Z]{3})\s+(\d+)\s+([A-Z])/)) {
                        const nextResidue = `${lines[j].match(/^([A-Z]{3})\s+(\d+)\s+([A-Z])/)![1]} ${lines[j].match(/^([A-Z]{3})\s+(\d+)\s+([A-Z])/)![2]} ${lines[j].match(/^([A-Z]{3})\s+(\d+)\s+([A-Z])/)![3]}`;
                        if (nextResidue === currentResidue) {
                            hasMultipleLines = true;
                        }
                        break;
                    } else if (lines[j].trim() === '' || lines[j].startsWith('SUMMARY')) {
                        break;
                    } else if (lines[j].match(/^\s*([A-Z]{3})\s+(\d+)\s+([A-Z])/)) {
                        // This is a continuation line
                        hasMultipleLines = true;
                        break;
                    }
                }
                
                if (hasMultipleLines) {
                    currentResidueStart = i;
                    previousResidue = currentResidue;
                } else {
                    currentResidueStart = -1;
                    previousResidue = '';
                }
            }
        }

        // Handle the last residue if it has multiple lines
        if (currentResidueStart !== -1) {
            let endLine = lines.length - 1;
            while (endLine > currentResidueStart && !lines[endLine].trim()) {
                endLine--;
            }
            
            if (endLine > currentResidueStart) {
                foldingRanges.push(new vscode.FoldingRange(
                    currentResidueStart, 
                    endLine, 
                    vscode.FoldingRangeKind.Region
                ));
            }
        }
    }

    private addSummarySectionFolding(lines: string[], foldingRanges: vscode.FoldingRange[]): void {
        let startLine = -1;
        let endLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('SUMMARY OF THIS PREDICTION')) {
                startLine = i;
            }
            
            if (startLine !== -1 && line.match(/^-{40,}$/)) {
                endLine = i - 1;
                break;
            }
        }

        if (startLine !== -1 && endLine !== -1 && endLine > startLine) {
            foldingRanges.push(new vscode.FoldingRange(
                startLine, 
                endLine, 
                vscode.FoldingRangeKind.Region
            ));
        }
    }

    private addEnergySectionFolding(lines: string[], foldingRanges: vscode.FoldingRange[]): void {
        let startLine = -1;
        let endLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('Free energy of') && line.includes('folding')) {
                startLine = i;
            }
            
            if (startLine !== -1 && line.startsWith('Protein charge of')) {
                endLine = i - 1;
                break;
            }
        }

        if (startLine !== -1 && endLine !== -1 && endLine > startLine) {
            foldingRanges.push(new vscode.FoldingRange(
                startLine, 
                endLine, 
                vscode.FoldingRangeKind.Region
            ));
        }
    }

    private addChargeSectionFolding(lines: string[], foldingRanges: vscode.FoldingRange[]): void {
        let startLine = -1;
        let endLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('Protein charge of folded and unfolded state')) {
                startLine = i;
            }
            
            if (startLine !== -1 && line.startsWith('The pI is')) {
                endLine = i - 1;
                break;
            }
        }

        if (startLine !== -1 && endLine !== -1 && endLine > startLine) {
            foldingRanges.push(new vscode.FoldingRange(
                startLine, 
                endLine, 
                vscode.FoldingRangeKind.Region
            ));
        }
    }
}
