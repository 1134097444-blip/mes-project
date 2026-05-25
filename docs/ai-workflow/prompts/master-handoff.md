# MES 项目主控文件 — 2026-05-25

> 这是 MES 项目的最终主控文档。
> **新 AI 接入：先读完本文档，再看 CLAUDE.md。**
> 所有关键信息已浓缩于此，无需翻阅历史对话。

---

## ═══════════════════════════════════════════
## 一、项目一句话概括
## ═══════════════════════════════════════════

MES 制造执行系统：**Steedos 做数据引擎（5100 端口），React + Vite + Tailwind 做前端（5173 端口）**。  
后端只维护 YAML 元数据（对象/字段/权限/API），**所有 UI 在 React 前端实现**。  
数据来源：用友 U8 数据库（MSSQL），通过同步脚本写入本地 MongoDB。  
前端已打包为 exe，工人双击即可使用。

---

## ═══════════════════════════════════════════
## 二、立即启动
## ═══════════════════════════════════════════

```bash
# 1. 启动 Steedos 后端
start_server.bat

# 2. 启动前端开发服务器（另一个终端）
cd frontend/web && npx vite --host 0.0.0.0 --port 5173

# 3. 浏览器访问
打开 http://localhost:5173
```

**或直接双击 exe：** `frontend/package/mes-frontend.exe`（自动启动 5173 服务 + 打开浏览器）

---

## ═══════════════════════════════════════════
## 三、测试账号
## ═══════════════════════════════════════════

| 账号 | 密码 | 角色 | 导航 |
|------|------|------|------|
| `zhanghao` | 888888 | 系统管理员 | 仪表盘、工序看板、生产工单、设备监控 |
| `ligong` | 666666 | 工长 | 工单分配、工单总览、工序看板 |
| `wangshi` | 123456 | 操作工 | 扫码报工（PDA）、我的任务、工序看板 |

---

## ═══════════════════════════════════════════
## 四、架构详解
## ═══════════════════════════════════════════

### 4.1 双端口架构

```
┌─ 浏览器 ──────────────────────────────┐
│  http://localhost:5173                 │
│  (React + Tailwind + 科技风暗色主题)    │
│  登录 → 角色路由 → 页面组件             │
└────────────┬──────────────────────────┘
             │ Vite Proxy (开发)
             │ mes-frontend.exe (生产)
             ▼
┌─ Steedos (localhost:5100) ────────────┐
│  REST API: /api/v6/*  /service/api/*  │
│  MongoDB: steedos_mes                 │
│  元数据: steedos-packages/mes/ YAML   │
└────────────┬──────────────────────────┘
             │ mssql 驱动 (node)
             ▼
┌─ U8 ERP (192.168.1.21) ──────────────┐
│  UFDATA_006_2025                      │
│  mom_order / Inventory / Customer ... │
│  5,866 张表                           │
└───────────────────────────────────────┘
```

### 4.2 关键约束

| 允许 | 禁止 |
|------|------|
| 5100：只改 YAML 元数据（对象/字段/权限） | ❌ 修改 `steedos-packages/.../pages/` 下的 Amis 页面 |
| 5173：所有 UI 需求在 React 实现 | ❌ 在 5173 硬编码 `localhost:5100` |
| 新增对象：YAML → api.js → pages/ → App.jsx | ❌ 运行旧版 `fix.js` / `fix_meta.js`（已删除） |
| 同步数据：`scripts/sync_30.js` | ❌ 仓库根放元数据文件 |

---

## ═══════════════════════════════════════════
## 五、完整文件索引
## ═══════════════════════════════════════════

### 5.1 根目录文档

| 文件 | 说明 | 关键内容 |
|------|------|----------|
| `CLAUDE.md` | AI 项目指令（版本 3.0.0） | 架构分工、开发流程、元数据规则 |
| `README.md` | 项目说明 | 技术栈、目录结构、常用命令 |
| `steedos-config.yml` | Steedos 配置 | MONGO_URL=steedos_mes |
| `.env` | 环境变量 | MONGO_URL=steedos_mes |
| `start_server.bat` | 启动 Steedos 后端 | cd + yarn start |
| `build_package.bat` | 打包前端 exe | npm run build → pkg → 复制 |

### 5.2 后端元数据（5100）

`steedos-packages/mes/main/default/`

| 路径 | 数量 | 说明 |
|------|------|------|
| `objects/` | 16 个 MES 对象 | 每个对象含 object.yml + fields/ + listviews/ + permissions/ |
| `applications/` | 2 个 | MES 应用定义 |
| `tabs/` | ~20 个 | 导航页签 |
| `permissionsets/` | 5 个 | admin / foreman / operator / inspector / tech |
| `pages/` | ~5 个 | **已废弃**，不再修改 |
| `triggers/` | ~2 个 | 触发器 |
| `functions/` | ~2 个 | 函数 |

**16 个 MES 对象：** mes_work_orders, mes_production_reports, mes_tasks, mes_routings, mes_operations, mes_work_centers, mes_workshops, mes_bom_items, mes_equipment, mes_maintenance_records, mes_equipment_faults, mes_inspection_records, mes_defects, mes_nonconformance, mes_materials, mes_inventory

### 5.3 前端源码（5173）

`frontend/web/src/`

| 文件 | 行数 | 说明 |
|------|------|------|
| `App.jsx` | ~140 | 主布局：侧边栏 + 角色路由 + 日夜模式 |
| `api.js` | ~85 | Steedos API：token 管理、自动刷新、apiGet/apiPost |
| `auth.js` | ~42 | 前端用户管理：3 个账号、localStorage 持久化 |
| `index.css` | ~245 | 双主题 CSS 变量（dark + light） |
| `main.jsx` | ~10 | 入口 |
| `pages/LoginPage.jsx` | ~90 | 登录页 + 账号提示 |
| `pages/Dashboard.jsx` | ~190 | 仪表盘：统计卡片 + 4 个实时表格 |
| `pages/WorkOrders.jsx` | ~130 | 工单列表：物料/客户/数量/状态/负责人/部门 |
| `pages/Equipment.jsx` | ~145 | 设备监控：设备卡片 + 故障记录 |
| `pages/Kanban.jsx` | ~270 | 工序看板：分组统计 + 复合筛选 + 四状态推进 |
| `pages/ForemanPage.jsx` | ~180 | 工长分配：工人卡片 + 下拉选人 + 分组展示 |
| `pages/WorkerTasks.jsx` | ~77 | 工人任务：只看分配给我的 |
| `pages/PDAWorker.jsx` | ~290 | PDA 扫码报工：小屏适配 + 扫码查询 + 开始/报工 |

### 5.4 便携式包（解压即用）

`frontend/package/`

| 文件 | 大小 | 说明 |
|------|------|------|
| `mes-frontend.exe` | 37.6 MB | 双击打开，嵌入 Node.js，自动代理 API |
| `server.js` | 3.5 KB | 独立 HTTP 服务器 + API 代理 |
| `start.bat` | 0.6 KB | 双击 `node server.js` |
| `dist/` | 280 KB | 前端生产构建（index.html + CSS + JS） |

### 5.5 工具脚本

| 文件 | 说明 |
|------|------|
| `tests/emergency_recovery.js` | 数据库急救（系统对象丢失时运行） |
| `tests/full_check.js` | Playwright 全量 22 页测试 |
| `tests/ver.js` | API 验证（登录 + schema） |
| `tests/check_health.js` | 健康检查 |
| `scripts/sync_30.js` | U8 → Steedos 同步（30 条样例） |
| `scripts/sync_all.js` | 全量同步串联器（部分子脚本未完成） |
| `scripts/sync_work_orders.js` | 工单同步 |
| `scripts/sync_materials.js` | 物料同步 |
| `frontend/mcp-server.js` | MCP 前端测试服务器（6 个工具） |

---

## ═══════════════════════════════════════════
## 六、数据库详解
## ═══════════════════════════════════════════

### 6.1 公司 U8 数据库（MSSQL）

```
服务器: 192.168.1.21
端口: 1433
数据库: UFDATA_006_2025
用户: rd01
密码: triowin
驱动: mssql (node_modules 已安装)
```

**核心表：**

| 表名 | 行数 | 说明 | 关联 MES 对象 |
|------|------|------|--------------|
| `mom_order` | 2,804 | 生产订单主表 | mes_work_orders |
| `mom_orderdetail` | 53,524 | 订单物料明细 | mes_work_orders |
| `Inventory` | 240,011 | 物料主数据 | mes_materials |
| `sfc_prouting` | 193,499 | 工艺路线 | mes_routings |
| `sfc_proutingdetail` | 595,862 | 工序明细 | mes_operations |
| `sfc_optransform` | ~11,000 | 工序流转报工 | mes_production_reports |
| `SO_SOMain` | 616 | 销售订单 | → Customer 翻译 |
| `Customer` | ~3,000+ | 客户 | 翻译客户名 |
| `Department` | ~50 | 部门 | 翻译部门名 |
| `sfc_workcenter` | 84 | 工作中心 | mes_work_centers |
| `sfc_operation` | 85 | 工序定义 | mes_operations |

**核心视图 `v_mom_orderdetail_ProcColMoIn`（113 列）：**

| 列 | 说明 | 人话翻译 |
|-----|------|----------|
| MoCode | 生产订单号 | 单号 J250500050 |
| InvName | 物料名称 | 杯式榨汁机 |
| Qty | 数量 | 1 件 |
| cCusName (JOIN Customer) | 客户名 | 上海沃迪智能装备 |
| DeptName | 部门 | 生产部 |
| OpDesc | 工序 | 领料工作中心 |
| Status (2/3/4) | 状态 | 2=执行中 3=已下达 4=已关闭 |
| Define28 | 负责人 | 陈福朋 |
| Remark | 备注 | 售后技改 |

### 6.2 本地 MongoDB

```
连接: mongodb://127.0.0.1:27017/steedos_mes
系统对象: 90 个（16 个 MES + 74 个系统）
mes_work_orders: 30 条（U8 同步的样例）
mes_materials: 239,865 条（已全量同步）
```

**当前同步状态：**

| 对象 | 本地数据量 | 状态 |
|------|-----------|------|
| mes_work_orders | 30 条 | ✅ 样例（U8 有 2,804 条） |
| mes_materials | 239,865 条 | ✅ 全量 |
| mes_work_centers | 174 条 | ✅ 全量 |
| mes_operations | 96 条 | ✅ 全量 |
| mes_routings | 351,503 条 | ✅ 全量 |
| mes_equipment | 3 条 | ⚠️ 手动录入，需补充 |
| mes_production_reports | 4 条 | ⚠️ 需重新同步 |
| mes_inventory | 0 条 | ❌ 未同步 |
| mes_bom_items | 2 条 | ⚠️ 需同步 |

---

## ═══════════════════════════════════════════
## 七、工作流状态
## ═══════════════════════════════════════════

### 四阶段推进

```
待处理 → 📋 派工 → 🚚 送工 → 🔨 开工 → ✅ 完工
```

- **数据字段：** `mes_work_orders.wf_status`
- **更新方式：** PATCH `/api/v6/data/mes_work_orders/{_id}`（实时写入 MongoDB）
- **看板操作：** 详情行按钮 / 工序卡片批量推进
- **U8 映射：** Status=3→派工、Status=2→开工、Status=4→完工

### 工作流状态分布

当前 30 条样例全部为「完工」（从 U8 同步时 Status=4），后续需要手动推进或全量同步后获得不同状态的工单。

---

## ═══════════════════════════════════════════
## 八、已知问题
## ═══════════════════════════════════════════

| 优先级 | 问题 | 影响 | 建议 |
|--------|------|------|------|
| 🔴 | **工人分配只存 localStorage** | 换电脑/清缓存全丢 | 新建 `mes_assignments` 对象写入 MongoDB |
| 🔴 | **数据仅 30 条，全是完工** | 无法测试派工/送工/开工流程 | 全量同步或手动创建不同状态工单 |
| 🟡 | **Steedos 新建用户 401** | 只能用前端 auth.js 管理用户 | 通过注册 API 建用户或接 OAuth |
| 🟡 | **PDA 无离线支持** | 断网无法操作 | 加 Service Worker PWA |
| 🟡 | **同步脚本不全** | sync_all.js 部分子脚本未创建 | 补全 sync_inventory + sync_bom |
| 🟢 | **看板缺日期筛选** | 无法按时间段查看 | 加日期范围输入 |
| 🟢 | **仪表盘缺实时刷新** | 需手动刷新页面 | 加 10 秒轮询或 WebSocket |

---

## ═══════════════════════════════════════════
## 九、下一步建议（按优先级排序）
## ═══════════════════════════════════════════

### 🔴 P0

1. **工人分配写入后端** — 新建 `mes_assignments` 对象或利用 `mes_tasks`，通过 Steedos API 持久化分配关系
2. **全量数据同步** — 运行 `scripts/sync_all.js`，补全缺失的子脚本，确保 U8 全量数据进入本地

### 🟡 P1

3. **PDA 离线 PWA** — Service Worker + manifest.json + IndexedDB 离线缓存 + 断网报工队列
4. **权限系统对接** — 前端角色和 Steedos permission_set 打通，实现后端级权限控制
5. **定时同步** — 用 Steedos trigger/function 实现每晚自动 U8 同步

### 🟢 P2

6. **看板多维分组** — 按车间、设备、项目、日期
7. **仪表盘实时刷新** — 轮询或 WebSocket
8. **生产部署** — nginx 反向代理（`/api/*` → 5100，`/*` → 5173），环境变量生产化
9. **工单导出** — Excel/CSV

---

## ═══════════════════════════════════════════
## 十、AI 交接清单
## ═══════════════════════════════════════════

新 AI 首次接入，按此清单执行：

```
[ ] 读完本文档
[ ] 读完 CLAUDE.md（版本 3.0.0）
[ ] 确定两个服务是否运行：
      - http://localhost:5100 (Steedos 后端)
      - http://localhost:5173 (React 前端)
[ ] 用 zhanghao/888888 登录前端验证
[ ] 检查 MongoDB: steedos_mes.objects 应有 90 个对象
[ ] 检查待办事项：看 docs/ai-workflow/prompts/session-summary-2026-05-22.md
```

### 常用命令速查

```bash
# 启动后端
start_server.bat

# 启动开发前端
cd frontend/web && npx vite --host 0.0.0.0 --port 5173

# 启动便携版
frontend/package/mes-frontend.exe

# 数据库急救
node tests/emergency_recovery.js

# 全量页面测试
node tests/full_check.js

# 同步 U8 数据
node scripts/sync_30.js

# 前端生产构建
cd frontend/web && npm run build

# 打包 exe
build_package.bat

# MCP 工具
deepseek mcp tools

# 日/夜模式切换
侧边栏底部 ☀/🌙 按钮
```

### API 端点参考

```javascript
// 健康检查
GET  /api/v6/health

// 认证
POST /api/v6/auth/login    body: { username, password }

// 数据 CRUD
GET    /api/v6/data/mes_work_orders?skip=0&top=200&sort=created_desc
POST   /api/v6/data/mes_work_orders    body: { name, order_number, ... }
PATCH  /api/v6/data/mes_work_orders/{_id}  body: { status, wf_status, ... }
DELETE /api/v6/data/mes_work_orders/{_id}

// 对象 Schema
GET /service/api/@mes_work_orders/uiSchema
```

---

> **最后提醒：**
> - 前端的 Amis 页面（`steedos-packages/.../pages/`）已废弃，不要修改
> - 所有 UI 在 `frontend/web/src/` 下实现
> - 出问题先跑 `emergency_recovery.js`
> - 有疑问读 `docs/ai-workflow/prompts/session-summary-2026-05-22.md`
