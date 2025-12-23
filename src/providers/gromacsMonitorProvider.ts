import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * 监控目标配置接口
 */
export interface IMonitorTarget {
    id: string;
    name: string;
    type: 'local' | 'remote';
    independent: boolean;
    sshHost?: string;
    sshPort?: number;
    sshKey?: string;
    scriptPath?: string;
}

/**
 * 进程信息接口
 */
export interface ProcessInfo {
    pid?: number;
    cmdline?: string;
    cwd?: string;
    logFile?: string;
    isRunning: boolean;
    isMdrun: boolean;
    remainingTime?: number;      // 剩余时间（秒）
    currentTimeNs?: number;      // 当前模拟时间（纳秒）
    currentStep?: number;        // 当前步数
    progressPercent?: number;    // 进度百分比
    error?: string;              // 错误信息
}

/**
 * 监控器基类 - 实现日志解析逻辑
 */
abstract class BaseMonitor {
    constructor(protected target: IMonitorTarget) {}

    /**
     * 检查进程状态（由子类实现）
     */
    abstract check(): Promise<ProcessInfo>;

    /**
     * 解析 mdrun 日志内容，提取进度信息
     */
    protected parseLogContent(logContent: string): Partial<ProcessInfo> {
        const lines = logContent.split('\n');
        const result: Partial<ProcessInfo> = {
            progressPercent: 0,
            remainingTime: undefined,
            currentTimeNs: undefined,
            currentStep: undefined,
        };

        let foundStepHeader = false;

        // 反向遍历最后 50 行
        const recentLines = lines.slice(-50);

        let lastLine = '';
        
        for (let i = recentLines.length - 1; i >= 0; i--) {
            const line = recentLines[i].trim();

            // 格式1: "step 8260300, will finish Mon Oct 13 20:02:36 2025"
            if (line.toLowerCase().includes('will finish')) {
                const match = line.match(/step\s+(\d+),\s+will finish\s+(.+?)(\d{4})\s*$/i);
                if (match) {
                    const timeStr = match[2].trim() + ' ' + match[3];
                    try {
                        const finishTime = new Date(timeStr);
                        const now = new Date();
                        const remaining = (finishTime.getTime() - now.getTime()) / 1000;
                        
                        if (remaining > 0) {
                            result.remainingTime = remaining;
                            break;
                        }
                    } catch (e) {
                        // 解析失败，继续
                    }
                }
            }

            // 格式2: "step 39103200, remaining wall clock time:   210 s"
            if (line.toLowerCase().includes('remaining wall clock time')) {
                const match = line.match(/remaining wall clock time[:\s]+(\d+)\s*s/i);
                if (match) {
                    result.remainingTime = parseFloat(match[1]);
                    break;
                }
            }

            // 格式3: md.log 中的 "Step           Time" 格式
            if (line.toLowerCase().includes('step') && 
                line.toLowerCase().includes('time') && 
                line.split(/\s+/).length <= 3) {
                const parts = lastLine.split(/\s+/).filter(p => p.length > 0);
                if (parts.length >= 2) {
                    try {
                        const step = parseInt(parts[0], 10);
                        const timePs = parseFloat(parts[1]);
                        
                        if (!isNaN(step) && !isNaN(timePs) && step > 0 && timePs > 0) {
                            result.currentStep = step;
                            result.currentTimeNs = timePs / 1000.0; // ps -> ns
                        }
                        
                        foundStepHeader = false;
                    } catch (e) {
                        // 解析失败
                    }
                }
            }

            // 格式4: "Remaining: xxx"
            if (line.toLowerCase().includes('remaining') && 
                !line.toLowerCase().includes('wall clock')) {
                const match = line.match(/remaining[:\s]+(\d+\.?\d*)/i);
                if (match) {
                    const value = parseFloat(match[1]);
                    if (!isNaN(value) && value > 0) {
                        result.remainingTime = value;
                    }
                }
            }

            // 百分比
            if (line.includes('%') && line.toLowerCase().includes('complete')) {
                const match = line.match(/(\d+\.?\d*)%/);
                if (match) {
                    const value = parseFloat(match[1]);
                    if (!isNaN(value) && value >= 0 && value <= 100) {
                        result.progressPercent = value;
                    }
                }
            }

            // Step 进度 "Step 1000000 / 5000000"
            if (line.toLowerCase().includes('step') && line.includes('/')) {
                const match = line.match(/step[:\s]+(\d+)\s*\/\s*(\d+)/i);
                if (match) {
                    const currentStep = parseInt(match[1], 10);
                    const totalStep = parseInt(match[2], 10);
                    if (!isNaN(currentStep) && !isNaN(totalStep) && totalStep > 0) {
                        result.progressPercent = (currentStep / totalStep) * 100;
                        result.currentStep = currentStep;
                    }
                }
            }

            // 如果找到足够信息就停止
            if (result.remainingTime !== undefined && result.currentTimeNs !== undefined) {
                break;
            }
            lastLine = line;
        }

        return result;
    }

    /**
     * 释放资源（可选实现）
     */
    dispose(): void {
        // 子类可以覆盖此方法
    }
}

/**
 * 本地监控器 - 监控本地 gmx 进程
 */
export class LocalMonitor extends BaseMonitor {
    async check(): Promise<ProcessInfo> {
        const info: ProcessInfo = {
            isRunning: false,
            isMdrun: false,
        };

        try {
            // 查找 gmx 进程
            const { stdout } = await execAsync('pgrep -x gmx', { timeout: 10000 });
            
            if (!stdout.trim()) {
                return info;
            }

            const pids = stdout.trim().split('\n');
            const pid = parseInt(pids[0]);
            
            if (isNaN(pid)) {
                return info;
            }

            info.pid = pid;
            info.isRunning = true;

            // 读取命令行
            try {
                const cmdlineContent = await fs.promises.readFile(`/proc/${pid}/cmdline`, 'utf-8');
                info.cmdline = cmdlineContent.replace(/\x00/g, ' ').trim();
                info.isMdrun = info.cmdline.toLowerCase().includes('mdrun');
            } catch (e) {
                // 进程可能已经结束
                return info;
            }

            // 读取工作目录
            try {
                info.cwd = await fs.promises.readlink(`/proc/${pid}/cwd`);
            } catch (e) {
                // 无法读取工作目录
            }

            // 查找日志文件
            if (info.isMdrun) {
                await this.findLogFile(pid, info);
            }

            return info;
        } catch (error: any) {
            if (error.code === 'ETIMEDOUT') {
                info.error = 'Timeout detecting process';
            } else if (error.code === 1) {
                // pgrep 返回 1 表示没有找到进程
                return info;
            } else {
                info.error = `Error: ${error.message}`;
            }
            return info;
        }
    }

    /**
     * 使用 lsof 查找进程打开的日志文件
     */
    private async findLogFile(pid: number, info: ProcessInfo): Promise<void> {
        try {
            const { stdout } = await execAsync(`lsof -p ${pid}`, { timeout: 10000 });
            
            // 查找 .log 文件（写入模式）
            const lines = stdout.split('\n');
            const logFiles: string[] = [];
            
            for (const line of lines) {
                if (line.includes('.log') && (line.includes('w') || line.includes('u'))) {
                    const parts = line.split(/\s+/);
                    if (parts.length > 8) {
                        const logPath = parts.slice(8).join(' ');
                        if (fs.existsSync(logPath) && logPath.endsWith('.log')) {
                            try {
                                const stat = await fs.promises.stat(logPath);
                                // 跳过小于 5KB 的文件
                                if (stat.size >= 5000) {
                                    logFiles.push(logPath);
                                }
                            } catch (e) {
                                // 忽略无法访问的文件
                            }
                        }
                    }
                }
            }

            // 优先选择非 md.log 的文件
            for (const logFile of logFiles) {
                if (!path.basename(logFile).toLowerCase().includes('md.log')) {
                    info.logFile = logFile;
                    await this.parseLogFile(logFile, info);
                    return;
                }
            }

            // 如果没有非 md.log 文件，使用第一个
            if (logFiles.length > 0) {
                info.logFile = logFiles[0];
                await this.parseLogFile(logFiles[0], info);
            }
        } catch (error: any) {
            // lsof 可能失败，尝试在工作目录查找
            if (info.cwd) {
                await this.findLogInCwd(info.cwd, info);
            }
        }
    }

    /**
     * 在工作目录查找最新的日志文件
     */
    private async findLogInCwd(cwd: string, info: ProcessInfo): Promise<void> {
        try {
            const files = await fs.promises.readdir(cwd);
            let latestLog: string | null = null;
            let latestTime = 0;

            for (const file of files) {
                if (file.endsWith('.log')) {
                    const filePath = path.join(cwd, file);
                    try {
                        const stat = await fs.promises.stat(filePath);
                        if (stat.size >= 5000 && stat.mtimeMs > latestTime) {
                            latestTime = stat.mtimeMs;
                            latestLog = filePath;
                        }
                    } catch (e) {
                        // 忽略无法访问的文件
                    }
                }
            }

            if (latestLog) {
                info.logFile = latestLog;
                await this.parseLogFile(latestLog, info);
            }
        } catch (error) {
            // 无法读取目录
        }
    }

    /**
     * 解析日志文件
     */
    private async parseLogFile(logPath: string, info: ProcessInfo): Promise<void> {
        try {
            const stat = await fs.promises.stat(logPath);
            const fileSize = stat.size;
            
            // 读取最后 10KB
            const readSize = Math.min(10240, fileSize);
            const buffer = Buffer.alloc(readSize);
            const fd = await fs.promises.open(logPath, 'r');
            
            try {
                await fd.read(buffer, 0, readSize, Math.max(0, fileSize - readSize));
                const content = buffer.toString('utf-8', 0, readSize);
                
                const parsed = this.parseLogContent(content);
                Object.assign(info, parsed);
            } finally {
                await fd.close();
            }
        } catch (error) {
            // 无法读取日志文件
        }
    }
}

/**
 * 远程监控器 - 通过 SSH 监控远程服务器
 */
export class RemoteMonitor extends BaseMonitor {
    private scriptDeployed = false;
    private deploymentError?: string;

    async check(): Promise<ProcessInfo> {
        const info: ProcessInfo = {
            isRunning: false,
            isMdrun: false,
        };

        // 确保脚本已部署
        if (!this.scriptDeployed && !this.deploymentError) {
            await this.deployScript();
        }

        if (this.deploymentError) {
            info.error = this.deploymentError;
            return info;
        }

        try {
            const scriptPath = this.target.scriptPath || '~/.vscode/gromacs_monitor.sh';
            const { stdout } = await this.executeSSH(`bash ${scriptPath}`, 15000);
            
            // 解析 JSON 输出
            const data = JSON.parse(stdout);
            const processes = data.processes || [];
            
            if (processes.length === 0) {
                return info;
            }

            // 取第一个进程
            const proc = processes[0];
            info.pid = proc.pid;
            info.cmdline = proc.cmdline;
            info.cwd = proc.cwd;
            info.logFile = proc.log_file;
            info.isRunning = true;
            info.isMdrun = (proc.cmdline || '').toLowerCase().includes('mdrun');

            // 解析日志内容
            if (proc.log_tail && info.isMdrun) {
                try {
                    const logContent = Buffer.from(proc.log_tail, 'base64').toString('utf-8');
                    const parsed = this.parseLogContent(logContent);
                    Object.assign(info, parsed);
                } catch (e) {
                    // 解码失败
                }
            }

            return info;
        } catch (error: any) {
            if (error.code === 'ETIMEDOUT') {
                info.error = 'SSH timeout';
            } else if (error.message && error.message.includes('parse')) {
                info.error = 'Parse error';
            } else {
                info.error = `SSH error: ${error.message?.substring(0, 30) || 'Unknown'}`;
            }
            return info;
        }
    }

    /**
     * 部署监控脚本到远程服务器
     */
    private async deployScript(): Promise<void> {
        try {
            const scriptPath = this.target.scriptPath || '~/.vscode/gromacs_monitor.sh';
            
            // 获取本地脚本路径
            const localScript = path.join(__dirname, '../../gromacs_monitor.sh');
            
            if (!fs.existsSync(localScript)) {
                this.deploymentError = 'Local script not found';
                return;
            }

            // 使用 scp 上传
            const scpArgs = this.buildScpArgs(localScript, scriptPath);
            const scpCmd = scpArgs.join(' ');
            
            await execAsync(scpCmd, { timeout: 10000 });
            
            // 设置执行权限
            await this.executeSSH(`chmod +x ${scriptPath}`, 5000);
            
            this.scriptDeployed = true;
        } catch (error: any) {
            this.deploymentError = `Deploy failed: ${error.message?.substring(0, 30) || 'Unknown'}`;
        }
    }

    /**
     * 构建 scp 命令参数
     */
    private buildScpArgs(localPath: string, remotePath: string): string[] {
        const args = ['scp'];
        
        if (this.target.sshPort && this.target.sshPort !== 22) {
            args.push('-P', this.target.sshPort.toString());
        }
        
        if (this.target.sshKey) {
            args.push('-i', this.target.sshKey);
        }
        
        args.push(
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            '-o', 'LogLevel=ERROR',
            '-o', 'ConnectTimeout=10',
            localPath,
            `${this.target.sshHost}:${remotePath}`
        );
        
        return args;
    }

    /**
     * 执行 SSH 命令
     */
    private async executeSSH(command: string, timeout: number): Promise<{ stdout: string; stderr: string }> {
        const args = this.buildSshArgs(command);
        const sshCmd = args.join(' ');
        
        return execAsync(sshCmd, { timeout });
    }

    /**
     * 构建 ssh 命令参数
     */
    private buildSshArgs(command: string): string[] {
        const args = ['ssh'];
        
        if (this.target.sshPort && this.target.sshPort !== 22) {
            args.push('-p', this.target.sshPort.toString());
        }
        
        if (this.target.sshKey) {
            args.push('-i', this.target.sshKey);
        }
        
        args.push(
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            '-o', 'LogLevel=ERROR',
            '-o', 'ConnectTimeout=10',
            '-o', 'ServerAliveInterval=5',
            this.target.sshHost!,
            command
        );
        
        return args;
    }
}

/**
 * 监控编排器 - 管理多个监控实例
 */
export class GromacsMonitorOrchestrator implements vscode.Disposable {
    private monitors: Map<string, BaseMonitor> = new Map();
    private monitorInfo: Map<string, ProcessInfo> = new Map();
    private refreshTimer?: NodeJS.Timeout;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private targets: IMonitorTarget[],
        private onUpdate: (info: Map<string, ProcessInfo>) => void,
        private refreshInterval: number = 5000
    ) {
        this.initializeMonitors();
    }

    /**
     * 初始化监控实例
     */
    private initializeMonitors(): void {
        for (const target of this.targets) {
            if (!this.validateTarget(target)) {
                console.warn(`[GromacsMonitor] Invalid target configuration: ${target.id}`);
                continue;
            }

            let monitor: BaseMonitor;
            if (target.type === 'local') {
                monitor = new LocalMonitor(target);
            } else {
                monitor = new RemoteMonitor(target);
            }

            this.monitors.set(target.id, monitor);
            this.monitorInfo.set(target.id, {
                isRunning: false,
                isMdrun: false,
            });
        }
    }

    /**
     * 验证监控目标配置
     */
    private validateTarget(target: IMonitorTarget): boolean {
        if (!target.id || !target.name || !target.type) {
            return false;
        }

        if (target.type === 'remote' && !target.sshHost) {
            return false;
        }

        return true;
    }

    /**
     * 启动监控
     */
    start(): void {
        // 立即执行一次
        this.refresh();

        // 启动定时刷新
        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, this.refreshInterval);
    }

    /**
     * 刷新所有监控
     */
    private async refresh(): Promise<void> {
        const promises = Array.from(this.monitors.entries()).map(async ([id, monitor]) => {
            try {
                const info = await monitor.check();
                this.monitorInfo.set(id, info);
            } catch (error: any) {
                console.error(`[GromacsMonitor] Error checking ${id}:`, error);
                this.monitorInfo.set(id, {
                    isRunning: false,
                    isMdrun: false,
                    error: error.message || 'Unknown error',
                });
            }
        });

        await Promise.all(promises);
        
        // 通知更新
        this.onUpdate(this.monitorInfo);
    }

    /**
     * 获取目标配置
     */
    getTarget(id: string): IMonitorTarget | undefined {
        return this.targets.find(t => t.id === id);
    }

    /**
     * 释放资源
     */
    dispose(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }

        for (const monitor of this.monitors.values()) {
            monitor.dispose();
        }
        
        this.monitors.clear();
        this.monitorInfo.clear();

        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}
