import * as vscode from 'vscode';
import { TopSymbolProvider } from '../../providers/topSymbolProvider';
import { TopFormattingProvider } from '../../providers/topFormattingProvider';
import { TopHoverProvider } from '../../providers/topHoverProvider';
import { TopFoldingProvider } from '../../providers/topFoldingProvider';

export function registerTopLanguageSupport(context: vscode.ExtensionContext): void {
  const topSelector: vscode.DocumentSelector = { language: 'gromacs_top_file' };
  
  // 注册 SymbolProvider
  const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
    topSelector,
    new TopSymbolProvider()
  );
  
  // 注册格式化提供器
  const formattingProvider = new TopFormattingProvider();
  const documentFormattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
    topSelector,
    formattingProvider
  );
  
  const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
    topSelector,
    formattingProvider
  );
  
  // 注册悬浮提供器
  const hoverProvider = vscode.languages.registerHoverProvider(
    topSelector,
    new TopHoverProvider()
  );
  
  // 注册折叠提供器
  const foldingProvider = vscode.languages.registerFoldingRangeProvider(
    topSelector,
    new TopFoldingProvider()
  );
  
  context.subscriptions.push(
    symbolProvider, 
    documentFormattingProvider, 
    rangeFormattingProvider, 
    hoverProvider,
    foldingProvider
  );
}
