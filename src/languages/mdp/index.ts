import * as vscode from 'vscode';
import { MdpCompletionProvider } from '../../providers/mdpCompletionProvider';
import { MdpHoverProvider } from '../../providers/mdpHoverProvider';
import { MdpDiagnosticProvider } from '../../providers/mdpDiagnosticProvider';
import { MdpFormattingProvider } from '../../providers/mdpFormattingProvider';
import { MdpSymbolProvider } from '../../providers/mdpSymbolProvider';
import { SnippetManager } from '../../snippetManager';

/**
 * MDP 语言支持模块
 * 提供 GROMACS MDP 文件的完整语言支持功能
 */
export class MdpLanguageSupport {
  private diagnosticProvider: MdpDiagnosticProvider;
  private snippetManager?: SnippetManager;
  private disposables: vscode.Disposable[] = [];
  
  constructor() {
    this.diagnosticProvider = new MdpDiagnosticProvider();
  }
  
  /**
   * 激活 MDP 语言支持
   */
  public activate(context: vscode.ExtensionContext): void {
    // 初始化片段管理器
    this.snippetManager = new SnippetManager(context);
    
    const mdpSelector: vscode.DocumentSelector = { language: 'gromacs_mdp_file' };
    
    // 注册补全提供者
    const completionProvider = new MdpCompletionProvider();
    completionProvider.setSnippetManager(this.snippetManager);
    
    const completionRegistration = vscode.languages.registerCompletionItemProvider(
      mdpSelector,
      completionProvider,
      '=', // 触发字符
      ' '  // 空格也可以触发补全
    );
    this.disposables.push(completionRegistration);
    
    // 注册悬停提示提供者
    const hoverProvider = vscode.languages.registerHoverProvider(
      mdpSelector,
      new MdpHoverProvider()
    );
    this.disposables.push(hoverProvider);
    
    // 注册格式化提供者
    const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
      mdpSelector,
      new MdpFormattingProvider()
    );
    this.disposables.push(formattingProvider);
    
    const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
      mdpSelector,
      new MdpFormattingProvider()
    );
    this.disposables.push(rangeFormattingProvider);
    
    // 注册文档符号提供者（用于代码折叠）
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
      mdpSelector,
      new MdpSymbolProvider()
    );
    this.disposables.push(symbolProvider);
    
    // 注册文档变化监听器（用于诊断）
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument(
      this.onDocumentChange.bind(this)
    );
    this.disposables.push(documentChangeListener);
    
    // 注册文档打开监听器
    const documentOpenListener = vscode.workspace.onDidOpenTextDocument(
      this.onDocumentOpen.bind(this)
    );
    this.disposables.push(documentOpenListener);
    
    // 注册文档保存监听器
    const documentSaveListener = vscode.workspace.onDidSaveTextDocument(
      this.onDocumentSave.bind(this)
    );
    this.disposables.push(documentSaveListener);
    
    // 对已打开的 MDP 文档进行初始诊断
    vscode.workspace.textDocuments.forEach(document => {
      if (document.languageId === 'gromacs_mdp_file') {
        this.diagnosticProvider.provideDiagnostics(document);
      }
    });

    // 注册片段管理命令
    const snippetManagerCommand = vscode.commands.registerCommand('gromacs-helper.manageSnippets', () => {
      if (this.snippetManager) {
        this.snippetManager.showSnippetManager();
      }
    });
    this.disposables.push(snippetManagerCommand);
    
    // 添加所有 disposables 到扩展上下文
    context.subscriptions.push(...this.disposables);
    
    console.log('MDP language support activated');
  }
  
  /**
   * 文档变化事件处理
   */
  private onDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    if (event.document.languageId === 'gromacs_mdp_file') {
      // 延迟诊断以避免频繁更新
      setTimeout(() => {
        this.diagnosticProvider.provideDiagnostics(event.document);
      }, 500);
    }
  }
  
  /**
   * 文档打开事件处理
   */
  private onDocumentOpen(document: vscode.TextDocument): void {
    if (document.languageId === 'gromacs_mdp_file') {
      this.diagnosticProvider.provideDiagnostics(document);
    }
  }
  
  /**
   * 文档保存事件处理
   */
  private onDocumentSave(document: vscode.TextDocument): void {
    if (document.languageId === 'gromacs_mdp_file') {
      this.diagnosticProvider.provideDiagnostics(document);
    }
  }
  
  /**
   * 释放资源
   */
  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.diagnosticProvider.dispose();
  }

  /**
   * 获取片段管理器实例
   */
  public getSnippetManager(): SnippetManager | undefined {
    return this.snippetManager;
  }
}
