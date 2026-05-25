---
title: 提示词 — 新建 Dashboard / Question
doc_id: MES-AIW-PROMPT-NEW-DASHBOARD
version: 1.0.0
status: approved
owner: Tech Lead
reviewers: [Architect, Product Owner]
created: 2026-05-18
updated: 2026-05-18
related: [MES-AIW-001]
---

# Prompt：新建 Dashboard / Question

## 何时使用

为 MES 系统增加 KPI 卡片或仪表盘（车间看板、质量统计、设备状态）。

## 输入字段

| 字段 | 必填 | 示例 |
|------|------|------|
| question API name | 是 | `q_work_orders_by_status` |
| 数据源 | 是 | `mes_work_orders` |
| 聚合 | 是 | count group by status |
| 图表类型 | 是 | bar / pie / scalar / table |
| 关联 dashboard | 是 | `mes_workshop_board` |
| 角色可见 | 是 | mes_admin / mes_production_manager |

## 期望产出

- `questions/<api_name>.question.yml`
- `dashboards/<dashboard>.dashboard.yml`（追加该 question 引用）
- 更新设计文档看板章节。

## 验收

- [ ] 数据正确（与手工 SQL 抽样一致）。
- [ ] 角色权限限制生效。
- [ ] 加载时间 ≤ 2s（10w 量级数据）。
