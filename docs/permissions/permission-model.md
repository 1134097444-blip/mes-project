---
title: 权限模型
doc_id: MES-PERM-001
version: 1.0.0
status: approved
owner: Tech Lead
reviewers: [Product Owner, Plant Manager]
created: 2026-05-18
updated: 2026-05-18
related: [MES-ARCH-001, MES-DM-001]
---

# 权限模型

## 1. 权限层次

Steedos 平台提供四级权限控制，本项目统一遵循：

1. **License**：用户许可范围（暂用 `Standard`）。
2. **Profile**：登录概要文件（暂用 `User` 默认）。
3. **PermissionSet**：本项目核心，每个角色一个 `*.permissionset.yml`。
4. **共享规则 (Sharing Rule)**：跨用户的数据可见性扩展。

## 2. 标准角色

| API Name | 名称 | 说明 |
|----------|------|------|
| `mes_admin` | 系统管理员 | 全部对象全部权限，配置元数据 |
| `mes_production_manager` | 生产主管 | 工单/报工/工艺/全量可见，可派发、可编辑 |
| `mes_operator` | 操作工 | 仅自己负责的工单和报工 |
| `mes_quality_inspector` | 质检员 | 检验/缺陷/不合格全权；工单/设备只读 |
| `mes_equipment_tech` | 设备技术员 | 设备/维保/故障全权；工单只读 |

## 3. 对象权限矩阵

| 对象 | mes_admin | mes_production_manager | mes_operator | mes_quality_inspector | mes_equipment_tech |
|------|-----------|----------------------|-------------|----------------------|-------------------|
| mes_work_orders | CRUD | CRUD | own R+U | R | R |
| mes_production_reports | CRUD | CRUD | own CRUD | R | R |
| mes_routings | CRUD | CRUD | R | R | R |
| mes_operations | CRUD | CRUD | R | R | R |
| mes_bom_items | CRUD | CRUD | R | R | R |
| mes_equipment | CRUD | CRUD | R | R | CRUD |
| mes_maintenance_records | CRUD | CRUD | R | R | CRUD |
| mes_equipment_faults | CRUD | CRUD | CRUD | R | CRUD |
| mes_inspection_records | CRUD | CRUD | R | CRUD | R |
| mes_defects | CRUD | CRUD | R | CRUD | R |
| mes_nonconformance | CRUD | CRUD | R | CRUD | R |
| mes_materials | CRUD | CRUD | R | R | R |
| mes_inventory | CRUD | CRUD | R | R | R |

> own = 仅自己 owner；R = 只读；CRUD = 完全控制。

## 4. 字段级权限

| 对象 | 字段 | 规则 |
|------|------|------|
| mes_work_orders | cost_estimate | operator 不可见 |
| mes_equipment | purchase_price | operator / inspector 不可见 |
| mes_nonconformance | root_cause | 仅 admin / production_manager 可编辑 |

## 5. 共享规则

| 规则 | 描述 | 时间 |
|------|------|------|
| 主管→车间 | production_manager 可读全部工单/报工 | Phase 1 |
| 部门内工单共享 | 同部门成员可读工单 | Phase 2 |
| 设备全厂可见 | 所有人可读设备台账（不可编辑） | Phase 1 |

## 6. 审计

- Phase 3 起开启关键对象审计日志（工单状态变更、缺陷处理、维保记录）。
- 关键字段（`work_orders.status`、`defects.severity`）变更全部审计。

## 变更记录

| 版本 | 日期 | 变更 | 作者 |
|------|------|------|------|
| 1.0.0 | 2026-05-18 | 初稿 | AI |
