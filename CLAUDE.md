# DeepSeek 指令 — MES 制造执行系统

> 最后更新：2026-05-22 | 版本：3.0.0

---

## 1. 项目身份

你是 MES（制造执行系统）项目的 AI 开发 Agent，采用 **前后端分离架构**：

- **后端**：Steedos 平台，负责元数据驱动（对象/字段/权限）、REST API、触发器、函数
- **前端**：React + Vite + Tailwind CSS，独立开发，通过 Steedos API 读写数据
- **数据库**：MongoDB

技术栈：Steedos + Node.js + MongoDB + React + Vite + Tailwind

---

## 2. 架构分工（核心变更 v3.0）

### 2.1 两个端口，两种职责

| 端口 | 框架 | 职责 | 你做什么 |
|------|------|------|----------|
| `5100` | Steedos（Amis） | **后端 + 数据源**。对象定义、字段、权限、列表视图、触发器、函数、REST API。不再做任何 Amis 页面修改。 | 只在 YAML 元数据层操作：加对象、加字段、加权限、配 automber、写 trigger/function。不要碰 Amis 页面文件。 |
| `5173` | React + Vite + Tailwind | **前端 UI**。所有用户可见的界面：仪表盘、列表、表单、按钮、看板、图表。 | 这是你亲手搭建的前端，你最熟悉。所有 UI 需求在这里实现。 |

### 2.2 关键原则

- **Steedos 是数据引擎，不是 UI 引擎**：用它定义数据模型、权限、API，但不用它渲染页面。
- **前端独享 UI 逻辑**：所有视图、列表、表格、表单、按钮、导航、样式都在 `frontend/web/` 里。
- **API 桥接**：前端通过 Vite proxy 调用 Steedos REST API（`/api/v6/`、`/service/api/`），无需跨域。
- **元数据照写**：Steedos 的 objects、fields、listviews、permissions 照常维护（因为 API 依赖它们），只是不再为 Amis 页面费心。

---

## 3. 目录结构

```
mes-project/
├── package.json                    # 工作区根
├── steedos-config.yml              # Steedos 配置
├── .env / .env.local               # 环境变量
├── start_server.bat                # 启动 Steedos
├── CLAUDE.md                       # ← 本文件
├── README.md
├── steedos-packages/mes/           # Steedos 后端包
│   └── main/default/
│       ├── objects/                # 对象元数据（YAML）
│       ├── applications/           # 应用定义
│       ├── tabs/                   # 导航页签
│       ├── pages/                  # Amis 页面（已废弃，不再修改）
│       ├── triggers/               # 触发器
│       ├── functions/              # 函数
│       ├── permissionsets/         # 权限集
│       ├── translations/           # 多语言
│       └── data/                   # 种子数据
├── frontend/                       # ★ 前端目录（主力 UI）
│   ├── mcp-server.js               # MCP 前端测试服务器
│   └── web/                        # React + Vite 应用
│       ├── vite.config.js          # Vite 配置（含 API 代理）
│       ├── index.html
│       └── src/
│           ├── main.jsx            # 入口
│           ├── App.jsx             # 主布局
│           ├── api.js              # Steedos API 接口层
│           ├── index.css           # 科技风主题
│           └── pages/
│               ├── Dashboard.jsx
│               ├── WorkOrders.jsx
│               └── Equipment.jsx
├── docs/                           # 项目文档
├── tests/                          # 测试脚本
│   └── emergency_recovery.js      # 急救脚本
└── screenshots/
```

---

## 4. 核心约束（必须遵守）

### 4.1 命名规则

- 所有自定义业务对象 API 名以 `mes_` 前缀开头（如 `mes_work_orders`）。
- 字段名用 `snake_case`，不重复对象前缀。
- 文件名 = 元数据 name + 后缀。

### 4.2 Steedos 元数据规则（5100）

- **对象**：必须设置 `enable_api: true`、`enable_audit: true`、`enable_files: true`、`enable_trash: true`。`enable_api: true` 是前端能读到数据的必要条件。
- **字段**：每个对象至少包含 `name`（text）字段作为记录标题。自增编号字段设置 `is_name: true`。
- **列表视图**：每个对象至少有一个 `all` 列表视图。
- **权限**：每个对象必须为各角色创建 `.permission.yml` 文件。
- **页签/应用**：新对象仍然需要添加 tab 和 app 入口（保持 API 可用性），但前端不依赖这些渲染。

### 4.3 前端开发规范（5173）

- **所有 UI 需求都在 `frontend/web/src/` 下实现**。
- 页面文件放 `pages/`，公共组件放 `components/`，API 函数放 `api.js`。
- 禁止硬编码 URL，统一使用 Vite proxy 转发。
- 样式使用 Tailwind CSS + `index.css` 中的自定义科技风主题类。
- 状态标签必须同时匹配中英文状态值（如 `in_progress` ↔ `生产中`）。

### 4.4 YAML 风格

- 缩进 2 空格，文件末空行，UTF-8 无 BOM。
- 布尔值用 `true`/`false`。
- label 写中文。

---

## 5. AI 开发工作流

### 5.1 通用流程

```
1. 阅读任务 → 确认是后端（5100 元数据）还是前端（5173 UI）需求
2. 5100 需求 → 操作 steedos-packages/ 下的 YAML
3. 5173 需求 → 操作 frontend/web/src/ 下的 React 代码
4. 验证 → 后端重启 Steedos，前端 Vite HMR 自动刷新
5. 用 MCP 测试 → 必须跑 mcp-test 验证页面正常
6. 更新 tasks.md
```

### 5.2 新增业务对象流程

当需要新对象时（仅后端元数据层）：

```
1. 在 steedos-packages/ 下创建 objects/mes_xxx/ 目录和 YAML
2. 创建 fields/、listviews/、permissions/
3. 添加 tabs/ 和 applications/ 入口
4. 重启 Steedos 加载元数据
5. 在 frontend/web/src/api.js 添加对应的 fetchXxx 函数
6. 在 frontend/web/src/pages/ 添加页面组件
7. 在 App.jsx 侧边栏添加导航入口
```

### 5.3 前端页面开发流程

```
1. 在 api.js 添加/使用 API 函数
2. 在 pages/ 创建页面组件
3. 在 App.jsx 的 NAV 数组中添加路由
4. Vite HMR 自动刷新，浏览器即时看到效果
5. 用 MCP mcp_mes-frontend_test_page 验证
```

---

## 6. 任务管理规则

- 任务状态：`待开始` → `开发中` → `待验收` → `已完成`
- 使用 checklist 分解子步骤
- 完成后用 MCP 测试验证，截图证明

---

## 7. Steedos 元数据速查

### 7.1 常用字段类型

| type | 用途 |
|------|------|
| `text` | 短文本 |
| `textarea` | 长文本 |
| `number` | 数值 |
| `select` | 单选下拉 |
| `date` / `datetime` | 日期 |
| `lookup` | 引用另一个对象 |
| `master_detail` | 主子明细 |
| `autonumber` | 自增编号 |
| `boolean` | 布尔 |

### 7.2 权限集速查

| API Name | 角色 |
|----------|------|
| `mes_admin` | 系统管理员 |
| `mes_production_manager` | 生产主管 |
| `mes_operator` | 操作工 |
| `mes_quality_inspector` | 质检员 |
| `mes_equipment_tech` | 设备技术员 |

### 7.3 Autonumber 格式

| 对象 | 字段 | 格式 |
|------|------|------|
| `mes_work_orders` | `order_number` | `WO-{YYYY}{MM}{DD}-{0000}` |
| `mes_equipment` | `equipment_code` | `EQ-{0000}` |
| `mes_materials` | `material_code` | `MTL-{0000}` |
| `mes_routings` | `routing_number` | `RT-{0000}` |

---

## 8. 常用命令

```bash
# 启动 Steedos 后端
start_server.bat

# 启动前端开发服务器
cd frontend/web && npx vite --host 0.0.0.0 --port 5173

# 数据库急救
node tests/emergency_recovery.js

# 全量页面测试
node tests/full_check.js

# MCP 前端测试
deepseek mcp tools  # 查看可用工具
```

---

## 9. 参考技能

| 技能 | 用途 |
|------|------|
| `steedos-objects` | 对象定义 |
| `steedos-object-fields` | 字段定义 |
| `steedos-object-permissions` | 权限配置 |
| `steedos-server-logic` | 触发器、函数 |
| `steedos-configuration` | 环境配置 |
| `steedos-translations` | 多语言 |
| `steedos-seed-data` | 种子数据 |
| `steedos-server-api` | REST API |
| ~~`steedos-pages`~~ | ~~Amis 页面（已废弃）~~ |
| ~~`steedos-tabs`~~ | ~~导航页签（后端仍用，前端不依赖）~~ |
| ~~`steedos-applications`~~ | ~~应用定义（后端仍用，前端不依赖）~~ |

---

## 10. 项目当前状态

- **阶段**：Phase 3（前端重构 + U8 对接）
- **Steedos 后端**：16 个 MES 对象，90 个系统对象，API 已通过验证 ✅
- **React 前端**：仪表盘、工单列表、设备监控、工序看板、PDA 扫码报工、工长分配、工人任务 7 页面 ✅
- **MCP 测试**：6 个测试工具已注册 ✅
- **当前任务**：见 `docs/ai-workflow/prompts/session-summary-2026-05-22.md`
