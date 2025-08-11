import * as vscode from 'vscode';
import { PkaHoverProvider } from '../../providers/pkaHoverProvider';
import { PkaFoldingProvider } from '../../providers/pkaFoldingProvider';
import { PkaSymbolProvider } from '../../providers/pkaSymbolProvider';

export class PkaLanguageSupport {
    
    public activate(context: vscode.ExtensionContext): void {
        // Register hover provider for PKA files
        const pkaHoverProvider = new PkaHoverProvider();
        const pkaHoverDisposable = vscode.languages.registerHoverProvider(
            { language: 'gromacs_pka_file' },
            pkaHoverProvider
        );
        
        // Register symbol provider for PKA files
        const pkaSymbolProvider = new PkaSymbolProvider();
        const pkaSymbolDisposable = vscode.languages.registerDocumentSymbolProvider(
            { language: 'gromacs_pka_file' },
            pkaSymbolProvider
        );
        
        // Register folding provider for PKA files
        const pkaFoldingProvider = new PkaFoldingProvider();
        const pkaFoldingDisposable = vscode.languages.registerFoldingRangeProvider(
            { language: 'gromacs_pka_file' },
            pkaFoldingProvider
        );
        
        context.subscriptions.push(
            pkaHoverDisposable, 
            pkaSymbolDisposable, 
            pkaFoldingDisposable
        );
        
        console.log('PKA language support activated');
    }
}
