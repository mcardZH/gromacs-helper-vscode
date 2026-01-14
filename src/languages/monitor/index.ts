import * as vscode from 'vscode';
import { GromacsMonitorOrchestrator, IMonitorTarget, ProcessInfo } from '../../providers/gromacsMonitorProvider';
import { GromacsStatusBarManager } from '../../providers/gromacsStatusBarManager';

/**
 * GROMACS 监控支持类 - 管理监控功能的生命周期
 */
export class GromacsMonitorSupport implements vscode.Disposable {
    private orchestrator?: GromacsMonitorOrchestrator;
    private statusBarManager?: GromacsStatusBarManager;
    private disposables: vscode.Disposable[] = [];

    /**
     * 激活监控功能
     */
    public activate(context: vscode.ExtensionContext): void {
        // 注册管理命令
        const addTargetCommand = vscode.commands.registerCommand(
            'gromacs-helper.addMonitorTarget',
            () => this.addMonitorTarget()
        );
        this.disposables.push(addTargetCommand);

        const manageTargetsCommand = vscode.commands.registerCommand(
            'gromacs-helper.manageMonitorTargets',
            () => this.manageMonitorTargets()
        );
        this.disposables.push(manageTargetsCommand);

        // 读取配置
        const config = vscode.workspace.getConfiguration('gromacsHelper.monitor');
        const enabled = config.get<boolean>('enabled', false);

        if (!enabled) {
            console.log('[GromacsMonitor] Monitoring is disabled');
            context.subscriptions.push(this);
            return;
        }

        // 初始化监控
        this.initialize();

        // 监听配置变更
        const configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('gromacsHelper.monitor')) {
                this.handleConfigChange();
            }
        });
        this.disposables.push(configListener);

        // 添加到扩展上下文
        context.subscriptions.push(this);
    }

    /**
     * 添加监控目标（交互式向导）
     */
    private async addMonitorTarget(): Promise<void> {
        // 选择监控类型
        const type = await vscode.window.showQuickPick(
            [
                { label: '$(desktop-download) Local', value: 'local', description: 'Monitor local GROMACS processes' },
                { label: '$(remote) Remote SSH', value: 'remote', description: 'Monitor remote server via SSH' }
            ],
            { placeHolder: 'Select monitor type' }
        );

        if (!type) {
            return;
        }

        // 输入名称
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a display name for this monitor',
            placeHolder: 'e.g., Local GPU1, Server A',
            validateInput: (value) => {
                if (!value.trim()) {
                    return 'Name cannot be empty';
                }
                return null;
            }
        });

        if (!name) {
            return;
        }

        // 生成唯一 ID
        const id = `${type.value}-${Date.now()}`;

        const target: IMonitorTarget = {
            id,
            name: name.trim(),
            type: type.value as 'local' | 'remote',
            independent: false
        };

        // 如果是远程监控，收集 SSH 信息
        if (type.value === 'remote') {
            // 单独输入用户名，便于与主机名分离配置
            const sshUser = await vscode.window.showInputBox({
                prompt: 'Enter SSH username',
                placeHolder: 'e.g., gmxuser',
                validateInput: (value) => {
                    if (!value.trim()) {
                        return 'Username cannot be empty';
                    }
                    return null;
                }
            });

            if (!sshUser) {
                return;
            }

            const sshHost = await vscode.window.showInputBox({
                prompt: 'Enter SSH host',
                placeHolder: 'hostname or ip',
                validateInput: (value) => {
                    if (!value.trim()) {
                        return 'Host cannot be empty';
                    }
                    return null;
                }
            });

            if (!sshHost) {
                return;
            }

            target.sshUser = sshUser.trim();
            target.sshHost = sshHost.trim();

            // 可选：SSH 端口
            const sshPort = await vscode.window.showInputBox({
                prompt: 'Enter SSH port (optional, press Enter for default 22)',
                placeHolder: '22',
                validateInput: (value) => {
                    if (value && (isNaN(Number(value)) || Number(value) <= 0 || Number(value) > 65535)) {
                        return 'Please enter a valid port number (1-65535)';
                    }
                    return null;
                }
            });

            if (sshPort) {
                target.sshPort = Number(sshPort);
            }

            // 可选：SSH 密钥
            const useSshKey = await vscode.window.showQuickPick(
                [
                    {
                        label: 'Use default SSH configuration',
                        description: 'Use your existing SSH config / agent / password login',
                        value: false
                    },
                    {
                        label: 'Specify custom SSH key',
                        description: 'Use a specific private key file for authentication',
                        value: true
                    }
                ],
                { placeHolder: 'SSH authentication method (password or key)' }
            );

            if (useSshKey?.value) {
                const keyFiles = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {
                        'SSH Keys': ['', 'pem', 'key'],
                        'All Files': ['*']
                    },
                    title: 'Select SSH private key file'
                });

                if (keyFiles && keyFiles.length > 0) {
                    target.sshKey = keyFiles[0].fsPath;
                }
            }
        }

        // 询问是否独立显示
        const independent = await vscode.window.showQuickPick(
            [
                { label: 'Merged display', value: false, description: 'Rotate with other monitors' },
                { label: 'Independent display', value: true, description: 'Show in separate status bar item' }
            ],
            { placeHolder: 'Display mode' }
        );

        if (independent) {
            target.independent = independent.value;
        }

        // 保存到配置
        const config = vscode.workspace.getConfiguration('gromacsHelper.monitor');
        const targets = config.get<IMonitorTarget[]>('targets', []);
        targets.push(target);

        await config.update('targets', targets, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(`Monitor target "${name}" added successfully!`);
    }

    /**
     * 管理监控目标
     */
    private async manageMonitorTargets(): Promise<void> {
        const config = vscode.workspace.getConfiguration('gromacsHelper.monitor');
        const targets = config.get<IMonitorTarget[]>('targets', []);

        if (targets.length === 0) {
            const addNew = await vscode.window.showInformationMessage(
                'No monitor targets configured. Would you like to add one?',
                'Add Target'
            );
            if (addNew === 'Add Target') {
                await this.addMonitorTarget();
            }
            return;
        }

        const items = targets.map((target, index) => ({
            label: `$(${target.type === 'local' ? 'desktop-download' : 'remote'}) ${target.name}`,
            description: target.type === 'remote' ? target.sshHost : 'local',
            detail: target.independent ? 'Independent display' : 'Merged display',
            target,
            index
        }));

        items.push({
            label: '$(add) Add New Target',
            description: 'Add a new monitor target',
            detail: '',
            target: null as any,
            index: -1
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a monitor target to manage'
        });

        if (!selected) {
            return;
        }

        if (selected.index === -1) {
            // 添加新目标
            await this.addMonitorTarget();
            return;
        }

        // 管理现有目标
        const action = await vscode.window.showQuickPick(
            [
                { label: '$(trash) Remove', value: 'remove' },
                { label: '$(eye) Toggle Independent Display', value: 'toggle' },
                { label: '$(edit) Edit Configuration', value: 'edit' }
            ],
            { placeHolder: `Manage "${selected.target.name}"` }
        );

        if (!action) {
            return;
        }

        if (action.value === 'remove') {
            const confirm = await vscode.window.showWarningMessage(
                `Remove monitor target "${selected.target.name}"?`,
                'Remove', 'Cancel'
            );
            if (confirm === 'Remove') {
                targets.splice(selected.index, 1);
                await config.update('targets', targets, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Monitor target "${selected.target.name}" removed`);
            }
        } else if (action.value === 'toggle') {
            targets[selected.index].independent = !targets[selected.index].independent;
            await config.update('targets', targets, vscode.ConfigurationTarget.Global);
            const mode = targets[selected.index].independent ? 'independent' : 'merged';
            vscode.window.showInformationMessage(`Display mode changed to ${mode}`);
        } else if (action.value === 'edit') {
            // 打开设置页面
            await vscode.commands.executeCommand('workbench.action.openSettings', 'gromacsHelper.monitor.targets');
        }
    }


    /**
     * 初始化监控
     */
    private initialize(): void {
        // 清理现有实例
        this.dispose();

        // 读取配置
        const config = vscode.workspace.getConfiguration('gromacsHelper.monitor');
        const enabled = config.get<boolean>('enabled', false);

        if (!enabled) {
            return;
        }

        let targets = config.get<IMonitorTarget[]>('targets', []);
        const refreshInterval = config.get<number>('refreshInterval', 5000);
        const rotateInterval = config.get<number>('rotateInterval', 10000);

        // 如果没有配置监控目标，自动添加一个本地默认目标，确保启动即显示
        if (!targets || targets.length === 0) {
            targets = [{
                id: 'local-default',
                name: 'Local',
                type: 'local',
                independent: false
            }];
        }

        // 创建编排器
        this.orchestrator = new GromacsMonitorOrchestrator(
            targets,
            (info) => this.handleMonitorUpdate(info),
            refreshInterval
        );

        // 创建状态栏管理器
        this.statusBarManager = new GromacsStatusBarManager(
            targets,
            (id) => this.getTargetInfo(id),
            (id) => this.handleStatusBarClick(id),
            rotateInterval
        );

        // 先执行一次状态栏更新，确保扩展启动时立即显示（Idle 或当前状态）
        this.statusBarManager.updateAll();

        // 启动监控（立即刷新一次并开始定时轮转）
        this.orchestrator.start();
        this.statusBarManager.startRotation();

        console.log(`[GromacsMonitor] Started monitoring ${targets.length} target(s)`);
    }

    /**
     * 处理监控更新
     */
    private handleMonitorUpdate(info: Map<string, ProcessInfo>): void {
        if (this.statusBarManager) {
            this.statusBarManager.updateAll();
        }
    }

    /**
     * 获取目标信息
     */
    private getTargetInfo(id: string): ProcessInfo | undefined {
        if (!this.orchestrator) {
            return undefined;
        }

        // 从编排器的缓存中获取
        return (this.orchestrator as any).monitorInfo?.get(id);
    }

    /**
     * 处理状态栏点击
     */
    private handleStatusBarClick(targetId: string): void {
        if (!this.orchestrator) {
            return;
        }

        const target = this.orchestrator.getTarget(targetId);
        const info = this.getTargetInfo(targetId);

        if (!target || !info) {
            return;
        }

        // 仅本地监控支持打开目录
        if (target.type === 'local' && info.cwd) {
            const uri = vscode.Uri.file(info.cwd);
            vscode.commands.executeCommand('revealFileInOS', uri);
        }
    }

    /**
     * 处理配置变更
     */
    private handleConfigChange(): void {
        const config = vscode.workspace.getConfiguration('gromacsHelper.monitor');
        const enabled = config.get<boolean>('enabled', false);

        if (enabled) {
            // 重新初始化
            this.initialize();
        } else {
            // 停止监控
            this.dispose();
        }
    }

    /**
     * 释放资源
     */
    public dispose(): void {
        if (this.orchestrator) {
            this.orchestrator.dispose();
            this.orchestrator = undefined;
        }

        if (this.statusBarManager) {
            this.statusBarManager.dispose();
            this.statusBarManager = undefined;
        }

        // 不要清理 disposables，因为配置监听器需要保留
    }
}
