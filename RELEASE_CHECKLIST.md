# 📋 发布前检查清单

在使用自动发布功能前，请确保完成以下检查项：

## ✅ 基础配置检查

### package.json 必需字段
- [ ] `name`: 扩展名称 ✅ `gromacs-helper-vscode`
- [ ] `displayName`: 显示名称 ✅ `GROMACS Helper for VS Code`  
- [ ] `description`: 描述信息 ✅
- [ ] `version`: 版本号 ✅ `0.0.3`
- [ ] `publisher`: 发布者 ✅ `mcardzh`
- [ ] `engines.vscode`: VS Code版本要求 ✅
- [ ] `categories`: 分类 ✅
- [ ] `keywords`: 关键词 ✅
- [ ] `repository`: 仓库信息 ✅
- [ ] `icon`: 图标文件 ✅

### GitHub 仓库配置
- [ ] README.md 文件完整
- [ ] LICENSE 文件存在 ✅ `GPL-2.0-only`
- [ ] CHANGELOG.md 文件维护
- [ ] 仓库描述和主题标签设置

## 🔑 Marketplace 发布配置

### Azure DevOps / VS Code Marketplace
- [ ] 已创建 Marketplace Publisher 账号
- [ ] Publisher 名称与 package.json 中的 `publisher` 字段一致
- [ ] 已获取 Personal Access Token (PAT)
- [ ] PAT Token 具有 Marketplace 的 "Acquire" 和 "Manage" 权限

### GitHub Secrets 配置
- [ ] 已在 GitHub 仓库中配置 `VSCE_PAT` secret
- [ ] Secret 值为有效的 Azure DevOps Personal Access Token
- [ ] Token 未过期且权限正确

## 🚀 发布流程检查

### 发布前准备
- [ ] 代码已经过充分测试
- [ ] 本地构建和打包成功
- [ ] 更新了 CHANGELOG.md 中的版本信息
- [ ] 确认新版本号符合语义化版本控制规范

### 工作流参数
- [ ] 版本号格式正确 (如: 1.0.0, 0.2.1, 1.0.0-beta.1)
- [ ] 发布类型选择：
  - `release`: 正式版本，会发布到 Marketplace
  - `prerelease`: 预发布版本，仅 GitHub Release
  - `draft`: 草稿版本，仅 GitHub Release
- [ ] 如需发布到 Marketplace，确保选择了 `publish_marketplace: true`

## 🎯 质量检查

### 代码质量
- [ ] 通过 ESLint 检查 (`npm run lint`)
- [ ] 通过编译检查 (`npm run compile`)
- [ ] 通过基础测试验证
- [ ] 所有语法文件格式正确

### 功能验证
- [ ] MDP 文件语法高亮正常
- [ ] TOP 文件符号导航功能正常
- [ ] GRO 文件悬停提示正常
- [ ] NDX 文件折叠功能正常
- [ ] 代码片段功能正常
- [ ] 代码补全功能正常

### 文档完整性
- [ ] README.md 包含安装说明
- [ ] README.md 包含功能说明
- [ ] README.md 包含使用示例
- [ ] CHANGELOG.md 记录了版本变更
- [ ] 许可证信息正确

## ⚠️ 重要提醒

### 版本管理
- [ ] **不能重复发布相同版本号到 Marketplace**
- [ ] 如果发布失败，需要更新版本号后重新发布
- [ ] 建议遵循语义化版本控制 (SemVer) 规范

### 安全注意事项  
- [ ] 永远不要在代码中硬编码 PAT Token
- [ ] 定期更新 PAT Token 避免过期
- [ ] 确保 GitHub Secrets 配置正确且安全

### 发布策略建议
- [ ] 首次发布建议先使用 `prerelease` 进行测试
- [ ] 确认功能正常后再发布 `release` 版本到 Marketplace
- [ ] 重要更新前先在 dev 分支充分测试

## 🔗 相关文档

- [发布流程详细说明](./RELEASE_GUIDE.md)
- [Marketplace 配置指南](./MARKETPLACE_SETUP.md)
- [更新日志](./CHANGELOG.md)

---

✅ **完成以上检查项后，即可安全地使用自动发布功能！**
