---
title: 提示词 — 新建自定义函数
doc_id: MES-AIW-PROMPT-NEW-FUNCTION
version: 1.0.0
status: approved
owner: Tech Lead
reviewers: [Architect]
created: 2026-05-18
updated: 2026-05-18
related: [MES-AIW-001]
---

# Prompt：新建自定义函数（function）

## 何时使用

需要暴露一个可被按钮、UI、外部系统调用的服务端方法。优先使用 trigger；只有当 UI 需要主动调用、或被外部系统集成时才用 function。

## 输入字段

| 字段 | 必填 | 示例 |
|------|------|------|
| function API name | 是 | `work_order_dispatch` |
| 入参 schema | 是 | `{ work_order_id: string, assignee: string }` |
| 出参 schema | 是 | `{ success: boolean, message: string }` |
| 调用方 | 是 | listview button / REST |
| 权限 | 是 | mes_admin / mes_production_manager |

## 期望产出

- `functions/<api_name>.function.yml`（声明 schema、permission）。
- 如果挂在 listview button，更新对应 `button.yml`。

## 验收

- [ ] 正常入参返回正确结果。
- [ ] 越权调用返回 403。
- [ ] 入参非法返回 400 + 明确错误码。
