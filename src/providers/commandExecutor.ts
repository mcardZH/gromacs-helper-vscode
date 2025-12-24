import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Placeholder information extracted from command template
 */
interface Placeholder {
    original: string;      // Original placeholder text, e.g., "{pdb|gro}"
    extensions: string[];  // File extensions, e.g., ["pdb", "gro"]
    isOutput: boolean;     // Whether this is an output placeholder (e.g., "{output.gro}")
    isBasename: boolean;   // Whether this is a basename placeholder (e.g., "{basename}")
}

/**
 * Command executor that handles placeholder parsing, file selection, and terminal execution
 */
export class CommandExecutor {
    private static instance: CommandExecutor;

    public static getInstance(): CommandExecutor {
        if (!CommandExecutor.instance) {
            CommandExecutor.instance = new CommandExecutor();
        }
        return CommandExecutor.instance;
    }

    /**
     * Execute a command template by resolving all placeholders and sending to terminal
     */
    public async executeCommand(commandTemplate: string): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        // Parse all placeholders from the command
        const placeholders = this.parsePlaceholders(commandTemplate);

        if (placeholders.length === 0) {
            // No placeholders, execute directly
            this.sendToTerminal(commandTemplate, workspaceFolder.uri.fsPath);
            return;
        }

        // Resolve each placeholder
        let resolvedCommand = commandTemplate;
        for (const placeholder of placeholders) {
            const replacement = await this.resolvePlaceholder(placeholder, workspaceFolder.uri.fsPath);
            if (replacement === undefined) {
                // User cancelled
                return;
            }
            resolvedCommand = resolvedCommand.replace(placeholder.original, replacement);
        }

        // Send the resolved command to terminal
        this.sendToTerminal(resolvedCommand, workspaceFolder.uri.fsPath);
    }

    /**
     * Parse placeholders from a command template
     * Supports: {ext}, {ext1|ext2}, {output.ext}, {basename}
     */
    private parsePlaceholders(command: string): Placeholder[] {
        const placeholders: Placeholder[] = [];
        const regex = /\{([^}]+)\}/g;
        let match;

        while ((match = regex.exec(command)) !== null) {
            const content = match[1];
            const original = match[0];

            // Check if already processed (same placeholder appearing multiple times)
            if (placeholders.some(p => p.original === original)) {
                continue;
            }

            if (content === 'basename') {
                placeholders.push({
                    original,
                    extensions: [],
                    isOutput: false,
                    isBasename: true
                });
            } else if (content.startsWith('output.')) {
                const ext = content.substring(7); // Remove "output."
                placeholders.push({
                    original,
                    extensions: [ext],
                    isOutput: true,
                    isBasename: false
                });
            } else {
                // Regular file extension(s)
                const extensions = content.split('|').map(e => e.trim());
                placeholders.push({
                    original,
                    extensions,
                    isOutput: false,
                    isBasename: false
                });
            }
        }

        return placeholders;
    }

    /**
     * Resolve a placeholder by finding files or prompting for input
     */
    private async resolvePlaceholder(
        placeholder: Placeholder,
        workspacePath: string
    ): Promise<string | undefined> {
        if (placeholder.isBasename) {
            // Prompt for a base name
            return this.promptForBasename();
        }

        if (placeholder.isOutput) {
            // Prompt for output filename
            return this.promptForOutputFile(placeholder.extensions[0]);
        }

        // Find files matching the extensions
        const files = await this.findFilesForExtensions(placeholder.extensions, workspacePath);

        if (files.length === 0) {
            const extList = placeholder.extensions.join(', ');
            const result = await vscode.window.showWarningMessage(
                `No .${extList} files found in workspace. Would you like to enter a filename manually?`,
                'Enter Filename',
                'Cancel'
            );
            if (result === 'Enter Filename') {
                return this.promptForManualInput(placeholder.extensions);
            }
            return undefined;
        }

        if (files.length === 1) {
            // Only one file, use directly but let user confirm
            const relativePath = path.relative(workspacePath, files[0]);
            const confirm = await vscode.window.showQuickPick(
                [
                    { label: path.basename(files[0]), description: relativePath, fullPath: relativePath },
                    { label: '$(edit) Enter different filename...', description: 'manual', fullPath: '' }
                ] as (vscode.QuickPickItem & { fullPath: string })[],
                { placeHolder: `Select file for ${placeholder.original}` }
            );
            if (!confirm) {
                return undefined;
            }
            if ((confirm as any).fullPath === '') {
                return this.promptForManualInput(placeholder.extensions);
            }
            return (confirm as any).fullPath;
        }

        // Multiple files, show QuickPick
        const items = files.map(f => {
            const relativePath = path.relative(workspacePath, f);
            return {
                label: path.basename(f),
                description: path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath),
                fullPath: relativePath
            };
        });
        items.push({ label: '$(edit) Enter filename manually...', description: 'manual', fullPath: '' });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Select file for ${placeholder.original}`
        });

        if (!selected) {
            return undefined;
        }

        if (selected.fullPath === '') {
            return this.promptForManualInput(placeholder.extensions);
        }

        return selected.fullPath;
    }

    /**
     * Find files in the workspace with given extensions
     */
    private async findFilesForExtensions(
        extensions: string[],
        workspacePath: string
    ): Promise<string[]> {
        const files: string[] = [];

        for (const ext of extensions) {
            const pattern = new vscode.RelativePattern(workspacePath, `**/*.${ext}`);
            const foundFiles = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 50);
            files.push(...foundFiles.map(uri => uri.fsPath));
        }

        // Sort by modification time (newest first) and remove duplicates
        const uniqueFiles = [...new Set(files)];
        return uniqueFiles.slice(0, 20); // Limit to 20 files for performance
    }

    /**
     * Prompt user to enter a base name
     */
    private async promptForBasename(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: 'Enter base name (without extension)',
            placeHolder: 'e.g., md, em, npt',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please enter a base name';
                }
                if (/[<>:"/\\|?*]/.test(value)) {
                    return 'Invalid characters in filename';
                }
                return null;
            }
        });
    }

    /**
     * Prompt user to enter an output filename
     */
    private async promptForOutputFile(extension: string): Promise<string | undefined> {
        const result = await vscode.window.showInputBox({
            prompt: `Enter output filename`,
            placeHolder: `e.g., output.${extension}`,
            value: `output.${extension}`,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please enter a filename';
                }
                if (/[<>:"/\\|?*]/.test(value.replace(/\.[^.]+$/, ''))) {
                    return 'Invalid characters in filename';
                }
                return null;
            }
        });

        if (result && !result.endsWith(`.${extension}`)) {
            return `${result}.${extension}`;
        }
        return result;
    }

    /**
     * Prompt for manual filename input
     */
    private async promptForManualInput(extensions: string[]): Promise<string | undefined> {
        const ext = extensions[0];
        return vscode.window.showInputBox({
            prompt: `Enter filename`,
            placeHolder: `e.g., input.${ext}`,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please enter a filename';
                }
                return null;
            }
        });
    }

    /**
     * Send command to the integrated terminal
     */
    private sendToTerminal(command: string, cwd: string): void {
        // Get or create a GROMACS terminal
        let terminal = vscode.window.terminals.find(t => t.name === 'GROMACS');

        if (!terminal) {
            terminal = vscode.window.createTerminal({
                name: 'GROMACS',
                cwd: cwd
            });
        }

        terminal.show();
        terminal.sendText(command);
    }
}
