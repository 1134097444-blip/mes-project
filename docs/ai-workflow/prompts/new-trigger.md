---
title: 提示词 — 新建触发器
doc_id: MES-AIW-PROMPT-NEW-TRIGGER
version: 1.0.0
status: approved
owner: Tech Lead
reviewers: [Architect]
created: 2026-05-18
updated: 2026-05-18
related: [MES-AIW-001, MES-DM-001]
---

# Prompt：新建触发器

## 何时使用

需要在对象生命周期事件（before/after × insert/update/delete）注入业务逻辑时使用。优先使用 formula 字段，仅在跨对象/计算复杂场景才写 trigger。

## 输入字段

| 字段 | 必填 | 示例 |
|------|------|------|
| 触发器 API name | 是 | `work_order_create` |
| 关联对象（完整名） | 是 | `mes_work_orders` |
| 时机 | 是 | beforeInsert / afterUpdate |
| 触发条件 | 是 | `record.status === 'released' && !record.actual_start_date` |
| 业务效果 | 是 | 自动将操作工绑定为 owner，初始化工序流转 |
| 错误回滚策略 | 是 | try/catch，失败抛出 + 用户提示 |

## 期望产出

- `triggers/<api_name>.trigger.yml`（跨对象触发器）。
- 在 `docs/data-model/<object>.md` 中补充触发器说明。

## 验收

- [ ] 正常路径成功（用例 1）。
- [ ] 失败路径无脏数据（用例 2，模拟一个子操作抛错）。
- [ ] 不递归触发（自身改动不再次触发）。
- [ ] 无 console.log 等调试残留。
