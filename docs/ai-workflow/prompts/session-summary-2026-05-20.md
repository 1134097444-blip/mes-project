# 错误总结与教训记录

## 日期：2026-05-20
## 任务：MES 系统业务流程导航页面开发

---

## 错误一：分拆 HTML 标签在多个 Amis tpl 组件之间

**现象**：第一版 Amis JSON 用 `<div class="flow-lane">` 在一个 tpl 中打开，用 `</div>` 在另一个 tpl 中关闭，导致 DOM 结构断裂，页面完全不可见。

**根因**：Amis 渲染引擎将每个 tpl 组件独立渲染为 DOM 碎片，不能跨组件拆分 HTML 标签。

**修复**：用 Amis 的 `container` 组件代替手动 div 包裹，用 `className` 控制样式。

**教训**：任何前端框架都不允许跨组件拆分 HTML 标签。在 Amis 中，容器用 `container`、`panel`、`flex` 组件，不要用 `tpl` 拼凑。

---

## 错误二：CSS 类名中的点号导致 MongoDB 存储失败

**现象**：通过 REST API 创建 page_version 时报错 `"key .mfp-lane must not contain '.'"`。

**根因**：MongoDB 不允许在字段名（或嵌套对象的 key）中使用 `.` 字符。Amis 的 `css` 属性中，key 是 CSS 选择器（如 `.mfp-lane`），存储为 MongoDB 文档时触发路径解析错误。

**修复**：去掉 Amis JSON 中的顶级 `css` 属性，改用组件的 `style` 内联属性。

**教训**：任何需要存入 MongoDB 的 JSON 数据，确保所有 key 不包含 `.`。Amis 的 `css` 属性在页面元数据中不要用，改用 `style` 或 className + 全局 CSS。

---

## 错误三：前端新 API 路径与后端路由不匹配

**现象**：前端 React SPA 调用 `/api/v6/pages/schema/app?pageId=mes_process_flow` 返回 500 `Fail at 0`。

**根因**：Steedos 3.0.14 中，此 URL 被 objectql 的通用 OData 处理器拦截，将 `schema/app` 解析为对 `pages` 对象的 OData 查询，导致解析失败。实际可用的旧 API 是 `/api/pageSchema/app`。

**修复**：在 `page_schema.router.js` 中添加对 `/api/v6/pages/schema/:type` 的路由，转发到与 `/api/pageSchema/:type` 相同的处理逻辑。

**教训**：Steedos 不同版本的前后端 API 路径可能不一致。遇到 500 先确认路由落在哪个 handler，不要假设 URL 格式有效。

---

## 错误四：OData 查询解析器内部错误未处理

**现象**：`page.service.js` 中的 `getMeSchema` 方法调用 `objectql.getObject('page_versions').find()` 时抛出 `Fail at 0`。

**根因**：`objectql` 内部将 find 参数转换为 OData 查询字符串后，`@steedos/odata-v4-parser` 在解析时失败。失败原因可能是 `master_detail` 类型字段的过滤条件转 ObjectId 转换失败。

**修复**：在 `page.service.js` 的 `getMeSchema` 和 `getLatestPageVersion` 方法中加入 try-catch，兜底用 MongoDB native driver 直查。

**教训**：Steedos 的 `objectql` 层对某些查询参数组合（sort + top + 复合 filter）存在兼容性问题。给内部 API 调用加 try-catch 是必要的防御措施。

---

## 错误五：流程图节点不可点击

**现象**：流程图渲染正常，但点击节点无任何反应。

**根因**：Amis 的 `action` 组件（`actionType: "link"` 或 `"url"`）在独立 `type: app` 页面中渲染为无交互的 DOM 节点，点击事件未绑定。

**修复**：将所有 `action` 组件替换为原生 `<a>` 标签，由浏览器原生处理导航。

**教训**：在 Steedos 的 `type: app` 独立页中，不要依赖 Amis action 组件做导航。用 `<a>` 标签最可靠。

---

## 错误六：对象 URL 中多余的 `object_` 前缀

**现象**：点击节点后跳转到对象页，但 `ObjectListView` 组件报 `Cannot read properties of undefined (reading 'list_views')`。

**根因**：`<a>` 标签的 `href` 写成了 `/app/mes/object_mes_work_orders`，但 React Router 从 URL 提取的 `objectName` 是 `object_mes_work_orders`（带 `object_` 前缀），导致 `getUISchemaSync('object_mes_work_orders')` 查找不存在的对象名。正确的对象名是 `mes_work_orders`。

**修复**：将 href 改为 `/app/mes/mes_work_orders`。

**教训**：在 Steedos 中，tab 名（`object_mes_xxx`）和对象 API 名（`mes_xxx`）是两回事。路由 URL 应该用对象 API 名，不要用 tab 名。这是一个极低级但后果严重的错误——花了大量 token 去排查 `ObjectListView` 组件、`getUISchemaSync` 缓存、list_views 数据库缺失，唯独没看 URL 里多了几个字符。

---

## 错误七：未预先验证对象页是否正常

**现象**：流程图开发过程中一直假设对象列表页是正常的。但实际上 `object_listviews` 未正确加载到数据库，`objects` 集合缺少 `list_views` 字段。

**根因**：Steedos YAML 元数据加载器未将 `listviews/*.listview.yml` 写入 MongoDB，导致前端对象页无法获取 list_views 配置。

**修复**：编写脚本将 listview YAML 导入 `object_listviews` 集合，并将 `list_views` 嵌入到 `objects` 集合的对应记录中。

**教训**：不要假设项目的已有功能是正常的。接手任何项目的第一步应该是验证核心链路是否可用。

---

## 错误八：修复流程缺乏系统性

**现象**：整个调试过程呈现"撞到问题 → 修一个 → 撞到下一个"的被动模式，没有整体排查链路。

**根因**：没有先画出完整的数据流和渲染链路再动手。流程图的前端渲染链路是：

```
YAML (.page.yml + .page.amis.json) 
  → Steedos 元数据加载器 → MongoDB (pages + page_versions) 
    → Schema API (/api/v6/pages/schema/app 或 /api/pageSchema/) 
      → React SPA (ObjectListView) 
        → Amis 渲染
```

逐个环节验证应该从最下游（Amis 渲染）开始，而不是从最上游（YAML 文件）开始。

**教训**：排查复杂问题时，先画出完整链路，从确定已知工作的环节开始，逐层向下排查，而不是随机试错。

---

## 总结

本次任务暴露出几个根本问题：

1. **不做验证直接写代码**：每一步都是写完才发现不对
2. **方向错了还在加码**：`object_` 多几个字符的问题，却去修 OData 解析器、前端缓存、数据库补数据
3. **不熟悉平台就贸然动手**：对 Amis、Steedos 页面管线、objectql 层的理解都是"边错边学"

唯一的改进方法：动手之前先想清楚应该怎么做，不确定的先去验证，确认了再写。不确定，宁可先问。
