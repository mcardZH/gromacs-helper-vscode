import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface CustomSnippet {
    name: string;
    prefix: string;
    body: string[];
    description: string;
    scope?: string;
}

export class SnippetManager {
    private context: vscode.ExtensionContext;
    private customSnippetsPath: string;
    private customSnippets: Map<string, CustomSnippet> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.customSnippetsPath = path.join(context.globalStorageUri?.fsPath || context.globalStoragePath, 'custom-mdp-snippets.json');
        this.loadCustomSnippets();
        this.addDefaultSnippets();
    }

    private async addDefaultSnippets(): Promise<void> {
        // Add some default snippets if no custom snippets exist
        if (this.customSnippets.size === 0) {
            const defaultSnippets: CustomSnippet[] = [
                {
                    name: 'basic-em',
                    prefix: 'basicem',
                    description: 'Basic energy minimization template',
                    body: [
                        '; Basic Energy Minimization',
                        'integrator = ${1|steep,cg,l-bfgs|}',
                        'nsteps = ${2:50000}',
                        'emtol = ${3:1000.0}',
                        'emstep = ${4:0.01}',
                        '',
                        '; Output control',
                        'nstlog = ${5:100}',
                        'nstenergy = ${6:100}',
                        '',
                        '; Neighbor searching',
                        'cutoff-scheme = Verlet',
                        'ns_type = grid',
                        'nstlist = ${7:10}',
                        'rlist = ${8:1.0}',
                        '',
                        '; Electrostatics',
                        'coulombtype = ${9|PME,Cut-off|}',
                        'rcoulomb = ${10:1.0}',
                        '',
                        '; VdW',
                        'vdwtype = ${11|Cut-off,PME|}',
                        'rvdw = ${12:1.0}',
                        '',
                        '; Temperature and pressure coupling are off during EM',
                        'tcoupl = no',
                        'pcoupl = no'
                    ]
                },
                {
                    name: 'basic-nvt',
                    prefix: 'basicnvt',
                    description: 'Basic NVT equilibration template',
                    body: [
                        '; NVT equilibration',
                        'integrator = md',
                        'dt = ${1:0.002}',
                        'nsteps = ${2:500000}  ; ${3:1 ns}',
                        '',
                        '; Output control',
                        'nstxout = ${4:5000}',
                        'nstvout = ${5:5000}',
                        'nstenergy = ${6:1000}',
                        'nstlog = ${7:1000}',
                        '',
                        '; Bond parameters',
                        'continuation = ${8|no,yes|}',
                        'constraint_algorithm = lincs',
                        'constraints = ${9|none,hbonds,all-bonds|}',
                        'lincs_iter = 1',
                        'lincs_order = 4',
                        '',
                        '; Neighbor searching',
                        'cutoff-scheme = Verlet',
                        'ns_type = grid',
                        'nstlist = ${10:10}',
                        'rlist = ${11:1.0}',
                        '',
                        '; Electrostatics',
                        'coulombtype = PME',
                        'rcoulomb = ${12:1.0}',
                        'pme_order = 4',
                        'fourierspacing = ${13:0.12}',
                        '',
                        '; VdW',
                        'vdwtype = Cut-off',
                        'rvdw = ${14:1.0}',
                        'DispCorr = EnerPres',
                        '',
                        '; Temperature coupling',
                        'tcoupl = ${15|V-rescale,Nose-Hoover,Berendsen|}',
                        'tc-grps = ${16:System}',
                        'tau_t = ${17:0.1}',
                        'ref_t = ${18:300}',
                        '',
                        '; Pressure coupling',
                        'pcoupl = no',
                        '',
                        '; Periodic boundary conditions',
                        'pbc = xyz',
                        '',
                        '; Velocity generation',
                        'gen_vel = ${19|yes,no|}',
                        'gen_temp = ${20:300}',
                        'gen_seed = ${21:-1}'
                    ]
                },
                {
                    name: 'basic-npt',
                    prefix: 'basicnpt',
                    description: 'Basic NPT equilibration template',
                    body: [
                        '; NPT equilibration',
                        'integrator = md',
                        'dt = ${1:0.002}',
                        'nsteps = ${2:500000}  ; ${3:1 ns}',
                        '',
                        '; Output control',
                        'nstxout = ${4:5000}',
                        'nstvout = ${5:5000}',
                        'nstenergy = ${6:1000}',
                        'nstlog = ${7:1000}',
                        '',
                        '; Bond parameters',
                        'continuation = yes',
                        'constraint_algorithm = lincs',
                        'constraints = ${8|hbonds,all-bonds|}',
                        'lincs_iter = 1',
                        'lincs_order = 4',
                        '',
                        '; Neighbor searching',
                        'cutoff-scheme = Verlet',
                        'ns_type = grid',
                        'nstlist = ${9:10}',
                        'rlist = ${10:1.0}',
                        '',
                        '; Electrostatics',
                        'coulombtype = PME',
                        'rcoulomb = ${11:1.0}',
                        'pme_order = 4',
                        'fourierspacing = ${12:0.12}',
                        '',
                        '; VdW',
                        'vdwtype = Cut-off',
                        'rvdw = ${13:1.0}',
                        'DispCorr = EnerPres',
                        '',
                        '; Temperature coupling',
                        'tcoupl = ${14|V-rescale,Nose-Hoover|}',
                        'tc-grps = ${15:System}',
                        'tau_t = ${16:0.1}',
                        'ref_t = ${17:300}',
                        '',
                        '; Pressure coupling',
                        'pcoupl = ${18|Parrinello-Rahman,Berendsen|}',
                        'pcoupltype = ${19|isotropic,semiisotropic|}',
                        'tau_p = ${20:2.0}',
                        'ref_p = ${21:1.0}',
                        'compressibility = ${22:4.5e-5}',
                        '',
                        '; Periodic boundary conditions',
                        'pbc = xyz',
                        '',
                        '; Velocity generation',
                        'gen_vel = no'
                    ]
                }
            ];

            // Save default snippets
            for (const snippet of defaultSnippets) {
                await this.addSnippet(snippet, false);
            }
        }
    }

    private async ensureStorageDirectory(): Promise<void> {
        const dir = path.dirname(this.customSnippetsPath);
        if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
    }

    private async loadCustomSnippets(): Promise<void> {
        try {
            if (fs.existsSync(this.customSnippetsPath)) {
                const content = await fs.promises.readFile(this.customSnippetsPath, 'utf8');
                const snippets = JSON.parse(content);
                this.customSnippets.clear();
                Object.entries(snippets).forEach(([key, snippet]) => {
                    this.customSnippets.set(key, snippet as CustomSnippet);
                });
            }
        } catch (error) {
            console.error('Error loading custom snippets:', error);
            vscode.window.showErrorMessage('Failed to load custom MDP snippets');
        }
    }

    private async saveCustomSnippets(): Promise<void> {
        try {
            await this.ensureStorageDirectory();
            const snippetsObj: { [key: string]: CustomSnippet } = {};
            this.customSnippets.forEach((snippet, key) => {
                snippetsObj[key] = snippet;
            });
            await fs.promises.writeFile(this.customSnippetsPath, JSON.stringify(snippetsObj, null, 2));
        } catch (error) {
            console.error('Error saving custom snippets:', error);
            vscode.window.showErrorMessage('Failed to save custom MDP snippets');
        }
    }

    async addSnippet(snippet: CustomSnippet, showMessage: boolean = true): Promise<void> {
        this.customSnippets.set(snippet.name, snippet);
        await this.saveCustomSnippets();
        if (showMessage) {
            vscode.window.showInformationMessage(`MDP snippet "${snippet.name}" added successfully!`);
        }
    }

    async deleteSnippet(name: string): Promise<void> {
        if (this.customSnippets.has(name)) {
            this.customSnippets.delete(name);
            await this.saveCustomSnippets();
            vscode.window.showInformationMessage(`MDP snippet "${name}" deleted successfully!`);
        } else {
            vscode.window.showWarningMessage(`Snippet "${name}" not found`);
        }
    }

    async updateSnippet(name: string, snippet: CustomSnippet): Promise<void> {
        if (this.customSnippets.has(name)) {
            this.customSnippets.set(name, snippet);
            await this.saveCustomSnippets();
            vscode.window.showInformationMessage(`MDP snippet "${name}" updated successfully!`);
        } else {
            vscode.window.showWarningMessage(`Snippet "${name}" not found`);
        }
    }

    getSnippet(name: string): CustomSnippet | undefined {
        return this.customSnippets.get(name);
    }

    getAllSnippets(): CustomSnippet[] {
        return Array.from(this.customSnippets.values());
    }

    getSnippetNames(): string[] {
        return Array.from(this.customSnippets.keys());
    }

    async showSnippetManager(): Promise<void> {
        const actions = [
            '➕ Add New Snippet',
            '📝 Edit Existing Snippet',
            '🗑️ Delete Snippet',
            '📋 List All Snippets',
            '🚀 Insert Snippet'
        ];

        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Select action for MDP snippets',
            canPickMany: false
        });

        if (!selected) {
            return;
        }

        switch (selected) {
            case '➕ Add New Snippet':
                await this.showAddSnippetDialog();
                break;
            case '📝 Edit Existing Snippet':
                await this.showEditSnippetDialog();
                break;
            case '🗑️ Delete Snippet':
                await this.showDeleteSnippetDialog();
                break;
            case '📋 List All Snippets':
                await this.showSnippetList();
                break;
            case '🚀 Insert Snippet':
                await this.showInsertSnippetDialog();
                break;
        }
    }

    private async showAddSnippetDialog(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter snippet name',
            placeHolder: 'e.g., my-custom-md'
        });

        if (!name) {
            return;
        }

        if (this.customSnippets.has(name)) {
            vscode.window.showErrorMessage(`Snippet "${name}" already exists!`);
            return;
        }

        const prefix = await vscode.window.showInputBox({
            prompt: 'Enter snippet prefix (trigger)',
            placeHolder: 'e.g., mymd'
        });

        if (!prefix) {
            return;
        }

        const description = await vscode.window.showInputBox({
            prompt: 'Enter snippet description',
            placeHolder: 'e.g., My custom MD configuration'
        });

        if (!description) {
            return;
        }

        // Open a new untitled document for the user to input the snippet body
        const doc = await vscode.workspace.openTextDocument({
            content: '; Enter your MDP parameters here\n; Use ${1:placeholder} for tab stops\n; Use ${1|option1,option2,option3|} for choices\n\nintegrator = ${1:md}\nnsteps = ${2:1000000}\ndt = ${3:0.002}\n\n; Add more parameters as needed...\n',
            language: 'gromacs_mdp_file'
        });

        await vscode.window.showTextDocument(doc);

        const result = await vscode.window.showInformationMessage(
            'Edit the MDP snippet content in the opened editor, then click "Save Snippet"',
            'Save Snippet',
            'Cancel'
        );

        if (result === 'Save Snippet') {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === doc) {
                const body = editor.document.getText().split('\n');
                const snippet: CustomSnippet = {
                    name,
                    prefix,
                    body,
                    description,
                    scope: 'gromacs_mdp_file'
                };

                await this.addSnippet(snippet);
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
        } else {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    }

    private async showEditSnippetDialog(): Promise<void> {
        const snippetNames = this.getSnippetNames();
        if (snippetNames.length === 0) {
            vscode.window.showInformationMessage('No custom snippets found');
            return;
        }

        const selectedName = await vscode.window.showQuickPick(snippetNames, {
            placeHolder: 'Select snippet to edit'
        });

        if (!selectedName) {
            return;
        }

        const snippet = this.getSnippet(selectedName);
        if (!snippet) {
            return;
        }

        // Allow editing all properties
        const action = await vscode.window.showQuickPick([
            'Edit Content',
            'Edit Name',
            'Edit Prefix',
            'Edit Description'
        ], {
            placeHolder: 'What would you like to edit?'
        });

        if (!action) {
            return;
        }

        switch (action) {
            case 'Edit Content':
                await this.editSnippetContent(selectedName, snippet);
                break;
            case 'Edit Name':
                await this.editSnippetName(selectedName, snippet);
                break;
            case 'Edit Prefix':
                await this.editSnippetPrefix(selectedName, snippet);
                break;
            case 'Edit Description':
                await this.editSnippetDescription(selectedName, snippet);
                break;
        }
    }

    private async editSnippetContent(name: string, snippet: CustomSnippet): Promise<void> {
        const doc = await vscode.workspace.openTextDocument({
            content: snippet.body.join('\n'),
            language: 'gromacs_mdp_file'
        });

        await vscode.window.showTextDocument(doc);

        const result = await vscode.window.showInformationMessage(
            'Edit the snippet content, then click "Save Changes"',
            'Save Changes',
            'Cancel'
        );

        if (result === 'Save Changes') {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === doc) {
                const newBody = editor.document.getText().split('\n');
                const updatedSnippet = { ...snippet, body: newBody };
                await this.updateSnippet(name, updatedSnippet);
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
        } else {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    }

    private async editSnippetName(oldName: string, snippet: CustomSnippet): Promise<void> {
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new snippet name',
            value: snippet.name
        });

        if (!newName || newName === oldName) {
            return;
        }

        if (this.customSnippets.has(newName)) {
            vscode.window.showErrorMessage(`Snippet "${newName}" already exists!`);
            return;
        }

        // Remove old and add new
        await this.deleteSnippet(oldName);
        const updatedSnippet = { ...snippet, name: newName };
        await this.addSnippet(updatedSnippet);
    }

    private async editSnippetPrefix(name: string, snippet: CustomSnippet): Promise<void> {
        const newPrefix = await vscode.window.showInputBox({
            prompt: 'Enter new snippet prefix',
            value: snippet.prefix
        });

        if (!newPrefix) {
            return;
        }

        const updatedSnippet = { ...snippet, prefix: newPrefix };
        await this.updateSnippet(name, updatedSnippet);
    }

    private async editSnippetDescription(name: string, snippet: CustomSnippet): Promise<void> {
        const newDescription = await vscode.window.showInputBox({
            prompt: 'Enter new snippet description',
            value: snippet.description
        });

        if (!newDescription) {
            return;
        }

        const updatedSnippet = { ...snippet, description: newDescription };
        await this.updateSnippet(name, updatedSnippet);
    }

    private async showDeleteSnippetDialog(): Promise<void> {
        const snippetNames = this.getSnippetNames();
        if (snippetNames.length === 0) {
            vscode.window.showInformationMessage('No custom snippets found');
            return;
        }

        const selectedName = await vscode.window.showQuickPick(snippetNames, {
            placeHolder: 'Select snippet to delete'
        });

        if (!selectedName) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete snippet "${selectedName}"?`,
            'Delete',
            'Cancel'
        );

        if (confirm === 'Delete') {
            await this.deleteSnippet(selectedName);
        }
    }

    private async showSnippetList(): Promise<void> {
        const snippets = this.getAllSnippets();
        if (snippets.length === 0) {
            vscode.window.showInformationMessage('No custom snippets found');
            return;
        }

        const items = snippets.map(snippet => ({
            label: `$(symbol-snippet) ${snippet.name}`,
            description: `Prefix: ${snippet.prefix}`,
            detail: snippet.description,
            snippet
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a snippet to preview',
            canPickMany: false
        });

        if (selected) {
            // Show snippet preview
            const doc = await vscode.workspace.openTextDocument({
                content: `; Snippet: ${selected.snippet.name}\n; Prefix: ${selected.snippet.prefix}\n; Description: ${selected.snippet.description}\n\n${selected.snippet.body.join('\n')}`,
                language: 'gromacs_mdp_file'
            });
            await vscode.window.showTextDocument(doc, { preview: true });
        }
    }

    private async showInsertSnippetDialog(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        if (editor.document.languageId !== 'gromacs_mdp_file') {
            vscode.window.showErrorMessage('Current file is not an MDP file');
            return;
        }

        const snippets = this.getAllSnippets();
        if (snippets.length === 0) {
            vscode.window.showInformationMessage('No custom snippets found');
            return;
        }

        const items = snippets.map(snippet => ({
            label: `$(symbol-snippet) ${snippet.name}`,
            description: `Prefix: ${snippet.prefix}`,
            detail: snippet.description,
            snippet
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a snippet to insert',
            canPickMany: false
        });

        if (selected) {
            await this.insertSnippet(editor, selected.snippet);
        }
    }

    private async insertSnippet(editor: vscode.TextEditor, snippet: CustomSnippet): Promise<void> {
        const position = editor.selection.active;
        const snippetString = new vscode.SnippetString(snippet.body.join('\n'));
        await editor.insertSnippet(snippetString, position);
    }

    // Get snippets for completion provider
    getCompletionItems(): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        
        this.customSnippets.forEach((snippet) => {
            const item = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
            item.detail = snippet.description;
            item.documentation = new vscode.MarkdownString(`**Custom MDP Snippet: ${snippet.name}**\n\n${snippet.description}`);
            item.insertText = new vscode.SnippetString(snippet.body.join('\n'));
            item.sortText = '0' + snippet.prefix; // Prioritize custom snippets
            items.push(item);
        });

        return items;
    }
}
