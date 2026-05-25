---
title: YAML 风格规范
doc_id: MES-CS-003
version: 1.0.0
status: approved
owner: Tech Lead
reviewers: [Architect]
created: 2026-05-18
updated: 2026-05-18
---

# YAML 风格规范

适用于本项目所有 `*.yml` 元数据文件。

## 1. 基础

| 项 | 规则 |
|----|------|
| 缩进 | 2 空格，禁止 TAB |
| 字符集 | UTF-8，不带 BOM |
| 行尾 | LF（Unix） |
| 结尾 | 文件末尾必须有一个空行 |
| 行宽 | ≤ 120 列；超长 label/description 用 `>` 折行 |

## 2. 引号

- 字符串默认不加引号。
- 出现以下情形必须加双引号：
  - 含 `:`、`#`、`{`、`}`、`[`、`]`、`,`、`&`、`*`、`?`、`|`、`-`、`<`、`>`、`=`、`!`、`%`、`@`、`` ` `` 或前导/尾随空白
  - 全数字但表达字符串（如 `"01"`）
  - 布尔保留字面（`"yes"`、`"no"`、`"on"`、`"off"`）当字符串使用
- 多行内容用 `|`（保留换行）或 `>`（折叠为空格），按语义选择。

## 3. 布尔与空值

- 布尔统一写 `true` / `false`。禁用 `yes/no/on/off`。
- 空值用 `null` 不用 `~`。多数情况下应直接省略键。

## 4. 键顺序

### 4.1 `*.object.yml`

```yaml
name:
label:
icon:
description:
enable_search: true
enable_tree: false
enable_chatter: true
enable_audit: true
enable_files: true
enable_api: true
enable_trash: true
enable_enhanced_lookup: true
field_groups:
list_views:
```

### 4.2 `*.field.yml`

```yaml
name:
label:
type:
required:
sortable:
searchable:
index:
omit:
hidden:
readonly:
defaultValue:
options:           # for select
reference_to:      # for lookup/master_detail
filtersFunction:
formula:
scale:
precision:
```

> 不存在的属性直接省略，不写空值。

### 4.3 `*.permission.yml`

```yaml
name:
permission_set_id:
allowCreate: true
allowRead: true
allowEdit: true
allowDelete: false
modifyAllRecords: false
viewAllRecords: false
field_permissions:
  - field:
    readable: true
    editable: false
```

### 4.4 `*.button.yml`

```yaml
name:
label:
type: amis_button
on:
is_enable: true
amis_schema: |-
  {
    "type": "service",
    "body": { ... }
  }
```

## 5. 列表与映射

- 列表项前空格 + 短横：`- name: foo`。
- 单行短列表可用 flow `[a, b, c]`，但 ≥ 4 项或含字典必须用块式。
- 字典中布尔/数字键禁用，必须用字符串。

## 6. 注释

- 仅在配置存在非显然约束时添加。
- 行内注释前必须有两个空格：`field: value  # 说明`。
- 不写"该字段是 xxx"这种从 label 即可推断的注释。

## 7. 国际化

- `label` 写默认语言（中文）。
- 多语言一律放在 `translations/<lang>.translation.yml`，禁止在对象 yml 中混杂语言后缀。

## 8. 公式与表达式

```yaml
formula: |
  IF(status == 'completed', '已完成',
     IF(status == 'in_progress', '执行中', '待开始'))
```

- 复杂公式拆分为辅助字段，避免嵌套 > 3 层。

## 9. Lint

CI 集成 `yamllint`，规则严格度：

- `indentation: spaces=2`
- `line-length: max=120`
- `truthy: allowed-values=[true, false]`
- `key-duplicates: enable`
- `trailing-spaces: enable`
- `new-line-at-end-of-file: enable`

## 变更记录

| 版本 | 日期 | 变更 | 作者 |
|------|------|------|------|
| 1.0.0 | 2026-05-18 | 初稿 | AI |
