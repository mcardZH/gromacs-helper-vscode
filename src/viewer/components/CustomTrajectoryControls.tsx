/**
 * Custom Trajectory Controls with Slider and Play/Pause
 * 
 * Enhanced version of mol*'s TrajectoryViewportControls
 * with progress slider and playback functionality.
 */

import * as React from 'react';
import { PluginUIComponent } from 'molstar/lib/mol-plugin-ui/base';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms';
import { StateTransformer } from 'molstar/lib/mol-state';
import { ModelFromTrajectory } from 'molstar/lib/mol-plugin-state/transforms/model';
import { IconButton } from 'molstar/lib/mol-plugin-ui/controls/common';
import { 
    SkipPreviousSvg, 
    NavigateBeforeSvg, 
    NavigateNextSvg 
} from 'molstar/lib/mol-plugin-ui/controls/icons';

interface State {
    show: boolean;
    currentFrame: number;
    frameCount: number;
    inputValue: string;
}

export class CustomTrajectoryControls extends PluginUIComponent<{}, State> {
    state: State = { 
        show: false, 
        currentFrame: 0, 
        frameCount: 0,
        inputValue: '1'
    };

    componentDidMount() {
        this.subscribe(this.plugin.state.data.events.changed, this.update);
        this.subscribe(this.plugin.behaviors.state.isAnimating, this.update);
        this.update();
    }

    componentWillUnmount() {
        // 清理定时器，避免组件卸载后仍然触发更新
        if (this.sliderCommitTimer !== void 0) {
            window.clearTimeout(this.sliderCommitTimer);
            this.sliderCommitTimer = void 0;
        }
    }

    /** 
     * 用于防抖提交滑块位置：
     * - 用户拖动时立即更新本地 UI 状态（currentFrame）
     * - 但真正的 Mol* 状态提交用定时器合并，减少跨进程/远程调用频率
     */
    private sliderCommitTimer: number | undefined;
    private pendingSliderFrame: number | undefined;

    private update = () => {
        const state = this.plugin.state.data;
        const models = state.selectQ(q => q.ofTransformer(StateTransforms.Model.ModelFromTrajectory));

        if (models.length === 0) {
            this.setState({ show: false });
            return;
        }

        let frameCount = 0;
        let currentFrame = 0;
        const parents = new Set();

        for (const m of models) {
            if (!m.sourceRef) continue;
            const parentCell = state.cells.get(m.sourceRef);
            if (!parentCell) continue;
            const parent = parentCell.obj as PluginStateObject.Molecule.Trajectory;
            if (!parent) continue;

            if (parent.data.frameCount > 1) {
                if (parents.has(m.sourceRef)) {
                    // Multiple models from same trajectory
                    this.setState({ show: false });
                    return;
                }
                parents.add(m.sourceRef);
                frameCount = parent.data.frameCount;
                const params = m.transform.params as StateTransformer.Params<typeof ModelFromTrajectory>;
                currentFrame = params?.modelIndex ?? 0;
                break;
            }
        }

        if (frameCount > 1) {
            this.setState({
                show: true,
                currentFrame,
                frameCount,
                inputValue: String(currentFrame + 1)
            });
        } else {
            this.setState({ show: false });
        }
    };

    private setFrame = async (frameIndex: number) => {
        const state = this.plugin.state.data;
        const models = state.selectQ(q => q.ofTransformer(StateTransforms.Model.ModelFromTrajectory));

        const update = state.build();
        for (const m of models) {
            if (!m.sourceRef) continue;
            const parentCell = state.cells.get(m.sourceRef);
            if (!parentCell) continue;
            const parent = parentCell.obj as PluginStateObject.Molecule.Trajectory;
            if (!parent || parent.data.frameCount <= 1) continue;

            const clamped = Math.max(0, Math.min(frameIndex, parent.data.frameCount - 1));
            update.to(m).update({ modelIndex: clamped });
        }

        await update.commit();
    };

    private reset = () => this.setFrame(0);
    private prev = () => this.setFrame(this.state.currentFrame - 1);
    private next = () => this.setFrame(this.state.currentFrame + 1);

    private onSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (isNaN(value)) return;

        // 1. 立即更新本地 UI 状态，让滑块「跟手」
        this.setState({
            currentFrame: value,
            inputValue: String(value + 1),
        });

        // 2. 记录待提交的帧索引
        this.pendingSliderFrame = value;

        // 3. 启动/重置防抖定时器，合并高频拖动事件
        if (this.sliderCommitTimer !== void 0) {
            window.clearTimeout(this.sliderCommitTimer);
        }

        // 在远程场景下 80~120ms 体验较好，这里取 100ms
        this.sliderCommitTimer = window.setTimeout(() => {
            this.flushSliderCommit();
        }, 100);
    };

    private flushSliderCommit = async () => {
        const target = this.pendingSliderFrame;
        this.sliderCommitTimer = void 0;
        this.pendingSliderFrame = void 0;

        if (typeof target !== 'number') return;
        await this.setFrame(target);
    };

    private onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ inputValue: e.target.value });
    };

    private onInputSubmit = () => {
        const frameNumber = parseInt(this.state.inputValue, 10);
        if (isNaN(frameNumber)) {
            this.setState({ inputValue: String(this.state.currentFrame + 1) });
            return;
        }

        const clamped = Math.max(1, Math.min(frameNumber, this.state.frameCount));
        this.setState({ inputValue: String(clamped) });
        this.setFrame(clamped - 1);
    };

    private onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.onInputSubmit();
            (e.target as HTMLInputElement).blur();
        }
    };

    render() {
        const { show, currentFrame, frameCount, inputValue } = this.state;
        const isAnimating = this.plugin.behaviors.state.isAnimating.value;
        
        if (!show || (isAnimating && !inputValue)) {
            return null;
        }

        return (
            <div className='msp-traj-controls' style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '4px',
                padding: '4px 0'
            }}>
                {/* Control buttons and frame info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {!isAnimating && (
                        <IconButton 
                            svg={SkipPreviousSvg} 
                            title='First Frame' 
                            onClick={this.reset} 
                            disabled={isAnimating || currentFrame === 0}
                        />
                    )}
                    {!isAnimating && (
                        <IconButton 
                            svg={NavigateBeforeSvg} 
                            title='Previous Frame' 
                            onClick={this.prev} 
                            disabled={isAnimating || currentFrame === 0}
                        />
                    )}
                    {!isAnimating && (
                        <IconButton 
                            svg={NavigateNextSvg} 
                            title='Next Frame' 
                            onClick={this.next} 
                            disabled={isAnimating || currentFrame >= frameCount - 1}
                        />
                    )}

                    {/* Frame input */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '13px',
                        marginLeft: '8px'
                    }}>
                        <span>Frame:</span>
                        <input
                            type='number'
                            min={1}
                            max={frameCount}
                            value={inputValue}
                            onChange={this.onInputChange}
                            onBlur={this.onInputSubmit}
                            onKeyDown={this.onInputKeyDown}
                            disabled={isAnimating}
                            style={{ 
                                width: '70px', 
                                padding: '2px 4px',
                                textAlign: 'center',
                                fontSize: '13px'
                            }}
                        />
                        <span>/ {frameCount}</span>
                    </div>
                </div>

                {/* Slider */}
                {!isAnimating && (
                    <div style={{ padding: '0 4px' }}>
                        <input
                            type='range'
                            min={0}
                            max={frameCount - 1}
                            value={currentFrame}
                            onChange={this.onSliderChange}
                            disabled={isAnimating}
                            style={{ width: '100%' }}
                        />
                    </div>
                )}
            </div>
        );
    }
}
