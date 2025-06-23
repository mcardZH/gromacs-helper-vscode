import * as vscode from 'vscode';
import { GroHoverProvider } from '../../providers/groHoverProvider';
import { GroSymbolProvider } from '../../providers/groSymbolProvider';
import { GroSemanticTokensProvider } from '../../providers/groSemanticTokensProvider';
import { SEMANTIC_TOKENS_LEGEND } from '../../providers/baseSemanticTokensProvider';

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
    
    // Register semantic tokens provider for GRO files
    const groSemanticTokensProvider = new GroSemanticTokensProvider();
    const groSemanticDisposable = vscode.languages.registerDocumentSemanticTokensProvider(
      { language: 'gromacs_gro_file' },
      groSemanticTokensProvider,
      SEMANTIC_TOKENS_LEGEND
    );
    
    context.subscriptions.push(groHoverDisposable, groSymbolDisposable, groSemanticDisposable);
    
    console.log('GRO language support activated');
  }
}
