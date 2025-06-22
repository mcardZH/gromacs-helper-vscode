import * as vscode from 'vscode';

export class NdxFoldingProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        const foldingRanges: vscode.FoldingRange[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const groupMatch = line.match(/^\s*\[\s*([^\]]+)\s*\]/);

            if (groupMatch) {
                // Find the end of this group (next group or end of file)
                let endLine = lines.length - 1;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].match(/^\s*\[\s*[^\]]+\s*\]/)) {
                        endLine = j - 1;
                        break;
                    }
                }

                // Only create folding range if there's content to fold
                if (endLine > i) {
                    // Skip empty lines at the end
                    while (endLine > i && !lines[endLine].trim()) {
                        endLine--;
                    }
                    
                    if (endLine > i) {
                        const foldingRange = new vscode.FoldingRange(i, endLine, vscode.FoldingRangeKind.Region);
                        foldingRanges.push(foldingRange);
                    }
                }
            }
        }

        return foldingRanges;
    }
}
