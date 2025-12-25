# Streaming TRR/XTC Reader

流式读取 GROMACS TRR 和 XTC 轨迹文件，支持缓存和批量读取。

## 功能特性

- ✅ **按需加载帧**：不再一次性加载整个文件到内存
- ✅ **LRU 缓存**：默认缓存 100 帧，自动淘汰最少使用的帧
- ✅ **快速索引**：首次扫描只建立轻量级的帧索引（偏移量、大小、时间等）
- ✅ **批量读取**：支持一次读取多个帧，减少 postMessage 通信开销
- ✅ **支持 TRR 和 XTC 格式**：自动识别文件类型

## 使用示例

### 基本用法

```typescript
import { StreamingTrajectoryProvider } from './util/stream_provider';

// 创建提供者
const provider = new StreamingTrajectoryProvider(
    '/path/to/topology.gro',
    '/path/to/trajectory.xtc'  // 或 .trr
);

// 初始化（建立帧索引）
await provider.initialize();

// 获取轨迹信息
const info = await provider.getInfo();
console.log(`总帧数: ${info.frameCount}`);
console.log(`原子数: ${info.atomCount}`);
console.log(`时间步长: ${info.deltaTime}`);

// 读取单个帧
const frame = await provider.getFrame(0);
console.log(`帧 ${frame.frameNumber}, 时间: ${frame.time}`);
console.log(`坐标数据: ${frame.x.length} 个原子`);

// 批量读取多个帧（推荐，减少通信开销）
const frames = await provider.getFrames([0, 10, 20, 30]);

// 读取连续帧范围
const frameRange = await provider.getFrameRange(0, 9); // 读取前 10 帧

// 使用完毕后关闭
await provider.close();
```

### 直接使用流式读取器

```typescript
import { TrrStreamReader } from './util/trr/stream-reader';
import { XtcStreamReader } from './util/xtc/stream-reader';

// TRR 文件
const trrReader = new TrrStreamReader('/path/to/trajectory.trr', 100); // 缓存 100 帧
await trrReader.initialize();

const trrFrame = await trrReader.getFrame(0);
console.log(`坐标: (${trrFrame.x[0]}, ${trrFrame.y[0]}, ${trrFrame.z[0]})`);

// XTC 文件
const xtcReader = new XtcStreamReader('/path/to/trajectory.xtc', 50); // 缓存 50 帧
await xtcReader.initialize();

const xtcFrames = await xtcReader.getFrameRange(0, 4); // 前 5 帧
```

## 架构说明

### 组件结构

```
src/util/
├── lru-cache.ts              # LRU 缓存实现
├── stream-reader.ts          # 流式读取器基类
├── stream_provider.ts        # 轨迹提供者（统一接口）
├── trr/
│   ├── parser.js            # 原始完整文件解析器（保留向后兼容）
│   ├── parser.d.ts          # 类型定义 + 导出流式读取器
│   └── stream-reader.ts     # TRR 流式读取器
└── xtc/
    ├── parser.js            # 原始完整文件解析器（保留向后兼容）
    ├── parser.d.ts          # 类型定义 + 导出流式读取器
    └── stream-reader.ts     # XTC 流式读取器
```

### 数据流

```
文件系统 (Node.js)
    ↓
StreamingReader
    ├─ 建立帧索引（首次扫描）
    ├─ 按需读取字节范围
    └─ LRU 缓存解析结果
    ↓
StreamingTrajectoryProvider
    ├─ 统一 TRR/XTC 接口
    └─ 批量读取支持
    ↓
postMessage (扩展宿主 → Webview)
    ↓
Mol* Viewer
```

### 关键接口

#### FrameData

```typescript
interface FrameData {
    frameNumber: number;      // 帧编号
    count: number;            // 原子数
    x: Float32Array;          // X 坐标（埃）
    y: Float32Array;          // Y 坐标（埃）
    z: Float32Array;          // Z 坐标（埃）
    box: Float32Array;        // 盒子尺寸 (9 个浮点数)
    time: number;             // 时间值
}
```

#### TrajectoryInfo

```typescript
interface TrajectoryInfo {
    frameCount: number;       // 总帧数
    atomCount: number;        // 原子数
    timeOffset: number;       // 时间偏移（首帧时间）
    deltaTime: number;        // 时间步长
    times: number[];          // 所有帧的时间数组
}
```

## 性能优势

### 内存使用

- **原实现**：一次性加载所有帧到内存
  - 示例：1000 帧 × 10000 原子 × 3 坐标 × 4 字节 ≈ 115 MB
- **新实现**：仅缓存 100 帧（可配置）
  - 示例：100 帧 × 10000 原子 × 3 坐标 × 4 字节 ≈ 11.5 MB

### 加载速度

- **原实现**：必须解析所有帧才能开始使用
- **新实现**：只扫描帧边界建立索引，立即可用

### 缓存策略

- **LRU 算法**：自动淘汰最少使用的帧
- **批量预取**：支持一次读取多个帧，优化通信效率

## 注意事项

1. **文件访问在 Node.js 端**：所有文件读取发生在扩展宿主（Node.js）中，而非 webview
2. **异步操作**：所有读取操作都是异步的，使用 `await` 或 Promise
3. **资源管理**：使用完毕后调用 `.close()` 释放文件句柄和缓存
4. **向后兼容**：原有的 `parseTrr()` 和 `parseXtc()` 函数保持不变

## 后续工作

等待测试文件后进行：
- 实际轨迹文件测试
- 内存使用基准测试
- 加载速度对比
- 与 Mol* viewer 集成测试
