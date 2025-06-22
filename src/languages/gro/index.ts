import * as vscode from 'vscode';
import { GroHoverProvider } from '../../providers/groHoverProvider';
import { GroSymbolProvider } from '../../providers/groSymbolProvider';

export class GroLanguageSupport {
  
  public activate(context: vscode.ExtensionContext): void {
    // Register hover provider for GRO files
    const groHoverProvider = new GroHoverProvider();
    const groHoverDisposable = vscode.languages.registerHoverProvider(
      { language: 'gromacs_gro_file' },
      groHoverProvider
    );
    
    // Register symbol provider for GRO files
    const groSymbolProvider = new GroSymbolProvider();
    const groSymbolDisposable = vscode.languages.registerDocumentSymbolProvider(
      { language: 'gromacs_gro_file' },
      groSymbolProvider
    );
    
    context.subscriptions.push(groHoverDisposable, groSymbolDisposable);
    
    console.log('GRO language support activated');
  }
}
