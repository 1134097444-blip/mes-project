# MES 项目会话总结 — 2026-05-22

> 完整会话记录，供下一次 AI 或开发者快速接手。
> **关键：旧的 Amis 前端（5100）已废弃，所有 UI 在 5173 React 前端实现。**

---

## 一、架构总览（v2.0 → v3.0 重大变更）

### 双端口架构

| 端口 | 框架 | 职责 | 状态 |
|------|------|------|------|
| **5100** | Steedos + Amis | **纯数据引擎**：对象定义、字段、权限、API、触发器、函数 | ⚠️ **Amis 前端已废弃**，只维护 YAML 元数据 |
| **5173** | React + Vite + Tailwind | **所有用户界面**：仪表盘、工单、看板、PDA、报工 | ✅ 主力 UI，所有新功能都在这里 |

### 绝对禁止的操作

| 禁止 | 原因 |
|------|------|
| 修改 `steedos-packages/.../pages/` 下的 Amis 文件 | 前端已迁移到 5173，Amis 不再维护 |
| 在 5173 前端硬编码 `http://localhost:5100` | 必须走 Vite proxy（`/api/*` → 5100） |
| 运行旧版 `fix.js` / `fix_meta.js` | 会覆盖系统对象，已删除，用 `emergency_recovery.js` 代替 |
| 在仓库根直接放元数据文件 | 必须落在 `steedos-packages/` 内 |

### 数据流

```
┌─────────────────────────────────────────────────────────┐
│  U8 MSSQL (192.168.1.21)                                │
│  v_mom_orderdetail_ProcColMoIn  ← 源数据视图             │
│  JOIN SO_SOMain / Customer / Department  ← 翻译关联表    │
└──────────┬──────────────────────────────────────────────┘
           │ sync_30.js (node mssql → REST API)
           ▼
┌──────────────────────┐
│  Steedos MongoDB     │  ← 本地数据库
│  steedos_mes.objects │     mes_work_orders (30条)
│  mes_production_reports, 等等
└──────────┬───────────┘
           │ Vite Proxy (开发) / nginx (生产)
           ▼
┌──────────────────────┐
│  React 前端 (5173)   │  ← 所有界面
│  http://localhost:5173
└──────────────────────┘
```

---

## 二、前端文件清单（frontend/web/src/）

### 核心文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `main.jsx` | ~10 | React 入口，挂载 `<App/>` |
| `App.jsx` | ~140 | **主布局**：侧边栏 + 角色路由 + 日夜模式切换 |
| `api.js` | ~85 | **Steedos API 封装**：登录获取 token、自动刷新、apiGet/apiPost |
| `auth.js` | ~42 | **前端用户管理**：3 账号硬编码、localStorage 持久化 |
| `index.css` | ~245 | **双主题 CSS 变量**：dark/light 全部样式 |

**关键配置：** `frontend/web/vite.config.js` — 代理 `/api` → 5100

### 页面组件

| 文件 | 说明 | 访问角色 |
|------|------|----------|
| `pages/LoginPage.jsx` | 登录页，显示全部测试账号 | 未登录 |
| `pages/Dashboard.jsx` | **仪表盘**：工单/设备/报工统计卡片 + 4 个实时表格 | admin |
| `pages/WorkOrders.jsx` | **工单列表**：物料名/客户/数量/状态/负责人/部门 | admin |
| `pages/Equipment.jsx` | **设备监控**：设备卡片网格 + 故障报修记录 | admin |
| `pages/Kanban.jsx` | **工序看板 + 四状态工作流**：分组统计 + 筛选 + 推进按钮 | 全部角色 |
| `pages/ForemanPage.jsx` | **工单分配**：3 个工人卡片 + 下拉选人 + 按工人分组 | foreman |
| `pages/WorkerTasks.jsx` | **我的任务**：只显示分配给自己的工单 | worker |
| `pages/PDAWorker.jsx` | **PDA 扫码报工**：小屏适配 + 扫码输入 + 开始/报工按钮 | worker |

### 废弃文件

| 文件 | 说明 |
|------|------|
| `src/App.css` | 已删除（旧 Vite 模板样式） |
| `src/assets/*` | 已清理（旧 Vite 模板图片） |

---

## 三、用户角色与账号

| 账号 | 密码 | 角色 | 显示名 | 看到的导航 |
|------|------|------|--------|-----------|
| `zhanghao` | 888888 | admin | 张浩 | 仪表盘 \| 工序看板 \| 生产工单 \| 设备监控 |
| `ligong` | 666666 | foreman | 李工 | 工单分配 \| 工单总览 \| 工序看板 \| 设备监控 |
| `wangshi` | 123456 | worker | 王师傅 | 扫码报工 \| 我的任务 \| 工序看板 |

**注意：** 登录验证在前端 `auth.js` 完成，API 调用走统一账号 `1134097444@qq.com`/`123456` 的 Steedos token。初始账号 YC 用于 API 认证，不可删除。

---

## 四、数据库连接

### 公司数据库（U8 ERP · MSSQL）

```
服务器: 192.168.1.21
数据库: UFDATA_006_2025
用户: rd01
密码: triowin
端口: 1433
驱动: mssql（已安装于项目根 node_modules）
表数: 5,866（业务相关 369 张）
```

### 核心 U8 表

| 表名 | 行数 | 说明 | MES 映射 |
|------|------|------|----------|
| `mom_order` | 2,804 | 生产订单主表 | mes_work_orders |
| `mom_orderdetail` | 53,524 | 生产订单物料明细 | mes_work_orders |
| `Inventory` | 240,011 | 物料主数据 | mes_materials |
| `sfc_prouting` | 193,499 | 工艺路线 | mes_routings |
| `sfc_proutingdetail` | 595,862 | 工艺路线工序明细 | mes_operations |
| `sfc_workcenter` | 84 | 工作中心 | mes_work_centers |
| `sfc_operation` | 85 | 工序定义 | mes_operations |
| `sfc_optransform` | ~11,000 | 工序流转报工 | mes_production_reports |
| `SO_SOMain` | 616 | 销售订单主表 | → Customer 翻译 |
| `Customer` | ~3,000+ | 客户主数据 | 翻译客户名 |
| `Department` | ~50 | 部门 | 翻译部门名 |

### 关键视图：`v_mom_orderdetail_ProcColMoIn`

113 列，已查询 30 条样例。核心列：

| 列 | 类型 | 说明 | 翻译来源 |
|----|------|------|----------|
| MoCode | nvarchar | 生产订单号 | 直用 |
| InvCode / InvName | nvarchar | 物料编码/名称 | 直用（Inventory） |
| Qty | decimal | 数量 | 直用 |
| SoCode | nvarchar | 销售订单号 | → Customer.cCusName |
| Status | tinyint | 状态 (2/3/4) | 2=执行中 3=已下达 4=已关闭 |
| DeptName | nvarchar | 部门名称 | Department |
| OpDesc | nvarchar | 工序描述 | sfc_operation |
| WhName | nvarchar | 仓库名称 | Warehouse |
| Define28 | nvarchar | 负责人姓名 | 自定义字段 |
| Remark | nvarchar | 备注 | 直用 |

### 本地数据库

```
MongoDB: mongodb://127.0.0.1:27017/steedos_mes
系统对象: 90 个（含 16 个 MES 业务对象）
mes_work_orders: 30 条（从 U8 同步的样例数据）
API 基础: http://localhost:5100
```

---

## 五、同步脚本

### 现有脚本

| 脚本 | 状态 | 说明 |
|------|------|------|
| `scripts/sync_30.js` | ✅ 可用 | 从 U8 拉 30 条 → 翻译（客户名/负责人） → 写入 Steedos |
| `scripts/sync_all.js` | ⚠️ 部分未完成 | 串联 8 个子脚本，部分子脚本尚未创建 |
| `scripts/sync_from_ufida.js` | ❌ 文件缺失 | 从目录列表看存在但无法读取 |
| `scripts/sync_materials.js` | ✅ 可用 | Inventory → mes_materials |
| `scripts/sync_work_orders.js` | ✅ 可用 | mom_order → mes_work_orders |
| `scripts/sync_bom.js` | ❌ 未创建 | BOM → mes_bom_items |
| `scripts/sync_inventory.js` | ❌ 未创建 | CurrentStock → mes_inventory |

### 同步注意事项

- 同步前需要 Steedos 服务运行（`start_server.bat`）
- 脚本自动调用 Steedos API 写数据
- 当前只有 30 条样例，全量同步有 53K 工单 + 240K 物料
- 新的字段（如 `wf_status`）需在同步脚本中显式添加

---

## 六、工作流状态说明

### 四阶段推进流程

```
待处理 → 📋 派工 → 🚚 送工 → 🔨 开工 → ✅ 完工
```

- 数据字段：`mes_work_orders.wf_status`
- 更新方式：PATCH `/api/v6/data/mes_work_orders/{_id}`
- 推进操作：看板详情行按钮 / 工序卡片批量推进
- 公司 U8 无对应四阶段字段，这是自主设计的

### U8 原始状态映射

| U8 Status | 含义 | 映射到 |
|-----------|------|--------|
| 2 | 执行中 | 开工 |
| 3 | 已下达 | 派工 |
| 4 | 已关闭 | 完工 |

---

## 七、已知问题

| # | 问题 | 影响 | 建议修复 |
|---|------|------|----------|
| 1 | **Steedos 新建用户认证失败** — 直接写 MongoDB 创建用户后，Steedos 登录 API 始终返回 401。密码 bcrypt 哈希是正确的（已验证），但认证插件可能还检查其他字段（邮件验证、空间成员等） | 新用户只能用前端 `auth.js` 管理，API 走统一账号 | 通过 Steedos 注册 API 创建用户，或接 OAuth |
| 2 | **工人分配存在 localStorage** — `ForemanPage.jsx` 把分配关系存浏览器 localStorage，刷新不丢但换机/清缓存全丢 | 无法持久化分配关系 | 新建 `mes_assignments` 对象，写入 MongoDB |
| 3 | **数据量仅 30 条** — 全部是 U8 Status=4(已关闭) 的完工数据，没有派工/送工/开工状态的工单 | 工作流推进按钮无法完整测试 | 全量同步 + 手动创建不同状态工单 |
| 4 | **PDA 无离线支持** — 页面已适配 400px 手机屏，但断网无法操作 | 车间 PDA 断网场景不可用 | 加 Service Worker PWA 离线缓存 |
| 5 | **工单筛选字段有限** — 当前按编号/物料名/客户/负责人/工序/部门搜索，缺少日期范围筛选 | 无法按时间段筛选工单 | 加日期范围输入 |
| 6 | **同步脚本分散** — 8 个子脚本各自独立，不全 | 只有 3 个脚本可用 | 完善 sync_all.js 串联全部 |

---

## 八、下一步建议（按优先级排序）

### 🔴 P0 — 必须做

1. **工人分配写入后端** — 新建 `mes_assignments` 对象或利用 `mes_tasks`，让工长分配的数据持久化到 MongoDB
2. **全量数据同步** — 跑通 `scripts/sync_all.js` 全量同步全部 U8 数据

### 🟡 P1 — 重要

3. **PDA 离线 PWA** — 加 Service Worker、manifest.json、离线缓存队列（报工先存本地，联网后提交）
4. **权限对接** — 前端角色和 Steedos permission_set 打通，后端级权限控制
5. **定时同步任务** — 用 Steedos trigger/function 实现每晚自动从 U8 同步

### 🟢 P2 — 优化

6. **看板更多维度** — 按车间、按设备、按项目、按日期分组统计
7. **仪表盘实时刷新** — 加 10 秒轮询或 WebSocket
8. **部署配置** — nginx 反向代理转发 5100 + 5173、环境变量生产化（隐藏密码）
9. **工单导出** — Excel/CSV 导出功能

---

## 九、开发环境速查

### 启动服务

```bash
# 启动 Steedos 后端 (5100)
start_server.bat

# 启动前端开发服务器 (5173)
cd frontend/web && npx vite --host 0.0.0.0 --port 5173

# 数据库急救（系统对象丢失）
node tests/emergency_recovery.js

# 全量页面测试（22 页）
node tests/full_check.js

# 从 U8 同步 30 条样例
node scripts/sync_30.js
```

### 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 新前端 | http://localhost:5173 | ✅ 主力 UI（React） |
| 旧后端管理 | http://localhost:5100 | ⚠️ 不用 Amis 页面，仅用于 API 和元数据验证 |
| Steedos API | http://localhost:5100/api/v6/ | 数据接口 |

### 常用 API 端点

```javascript
GET  /api/v6/health                           // 健康检查
POST /api/v6/auth/login                       // 登录获取 token
GET  /api/v6/data/mes_work_orders?skip=0&top=200  // 工单列表
PATCH /api/v6/data/mes_work_orders/{_id}       // 更新工单
POST /api/v6/data/mes_work_orders              // 创建工单
GET  /service/api/@mes_tasks/uiSchema         // 对象 schema
```

---

## 十、项目文件地图

```
mes-project/
├── CLAUDE.md                      # AI 项目指令（版本 3.0.0）
├── README.md                      # 项目说明（版本 3.0.0）
├── package.json                   # 工作区根
├── steedos-config.yml             # Steedos 配置
├── .env                           # 环境变量（MONGO_URL=steedos_mes）
├── start_server.bat               # 启动 Steedos
│
├── steedos-packages/mes/          # ★ Steedos 后端（元数据层）
│   └── main/default/
│       ├── objects/               # 16 个 MES 对象 YAML
│       ├── applications/          # 应用定义
│       ├── tabs/                  # 导航页签
│       ├── permissionsets/        # 权限集
│       ├── triggers/ / functions/ # 触发器/函数
│       ├── pages/                 # ⛔ Amis 页面（已废弃）
│       └── data/                  # 种子数据
│
├── frontend/                      # ★ React 前端（主力 UI）
│   ├── mcp-server.js              # MCP 测试服务器
│   └── web/                       # Vite 项目
│       ├── vite.config.js         # 配置 + API 代理
│       ├── package.json           # 依赖
│       ├── index.html
│       ├── dist/                  # 生产构建输出
│       └── src/
│           ├── main.jsx → App.jsx → LoginPage
│           ├── api.js             # Steedos API
│           ├── auth.js            # 用户管理
│           ├── index.css          # 双主题样式
│           └── pages/             # 7 个页面组件
│
├── scripts/                       # U8 同步脚本
│   ├── sync_30.js                 # 30 条样例同步
│   ├── sync_all.js                # 全量同步串联器
│   ├── sync_work_orders.js        # 工单
│   ├── sync_materials.js          # 物料
│   └── ...                        # 其他（部分未完成）
│
├── tests/                         # 测试/工具
│   ├── emergency_recovery.js      # 数据库急救
│   ├── full_check.js              # 全量 Playwright 测试
│   └── ver.js / check*.js         # API 验证
│
└── docs/
    ├── design.md                  # 设计文档（版本 2.0.0）
    ├── README.md
    ├── coding-standards/          # 编码规范
    ├── ai-workflow/
    │   ├── README.md              # AI 工作流（版本 2.0.0）
    │   └── prompts/
    │       └── session-summary-2026-05-22.md  ← 本文
    └── data-model/                # 数据模型
```

---

> **给下一个 AI 的嘱托：**
> 1. 先读 `CLAUDE.md` 了解架构
> 2. 读本文档了解当前状态
> 3. 打开 `http://localhost:5173` 看效果
> 4. 用 `zhanghao`/`888888` 登录
> 5. 所有前端代码在 `frontend/web/src/`
> 6. **不要碰 Amis 页面**（`steedos-packages/.../pages/`）
> 7. 有问题跑 `node tests/emergency_recovery.js`
