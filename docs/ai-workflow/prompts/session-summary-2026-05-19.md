# MES 项目开发日志 — 2026-05-19

> 本文档记录了当日 AI Agent 开发过程中的所有操作、问题、解决方案和教训。
> 第二天 AI 请先阅读此文档，了解项目当前状态和历史背景，避免重复踩坑。

---

## 一、概览

- **日期**：2026-05-19
- **项目**：MES 制造执行系统（基于 Steedos 3.0.14）
- **当前阶段**：验证交付阶段（所有 22 个 MES 任务已开发完毕）
- **核心问题**：前端页面空白、GraphQL 500、数据同步

---

## 二、遇到的核心问题与修复

### 问题 1：所有前端页面空白 + 接口报错

**现象**：看板页面空白，所有应用程序报错，前端显示"接口报错：{}"

**根本原因**：**GraphQL 依赖冲突**
- `@steedos/moleculer-apollo-server` 内嵌了 `graphql@15.10.2`
- `@steedos/service-api` 也内嵌了 `graphql@15.10.2`
- 顶层安装的是 `graphql@16.14.0`
- 三个版本冲突导致 GraphQL schema 构建崩溃，`POST /graphql` 返回 500

**修复**：
```
# 删除嵌套的 graphql 包
rmdir /s /q node_modules\@steedos\moleculer-apollo-server\node_modules\graphql
rmdir /s /q node_modules\@steedos\service-api\node_modules\graphql

# package.json 添加 resolutions 锁定版本
"resolutions": { "graphql": "16.14.0" }
```

### 问题 2：看板统计数字均为 0

**现象**：工单看板统计面板显示"待下达 0、已下达 0、执行中 0、已完成 0"，但下方列表有数据

**根本原因**：Amis 模板引用错误的变量名
- 用友 v6 API 返回的是 `totalCount`（如 `{"data":[...], "totalCount": 42}`）
- Amis service 组件中可用 `items.length` 获取数据长度
- 但 Amis schema 中写的是 `${count | default: 0}`，变量名完全不对

**修复**：修改三个看板文件中的模板变量
```
${count | default: 0} → ${items.length | default: 0}
```

涉及文件：`mes_workshop_board.page.amis.json`、`mes_quality_board.page.amis.json`、`mes_equipment_board.page.amis.json`

**❗ 教训**：Amis template 变量必须与 Steedos API 返回的实际字段名匹配。不要靠猜测，要先通过 API 测试确认。

### 问题 3：MES 首页内容空白

**现象**：页面导航正常加载（左侧菜单完整），但主内容区空白

**根本原因**：**页面 schema 加载路径问题**
- 前端加载页面的 API 是 `/api/v6/pages/schema/app?app=mes&pageId=mes_home`
- 后端通过 `page.getMeSchema` -> `getLatestPageVersion` 从 `page_versions` 读取 schema
- 直接操作 MongoDB 写入的 `page_versions` 中，`page` 字段（master_detail 类型）使用了**字符串**而非正确的 **ObjectId 引用**
- 导致 `getLatestPageVersion` 查询找不到数据

**最终修复方案**：
1. 通过 REST API 创建 `pages` 记录（自动生成 ObjectId）
2. 通过 REST API 创建 `page_versions` 记录，page 引用使用真实 ObjectId

```javascript
// 正确方式
const r1 = await api('POST', '/api/v6/data/pages', { name, label, type: 'app', ... });
const pageId = JSON.parse(r1.b)._id; // 真实的 ObjectId
const r2 = await api('POST', '/api/v6/data/page_versions', { page: pageId, ... });
```

**❗ 核心教训**：
- **永远不要直接写 MongoDB 的 Steedos 元数据表**（pages, page_versions, objects, tabs 等）
- Steedos 的 master_detail/lookup 字段要求存储目标记录的 ObjectId，不是字符串名称
- 必须通过 Steedos REST API 操作，或通过 YAML 文件定义

### 问题 4：设备状态看板无法显示

**现象**：其他三个看板正常，设备看板空白

**原因**：`mes_equipment_board` 的 page_versions.page 字段是字符串，pages._id 是 ObjectId，类型不匹配。

**修复**：用 ObjectId 重新创建 page_versions。

---

## 三、数据同步（用友 U8 → MES）

### 数据库信息

```
MSSQL: 192.168.1.21 / UFDATA_006_2025 / rd01 / triowin
MongoDB: mongodb://127.0.0.1:27017/steedos_mes
```

### 表映射

| 用友表 | 行数 | MES 对象 |
|--------|------|----------|
| sfc_operation | 85 | mes_operations |
| sfc_workcenter | 84 | mes_work_centers |
| sfc_prouting | 193,499 | mes_routings |
| sfc_proutingdetail | 595,862 | 关联操作到路线 |
| Inventory | 239,541 | mes_materials |
| CurrentStock | 49,349 | mes_inventory |
| bom_opcomponent | 730,780 | mes_bom_items |
| mom_order / mom_orderdetail | 53,038 | mes_work_orders |
| mom_moallocate | 141,919 | 齐套分析 |

### 新增对象

- `mes_work_centers`：工作中心，4 个字段

### 扩展字段

- `mes_routings`：version, routing_status, effective_date, uf_prouting_id
- `mes_operations`：work_center 改为 lookup、is_subcontract、uf_operation_id

---

## 四、给第二天 AI 的注意事项

### 环境参数

- Node.js 22.14.0 | MongoDB 4.2.24（库名 steedos_mes）| Redis 5.0.14.1
- Steedos 3.0.14（端口 5100）| 启动：`yarn start`
- 用户：`1134097444@qq.com` / `123456`

### 关键文件

- `.env` — 环境变量配置
- `steedos-config.yml` — Steedos 配置
- `package.json` — 含 resolutions 锁定 graphql 版本
- `docs/ai-workflow/prompts/` — AI 工作流提示词
- `tests/` — 测试脚本
- `tests/sync_from_ufida.js` — U8 同步脚本（正在运行）
- `screenshots/` — 页面截图

### 未完成事项

1. BOM 表同步（bom_opcomponent → mes_bom_items）
2. 生产订单同步（mom_order → mes_work_orders）
3. 库存同步（CurrentStock → mes_inventory）
4. 为 mes_work_centers 补充完整权限文件
5. 凭证/总账 GL_accvouch 数据对接

### 重要经验清单

1. ❌ **不要直接写 MongoDB 元数据表**，用 REST API 或 YAML
2. ❌ **不要猜 Amis 模板变量名**，先 API 测试确认
3. ⚠️ **GraphQL 500** = 删除嵌套的 graphql 包
4. ⚠️ **权限文件名** = `{object}.{set}.permission.yml`，name = `{object}.{set}`
5. ⚠️ `.env` 必须有 `STEEDOS_ROOT_URL` 和 `BUILDER6_PUBLIC_SETTINGS`
6. ✅ YAML 文件中定义的对象会在启动时自动加载
7. ✅ MongoDB 中的 objects 集合 = UI 创建的对象，不是 YAML 定义的
