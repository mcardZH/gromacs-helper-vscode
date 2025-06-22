import * as vscode from 'vscode';
import { XvgHoverProvider } from '../../providers/xvgHoverProvider';
import { XvgPreviewProvider } from '../../providers/xvgPreviewProvider';

export class XvgLanguageSupport {
    
    public activate(context: vscode.ExtensionContext): void {
        // Register hover provider for XVG files
        const xvgHoverProvider = new XvgHoverProvider();
        const xvgHoverDisposable = vscode.languages.registerHoverProvider(
            { language: 'gromacs_xvg_file' },
            xvgHoverProvider
        );
        
        // Register XVG preview provider
        const xvgPreviewProvider = new XvgPreviewProvider(context);
        
        // Register preview command
        const previewCommand = vscode.commands.registerCommand(
            'gromacs-helper.previewXvg',
            (uri?: vscode.Uri) => {
                if (!uri && vscode.window.activeTextEditor) {
                    uri = vscode.window.activeTextEditor.document.uri;
                }
                if (uri) {
                    xvgPreviewProvider.previewXvg(uri);
                } else {
                    vscode.window.showErrorMessage('No XVG file selected');
                }
            }
        );
        
        context.subscriptions.push(
            xvgHoverDisposable,
            previewCommand
        );
        
        console.log('XVG language support activated');
    }
}
