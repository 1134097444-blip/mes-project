---
title: AI 协作工作流
doc_id: MES-AIW-001
version: 2.0.0
status: approved
owner: Tech Lead
reviewers: [Product Owner]
created: 2026-05-18
updated: 2026-05-22
related: [MES-ARCH-001]
---

# AI 协作工作流

本项目所有代码、元数据、文档由 **DeepSeek** 在人类主导下生成。v2.0 采用前后端分离架构。

## 1. 角色

| 角色 | 职责 |
|------|------|
| 产品负责人 | 提出意图、验收 |
| 架构评审 | 确认元数据决策（对象/字段/关系/权限） |
| AI（DeepSeek） | 生成元数据/React 组件/触发器/函数/文档 |
| 测试 | MCP 自动化测试验证 |

## 2. 核心原则

1. **意图驱动**：人描述 *what*，AI 决定 *how*；偏离时人立即纠正。
2. **最小生成单元**：一次只生成一个对象 / 一个页面 / 一个 trigger。
3. **前后端明确分工**：
   - 后端（5100）：元数据先行 → objects/fields/listview/permission 跑通 API
   - 前端（5173）：React 页面 + API 调用 + 导航入口
4. **每步可验证**：后端改完重启 Steedos，前端改完 HMR 自动刷新。
5. **MCP 测试必过**：任何前端变动必须用 MCP 工具验证页面正常。
6. **文档同步**：元数据变更先改 `docs/data-model/`，前端页面变更更新 App.jsx NAV。

## 3. 开发流程

### 3.1 后端元数据开发（5100）

```
1. 阅读需求 → 确认新增或修改哪个 MES 对象
2. 在 steedos-packages/ 下创建/修改 YAML 文件
3. 增加 objects/mes_xxx/ + fields/ + listviews/ + permissions/
4. 添加 tabs/ 和 applications/ 入口
5. 重启 Steedos 加载元数据
6. 用 API 测试数据读写是否正常
```

### 3.2 前端页面开发（5173）

```
1. 在 frontend/web/src/api.js 添加 fetchXxx() 函数
2. 在 frontend/web/src/pages/ 创建 React 组件
3. 在 App.jsx 的 NAV 数组中添加导航入口
4. Vite HMR 自动刷新，浏览器即时看到效果
5. 用 MCP mcp_mes-frontend_test_page 验证
6. 用 MCP mcp_mes-frontend_screenshot 截图留证
```

## 4. MCP 测试工具

项目已配置 6 个 MCP 前端测试工具，必须使用：

| 工具 | 用途 |
|------|------|
| `mcp_mes-frontend_test_health` | 检查 Steedos 服务存活 |
| `mcp_mes-frontend_test_login` | 测试登录流程 |
| `mcp_mes-frontend_test_page` | 测试单个页面加载 |
| `mcp_mes-frontend_test_all_pages` | 测试全部 22 个页面 |
| `mcp_mes-frontend_test_ui_schema` | 测试对象 schema API |
| `mcp_mes-frontend_screenshot` | 截取页面截图 |

## 5. AI 产出验收

任何 AI 产出在合并前必须通过：

- [ ] Steedos 重启不报错（后端变更）
- [ ] 前端 HMR 无报错，页面正常渲染
- [ ] API 接口返回 200（`/api/v6/health`、`/service/api/@mes_xxx/uiSchema`）
- [ ] MCP `test_all_pages` 全部通过
- [ ] 文件路径与目录结构规范一致
- [ ] YAML 风格遵循编码规范

## 6. 数据库急救

系统对象丢失时，运行：
```bash
node tests/emergency_recovery.js
```
脚本会自动扫描 `node_modules/@steedos/` 核心包，补回所有缺失的对象定义，验证 API 是否正常。

## 变更记录

| 版本 | 日期 | 变更 | 作者 |
|------|------|------|------|
| 2.0.0 | 2026-05-22 | 前后端分离架构 + MCP 测试流程 | AI |
| 1.0.0 | 2026-05-18 | 初稿 | AI |
