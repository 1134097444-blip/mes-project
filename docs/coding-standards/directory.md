---
title: 目录结构规范
doc_id: MES-CS-002
version: 2.0.0
status: approved
owner: Architect
reviewers: [Tech Lead]
created: 2026-05-18
updated: 2026-05-22
related: [MES-CS-001, MES-ARCH-001]
---

# 目录结构规范

## 1. 仓库根

```
mes-project/
├── package.json                # 工作区根
├── steedos-config.yml          # Steedos 配置
├── .env / .env.local           # 环境变量（不提交）
├── .gitignore
├── CLAUDE.md                   # DeepSeek 项目指令
├── README.md                   # 项目说明
├── start_server.bat            # 启动 Steedos
├── docs/                       # 项目文档
├── steedos-packages/           # Steedos 后端包（元数据层）
│   └── mes/
│       ├── package.json
│       ├── package.service.js
│       └── main/default/
│           ├── objects/        # 16 个 MES 业务对象
│           ├── applications/   # 应用定义
│           ├── tabs/           # 导航页签
│           ├── pages/          # Amis 页面（已废弃，不再修改）
│           ├── triggers/       # 触发器
│           ├── functions/      # 函数
│           ├── permissionsets/ # 权限集
│           ├── translations/   # 多语言
│           └── data/           # 种子数据
├── frontend/                   # ★ React 前端（主力 UI）
│   ├── mcp-server.js           # MCP 前端测试服务器
│   └── web/
│       ├── vite.config.js      # Vite 配置（含 Steedos API 代理）
│       ├── package.json
│       ├── index.html
│       └── src/
│           ├── main.jsx        # 入口
│           ├── App.jsx         # 主布局 + 侧边栏导航
│           ├── api.js          # Steedos API 接口层
│           ├── index.css       # 科技风暗色主题 + Tailwind
│           ├── pages/          # 页面组件
│           └── components/     # 公共组件（按需创建）
└── tests/                      # 测试脚本
    └── emergency_recovery.js   # 数据库急救脚本
```

---

## 2. Steedos 包内部布局（5100 后端）

```
steedos-packages/mes/main/default/
├── objects/mes_xxx/            # 每对象一目录
│   ├── mes_xxx.object.yml      # 对象定义
│   ├── fields/                 # 字段定义（每个字段一个 .field.yml）
│   ├── listviews/              # 列表视图
│   └── permissions/            # 权限配置（每角色一个 .permission.yml）
├── triggers/                   # 触发器
├── functions/                  # 函数
├── applications/               # 应用定义（.app.yml）
├── tabs/                       # 页签定义（.tab.yml）
├── pages/                      # Amis 页面（已废弃，不再修改）
├── permissionsets/             # 权限集
├── translations/               # 多语言
└── data/                       # 种子数据
```

- 新对象仍需创建 tab 和 app 入口，因为 API 依赖这些元数据
- 但 Amis 页面层不再维护，所有 UI 改在 5173 前端

---

## 3. 前端目录规范（5173 React）

```
frontend/web/src/
├── main.jsx                    # 入口，挂载 <App/>
├── App.jsx                     # 主布局：侧边栏 + 内容区
├── api.js                      # Steedos API 封装（登录、CRUD）
├── index.css                   # 主题样式（Tailwind + 自定义 CSS 变量）
├── pages/                      # 页面组件
│   ├── Dashboard.jsx           # 仪表盘
│   ├── WorkOrders.jsx          # 工单列表
│   ├── Equipment.jsx           # 设备监控
│   └── [NewPage].jsx           # 新增页面放这里
└── components/                 # 可复用组件（按需创建）
```

### 3.1 新增页面规则

1. 在 `api.js` 添加 `fetchXxx()` 函数
2. 在 `pages/` 创建 `XxxPage.jsx`
3. 在 `App.jsx` 的 `NAV` 数组中加 `{ id, label, icon }`
4. 不要硬编码 URL，通过 Vite proxy 走 `/api/v6/` 和 `/service/api/`
5. 状态标签同时匹配中英文（如 `in_progress` ↔ `生产中`）

---

## 4. 文档目录

```
docs/
├── README.md
├── design.md
├── architecture/
├── data-model/
├── business-flows/
├── permissions/
├── api/
├── coding-standards/
│   ├── naming.md
│   ├── directory.md  ← 本文件
│   └── yaml-style.md
├── delivery/
├── ai-workflow/
├── project-management/
│   ├── roadmap.md
│   ├── tasks.md
│   └── adr/
└── product/
```

---

## 5. 不允许出现的文件/操作

| 禁止 | 原因 |
|------|------|
| 修改 `steedos-packages/.../pages/` 下的 Amis 文件 | 前端已迁移到 5173 |
| 在 5173 前端硬编码 `localhost:5100` | 必须走 Vite proxy |
| 提交 `.env`、`node_modules`、`steedos-storage` | 已 gitignore |
| 仓库根直接放元数据文件 | 必须落在 `steedos-packages/` 内 |
| 运行破坏数据库的脚本（如旧版 fix.js） | 已删除，用 `emergency_recovery.js` 代替 |

## 变更记录

| 版本 | 日期 | 变更 | 作者 |
|------|------|------|------|
| 2.0.0 | 2026-05-22 | 新增前端目录规范，标记 Amis 页面废弃 | AI |
| 1.0.0 | 2026-05-18 | 初稿 | AI |
