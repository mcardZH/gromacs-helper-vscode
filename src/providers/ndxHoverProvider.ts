import * as vscode from 'vscode';

export class NdxHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const line = document.lineAt(position);
        const text = line.text;

        // Check if hovering over a group name
        const groupMatch = text.match(/^\s*\[\s*([^\]]+)\s*\]/);
        if (groupMatch) {
            const groupName = groupMatch[1].trim();
            const hoverText = new vscode.MarkdownString();
            hoverText.appendMarkdown(`**GROMACS Index Group**\n\n`);
            hoverText.appendMarkdown(`Group Name: \`${groupName}\`\n\n`);
            hoverText.appendMarkdown(`This is an index group containing atom indices for GROMACS analysis and simulations.`);
            
            return new vscode.Hover(hoverText);
        }

        // Check if hovering over atom indices
        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange) {
            const word = document.getText(wordRange);
            if (/^\d+$/.test(word)) {
                const hoverText = new vscode.MarkdownString();
                hoverText.appendMarkdown(`**Atom Index**\n\n`);
                hoverText.appendMarkdown(`Atom number: \`${word}\`\n\n`);
                hoverText.appendMarkdown(`This is a 1-based atom index used in GROMACS index groups.`);
                
                return new vscode.Hover(hoverText);
            }
        }

        return null;
    }
}
