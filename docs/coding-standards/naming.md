---
title: 命名规范
doc_id: MES-CS-001
version: 1.0.0
status: approved
owner: Tech Lead
reviewers: [Architect]
created: 2026-05-18
updated: 2026-05-18
related: [MES-DM-001]
---

# 命名规范

## 1. 通用原则

- 一律使用英文小写，避免中文与缩写歧义。
- 单词分隔统一用 `snake_case`（元数据 API name）或 `kebab-case`（文件/目录名/分支名）。
- 禁止保留字：`type`、`name`、`id`、`_id`、`created`、`modified`、`owner` 等 Steedos 平台保留字段不得作为自定义字段名。

## 2. Steedos 对象 API name

> 决策：所有业务对象统一使用 `mes_` 前缀，避免与平台/其他包对象冲突。

| 元素 | 规则 | 示例 |
|------|------|------|
| 对象 (object) | `mes_` + 小写复数 snake_case | `mes_work_orders`、`mes_equipment`、`mes_inspection_records` |
| 字段 (field) | 小写 snake_case，**不**重复对象前缀 | `order_number`、`equipment_code`、`defect_type` |
| Lookup 字段 | 引用对象单数语义 + 业务后缀 | `equipment`（指向 `mes_equipment`）、`parent_work_order` |
| 关系字段 | 不使用 `_id` 后缀（平台自动处理） | `equipment` 而非 `equipment_id` |
| Listview | 小写 snake_case，描述视图意图 | `all`、`my_pending`、`this_week`、`overdue` |
| Tab | 对象 API name 或 `object_mes_xxx` | `object_mes_work_orders`、`object_mes_equipment` |
| Application | 小写单词 | `mes` |
| Trigger | `<object_short>_<intent>` | `work_order_create`、`inspection_auto_assign` |
| Function | `<object_short>_<verb>` | `work_order_dispatch`、`defect_close_loop` |
| PermissionSet | `mes_` + 角色 API name | `mes_operator`、`mes_quality_inspector`、`mes_admin` |
| Dashboard / Question | `mes_<scope>_<metric>` | `mes_workshop_output`、`mes_quality_defect_rate` |

## 3. 自增字段（autonumber）

| 对象 | 字段 | 格式 |
|------|------|------|
| `mes_work_orders` | `order_number` | `WO-{YYYY}{MM}{DD}-{0000}` |
| `mes_routings` | `routing_number` | `RT-{0000}` |
| `mes_operations` | `operation_code` | `OP-{0000}` |
| `mes_equipment` | `equipment_code` | `EQ-{0000}` |
| `mes_inspection_records` | `inspection_number` | `QC-{YYYY}{MM}{DD}-{0000}` |
| `mes_defects` | `defect_number` | `DF-{0000}` |
| `mes_maintenance_records` | `maintenance_number` | `MT-{YYYY}{MM}{DD}-{0000}` |
| `mes_materials` | `material_code` | `MTL-{0000}` |

`is_name: true` 必须设在自增编号字段上，便于跨对象引用稳定。

## 4. 文件与目录

| 类别 | 规则 | 示例 |
|------|------|------|
| 元数据文件 | `<api_name>.<type>.yml` | `mes_work_orders.object.yml` |
| 字段拆分目录 | `objects/<object>/fields/<field>.field.yml` | `objects/mes_work_orders/fields/order_number.field.yml` |
| Trigger | `triggers/<name>.trigger.yml` | `triggers/work_order_create.trigger.yml` |
| Function | `functions/<name>.function.yml` | `functions/work_order_dispatch.function.yml` |
| Page | `pages/<name>.page.yml` + `.page.amis.json` | `pages/mes_workshop_board.page.yml` |
| 文档 | `kebab-case.md` | `business-flows/work-order-execution.md` |

## 5. 分支命名

`<type>/<scope>-<short-desc>`

| type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 仅文档 |
| `refactor` | 重构（不改行为） |
| `chore` | 构建/工具 |
| `data` | 种子数据/迁移 |

示例：`feat/work-order-create-trigger`、`docs/permission-matrix-update`。

## 6. 文档 ID

格式：`MES-<PREFIX>-<NNN>`，全局唯一。新增文档时查阅同前缀已有最大编号 +1。

| 前缀 | 用途 |
|------|------|
| MES-PROD | 产品需求 |
| MES-ARCH | 架构设计 |
| MES-DM | 数据模型 |
| MES-FLOW | 业务流程 |
| MES-PERM | 权限模型 |
| MES-API | API 接口 |
| MES-CS | 编码规范 |
| MES-AIW | AI 工作流 |
| MES-DEL | 交付 |

## 变更记录

| 版本 | 日期 | 变更 | 作者 |
|------|------|------|------|
| 1.0.0 | 2026-05-18 | 初稿 | AI |
