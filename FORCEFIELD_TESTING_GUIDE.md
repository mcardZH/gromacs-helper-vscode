# GROMACS 力场文件支持 - 测试指南

> 快速测试新增的力场文件支持功能
> 生成日期：2026-08-27

---

## 🚀 快速开始

### 1. 启动扩展开发环境

```bash
# 确保代码已编译
npm run compile

# 在 VS Code 中按 F5 启动 Extension Development Host
```

### 2. 打开测试力场目录

在 Extension Development Host 中打开：
```
/opt/homebrew/Cellar/gromacs/2026.1/share/gromacs/top/charmm27_tnc.ff/
```

---

## ✅ 测试清单

### 📝 测试 1: 语法高亮

#### 测试 `.atp` 文件（原子类型）
1. 打开 `atomtypes.atp`
2. **预期效果**：
   - 原子类型名（如 `H`, `CT1`, `NH1`）应该高亮显示
   - 质量数字（如 `1.00800`, `12.01100`）应该着色
   - 注释（`;` 后面的内容）应该显示为灰色

#### 测试 `.rtp` 文件（残基拓扑）
1. 打开 `aminoacids.rtp`
2. **预期效果**：
   - 段标记 `[ ALA ]`、`[ atoms ]`、`[ bonds ]` 应该高亮
   - 原子类型（如 `NH1`, `CT1`, `C`, `O`）应该着色
   - 电荷数字（如 `-0.47`, `0.07`）应该显示
   - 跨残基引用 `-C`, `+N` 应该突出显示

#### 测试 `.tdb` 文件（terminus 修饰）
1. 打开 `aminoacids.c.tdb`
2. **预期效果**：
   - 段标记 `[ COO- ]`、`[ replace ]`、`[ add ]` 应该高亮
   - 操作关键字应该着色

---

### 🎯 测试 2: 智能补全

#### 测试原子类型补全
1. 打开 `aminoacids.rtp`
2. 找到任意残基的 `[ atoms ]` 段
3. 添加新行，输入：`NEW_ATOM  ` （注意末尾有两个空格）
4. **预期效果**：
   - 应该弹出原子类型补全列表
   - 列表包含 `H`, `CT1`, `NH1`, `C`, `O` 等
   - 每个条目显示质量信息（如 `mass: 12.011`）
   - 选择一个类型应该自动插入

**调试输出查看**：
打开 "Output" 面板 → 选择 "Extension Host" → 查找 `[RtpCompletion]` 日志

#### 测试原子名补全
1. 在同一文件中找到 `[ bonds ]` 段
2. 添加新行，开始输入原子名
3. **预期效果**：
   - 应该弹出当前残基的原子名列表
   - 包含跨残基引用 `-C`, `-CA`, `+N`, `+CA`
   - 每个原子显示类型和电荷信息

---

### 🔍 测试 3: 悬浮文档

#### 测试原子类型悬浮
1. 打开 `aminoacids.rtp`
2. 在 `[ atoms ]` 段中，将鼠标悬停在原子类型上（如 `NH1`）
3. **预期效果**：
   - 弹出悬浮窗口
   - 显示：
     - `Atom Type: NH1`
     - `Mass: 14.007 amu`
     - `Description: peptide nitrogen` （如果有）
   - 底部有 "Go to definition" 链接

**调试输出查看**：
查找 `[RtpHover]` 日志

#### 测试残基悬浮
1. 将鼠标悬停在残基名上（如 `[ ALA ]` 中的 `ALA`，或文件中引用其他残基的地方）
2. **预期效果**：
   - 显示残基统计信息
   - 原子数、键数、总电荷
   - "Go to definition" 链接，点击可跳转到残基定义位置

#### 测试段标记关键字悬浮
1. 在 `.rtp` 文件中，将鼠标悬停在段标记关键字上（如 `[ atoms ]` 中的 `atoms`）
2. **预期效果**：
   - 显示该段的格式说明
   - 包含格式、示例和详细说明
   - 测试所有关键字：`atoms`、`bonds`、`impropers`、`cmap`、`bondedtypes`

#### 测试 TDB 关键字悬浮
1. 打开 `aminoacids.c.tdb`
2. 将鼠标悬停在段标记关键字上（如 `[ replace ]` 中的 `replace`）
3. **预期效果**：
   - 显示详细的格式说明
   - 包含示例和用途说明
   - 测试所有关键字：`replace`、`add`、`delete`、`bonds`、`impropers`、`cmap`

**调试输出查看**：
查找 `[TdbHover]` 日志

---

### 📑 测试 4: 文档大纲

#### 测试 RTP 文件大纲
1. 打开 `aminoacids.rtp`
2. 在侧边栏打开 "大纲" 面板（Outline）或按 Ctrl+Shift+O / Cmd+Shift+O
3. **预期效果**：
   - 显示所有残基列表（如 `ALA`、`ARG`、`ASN`...）
   - 每个残基显示原子数和键数统计
   - 展开残基可以看到：
     - `[ atoms ]` - 列出所有原子及其类型和电荷
     - `[ bonds ]` - 列出键（最多显示10个）
     - `[ impropers ]` - 列出 impropers（最多显示5个）
     - `[ cmap ]` - 列出 cmaps（如果有）
   - 点击任意项可跳转到对应位置

**调试输出查看**：
查找 `[RtpSymbol]` 日志，应该看到：
```
[RtpSymbol] 提供大纲: .../aminoacids.rtp
[RtpSymbol] ✓ 生成 20 个残基大纲
```

#### 测试 ATP 文件大纲
1. 打开 `atomtypes.atp`
2. 打开 "大纲" 面板
3. **预期效果**：
   - 显示所有原子类型列表（按字母顺序）
   - 每个原子类型显示质量和描述
   - 点击可跳转到定义位置

**调试输出查看**：
查找 `[AtpSymbol]` 日志，应该看到：
```
[AtpSymbol] 提供大纲: .../atomtypes.atp
[AtpSymbol] ✓ 生成 130 个原子类型大纲
```

---

### ⚠️ 测试 4: 实时诊断

#### 测试未定义原子类型检测
1. 打开 `aminoacids.rtp`
2. 在任意残基的 `[ atoms ]` 段中，修改一个原子类型为不存在的类型：
   ```
   N    INVALID_TYPE    -0.47    0
   ```
3. 保存文件（Cmd+S / Ctrl+S）
4. **预期效果**：
   - 该行出现红色波浪线
   - 悬停显示错误：`Atom type "INVALID_TYPE" not found in atomtypes.atp`
   - "Problems" 面板中显示该错误

**调试输出查看**：
查找 `[RtpDiagnostic]` 日志，应该看到：
```
[RtpDiagnostic] 开始诊断: .../aminoacids.rtp
[RtpDiagnostic] 检查 X 个残基...
[RtpDiagnostic]   ✗ ALA: 未定义的原子类型 "INVALID_TYPE"
```

#### 测试未定义原子引用检测
1. 在 `[ bonds ]` 段中添加：
   ```
   N  NONEXISTENT_ATOM
   ```
2. 保存文件
3. **预期效果**：
   - 该行出现红色波浪线
   - 错误信息：`Atom "NONEXISTENT_ATOM" not defined in [ atoms ] section`

#### 测试电荷平衡警告
1. 修改某个原子的电荷，使残基总电荷不为整数
2. 保存文件
3. **预期效果**：
   - 残基定义行（`[ ALA ]`）出现黄色波浪线
   - 警告信息：`Residue "ALA" has non-integer total charge: 0.053 (expected: 0)`

---

### 🗂️ 测试 5: 力场索引系统

#### 测试索引构建
1. 打开力场目录中的任意文件（如 `atomtypes.atp`）
2. **预期效果（在控制台）**：
   ```
   [IndexManager] 请求索引: .../charmm27_tnc.ff
   [IndexManager] ⚡ 构建新索引...
   [ForceFieldParser] ========================================
   [ForceFieldParser] 开始解析力场: .../charmm27_tnc.ff
   [ForceFieldParser] ✓ 找到 forcefield.itp
   [AtpParser] 开始解析: .../atomtypes.atp
   [AtpParser]   发现原子类型: H (1.008)
   [AtpParser]   发现原子类型: C (12.011)
   ...
   [AtpParser] 解析完成，共 130 个原子类型
   [RtpParser] 开始解析: .../aminoacids.rtp
   [RtpParser]   发现残基: ALA
   [RtpParser]     - 10 个原子
   [RtpParser]     - 9 个键
   ...
   [ForceFieldParser] 解析完成！
   [ForceFieldParser]   - 原子类型: 130
   [ForceFieldParser]   - 残基: 50+
   ```

#### 测试索引缓存
1. 打开第二个文件（如 `aminoacids.c.tdb`）
2. **预期效果**：
   ```
   [IndexManager] 请求索引: .../charmm27_tnc.ff
   [IndexManager] ✓ 使用缓存的索引
   ```
   （不会重新解析）

#### 测试索引失效
1. 修改并保存 `atomtypes.atp`
2. **预期效果**：
   ```
   [ForceFieldSupport] ATP 文件变化: .../atomtypes.atp
   [IndexManager] 使索引失效: .../charmm27_tnc.ff
   ```
3. 触发补全时会重新构建索引

---

## 📊 性能基准

### 预期性能指标

| 操作 | 预期时间 | 备注 |
|------|---------|------|
| 解析 charmm27 atomtypes.atp | < 50ms | ~130 个原子类型 |
| 解析 aminoacids.rtp | < 200ms | ~20 个残基 |
| 完整力场索引构建 | < 1s | 包含所有 .rtp 文件 |
| 补全触发 | < 100ms | 从缓存读取 |
| 诊断触发 | < 300ms | 包括解析和验证 |

---

## 🐛 常见问题排查

### 问题 1: 补全不工作
**检查步骤**：
1. 查看 Output 面板是否有 `[RtpCompletion]` 日志
2. 确认光标位置正确（在 `[ atoms ]` 段的第二列）
3. 确认力场目录有 `forcefield.itp`

### 问题 2: 诊断不触发
**检查步骤**：
1. 查看 Output 面板是否有 `[RtpDiagnostic]` 日志
2. 确认文件已保存（诊断在保存时触发）
3. 尝试关闭再重新打开文件

### 问题 3: 索引构建失败
**检查步骤**：
1. 查看 `[ForceFieldParser]` 日志
2. 确认目录包含 `forcefield.itp` 和 `atomtypes.atp`
3. 检查文件格式是否正确

### 问题 4: 控制台没有日志输出
**解决方案**：
1. 打开 Output 面板
2. 下拉菜单选择 "Extension Host"
3. 刷新输出（点击刷新图标）

---

## 📝 测试反馈模板

完成测试后，请提供以下信息：

```
## 测试环境
- GROMACS 版本: 2026.1
- 力场: charmm27_tnc.ff
- VS Code 版本: 
- 扩展版本: 0.5.0

## 测试结果

### ✅ 成功的功能
- [ ] 语法高亮 (.atp)
- [ ] 语法高亮 (.rtp)
- [ ] 语法高亮 (.tdb)
- [ ] 语法高亮 (.hdb)
- [ ] 原子类型补全
- [ ] 原子名补全
- [ ] 原子类型悬浮文档
- [ ] 残基悬浮文档（含跳转定义）
- [ ] RTP 段标记关键字悬浮说明
- [ ] TDB 关键字悬浮说明
- [ ] RTP 文件大纲
- [ ] ATP 文件大纲
- [ ] 未定义原子类型诊断
- [ ] 未定义原子引用诊断
- [ ] 电荷平衡警告
- [ ] 力场索引构建
- [ ] 索引缓存

### ❌ 发现的问题
1. 问题描述：
   - 复现步骤：
   - 预期行为：
   - 实际行为：
   - 控制台日志：

### 💡 改进建议
- 

### 📊 性能数据
- 索引构建耗时: 
- 补全响应时间: 
- 诊断耗时: 
```

---

## 🎉 预期测试结果

如果一切正常，你应该能够：
1. ✅ 看到所有力场文件的语法高亮
2. ✅ 在编辑 `.rtp` 文件时获得智能补全
3. ✅ 悬停查看详细的原子类型信息
4. ✅ 实时发现文件中的错误和警告
5. ✅ 在控制台看到详细的调试日志

祝测试顺利！🚀
