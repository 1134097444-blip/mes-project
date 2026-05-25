---
title: 提示词 — 文档生成与更新
doc_id: MES-AIW-PROMPT-UPDATE-DOC
version: 1.0.0
status: approved
owner: Architect
reviewers: [Tech Lead]
created: 2026-05-18
updated: 2026-05-18
related: [MES-AIW-001]
---

# Prompt：文档生成 / 更新

## 何时使用

当代码或元数据变更引起文档漂移，或需要新增 ARCH/DM/FLOW/PERM/API/ADR 文档时调用。

## 输入字段

| 字段 | 必填 | 示例 |
|------|------|------|
| 文档 doc_id | 是 | MES-DM-002 / ADR-0001 |
| 主题 | 是 | 生产工单对象详细数据模型 |
| 触发原因 | 是 | 新增字段 / 决策变更 / 流程更新 |
| 关联元数据 | 是 | objects/mes_work_orders/* |
| 关联其他文档 | 否 | MES-ARCH-001, MES-PERM-001 |

## 期望产出

- 新文件或修改后的文件，YAML frontmatter 完整（title / doc_id / version / status / owner / reviewers / created / updated / related）。
- 在所属章节 README / 索引追加链接。
- 在 change-log.md 追加一条变更记录。
- 如为 ADR：自增编号、不复用、被推翻者改 `superseded_by`。

## 验收

- [ ] markdownlint 通过。
- [ ] 所有内部链接可达。
- [ ] 与代码 / 元数据描述一致（抽样 3 处核对）。
- [ ] doc_id 唯一、版本号按升级规则。
