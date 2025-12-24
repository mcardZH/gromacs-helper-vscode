import * as vscode from 'vscode';
import { MdpLanguageSupport } from './languages/mdp';
import { registerTopLanguageSupport } from './languages/top';
import { GroLanguageSupport } from './languages/gro';
import { PkaLanguageSupport } from './languages/pka';
import { NdxSymbolProvider } from './providers/ndxSymbolProvider';
import { NdxHoverProvider } from './providers/ndxHoverProvider';
import { NdxFoldingProvider } from './providers/ndxFoldingProvider';
import { registerPdbLanguageFeatures } from './languages/pdb';
import { PdbHoverProvider } from './providers/pdbHoverProvider';
import { PdbSymbolProvider } from './providers/pdbSymbolProvider';
import { PdbFoldingProvider } from './providers/pdbFoldingProvider';
import { XvgLanguageSupport } from './languages/xvg';
import { registerPackmolLanguageSupport } from './languages/packmol';
import { PackmolPreviewPanel } from './providers/packmolPreviewPanel';
import { PackmolPreviewProvider } from './providers/packmolPreviewProvider';
import { SnippetViewProvider } from './providers/snippetTreeProvider';
import { ResidueHighlightingManager } from './providers/residueHighlightingManager';
import { UnitConverterPanel } from './providers/unitConverter';
import { ColorManager } from './providers/colorManager';
import { GromacsMonitorSupport } from './languages/monitor';
import { CommandsViewProvider } from './providers/commandsViewProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "gromacs-helper-vscode" is now active!');

	// 检查并显示欢迎/更新通知
	showWelcomeOrUpdateNotification(context);

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

	// Initialize PKA language support
	const pkaLanguageSupport = new PkaLanguageSupport();
	pkaLanguageSupport.activate(context);

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

	// Register Packmol preview provider for the sidebar
	const packmolPreviewProvider = new PackmolPreviewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(PackmolPreviewProvider.viewType, packmolPreviewProvider),
		packmolPreviewProvider // 确保在扩展停用时清理资源
	);

	// Register Packmol preview command
	const packmolPreviewCommand = vscode.commands.registerCommand('gromacs-helper.previewPackmol', async (uri?: vscode.Uri) => {
		let targetUri = uri;
		if (!targetUri && vscode.window.activeTextEditor) {
			targetUri = vscode.window.activeTextEditor.document.uri;
		}

		if (targetUri) {
			// Update both the panel and the sidebar preview
			await Promise.all([
				PackmolPreviewPanel.createOrShow(context.extensionUri, targetUri),
				packmolPreviewProvider.previewPackmolFile(targetUri)
			]);
		} else {
			vscode.window.showErrorMessage('No Packmol file selected for preview');
		}
	});

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
		openUnitConverterCommand,
		packmolPreviewCommand
	);

	// Initialize GROMACS monitor
	const monitorSupport = new GromacsMonitorSupport();
	monitorSupport.activate(context);

	// Initialize GROMACS Commands View
	new CommandsViewProvider(context);

}

/**
 * 检测语言环境并返回对应的通知文案
 */
function getLocalizedMessages(isChinese: boolean) {
	if (isChinese) {
		return {
			welcome: '欢迎使用 GROMACS Helper！',
			update: 'GROMACS Helper 已更新',
			viewWelcome: '查看欢迎文档',
			viewChangelog: '查看更新日志',
			dontShowAgain: '不再显示'
		};
	} else {
		return {
			welcome: 'Welcome to GROMACS Helper!',
			update: 'GROMACS Helper has been updated',
			viewWelcome: 'View Welcome',
			viewChangelog: 'View Changelog',
			dontShowAgain: "Don't Show Again"
		};
	}
}

/**
 * 显示欢迎或更新通知
 */
async function showWelcomeOrUpdateNotification(context: vscode.ExtensionContext) {
	// 检查用户是否禁用了通知
	const config = vscode.workspace.getConfiguration('gromacsHelper');
	const disableNotifications = config.get<boolean>('disableWelcomeNotifications', false);

	if (disableNotifications) {
		return;
	}

	// 获取当前版本和上次通知的版本
	const currentVersion = context.extension.packageJSON.version;
	const previousVersion = context.globalState.get<string>('extensionVersion');
	const lastNotificationVersion = context.globalState.get<string>('lastNotificationVersion');

	// 检测语言环境（模糊匹配中文）
	const isChinese = vscode.env.language.toLowerCase().startsWith('zh');
	const messages = getLocalizedMessages(isChinese);

	// 确定文档文件名
	const readmeFile = isChinese ? 'README_ZH.md' : 'README.md';
	const changelogFile = 'CHANGELOG.md';

	let shouldShowNotification = false;
	let isFirstInstall = false;

	if (!previousVersion) {
		// 首次安装
		shouldShowNotification = true;
		isFirstInstall = true;
	} else if (previousVersion !== currentVersion && lastNotificationVersion !== currentVersion) {
		// 版本更新且未显示过当前版本的通知
		shouldShowNotification = true;
		isFirstInstall = false;
	}

	if (shouldShowNotification) {
		const message = isFirstInstall ? messages.welcome : messages.update;
		const primaryButton = isFirstInstall ? messages.viewWelcome : messages.viewChangelog;

		// GitHub 文档链接
		const githubUrl = isFirstInstall
			? (isChinese
				? 'https://github.com/mcardZH/gromacs-helper-vscode/blob/master/README_ZH.md'
				: 'https://github.com/mcardZH/gromacs-helper-vscode/blob/master/README.md')
			: 'https://github.com/mcardZH/gromacs-helper-vscode/blob/master/CHANGELOG.md';

		// 显示通知
		const result = await vscode.window.showInformationMessage(
			message,
			primaryButton,
			messages.dontShowAgain
		);

		// 处理用户选择
		if (result === primaryButton) {
			// 在浏览器中打开 GitHub 链接
			await vscode.env.openExternal(vscode.Uri.parse(githubUrl));
		} else if (result === messages.dontShowAgain) {
			// 用户选择不再显示
			await config.update('disableWelcomeNotifications', true, vscode.ConfigurationTarget.Global);
		}

		// 更新版本信息（无论用户是否点击按钮）
		await context.globalState.update('extensionVersion', currentVersion);
		await context.globalState.update('lastNotificationVersion', currentVersion);
	} else if (previousVersion !== currentVersion) {
		// 版本更新了但已经显示过通知，只更新 extensionVersion
		await context.globalState.update('extensionVersion', currentVersion);
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
