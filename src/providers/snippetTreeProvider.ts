import * as vscode from 'vscode';
import { SnippetManager, CustomSnippet } from '../snippetManager';

export class SnippetTreeDataProvider implements vscode.TreeDataProvider<SnippetTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SnippetTreeItem | undefined | null | void> = new vscode.EventEmitter<SnippetTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SnippetTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private snippetManager: SnippetManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SnippetTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SnippetTreeItem): Thenable<SnippetTreeItem[]> {
        if (!element) {
            // Root level - return all snippets
            const snippets = this.snippetManager.getAllSnippets();
            return Promise.resolve(snippets.map(snippet => new SnippetTreeItem(snippet, vscode.TreeItemCollapsibleState.None)));
        }
        return Promise.resolve([]);
    }
}

export class SnippetTreeItem extends vscode.TreeItem {
    constructor(
        public readonly snippet: CustomSnippet,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(snippet.name, collapsibleState);
        this.tooltip = snippet.description;
        this.description = `${snippet.prefix}`;
        this.contextValue = 'snippet';
        this.iconPath = new vscode.ThemeIcon('symbol-snippet');
        
        // Add command to insert snippet on click
        this.command = {
            command: 'gromacs-helper.insertSnippetFromTree',
            title: 'Insert Snippet',
            arguments: [snippet]
        };
    }
}

export class SnippetViewProvider {
    private treeDataProvider: SnippetTreeDataProvider;
    private treeView: vscode.TreeView<SnippetTreeItem>;

    constructor(context: vscode.ExtensionContext, snippetManager: SnippetManager) {
        this.treeDataProvider = new SnippetTreeDataProvider(snippetManager);
        
        this.treeView = vscode.window.createTreeView('gromacsSnippets', {
            treeDataProvider: this.treeDataProvider,
            showCollapseAll: false
        });

        // Register tree view commands
        context.subscriptions.push(
            vscode.commands.registerCommand('gromacs-helper.refreshSnippets', () => {
                this.treeDataProvider.refresh();
            }),
            vscode.commands.registerCommand('gromacs-helper.insertSnippetFromTree', (snippet: CustomSnippet) => {
                this.insertSnippet(snippet);
            }),
            vscode.commands.registerCommand('gromacs-helper.editSnippetFromTree', (item: SnippetTreeItem) => {
                this.editSnippet(item.snippet.name);
            }),
            vscode.commands.registerCommand('gromacs-helper.deleteSnippetFromTree', (item: SnippetTreeItem) => {
                this.deleteSnippet(item.snippet.name);
            })
        );

        context.subscriptions.push(this.treeView);
    }

    private async insertSnippet(snippet: CustomSnippet): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        if (editor.document.languageId !== 'gromacs_mdp_file') {
            vscode.window.showErrorMessage('Current file is not an MDP file');
            return;
        }

        const position = editor.selection.active;
        const snippetString = new vscode.SnippetString(snippet.body.join('\n'));
        await editor.insertSnippet(snippetString, position);
    }

    private async editSnippet(name: string): Promise<void> {
        // This will trigger the snippet manager's edit dialog
        await vscode.commands.executeCommand('gromacs-helper.manageSnippets');
    }

    private async deleteSnippet(name: string): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete snippet "${name}"?`,
            'Delete',
            'Cancel'
        );

        if (confirm === 'Delete') {
            // We need access to the snippet manager here
            // This is a simplified approach - in practice, you'd want to pass the manager reference
            await vscode.commands.executeCommand('gromacs-helper.manageSnippets');
        }
    }

    public refresh(): void {
        this.treeDataProvider.refresh();
    }
}
