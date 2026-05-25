---
title: 提示词 — 新建对象
doc_id: MES-AIW-PROMPT-NEW-OBJECT
version: 1.0.0
status: approved
owner: Tech Lead
reviewers: [Architect]
created: 2026-05-18
updated: 2026-05-18
related: [MES-AIW-001, MES-CS-001, MES-CS-002, MES-DM-001]
---

# Prompt：新建业务对象

## 何时使用

新增一个 MES 业务对象时调用本模板，目标产出 = 一个 `mes_<plural>` 对象目录、字段、listview、permission，并同步数据模型文档。

## 必读上下文（AI 调用前自行读取）

- [docs/coding-standards/naming.md](../../coding-standards/naming.md)
- [docs/coding-standards/directory.md](../../coding-standards/directory.md)
- [docs/coding-standards/yaml-style.md](../../coding-standards/yaml-style.md)
- [docs/data-model/README.md](../../data-model/README.md)
- [docs/permissions/permission-model.md](../../permissions/permission-model.md)
- [docs/design.md](../../design.md)

## 输入字段（人填写）

| 字段 | 必填 | 示例 |
|------|------|------|
| 业务名（中文） | 是 | 生产工单 |
| API name | 是 | `mes_work_orders` |
| 名称字段类型 | 是 | autonumber `WO-{0000}` / text |
| 主要字段（≥3） | 是 | order_number / name / status / priority / planned_qty / assignee |
| 关系 | 否 | routing → mes_routings (lookup) |
| 所属模块 | 是 | 生产执行 / 工艺数据 / 质量管控 / 设备管理 / 物料管理 |
| 角色权限差异 | 是 | 见权限模型 |

## 期望产出

```
steedos-packages/mes/main/default/objects/<api_name>/
├── <api_name>.object.yml
├── fields/
│   ├── <field>.field.yml
│   └── …
├── listviews/
│   └── all.listview.yml
└── permissions/
    ├── mes_admin.permission.yml
    ├── mes_production_manager.permission.yml
    └── …（覆盖所有相关角色）
```

并同步：

- 新建 `docs/data-model/<api_name>.md`（字段表 + 生命周期）。
- 在 [docs/data-model/README.md](../../data-model/README.md) §对象清单追加一行。
- 在 [docs/project-management/tasks.md](../../project-management/tasks.md) 把对应任务标 `done`。

## 验收

- [ ] `steedos restart` 无报错；左侧菜单出现该对象 Tab（如已注册 application/tab）。
- [ ] 列表页可新建/编辑/删除一条记录。
- [ ] 不同角色登录权限矩阵符合设计。
- [ ] yamllint / markdownlint 通过。
