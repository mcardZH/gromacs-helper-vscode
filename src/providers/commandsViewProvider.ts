import * as vscode from 'vscode';
import { CommandExecutor } from './commandExecutor';

/**
 * Command definition from configuration
 */
interface CommandDefinition {
    name: string;
    command: string;
}

/**
 * Command group from configuration
 */
interface CommandGroup {
    name: string;
    commands: CommandDefinition[];
}

/**
 * Tree item for command groups (expandable)
 */
export class CommandGroupItem extends vscode.TreeItem {
    constructor(
        public readonly group: CommandGroup,
        public readonly groupIndex: number
    ) {
        super(group.name, vscode.TreeItemCollapsibleState.Expanded);
        this.tooltip = `${group.commands.length} commands`;
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'commandGroup';
    }
}

/**
 * Tree item for individual commands
 */
export class CommandItem extends vscode.TreeItem {
    constructor(
        public readonly commandDef: CommandDefinition,
        public readonly groupIndex: number,
        public readonly commandIndex: number
    ) {
        super(commandDef.name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = commandDef.command;
        this.description = this.formatCommandPreview(commandDef.command);
        this.iconPath = new vscode.ThemeIcon('terminal');
        this.contextValue = 'command';

        // Execute command on click
        this.command = {
            command: 'gromacs-helper.executeCommand',
            title: 'Execute Command',
            arguments: [commandDef]
        };
    }

    private formatCommandPreview(command: string): string {
        // Truncate long commands for display
        if (command.length > 50) {
            return command.substring(0, 47) + '...';
        }
        return command;
    }
}

type CommandTreeItem = CommandGroupItem | CommandItem;

/**
 * Tree data provider for GROMACS commands
 */
export class CommandsTreeDataProvider implements vscode.TreeDataProvider<CommandTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CommandTreeItem | undefined | null | void> =
        new vscode.EventEmitter<CommandTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CommandTreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    constructor() {
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('gromacsHelper.commands.groups')) {
                this.refresh();
            }
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CommandTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CommandTreeItem): Thenable<CommandTreeItem[]> {
        if (!element) {
            // Root level - return command groups
            const groups = this.getCommandGroups();
            return Promise.resolve(
                groups.map((group, index) => new CommandGroupItem(group, index))
            );
        }

        if (element instanceof CommandGroupItem) {
            // Return commands in this group
            const commands = element.group.commands.map(
                (cmd, index) => new CommandItem(cmd, element.groupIndex, index)
            );
            return Promise.resolve(commands);
        }

        return Promise.resolve([]);
    }

    private getCommandGroups(): CommandGroup[] {
        const config = vscode.workspace.getConfiguration('gromacsHelper');
        return config.get<CommandGroup[]>('commands.groups') || [];
    }
}

/**
 * Main view provider for GROMACS commands
 */
export class CommandsViewProvider {
    private treeDataProvider: CommandsTreeDataProvider;
    private treeView: vscode.TreeView<CommandTreeItem>;
    private commandExecutor: CommandExecutor;

    constructor(context: vscode.ExtensionContext) {
        this.treeDataProvider = new CommandsTreeDataProvider();
        this.commandExecutor = CommandExecutor.getInstance();

        this.treeView = vscode.window.createTreeView('gromacsCommandsView', {
            treeDataProvider: this.treeDataProvider,
            showCollapseAll: true
        });

        // Register all commands
        context.subscriptions.push(
            this.treeView,

            // Execute command
            vscode.commands.registerCommand('gromacs-helper.executeCommand',
                (commandDef: CommandDefinition) => this.executeCommand(commandDef)
            ),

            // Refresh commands view
            vscode.commands.registerCommand('gromacs-helper.refreshCommands',
                () => this.treeDataProvider.refresh()
            ),

            // Add command group
            vscode.commands.registerCommand('gromacs-helper.addCommandGroup',
                () => this.addCommandGroup()
            ),

            // Add command to group
            vscode.commands.registerCommand('gromacs-helper.addCommand',
                (item: CommandGroupItem) => this.addCommand(item)
            ),

            // Edit command
            vscode.commands.registerCommand('gromacs-helper.editCommand',
                (item: CommandItem) => this.editCommand(item)
            ),

            // Delete command or group
            vscode.commands.registerCommand('gromacs-helper.deleteCommand',
                (item: CommandTreeItem) => this.deleteItem(item)
            )
        );
    }

    private async executeCommand(arg: CommandDefinition | CommandItem): Promise<void> {
        // Handle both CommandItem (from inline button) and CommandDefinition (from click)
        const commandDef = arg instanceof CommandItem ? arg.commandDef : arg;
        await this.commandExecutor.executeCommand(commandDef.command);
    }

    private async addCommandGroup(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter command group name',
            placeHolder: 'e.g., My Commands'
        });

        if (!name) {
            return;
        }

        const groups = this.getCommandGroups();
        groups.push({ name, commands: [] });
        await this.saveCommandGroups(groups);
        this.treeDataProvider.refresh();
    }

    private async addCommand(groupItem: CommandGroupItem): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter command display name',
            placeHolder: 'e.g., genbox'
        });

        if (!name) {
            return;
        }

        const command = await vscode.window.showInputBox({
            prompt: 'Enter command template (use {ext} for file placeholders)',
            placeHolder: 'e.g., gmx genbox -f {gro} -o {output.gro}',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please enter a command';
                }
                return null;
            }
        });

        if (!command) {
            return;
        }

        const groups = this.getCommandGroups();
        if (groups[groupItem.groupIndex]) {
            groups[groupItem.groupIndex].commands.push({ name, command });
            await this.saveCommandGroups(groups);
            this.treeDataProvider.refresh();
        }
    }

    private async editCommand(item: CommandItem): Promise<void> {
        const newName = await vscode.window.showInputBox({
            prompt: 'Edit command name',
            value: item.commandDef.name
        });

        if (!newName) {
            return;
        }

        const newCommand = await vscode.window.showInputBox({
            prompt: 'Edit command template',
            value: item.commandDef.command
        });

        if (!newCommand) {
            return;
        }

        const groups = this.getCommandGroups();
        if (groups[item.groupIndex]?.commands[item.commandIndex]) {
            groups[item.groupIndex].commands[item.commandIndex] = {
                name: newName,
                command: newCommand
            };
            await this.saveCommandGroups(groups);
            this.treeDataProvider.refresh();
        }
    }

    private async deleteItem(item: CommandTreeItem): Promise<void> {
        const itemType = item instanceof CommandGroupItem ? 'group' : 'command';
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete this ${itemType}?`,
            'Delete',
            'Cancel'
        );

        if (confirm !== 'Delete') {
            return;
        }

        const groups = this.getCommandGroups();

        if (item instanceof CommandGroupItem) {
            // Delete entire group
            groups.splice(item.groupIndex, 1);
        } else if (item instanceof CommandItem) {
            // Delete single command
            if (groups[item.groupIndex]?.commands) {
                groups[item.groupIndex].commands.splice(item.commandIndex, 1);
            }
        }

        await this.saveCommandGroups(groups);
        this.treeDataProvider.refresh();
    }

    private getCommandGroups(): CommandGroup[] {
        const config = vscode.workspace.getConfiguration('gromacsHelper');
        return config.get<CommandGroup[]>('commands.groups') || [];
    }

    private async saveCommandGroups(groups: CommandGroup[]): Promise<void> {
        const config = vscode.workspace.getConfiguration('gromacsHelper');
        await config.update('commands.groups', groups, vscode.ConfigurationTarget.Global);
    }

    public refresh(): void {
        this.treeDataProvider.refresh();
    }
}
