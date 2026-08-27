# GROMACS 二进制文件自定义编辑器 - 实现总结

## 🎯 目标

将 `.xtc`、`.trr`、`.edr`、`.tpr` 文件的预览从「右键菜单」改为「双击自动打开」，使用 VS Code 的 Custom Editor API。

## ✅ 已完成的工作

### 1. 新增文件

#### `src/providers/gromacsBinaryEditorProvider.ts`
- 实现 `CustomReadonlyEditorProvider<GromacsBinaryDocument>` 接口
- `openCustomDocument`: 创建轻量级文档句柄（uri + format）
- `resolveCustomEditor`: 调用 `GromacsPreviewPanel.createWithPanel` 渲染完整预览

**关键设计决策**:
- 使用 `CustomReadonlyEditorProvider`（不是 `CustomTextEditorProvider`）因为这些是二进制大文件
- 不使用 `CustomEditorProvider` 因为不需要编辑/保存功能
- 复用现有的 `GromacsPreviewPanel` HTML 生成逻辑，确保功能完整性

### 2. 修改文件

#### `src/providers/gromacsPreviewPanel.ts`
新增 `createWithPanel` 静态方法：
```typescript
public static async createWithPanel(
  panel: vscode.WebviewPanel,
  extensionUri: vscode.Uri,
  targetUri: vscode.Uri,
): Promise<void>
```
- 接受外部传入的 webview panel（来自 Custom Editor Provider）
- 不维护单例，允许多个文件同时在不同标签页中打开
- 复用现有的 `_updateContent`、`_parseFile`、`_updateEdrContent` 等方法

#### `src/extension.ts`
- 已经注册了 `registerCustomEditorProvider`（第 217 行）
- 已经导入了 `GromacsBinaryEditorProvider`（第 25 行）
- 配置正确：
  ```typescript
  vscode.window.registerCustomEditorProvider(
    'gromacs-helper.binaryPreview',
    new GromacsBinaryEditorProvider(context.extensionUri),
    {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    }
  )
  ```

#### `package.json`
- 已添加 `customEditors` 配置（第 1374-1393 行）
- `viewType`: `"gromacs-helper.binaryPreview"`
- `priority`: `"default"` → 使其成为默认编辑器
- `selector`: 匹配 `*.xtc`、`*.trr`、`*.edr`、`*.tpr`
- 已删除 4 个旧的右键菜单命令（`previewXtc`/`previewTrr`/`previewEdr`/`previewTpr`）

#### `README.md`
- 在 Mol* Trajectory Viewer 之前添加了 "Binary File Preview" 部分
- 说明了双击自动预览功能
- 说明了如何使用 "Reopen With" 切换回文本编辑器
- 保留了 "Open with Mol* Viewer" 的说明（3D 可视化）

#### `CHANGELOG.md`
- 在 `[Unreleased]` 下添加了详细的变更说明
- 强调了从单例面板改为独立标签页的变化
- 说明了移除冗余菜单入口的原因

### 3. 新增测试文档

#### `TESTING.md`
完整的测试计划，包括：
- 基本功能测试（双击打开、Reopen With）
- 功能完整性测试（各文件格式预览内容）
- 性能测试（大文件、多文件并发）
- 回归测试（其他功能未受影响）
- 已知问题和解决方案
- 回滚方案

#### `test-custom-editor.sh`
快速测试脚本，自动执行：
- TypeScript 编译
- ESLint 检查
- 关键文件检查
- package.json 配置验证
- 测试文件查找

## 🔑 核心技术细节

### Custom Editor Provider 工作流程

1. **用户双击 `.xtc` 文件**
2. **VS Code 调用 `openCustomDocument(uri)`**
   - 创建 `GromacsBinaryDocument` (轻量级，只含 uri + format)
   - 使用 `detectFormat(uri)` 验证文件类型
   - 此步骤必须快速（< 10ms），不做任何文件 I/O
3. **VS Code 调用 `resolveCustomEditor(document, webviewPanel)`**
   - 设置 webview options (enableScripts, localResourceRoots)
   - 调用 `GromacsPreviewPanel.createWithPanel(panel, extensionUri, uri)`
4. **`GromacsPreviewPanel.createWithPanel`**
   - 创建新的 `GromacsPreviewPanel` 实例（不是单例）
   - 显示 loading HTML
   - 调用 `_updateContent(uri)` 解析文件
5. **文件解析**
   - XTC/TRR: 使用 head+tail 探针（35-57ms）
   - EDR: 两阶段（骨架 + 流式统计）
   - TPR: 只读头部（37ms）
6. **渲染完整预览**
   - 使用 `_buildHtml` 生成富文本 HTML
   - 包含所有交互功能（搜索、图表、按钮等）

### 与旧实现的差异

| 特性 | 旧实现（右键菜单） | 新实现（Custom Editor） |
|------|-------------------|------------------------|
| 打开方式 | 右键 → "Preview Xtc" | 双击文件 |
| 窗口类型 | 单例 WebviewPanel（侧边栏） | 独立编辑器标签页 |
| 多文件 | 切换文件时复用同一个 panel | 每个文件独立标签页 |
| VS Code 集成 | 手动命令 | 原生编辑器（支持 "Reopen With"） |
| 用户体验 | 需要记住右键菜单命令 | 符合标准文件操作习惯 |

### 性能考虑

- **`openCustomDocument` 必须快速**: 只创建文档对象，不读取文件
- **`resolveCustomEditor` 可以慢**: VS Code 会显示 loading 状态
- **大文件优化**: 使用现有的 head+tail 探针技术（已验证 4100× 性能提升）
- **EDR 流式渲染**: 骨架立即显示，统计数据后台计算

## 🧪 测试验证

### 编译测试
```bash
npm run compile
npm run lint
```

### 快速测试
```bash
./test-custom-editor.sh
```

### 手动测试
1. 按 F5 启动 Extension Development Host
2. 打开包含 GROMACS 文件的工作区
3. 双击 `.trr` 文件 → 应看到完整的 TRR 预览
4. 双击 `.edr` 文件 → 应看到能量项列表和图表
5. 右键标签页 → "Reopen With" → 选择 "Text Editor" → 应看到原始字节
6. 右键 `.xtc` 文件 → 仍然有 "Open with Mol* Viewer" 选项

## 📋 清单

- [x] 创建 `GromacsBinaryEditorProvider.ts`
- [x] 在 `GromacsPreviewPanel` 中添加 `createWithPanel` 方法
- [x] 在 `extension.ts` 中注册 Custom Editor Provider
- [x] 在 `package.json` 中添加 `customEditors` 配置
- [x] 删除 4 个旧的右键菜单命令
- [x] 更新 `README.md`
- [x] 更新 `CHANGELOG.md`
- [x] 创建 `TESTING.md`
- [x] 创建测试脚本 `test-custom-editor.sh`
- [ ] 在 Extension Development Host 中手动测试所有文件格式
- [ ] 验证大文件性能
- [ ] 验证多文件并发打开
- [ ] 验证回归测试（其他功能未受影响）

## 🚀 下一步

1. **立即测试**: 运行 `./test-custom-editor.sh` 验证编译成功
2. **手动验证**: 在 Extension Development Host 中测试所有场景
3. **性能测试**: 打开大文件（> 1GB）验证性能
4. **发布准备**: 如果测试通过，准备发布新版本

## 💡 关键收获

1. **复用而不是重写**: 通过 `createWithPanel` 复用了所有现有逻辑，避免代码重复
2. **渐进增强**: 保留了右键菜单的 "Open with Mol* Viewer"，用户仍有选择
3. **标准化体验**: 使用 VS Code 原生 Custom Editor API，用户体验更一致
4. **性能优先**: `openCustomDocument` 只做轻量级验证，重操作放在 `resolveCustomEditor`
