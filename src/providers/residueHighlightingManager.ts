import * as vscode from 'vscode';

/**
 * Configuration manager for residue highlighting
 */
export class ResidueHighlightingManager {
    private static instance: ResidueHighlightingManager;
    private config: vscode.WorkspaceConfiguration;

    private constructor() {
        this.config = vscode.workspace.getConfiguration('gromacsHelper');
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('gromacsHelper')) {
                this.config = vscode.workspace.getConfiguration('gromacsHelper');
                this.updateSemanticTokenColors();
            }
        });
    }

    public static getInstance(): ResidueHighlightingManager {
        if (!ResidueHighlightingManager.instance) {
            ResidueHighlightingManager.instance = new ResidueHighlightingManager();
        }
        return ResidueHighlightingManager.instance;
    }

    /**
     * Check if semantic highlighting is enabled
     */
    public isSemanticHighlightingEnabled(): boolean {
        return this.config.get('semanticHighlighting.enabled', true);
    }

    /**
     * Get color for a residue type
     */
    public getResidueColor(residueType: string): string {
        const defaultColors: { [key: string]: string } = {
            'acidic': '#FF6B6B',
            'basic': '#4ECDC4',
            'polar': '#45B7D1',
            'nonpolar': '#96CEB4',
            'aromatic': '#FFEAA7',
            'special': '#DDA0DD',
            'nucleotide': '#74B9FF',
            'ion': '#FD79A8',
            'water': '#00CEC9',
            'other': '#B2BEC3'
        };

        const configKey = `residueColors.${residueType}`;
        return this.config.get(configKey, defaultColors[residueType] || '#B2BEC3');
    }

    /**
     * Update semantic token colors in the current theme
     */
    private async updateSemanticTokenColors(): Promise<void> {
        // This method would update the theme colors dynamically
        // VS Code doesn't provide a direct API for this, so we'll rely on
        // configuration changes triggering provider updates
        
        // Trigger a refresh of all semantic token providers
        vscode.commands.executeCommand('editor.action.reloadSemanticTokens');
    }

    /**
     * Get all residue colors as a configuration object
     */
    public getAllResidueColors(): { [key: string]: string } {
        return {
            acidic: this.getResidueColor('acidic'),
            basic: this.getResidueColor('basic'),
            polar: this.getResidueColor('polar'),
            nonpolar: this.getResidueColor('nonpolar'),
            aromatic: this.getResidueColor('aromatic'),
            special: this.getResidueColor('special'),
            nucleotide: this.getResidueColor('nucleotide'),
            ion: this.getResidueColor('ion'),
            water: this.getResidueColor('water'),
            other: this.getResidueColor('other')
        };
    }

    /**
     * Reset all colors to default
     */
    public async resetToDefaults(): Promise<void> {
        const defaultColors = {
            'gromacsHelper.residueColors.acidic': '#FF6B6B',
            'gromacsHelper.residueColors.basic': '#4ECDC4',
            'gromacsHelper.residueColors.polar': '#45B7D1',
            'gromacsHelper.residueColors.nonpolar': '#96CEB4',
            'gromacsHelper.residueColors.aromatic': '#FFEAA7',
            'gromacsHelper.residueColors.special': '#DDA0DD',
            'gromacsHelper.residueColors.nucleotide': '#74B9FF',
            'gromacsHelper.residueColors.ion': '#FD79A8',
            'gromacsHelper.residueColors.water': '#00CEC9',
            'gromacsHelper.residueColors.other': '#B2BEC3'
        };

        for (const [key, value] of Object.entries(defaultColors)) {
            await this.config.update(key.replace('gromacsHelper.', ''), value, vscode.ConfigurationTarget.Global);
        }
    }

    /**
     * Show color picker for a residue type
     */
    public async showColorPicker(residueType: string): Promise<void> {
        const currentColor = this.getResidueColor(residueType);
        
        const color = await vscode.window.showInputBox({
            prompt: `Enter color for ${residueType} residues (hex format, e.g., #FF6B6B)`,
            value: currentColor,
            validateInput: (value) => {
                if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                    return 'Please enter a valid hex color (e.g., #FF6B6B)';
                }
                return null;
            }
        });

        if (color) {
            const configKey = `residueColors.${residueType}`;
            await this.config.update(configKey, color, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Updated ${residueType} residue color to ${color}`);
        }
    }
}
