import * as vscode from 'vscode';
import { ProcessInfo, IMonitorTarget } from './gromacsMonitorProvider';

/**
 * 状态栏管理器 - 管理 GROMACS 监控的状态栏显示
 */
export class GromacsStatusBarManager implements vscode.Disposable {
    private mergedStatusBar?: vscode.StatusBarItem;
    private independentStatusBars: Map<string, vscode.StatusBarItem> = new Map();
    private mergedTargetIds: string[] = [];
    private currentMergedIndex = 0;
    private rotateTimer?: NodeJS.Timeout;
    private isHovering = false;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private targets: IMonitorTarget[],
        private getTargetInfo: (id: string) => ProcessInfo | undefined,
        private onStatusBarClick: (targetId: string) => void,
        private rotateInterval: number = 10000
    ) {
        this.initializeStatusBars();
    }

    /**
     * 初始化状态栏项
     */
    private initializeStatusBars(): void {
        // 分离合并和独立的目标
        const mergedTargets = this.targets.filter(t => !t.independent);
        const independentTargets = this.targets.filter(t => t.independent);

        // 创建合并状态栏项
        if (mergedTargets.length > 0) {
            this.mergedTargetIds = mergedTargets.map(t => t.id);
            this.mergedStatusBar = vscode.window.createStatusBarItem(
                vscode.StatusBarAlignment.Right,
                100
            );
            this.mergedStatusBar.command = 'gromacs-helper.rotateMonitor';
            
            // 注册点击命令
            const clickCommand = vscode.commands.registerCommand('gromacs-helper.rotateMonitor', () => {
                this.rotateToNext();
            });
            this.disposables.push(clickCommand);
        }

        // 创建独立状态栏项
        for (const target of independentTargets) {
            const statusBar = vscode.window.createStatusBarItem(
                vscode.StatusBarAlignment.Right,
                99 - this.independentStatusBars.size
            );
            
            // 为本地监控设置点击打开目录的命令
            if (target.type === 'local') {
                const commandId = `gromacs-helper.openMonitorDir.${target.id}`;
                statusBar.command = commandId;
                
                const command = vscode.commands.registerCommand(commandId, () => {
                    this.onStatusBarClick(target.id);
                });
                this.disposables.push(command);
            }
            
            this.independentStatusBars.set(target.id, statusBar);
        }
    }

    /**
     * 启动自动轮转
     */
    startRotation(): void {
        if (this.mergedTargetIds.length <= 1) {
            return;
        }

        this.rotateTimer = setInterval(() => {
            if (!this.isHovering) {
                this.rotateToNext();
            }
        }, this.rotateInterval);
    }

    /**
     * 轮转到下一个目标
     */
    private rotateToNext(): void {
        if (this.mergedTargetIds.length <= 1) {
            return;
        }

        this.currentMergedIndex = (this.currentMergedIndex + 1) % this.mergedTargetIds.length;
        this.updateMergedStatusBar();
    }

    /**
     * 暂停轮转（鼠标悬浮时）
     */
    pauseRotation(): void {
        this.isHovering = true;
    }

    /**
     * 恢复轮转
     */
    resumeRotation(): void {
        this.isHovering = false;
    }

    /**
     * 更新所有状态栏
     */
    updateAll(): void {
        this.updateMergedStatusBar();
        this.updateIndependentStatusBars();
    }

    /**
     * 更新合并状态栏
     */
    private updateMergedStatusBar(): void {
        if (!this.mergedStatusBar || this.mergedTargetIds.length === 0) {
            return;
        }

        const currentId = this.mergedTargetIds[this.currentMergedIndex];
        const info = this.getTargetInfo(currentId);
        const target = this.targets.find(t => t.id === currentId);

        if (!info || !target) {
            this.mergedStatusBar.hide();
            return;
        }

        this.updateStatusBarItem(this.mergedStatusBar, target, info);
        this.mergedStatusBar.show();
    }

    /**
     * 更新独立状态栏
     */
    private updateIndependentStatusBars(): void {
        for (const [id, statusBar] of this.independentStatusBars.entries()) {
            const info = this.getTargetInfo(id);
            const target = this.targets.find(t => t.id === id);

            if (!info || !target) {
                statusBar.hide();
                continue;
            }

            this.updateStatusBarItem(statusBar, target, info);
            statusBar.show();
        }
    }

    /**
     * 更新单个状态栏项
     */
    private updateStatusBarItem(
        statusBar: vscode.StatusBarItem,
        target: IMonitorTarget,
        info: ProcessInfo
    ): void {
        // 构建显示文本
        if (info.error) {
            statusBar.text = `$(error) ${target.name}: Error`;
            statusBar.tooltip = this.buildErrorTooltip(target, info);
            statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            return;
        }

        if (!info.isRunning) {
            statusBar.text = `$(circle-outline) ${target.name}: Idle`;
            const tooltip = new vscode.MarkdownString();
            tooltip.appendMarkdown(`**${target.name}**\n\nNo GROMACS process detected`);
            statusBar.tooltip = tooltip;
            statusBar.backgroundColor = undefined;
            return;
        }

        if (info.isMdrun && info.remainingTime !== undefined && !isNaN(info.remainingTime)) {
            // 显示剩余时间
            const timeStr = this.formatTime(info.remainingTime);
            const color = this.getTimeColor(info.remainingTime);
            
            statusBar.text = `$(sync~spin) ${target.name}: ${timeStr}`;
            statusBar.tooltip = this.buildMdrunTooltip(target, info, 'remaining');
            statusBar.backgroundColor = undefined;
        } else if (info.isMdrun && info.currentTimeNs !== undefined && !isNaN(info.currentTimeNs)) {
            // 显示当前模拟时间
            const timeStr = this.formatSimulationTime(info.currentTimeNs);
            
            statusBar.text = `$(sync~spin) ${target.name}: ${timeStr}`;
            statusBar.tooltip = this.buildMdrunTooltip(target, info, 'simulation');
            statusBar.backgroundColor = undefined;
        } else {
            // 显示运行中的命令
            const cmdName = this.extractCommandName(info.cmdline || '');
            
            statusBar.text = `$(play) ${target.name}: ${cmdName}`;
            statusBar.tooltip = this.buildRunningTooltip(target, info);
            statusBar.backgroundColor = undefined;
        }
    }

    /**
     * 构建错误提示
     */
    private buildErrorTooltip(target: IMonitorTarget, info: ProcessInfo): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${target.name}** (${target.type})\n\n`);
        md.appendMarkdown(`**Status:** Error\n\n`);
        md.appendMarkdown(`**Error:** ${info.error || 'Unknown error'}\n\n`);

        if (target.type === 'remote') {
            md.appendMarkdown(`**Host:** ${target.sshHost}\n`);
        }

        return md;
    }

    /**
     * 构建 mdrun 提示
     */
    private buildMdrunTooltip(
        target: IMonitorTarget,
        info: ProcessInfo,
        mode: 'remaining' | 'simulation'
    ): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${target.name}** (${target.type})\n\n`);
        md.appendMarkdown(`**Status:** Running mdrun\n\n`);

        if (mode === 'remaining' && info.remainingTime !== undefined && !isNaN(info.remainingTime)) {
            md.appendMarkdown(`**Remaining:** ${this.formatTime(info.remainingTime)}\n\n`);
        }

        if (info.currentTimeNs !== undefined && !isNaN(info.currentTimeNs)) {
            md.appendMarkdown(`**Simulation Time:** ${this.formatSimulationTime(info.currentTimeNs)}\n\n`);
        }

        if (info.currentStep !== undefined && !isNaN(info.currentStep)) {
            md.appendMarkdown(`**Current Step:** ${this.formatStep(info.currentStep)}\n\n`);
        }

        if (info.progressPercent !== undefined && !isNaN(info.progressPercent) && info.progressPercent > 0) {
            md.appendMarkdown(`**Progress:** ${info.progressPercent.toFixed(1)}%\n\n`);
        }

        if (info.cwd) {
            md.appendMarkdown(`**Directory:** \`${info.cwd}\`\n\n`);
        }

        if (info.logFile) {
            md.appendMarkdown(`**Log File:** \`${info.logFile}\`\n\n`);
        }

        if (target.type === 'remote') {
            md.appendMarkdown(`**Host:** ${target.sshHost}\n`);
        }

        return md;
    }

    /**
     * 构建运行中提示
     */
    private buildRunningTooltip(target: IMonitorTarget, info: ProcessInfo): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${target.name}** (${target.type})\n\n`);
        md.appendMarkdown(`**Status:** Running\n\n`);

        if (info.cmdline) {
            md.appendMarkdown(`**Command:** \`${info.cmdline}\`\n\n`);
        }

        if (info.cwd) {
            md.appendMarkdown(`**Directory:** \`${info.cwd}\`\n\n`);
        }

        if (info.pid) {
            md.appendMarkdown(`**PID:** ${info.pid}\n\n`);
        }

        if (target.type === 'remote') {
            md.appendMarkdown(`**Host:** ${target.sshHost}\n`);
        }

        return md;
    }

    /**
     * 格式化时间（秒 -> 可读格式）
     */
    private formatTime(seconds: number): string {
        const totalSec = Math.floor(seconds);
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;

        if (hours > 0) {
            return `${hours}h${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * 格式化模拟时间（纳秒 -> 可读格式）
     */
    private formatSimulationTime(ns: number): string {
        if (ns >= 1000) {
            return `${(ns / 1000).toFixed(1)}μs`;
        } else {
            return `${ns.toFixed(1)}ns`;
        }
    }

    /**
     * 格式化步数
     */
    private formatStep(step: number): string {
        if (step >= 1000000) {
            return `${(step / 1000000).toFixed(1)}M`;
        } else if (step >= 1000) {
            return `${(step / 1000).toFixed(1)}K`;
        } else {
            return step.toString();
        }
    }

    /**
     * 根据剩余时间获取颜色主题
     */
    private getTimeColor(seconds: number): string {
        if (seconds < 300) {
            return 'green';
        } else if (seconds < 3600) {
            return 'orange';
        } else {
            return 'blue';
        }
    }

    /**
     * 提取命令名称
     */
    private extractCommandName(cmdline: string): string {
        const parts = cmdline.split(/\s+/);
        if (parts.length >= 2) {
            return parts[1].substring(0, 8);
        } else if (parts.length === 1) {
            return 'gmx';
        } else {
            return 'running';
        }
    }

    /**
     * 释放资源
     */
    dispose(): void {
        if (this.rotateTimer) {
            clearInterval(this.rotateTimer);
            this.rotateTimer = undefined;
        }

        if (this.mergedStatusBar) {
            this.mergedStatusBar.dispose();
            this.mergedStatusBar = undefined;
        }

        for (const statusBar of this.independentStatusBars.values()) {
            statusBar.dispose();
        }
        this.independentStatusBars.clear();

        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}
