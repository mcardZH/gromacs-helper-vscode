import * as vscode from 'vscode';
import { ForceFieldIndexManager } from './forceFieldIndexManager';
import { RtpCompletionProvider } from '../../providers/forcefield/rtpCompletionProvider';
import { RtpHoverProvider } from '../../providers/forcefield/rtpHoverProvider';
import { RtpDiagnosticProvider } from '../../providers/forcefield/rtpDiagnosticProvider';
import { RtpSymbolProvider } from '../../providers/forcefield/rtpSymbolProvider';
import { AtpSymbolProvider } from '../../providers/forcefield/atpSymbolProvider';
import { TdbHoverProvider } from '../../providers/forcefield/tdbHoverProvider';
import { HdbHoverProvider } from '../../providers/forcefield/hdbHoverProvider';
import { WaterModelsHoverProvider } from '../../providers/forcefield/waterModelsHoverProvider';
import { WaterModelsSymbolProvider } from '../../providers/forcefield/waterModelsSymbolProvider';
import { IncludeDefinitionProvider } from '../../providers/forcefield/includeDefinitionProvider';
import { ItpHoverProvider } from '../../providers/forcefield/itpHoverProvider';
import { ItpCompletionProvider } from '../../providers/forcefield/itpCompletionProvider';
import { ItpDiagnosticProvider } from '../../providers/forcefield/itpDiagnosticProvider';
import { TdbCompletionProvider } from '../../providers/forcefield/tdbCompletionProvider';
import { TdbDiagnosticProvider } from '../../providers/forcefield/tdbDiagnosticProvider';
import { HdbCompletionProvider } from '../../providers/forcefield/hdbCompletionProvider';
import { HdbDiagnosticProvider } from '../../providers/forcefield/hdbDiagnosticProvider';
import { TopologyCompletionProvider } from '../../providers/forcefield/topologyCompletionProvider';
import { TopologyHoverProvider } from '../../providers/forcefield/topologyHoverProvider';
import { TopologyDiagnosticProvider } from '../../providers/forcefield/topologyDiagnosticProvider';

/**
 * ForceFieldLanguageSupport - 力场文件语言支持
 */
export class ForceFieldLanguageSupport {
  private disposables: vscode.Disposable[] = [];
  private indexManager: ForceFieldIndexManager;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private rtpDiagnosticProvider: RtpDiagnosticProvider;
  private itpDiagnosticProvider: ItpDiagnosticProvider;
  private tdbDiagnosticProvider: TdbDiagnosticProvider;
  private hdbDiagnosticProvider: HdbDiagnosticProvider;
  private topologyDiagnosticProvider: TopologyDiagnosticProvider;

  constructor() {
    this.indexManager = new ForceFieldIndexManager();
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('gromacs-forcefield');
    this.rtpDiagnosticProvider = new RtpDiagnosticProvider(this.indexManager, this.diagnosticCollection);
    this.itpDiagnosticProvider = new ItpDiagnosticProvider(this.indexManager, this.diagnosticCollection);
    this.tdbDiagnosticProvider = new TdbDiagnosticProvider(this.indexManager, this.diagnosticCollection);
    this.hdbDiagnosticProvider = new HdbDiagnosticProvider(this.indexManager, this.diagnosticCollection);
    this.topologyDiagnosticProvider = new TopologyDiagnosticProvider(this.indexManager, this.diagnosticCollection);
  }

  /**
   * 激活力场支持
   */
  public activate(context: vscode.ExtensionContext): void {
    console.log('[ForceFieldSupport] 激活力场文件支持...');

    // 注册 .rtp 文件的 Providers
    this.registerRtpProviders();

    // 注册 .atp 文件的 Providers
    this.registerAtpProviders();

    // 注册 .tdb 文件的 Providers
    this.registerTdbProviders();

    // 注册 .hdb 文件的 Providers
    this.registerHdbProviders();

    // 注册 watermodels.dat 文件的 Providers
    this.registerWaterModelsProviders();

    // 注册 ITP 力场参数文件的 Providers
    this.registerItpProviders();

    // 注册 TOP/ITP 拓扑文件的 Providers
    this.registerTopologyProviders();

    // 注册 Include Definition Provider
    this.registerIncludeDefinitionProvider();

    // 监听文档变化以触发诊断
    this.registerDiagnosticTriggers();

    // 监听文件变化以使索引失效
    this.registerFileWatchers();

    // 添加到 context
    context.subscriptions.push(...this.disposables);
    context.subscriptions.push(this.diagnosticCollection);

    console.log('[ForceFieldSupport] ✓ 力场文件支持已激活');
  }

  /**
   * 注册 .rtp 文件的 Providers
   */
  private registerRtpProviders(): void {
    const rtpSelector: vscode.DocumentSelector = { language: 'gromacs_rtp_file' };

    // Completion Provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      rtpSelector,
      new RtpCompletionProvider(this.indexManager),
      ' ' // 触发字符：空格
    );
    this.disposables.push(completionProvider);
    console.log('[ForceFieldSupport]   - 注册 RTP Completion Provider');

    // Hover Provider
    const hoverProvider = vscode.languages.registerHoverProvider(
      rtpSelector,
      new RtpHoverProvider(this.indexManager)
    );
    this.disposables.push(hoverProvider);
    console.log('[ForceFieldSupport]   - 注册 RTP Hover Provider');

    // Symbol Provider (大纲)
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
      rtpSelector,
      new RtpSymbolProvider()
    );
    this.disposables.push(symbolProvider);
    console.log('[ForceFieldSupport]   - 注册 RTP Symbol Provider (大纲)');
  }

  /**
   * 注册 .atp 文件的 Providers
   */
  private registerAtpProviders(): void {
    const atpSelector: vscode.DocumentSelector = { language: 'gromacs_atp_file' };

    // Hover Provider（显示原子类型信息）
    const hoverProvider = vscode.languages.registerHoverProvider(
      atpSelector,
      new RtpHoverProvider(this.indexManager) // 复用 RTP 的 Hover Provider
    );
    this.disposables.push(hoverProvider);
    console.log('[ForceFieldSupport]   - 注册 ATP Hover Provider');

    // Symbol Provider (大纲)
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
      atpSelector,
      new AtpSymbolProvider()
    );
    this.disposables.push(symbolProvider);
    console.log('[ForceFieldSupport]   - 注册 ATP Symbol Provider (大纲)');
  }

  /**
   * 注册 .tdb 文件的 Providers
   */
  private registerTdbProviders(): void {
    const tdbSelector: vscode.DocumentSelector = { language: 'gromacs_tdb_file' };

    // Hover Provider（显示关键字格式说明和原子/残基信息）
    const hoverProvider = vscode.languages.registerHoverProvider(
      tdbSelector,
      new TdbHoverProvider(this.indexManager)
    );
    this.disposables.push(hoverProvider);
    console.log('[ForceFieldSupport]   - 注册 TDB Hover Provider');

    // Completion Provider（原子类型补全）
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      tdbSelector,
      new TdbCompletionProvider(this.indexManager),
      ' '  // 触发字符：空格
    );
    this.disposables.push(completionProvider);
    console.log('[ForceFieldSupport]   - 注册 TDB Completion Provider');
  }

  /**
   * 注册 .hdb 文件的 Providers
   */
  private registerHdbProviders(): void {
    const hdbSelector: vscode.DocumentSelector = { language: 'gromacs_hdb_file' };

    // Hover Provider（显示原子和残基信息）
    const hoverProvider = vscode.languages.registerHoverProvider(
      hdbSelector,
      new HdbHoverProvider(this.indexManager)
    );
    this.disposables.push(hoverProvider);
    console.log('[ForceFieldSupport]   - 注册 HDB Hover Provider');

    // Completion Provider（残基名称补全）
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      hdbSelector,
      new HdbCompletionProvider(this.indexManager),
      ' '  // 触发字符：空格
    );
    this.disposables.push(completionProvider);
    console.log('[ForceFieldSupport]   - 注册 HDB Completion Provider');
  }

  /**
   * 注册 watermodels.dat 文件的 Providers
   */
  private registerWaterModelsProviders(): void {
    const waterModelsSelector: vscode.DocumentSelector = { language: 'gromacs_watermodels_file' };

    // Hover Provider（显示水模型信息）
    const hoverProvider = vscode.languages.registerHoverProvider(
      waterModelsSelector,
      new WaterModelsHoverProvider(new Map())
    );
    this.disposables.push(hoverProvider);
    console.log('[ForceFieldSupport]   - 注册 WaterModels Hover Provider');

    // Symbol Provider (大纲)
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
      waterModelsSelector,
      new WaterModelsSymbolProvider()
    );
    this.disposables.push(symbolProvider);
    console.log('[ForceFieldSupport]   - 注册 WaterModels Symbol Provider (大纲)');
  }

  /**
   * 注册 Include Definition Provider（支持 #include 跳转）
   */
  private registerIncludeDefinitionProvider(): void {
    // 支持 .itp、.top、.rtp 等文件中的 #include 指令
    const includeSelector: vscode.DocumentSelector = [
      { language: 'gromacs_rtp_file' },
      { language: 'gromacs_atp_file' },
      { language: 'gromacs_tdb_file' },
      { language: 'gromacs_hdb_file' },
      { pattern: '**/*.itp' },
      { pattern: '**/*.top' },
    ];

    const includeDefinitionProvider = new IncludeDefinitionProvider();
    this.disposables.push(
      vscode.languages.registerDefinitionProvider(includeSelector, includeDefinitionProvider)
    );
    console.log('[ForceFieldSupport]   - 注册 Include Definition Provider');
  }

  /**
   * 注册 ITP 力场参数文件的 Providers
   */
  private registerItpProviders(): void {
    // 使用语言 ID 选择器
    const itpSelector: vscode.DocumentSelector = { language: 'gromacs_itp_forcefield' };

    // Hover Provider
    const hoverProvider = vscode.languages.registerHoverProvider(
      itpSelector,
      new ItpHoverProvider(this.indexManager)
    );
    this.disposables.push(hoverProvider);
    console.log('[ForceFieldSupport]   - 注册 ITP Hover Provider (4个力场参数文件)');

    // Completion Provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      itpSelector,
      new ItpCompletionProvider(this.indexManager),
      ' '  // 触发字符：空格
    );
    this.disposables.push(completionProvider);
    console.log('[ForceFieldSupport]   - 注册 ITP Completion Provider (4个力场参数文件)');
  }

  /**
   * 注册 TOP/ITP 拓扑文件的 Providers
   */
  private registerTopologyProviders(): void {
    const topSelector: vscode.DocumentSelector = { language: 'gromacs_top_file' };
    const itpSelector: vscode.DocumentSelector = { pattern: '**/*.itp' };

    // Hover Provider
    const hoverProvider = vscode.languages.registerHoverProvider(
      [topSelector, itpSelector],
      new TopologyHoverProvider(this.indexManager)
    );
    this.disposables.push(hoverProvider);
    console.log('[ForceFieldSupport]   - 注册 TOP/ITP Hover Provider');

    // Completion Provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      [topSelector, itpSelector],
      new TopologyCompletionProvider(this.indexManager),
      ' '  // 触发字符：空格
    );
    this.disposables.push(completionProvider);
    console.log('[ForceFieldSupport]   - 注册 TOP/ITP Completion Provider');
  }

  /**
   * 注册诊断触发器
   */
  private registerDiagnosticTriggers(): void {
    // 文档打开时诊断
    const onOpen = vscode.workspace.onDidOpenTextDocument(doc => {
      if (doc.languageId === 'gromacs_rtp_file') {
        console.log(`[ForceFieldSupport] 文档打开，触发诊断: ${doc.uri.fsPath}`);
        this.rtpDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_itp_forcefield') {
        console.log(`[ForceFieldSupport] ITP 文档打开，触发诊断: ${doc.uri.fsPath}`);
        this.itpDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_tdb_file') {
        console.log(`[ForceFieldSupport] TDB 文档打开，触发诊断: ${doc.uri.fsPath}`);
        this.tdbDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_hdb_file') {
        console.log(`[ForceFieldSupport] HDB 文档打开，触发诊断: ${doc.uri.fsPath}`);
        this.hdbDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_top_file' || doc.uri.fsPath.endsWith('.itp')) {
        console.log(`[ForceFieldSupport] TOP/ITP 文档打开，触发诊断: ${doc.uri.fsPath}`);
        this.topologyDiagnosticProvider.provideDiagnostics(doc);
      }
    });
    this.disposables.push(onOpen);

    // 文档保存时诊断
    const onSave = vscode.workspace.onDidSaveTextDocument(doc => {
      if (doc.languageId === 'gromacs_rtp_file') {
        console.log(`[ForceFieldSupport] 文档保存，触发诊断: ${doc.uri.fsPath}`);
        this.rtpDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_itp_forcefield') {
        console.log(`[ForceFieldSupport] ITP 文档保存，触发诊断: ${doc.uri.fsPath}`);
        this.itpDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_tdb_file') {
        console.log(`[ForceFieldSupport] TDB 文档保存，触发诊断: ${doc.uri.fsPath}`);
        this.tdbDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_hdb_file') {
        console.log(`[ForceFieldSupport] HDB 文档保存，触发诊断: ${doc.uri.fsPath}`);
        this.hdbDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_top_file' || doc.uri.fsPath.endsWith('.itp')) {
        console.log(`[ForceFieldSupport] TOP/ITP 文档保存，触发诊断: ${doc.uri.fsPath}`);
        this.topologyDiagnosticProvider.provideDiagnostics(doc);
      }
    });
    this.disposables.push(onSave);

    // 文档关闭时清除诊断
    const onClose = vscode.workspace.onDidCloseTextDocument(doc => {
      if (doc.languageId === 'gromacs_rtp_file') {
        console.log(`[ForceFieldSupport] 文档关闭，清除诊断: ${doc.uri.fsPath}`);
        this.rtpDiagnosticProvider.clearDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_itp_forcefield') {
        console.log(`[ForceFieldSupport] ITP 文档关闭，清除诊断: ${doc.uri.fsPath}`);
        this.itpDiagnosticProvider.clearDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_tdb_file') {
        console.log(`[ForceFieldSupport] TDB 文档关闭，清除诊断: ${doc.uri.fsPath}`);
        this.tdbDiagnosticProvider.clearDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_hdb_file') {
        console.log(`[ForceFieldSupport] HDB 文档关闭，清除诊断: ${doc.uri.fsPath}`);
        this.hdbDiagnosticProvider.clearDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_top_file' || doc.uri.fsPath.endsWith('.itp')) {
        console.log(`[ForceFieldSupport] TOP/ITP 文档关闭，清除诊断: ${doc.uri.fsPath}`);
        this.topologyDiagnosticProvider.clearDiagnostics(doc);
      }
    });
    this.disposables.push(onClose);

    // 对已打开的文档立即诊断
    vscode.workspace.textDocuments.forEach(doc => {
      if (doc.languageId === 'gromacs_rtp_file') {
        console.log(`[ForceFieldSupport] 对已打开文档进行诊断: ${doc.uri.fsPath}`);
        this.rtpDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_itp_forcefield') {
        console.log(`[ForceFieldSupport] 对已打开 ITP 文档进行诊断: ${doc.uri.fsPath}`);
        this.itpDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_tdb_file') {
        console.log(`[ForceFieldSupport] 对已打开 TDB 文档进行诊断: ${doc.uri.fsPath}`);
        this.tdbDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_hdb_file') {
        console.log(`[ForceFieldSupport] 对已打开 HDB 文档进行诊断: ${doc.uri.fsPath}`);
        this.hdbDiagnosticProvider.provideDiagnostics(doc);
      } else if (doc.languageId === 'gromacs_top_file' || doc.uri.fsPath.endsWith('.itp')) {
        console.log(`[ForceFieldSupport] 对已打开 TOP/ITP 文档进行诊断: ${doc.uri.fsPath}`);
        this.topologyDiagnosticProvider.provideDiagnostics(doc);
      }
    });
  }

  /**
   * 注册文件监听器（使索引失效）
   */
  private registerFileWatchers(): void {
    // 监听 .atp 文件变化
    const atpWatcher = vscode.workspace.createFileSystemWatcher('**/*.atp');
    atpWatcher.onDidChange(uri => {
      console.log(`[ForceFieldSupport] ATP 文件变化: ${uri.fsPath}`);
      this.invalidateIndexForFile(uri);
    });
    atpWatcher.onDidDelete(uri => {
      console.log(`[ForceFieldSupport] ATP 文件删除: ${uri.fsPath}`);
      this.invalidateIndexForFile(uri);
    });
    this.disposables.push(atpWatcher);

    // 监听 .rtp 文件变化
    const rtpWatcher = vscode.workspace.createFileSystemWatcher('**/*.rtp');
    rtpWatcher.onDidChange(uri => {
      console.log(`[ForceFieldSupport] RTP 文件变化: ${uri.fsPath}`);
      this.invalidateIndexForFile(uri);
    });
    rtpWatcher.onDidDelete(uri => {
      console.log(`[ForceFieldSupport] RTP 文件删除: ${uri.fsPath}`);
      this.invalidateIndexForFile(uri);
    });
    this.disposables.push(rtpWatcher);
  }

  /**
   * 使文件所在力场的索引失效
   */
  private async invalidateIndexForFile(uri: vscode.Uri): Promise<void> {
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      const forceFieldDir = await this.indexManager.findForceFieldForDocument(doc);
      if (forceFieldDir) {
        this.indexManager.invalidate(forceFieldDir);
      }
    } catch (error) {
      // 文件可能已被删除，忽略错误
    }
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.diagnosticCollection.dispose();
    this.indexManager.clearAll();
  }
}
