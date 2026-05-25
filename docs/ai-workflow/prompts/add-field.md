---
title: 提示词 — 新增字段
doc_id: MES-AIW-PROMPT-ADD-FIELD
version: 1.0.0
status: approved
owner: Tech Lead
reviewers: [Architect]
created: 2026-05-18
updated: 2026-05-18
related: [MES-AIW-001, MES-DM-001]
---

# Prompt：新增字段

## 何时使用

向已存在对象追加一个或多个字段。

## 输入字段

| 字段 | 必填 | 示例 |
|------|------|------|
| 对象 API name | 是 | `mes_work_orders` |
| 字段 API name | 是 | `actual_end_date` |
| 类型 | 是 | datetime / number / select / lookup / formula |
| label / 说明 | 是 | 实际结束时间 |
| 是否必填 / 默认值 / 索引 | 否 | required: false |
| 是否影响 listview / permission | 是 | 在 listview `all` 中显示 |

## 期望产出

- `objects/<api_name>/fields/<field>.field.yml`（按目录结构规范，多字段拆独立文件）。
- 同步更新 `docs/data-model/<api_name>.md` 字段表。
- 如涉及字段级权限，更新对应 `permission.yml` 中 `field_permissions`。

## 验收

- [ ] `steedos restart` 后字段在表单/列表可见且类型正确。
- [ ] 旧记录默认值生效或为空时不报错。
- [ ] 字段级权限按矩阵生效。
