// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
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
import { SnippetViewProvider } from './providers/snippetTreeProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gromacs-helper-vscode" is now active!');

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

	// Initialize Snippet Tree View
	const snippetManager = mdpLanguageSupport.getSnippetManager();
	if (snippetManager) {
		new SnippetViewProvider(context, snippetManager);
	}

}

// This method is called when your extension is deactivated
export function deactivate() {}
