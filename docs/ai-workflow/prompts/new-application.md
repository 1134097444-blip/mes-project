---
title: 提示词 — 新建应用与 Tab
doc_id: MES-AIW-PROMPT-NEW-APPLICATION
version: 1.0.0
status: approved
owner: Tech Lead
reviewers: [Architect]
created: 2026-05-18
updated: 2026-05-18
related: [MES-AIW-001, MES-CS-001]
---

# Prompt：新建 Application + Tabs

## 何时使用

新增一个业务模块（例如 `mes_maintenance` / `mes_quality`），需要顶部导航容器与子 Tab。

## 输入字段

| 字段 | 必填 | 示例 |
|------|------|------|
| application API name | 是 | `mes` |
| label / icon | 是 | 制造执行系统 / `service_contract` |
| 包含 Tabs | 是 | object_mes_work_orders / object_mes_equipment / mes_workshop_board |
| 默认进入 Tab | 是 | object_mes_work_orders |
| 角色可见 | 是 | mes_admin / mes_production_manager / mes_operator |

## 期望产出

- `applications/<api_name>.app.yml`
- `tabs/<tab>.tab.yml`（type: object / url / page）
- 在对应 `permissionset.yml` 中授予 `apps` 可见。
- 更新设计文档应用清单。

## 验收

- [ ] 顶部导航出现新应用，点击后默认 Tab 正确。
- [ ] 不在角色范围的用户看不到该应用。
