import * as vscode from 'vscode';
import { MdpLanguageSupport } from './languages/mdp';
import { registerTopLanguageSupport } from './languages/top';
import { GroLanguageSupport } from './languages/gro';
import { NdxSymbolProvider } from './providers/ndxSymbolProvider';
import { NdxHoverProvider } from './providers/ndxHoverProvider';
import { NdxFoldingProvider } from './providers/ndxFoldingProvider';
import { registerPdbLanguageFeatures } from './languages/pdb';
import { PdbHoverProvider } from './providers/pdbHoverProvider';
import { PdbSymbolProvider } from './providers/pdbSymbolProvider';
import { PdbFoldingProvider } from './providers/pdbFoldingProvider';
import { XvgLanguageSupport } from './languages/xvg';
import { registerPackmolLanguageSupport } from './languages/packmol';
import { SnippetViewProvider } from './providers/snippetTreeProvider';
import { ResidueHighlightingManager } from './providers/residueHighlightingManager';
import { UnitConverterPanel } from './providers/unitConverter';
import { ColorManager } from './providers/colorManager';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "gromacs-helper-vscode" is now active!');

	// 初始化颜色管理器并应用语言特定的颜色
	const colorManager = ColorManager.getInstance();
	colorManager.applyLanguageSpecificColors();

	// Initialize MDP language support
	const mdpLanguageSupport = new MdpLanguageSupport();
	mdpLanguageSupport.activate(context);

	// Initialize TOP language support
	registerTopLanguageSupport(context);

	// Initialize GRO language support
	const groLanguageSupport = new GroLanguageSupport();
	groLanguageSupport.activate(context);

	// Initialize NDX language support
	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider('gromacs_ndx_file', new NdxSymbolProvider()),
		vscode.languages.registerHoverProvider('gromacs_ndx_file', new NdxHoverProvider()),
		vscode.languages.registerFoldingRangeProvider('gromacs_ndx_file', new NdxFoldingProvider())
	);

	// Initialize PDB language support
	registerPdbLanguageFeatures(context);
	context.subscriptions.push(
		vscode.languages.registerDocumentSymbolProvider('gromacs_pdb_file', new PdbSymbolProvider()),
		vscode.languages.registerHoverProvider('gromacs_pdb_file', new PdbHoverProvider()),
		vscode.languages.registerFoldingRangeProvider('gromacs_pdb_file', new PdbFoldingProvider())
	);

	// Initialize XVG language support
	const xvgLanguageSupport = new XvgLanguageSupport();
	xvgLanguageSupport.activate(context);

	// Initialize Packmol language support
	registerPackmolLanguageSupport(context);

	// Initialize Snippet Tree View
	const snippetManager = mdpLanguageSupport.getSnippetManager();
	if (snippetManager) {
		new SnippetViewProvider(context, snippetManager);
	}

	// Initialize residue highlighting manager
	const residueHighlightingManager = ResidueHighlightingManager.getInstance();

	// Register residue color configuration commands
	const configureResidueColorsCommand = vscode.commands.registerCommand(
		'gromacs-helper.configureResidueColors',
		async () => {
			const residueTypes = ['residue_acidic', 'residue_basic', 'residue_polar', 'residue_nonpolar', 'residue_aromatic', 'residue_special', 'residue_nucleotide', 'residue_ion', 'residue_water', 'residue_other'];
			const selectedType = await vscode.window.showQuickPick(residueTypes, {
				placeHolder: 'Select residue type to configure color'
			});
			
			if (selectedType) {
				const color = await vscode.window.showInputBox({
					prompt: `Enter hex color for ${selectedType} (e.g., #FF6B6B)`,
					validateInput: (value) => {
						if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
							return 'Please enter a valid hex color (e.g., #FF6B6B)';
						}
						return null;
					}
				});
				
				if (color) {
					await colorManager.setColor(selectedType as any, color);
					vscode.window.showInformationMessage(`Color updated for ${selectedType}`);
				}
			}
		}
	);

	const resetResidueColorsCommand = vscode.commands.registerCommand(
		'gromacs-helper.resetResidueColors',
		async () => {
			const result = await vscode.window.showWarningMessage(
				'Are you sure you want to reset all colors to default?',
				'Yes', 'No'
			);
			
			if (result === 'Yes') {
				await colorManager.resetColorsToDefault();
				vscode.window.showInformationMessage('Colors reset to default');
			}
		}
	);

	const toggleSemanticHighlightingCommand = vscode.commands.registerCommand(
		'gromacs-helper.toggleSemanticHighlighting',
		async () => {
			const config = vscode.workspace.getConfiguration('editor');
			const current = config.get<boolean>('semanticHighlighting.enabled', true);
			await config.update('semanticHighlighting.enabled', !current, vscode.ConfigurationTarget.Global);
			vscode.window.showInformationMessage(
				`Semantic highlighting ${!current ? 'enabled' : 'disabled'}`
			);
		}
	);

	// Register unit converter command
	const openUnitConverterCommand = vscode.commands.registerCommand(
		'gromacs-helper.openUnitConverter',
		() => {
			UnitConverterPanel.createOrShow(context.extensionUri);
		}
	);

	context.subscriptions.push(
		configureResidueColorsCommand,
		resetResidueColorsCommand,
		toggleSemanticHighlightingCommand,
		openUnitConverterCommand
	);

}

// This method is called when your extension is deactivated
export function deactivate() {}
