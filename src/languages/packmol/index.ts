import * as vscode from 'vscode';
import { PackmolCompletionProvider } from '../../providers/packmolCompletionProvider';
import { PackmolHoverProvider } from '../../providers/packmolHoverProvider';
import { PackmolDiagnosticProvider } from '../../providers/packmolDiagnosticProvider';
import { PackmolFoldingProvider } from '../../providers/packmolFoldingProvider';
import { PackmolSymbolProvider } from '../../providers/packmolSymbolProvider';
import { PackmolSemanticTokensProvider } from '../../providers/packmolSemanticTokensProvider';
import { PackmolFormattingProvider } from '../../providers/packmolFormattingProvider';

/**
 * Packmol 语言支持模块
 * 提供 Packmol 输入文件的完整语言支持功能
 */
export class PackmolLanguageSupport {
  private diagnosticProvider: PackmolDiagnosticProvider;
  private disposables: vscode.Disposable[] = [];
  
  constructor() {
    this.diagnosticProvider = new PackmolDiagnosticProvider();
  }
  
  /**
   * 激活 Packmol 语言支持
   */
  public activate(context: vscode.ExtensionContext): void {
    const packmolSelector: vscode.DocumentSelector = { language: 'packmol' };
    
    // 注册补全提供者
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      packmolSelector,
      new PackmolCompletionProvider(),
      ' ', // 空格可以触发补全
      '.'  // 点号也可以触发补全（用于文件扩展名）
    );
    this.disposables.push(completionProvider);
    
    // 注册悬停提示提供者
    const hoverProvider = vscode.languages.registerHoverProvider(
      packmolSelector,
      new PackmolHoverProvider()
    );
    this.disposables.push(hoverProvider);
    
    // 注册语义标记提供者
    const semanticTokensProvider = vscode.languages.registerDocumentSemanticTokensProvider(
      packmolSelector,
      new PackmolSemanticTokensProvider(),
      PackmolSemanticTokensProvider.legend
    );
    this.disposables.push(semanticTokensProvider);
    
    // 注册折叠提供者
    const foldingProvider = vscode.languages.registerFoldingRangeProvider(
      packmolSelector,
      new PackmolFoldingProvider()
    );
    this.disposables.push(foldingProvider);
    
    // 注册符号提供者
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
      packmolSelector,
      new PackmolSymbolProvider()
    );
    this.disposables.push(symbolProvider);
    
    // 注册格式化提供者
    const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
      packmolSelector,
      new PackmolFormattingProvider()
    );
    this.disposables.push(formattingProvider);
    
    const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
      packmolSelector,
      new PackmolFormattingProvider()
    );
    this.disposables.push(rangeFormattingProvider);
    
    // 注册诊断提供者
    this.diagnosticProvider.activate(context);
    this.disposables.push(this.diagnosticProvider);
    
    // 将所有 disposables 添加到上下文
    context.subscriptions.push(...this.disposables);
    
    console.log('Packmol language support activated');
  }
  
  /**
   * 停用语言支持
   */
  public deactivate(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.diagnosticProvider.dispose();
  }
}

export function registerPackmolLanguageSupport(context: vscode.ExtensionContext): void {
  const packmolSupport = new PackmolLanguageSupport();
  packmolSupport.activate(context);
}
