---
title: MES 系统总体设计
doc_id: MES-ARCH-001
version: 2.0.0
status: approved
owner: Architect
reviewers: [Tech Lead, Plant Manager]
created: 2026-05-18
updated: 2026-05-22
related: [MES-PROD-001, MES-DM-001, MES-PERM-001]
---

# MES 系统总体设计

## 设计目标

本项目基于 Steedos 构建企业 MES 后端，React + Vite + Tailwind 构建前端，覆盖从工单下达、工序流转、生产报工、质量管控到设备维保的车间级核心业务闭环。

核心目标如下：

- 建立统一的生产执行数据平台，沉淀工艺、工单、质量、设备全链路数据。
- 支持车间管理人员派发工单、跟踪进度、统计产量。
- 支持操作工接收任务、报工、记录质量问题和设备异常。
- 支持质检员执行检验、登记缺陷、跟踪不合格处理。
- **前后端分离**：Steedos 负责元数据和 API，React 负责所有 UI。
- 所有自定义业务对象和表名必须使用 `mes_` 前缀。
- 所有项目文档、说明和 AI 指令必须使用中文。

## 设计原则

- **元数据优先**：后台使用 Steedos 对象、字段、权限、触发器、函数。
- **前端独立**：所有 UI（仪表盘、列表、表单、看板）在 React 中实现。
- **业务闭环**：围绕工单生命周期组织数据，不创建孤立业务对象。
- **可追溯**：重要业务对象开启审计、回收站、附件和 API 能力。
- **可测试**：前端变化通过 MCP 自动化测试验证。

## 技术架构

### 前后端分离架构（v2.0）

```
前端 (5173)                      后端 (5100)
React + Vite + Tailwind  ──API──→  Steedos 元数据引擎
  Dashboard.jsx                   objects/*.object.yml
  WorkOrders.jsx                  fields/*.field.yml
  Equipment.jsx                   permissions/*.permission.yml
                                  triggers / functions
```

| 端口 | 框架 | 职责 |
|------|------|------|
| `5100` | Steedos + Moleculer | 元数据定义、权限、REST API、触发器、函数 |
| `5173` | React + Vite + Tailwind | 所有用户界面：仪表盘、列表、表格、按钮、看板 |

### 目录结构

```
mes-project/
├── steedos-packages/mes/         # Steedos 后端（元数据层）
│   └── main/default/
│       ├── objects/              # 16 个 MES 业务对象
│       ├── triggers/ / functions/
│       └── permissionsets/
├── frontend/                     # React 前端（UI 层）
│   ├── mcp-server.js             # MCP 测试服务器
│   └── web/
│       └── src/
│           ├── App.jsx / api.js
│           └── pages/
│               ├── Dashboard.jsx
│               ├── WorkOrders.jsx
│               └── Equipment.jsx
└── docs/
```

### 分层说明

| 层级 | 位置 | 设计内容 |
|------|------|----------|
| 前端 UI | `frontend/web/src/` | React 组件：仪表盘、列表、设备监控 |
| API 桥接 | `frontend/web/vite.config.js` | Vite proxy 转发到 Steedos |
| 元数据层 | `steedos-packages/.../objects/` | 对象、字段、列表视图、权限 |
| 服务层 | `steedos-packages/.../triggers/ functions/` | 触发器、函数 |
| 数据层 | MongoDB | Steedos 对象对应业务表 |

## 实体关系图

```
mes_work_orders ─┬─ mes_production_reports  (master_detail, 工单 → 报工)
                 ├─ mes_routings            (lookup, 工单 → 工艺路线)
                 ├─ mes_equipment           (lookup, 工单 → 设备)
                 ├─ mes_inspection_records  (lookup, 工单 → 检验)
                 ├─ mes_defects             (lookup, 工单 → 缺陷)
                 ├─ mes_nonconformance      (lookup, 工单 → 不合格)
                 └─ mes_tasks               (lookup, 工单 → 工人任务)

mes_routings ── mes_operations             (master_detail, 路线 → 工序)
mes_operations ── mes_work_centers         (lookup, 工序 → 工作中心)
mes_work_centers ── mes_workshops          (lookup, 工作中心 → 车间)

mes_equipment ─┬─ mes_maintenance_records  (lookup, 设备 → 维保)
               ├─ mes_equipment_faults     (lookup, 设备 → 故障)
               └─ mes_inspection_records   (lookup, 设备 → 检验)

mes_materials ─┬─ mes_bom_items            (lookup, 物料 → BOM)
               ├─ mes_inventory            (lookup, 物料 → 库存)
               └─ mes_production_reports   (lookup, 物料 → 消耗)
```

## 核心对象清单

所有对象都必须使用 `mes_` 前缀。

| 对象 API 名 | 中文名称 | 说明 | 图标 |
|-------------|----------|------|------|
| `mes_work_orders` | 生产工单 | 生产任务的核心载体 | `orders` |
| `mes_production_reports` | 报工记录 | 工序报工、工时记录 | `feedback` |
| `mes_tasks` | 工人任务 | 车间工人领工/报工 | `task` |
| `mes_routings` | 工艺路线 | 产品加工的工序路径 | `kanban` |
| `mes_operations` | 工序定义 | 工艺路线中的单个工序 | `checklist_item` |
| `mes_work_centers` | 工作中心 | 生产加工的工作中心 | `location` |
| `mes_workshops` | 车间管理 | 车间/产线组织单元 | `groups` |
| `mes_bom_items` | BOM 清单 | 物料清单明细 | `product` |
| `mes_equipment` | 设备台账 | 车间设备主数据 | `settings` |
| `mes_maintenance_records` | 维保记录 | 设备保养、维修历史 | `maintenance_plan` |
| `mes_equipment_faults` | 故障报修 | 设备故障申报与处理 | `problem` |
| `mes_inspection_records` | 检验记录 | 来料/过程/完工检验 | `scan` |
| `mes_defects` | 缺陷登记 | 检验中发现的缺陷 | `cross` |
| `mes_nonconformance` | 不合格处理 | 不合格品评审与处置 | `block_visitor` |
| `mes_materials` | 物料主数据 | 原材料、半成品、成品 | `product_item` |
| `mes_inventory` | 线边库存 | 车间现场库存数量 | `inventory` |

## 变更新记录

| 版本 | 日期 | 变更 | 作者 |
|------|------|------|------|
| 2.0.0 | 2026-05-22 | 架构更新：前后端分离（React 5173 + Steedos 5100） | AI |
| 1.1.0 | 2026-05-21 | 补充完整对象清单和字段定义 | AI |
| 1.0.0 | 2026-05-18 | 初稿 | AI |
