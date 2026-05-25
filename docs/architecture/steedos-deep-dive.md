# Steedos 3.0.14 架构详解

> 本文档适用于 MES 项目使用的 Steedos 3.0.14 版本。
> 基于 2026-05-20 的深度代码阅读和实际测试编写。

---

## 概述

Steedos 是一个基于 Node.js + MongoDB + Amis 的低代码平台，采用元数据驱动架构。业务功能通过 YAML 元数据文件定义，运行时加载到 MongoDB，通过 REST API 和 GraphQL 暴露给前端 React SPA 渲染。

---

## 核心包依赖关系

```
webapp (React SPA)
  └─ service-ui ─┬─ service-pages
                  │    └─ metadata-api
                  └─ standard-ui
                       └─ service-pages
                            └─ metadata-api
                                 └─ objectql
                                      └─ odata-v4-parser
                                           └─ odata-v4-mongodb

service-package-loader
  └─ metadata-registrar
       └─ metadata-core (LoadPageFile 等)
       └─ service-package-loader

service-pages
  ├─ page.service.js (getMeSchema, getLatestPageVersion)
  ├─ pages_init.trigger.js
  └─ routes/page_schema.router.js
```

---

## 元数据加载流程详解

### 1. 启动时序

```
Moleculer Broker 启动
  ↓
@steedos/service-packages 加载
  ↓
@steedos/service-package-loader 加载
  ↓
扫描 steedos-packages/ 下所有包
  ↓
对每个包：
  ├─ 读取 package.json
  ├─ 调用 loadPackageMetadataFiles()
  └─ 调用 loadPackageMetadataServices()
```

### 2. loadPackageMetadataFiles() 内部

```javascript
async function loadPackageMetadataFiles(packagePath, name) {
    // 1. 初始化数据源（建立 MongoDB 连接）
    await this.initDataSource(packagePath, datasourceName);
    
    // 2. 加载标准元数据（内置对象、字段等）
    await loadStandardMetadata(name, datasourceName);
    
    // 3. 注册 YAML 元数据配置（核心步骤）
    await registerMetadataConfigs(packagePath, datasourceName, name);
    
    // 4. 加载触发器、函数、路由等
    await triggerLoader.load(this.broker, packagePath, name);
    await functionYmlLoader.load(this.broker, packagePath, name);
    await importLoader.load(this.broker, packagePath, name);
    
    // 5. 注册路由
    await this.loadPackageRouters(packagePath, name);
}
```

### 3. registerMetadataConfigs() 内部

扫描 `{packagePath}/main/default/` 下的所有子目录。每个子目录名对应一种元数据类型。支持的类型见 `@steedos/metadata-registrar/lib/config-register/` 中的文件列表（约 30 种）。

对每种类型调用对应的加载器。比如 pages：

```javascript
// config-register/page.js
const registerPackagePages = async (packagePath, packageServiceName) => {
    // LoadPageFile 是专门的页面加载器
    const loadPageFile = new LoadPageFile();
    const pages = loadPageFile.load(packagePath);
    
    // 批量注册到 metadata-server
    await registerPage.mregister(broker, packageServiceName, data);
};
```

### 4. LoadPageFile 加载页面

```javascript
class LoadPageFile extends BaseLoadMetadataFile {
    load(filePath) {
        // 1. 父类加载 .page.yml 文件
        const pages = super.load(filePath);
        
        for (const apiName in pages) {
            const page = pages[apiName];
            
            // 2. 根据 render_engine 找对应的 schema 文件
            const engineFileName = `${apiName}.page.${render_engine}.json`;
            // 如：mes_process_flow.page.amis.json
            
            // 3. 读取文件内容为原始字符串
            const engineFileContent = fs.readFileSync(engineFilePath);
            page.schema = engineFileContent.toString();  // 关键：存为字符串！
        }
        
        return pages;
    }
}
```

**关键发现**：schema 以原始字符串形式存储，而不是解析后的 JSON 对象。这是为了避免 MongoDB 的 `.` 键名问题。

### 5. 写入 MongoDB

```javascript
// metadata-register/_base.js
class RegisterBase {
    async mregister(broker, packageServiceName, configs) {
        // 调用 metadata-server 的 broker action
        await broker.call(`${this.serviceName}.madd`, { data: mdata });
        // 对 pages 来说：broker.call('pages.madd', { data: {...} })
    }
}
```

`pages.madd` 最终将页面数据写入 `pages` 集合。如果在 MongoDB 中直接存储包含 `.` 键的嵌套对象，会触发 MongoDB 报错。

---

## 页面渲染管线

### 1. Schema API 请求流程

```
客户端                               服务端
  |                                    |
  |─ GET /api/v6/pages/schema/app ────→|
  |    ?app=desktop&pageId=xxx         |  ← V6 新版 URL
  |                                    |
  |    路由匹配：page_schema.router.js  |
  |    (V3 旧版路由在 /api/pageSchema/) |
  |                                    |
  |─ broker.call('page.getMeSchema') → |
  |    ├─ getObject('pages').find()    |
  |    ├─ getLatestPageVersion()       |
  |    └─ return {schema, pageInfo}    |
  |                                    |
  |← 200 { schema: "..." } ────────────|
```

### 2. getMeSchema 方法内部

```javascript
async getMeSchema(type, app, objectApiName, recordId, pageId, formFactor, userSession) {
    // 1. 按名称查找页面
    const records = await objectql.getObject('pages')
        .find({ filters: [['name', '=', pageId]] });
    
    if (records.length > 0) {
        pageInfo = records[0];
        
        // 2. 获取最新的 page_version
        const pageVersion = await this.getLatestPageVersion(pageInfo._id, true);
        
        if (pageVersion && pageVersion.schema) {
            // 3. 合并页面信息和 schema
            return Object.assign({}, pageInfo, { schema: pageVersion.schema });
        }
    }
}
```

### 3. getLatestPageVersion 方法内部

```javascript
async getLatestPageVersion(pageId, isArchived) {
    const filters = [['page', '=', pageId]];
    if (isArchived) {
        filters.push(['is_active', '=', true]);
    }
    
    // 对象查询层生成 OData 查询
    const pageVersions = await objectql.getObject('page_versions')
        .find({ filters, sort: 'version desc', top: 1 });
    
    if (pageVersions.length === 1) {
        return pageVersions[0];
    }
}
```

**注意**：这里生成的 OData 查询会被 `@steedos/odata-v4-parser` 解析。如果 `pageId` 参数不是合法的 ObjectId 字符串（24位 hex），解析器会抛出 "Fail at 0" 错误。

### 4. 前端渲染

```javascript
// React ObjectListView 组件
const ObjectListView = () => {
    const { appId, objectName } = useParams();
    const uiSchema = window.getUISchemaSync(objectName);
    
    if (!listName) {
        // 从 uiSchema 取第一个列表视图
        listName = _.first(_.values(uiSchema.list_views))?.name;
    }
    
    return <AmisRender schema={{...}} />;
};

// getUISchemaSync 实现（steedos-init.js）
window.getUISchemaSync = (objectName, force) => {
    // 1. 缓存检查
    if (hasUISchemaCache(objectName) && !force) {
        return getUISchemaCache(objectName);
    }
    
    // 2. 调用后端 API
    const url = `/service/api/@${objectName}/uiSchema`;
    uiSchema = Steedos.authRequest(url, { type: "GET", async: false });
    
    // 3. 格式化并缓存
    formatUISchemaCache(objectName, uiSchema);
    
    return getUISchemaCache(objectName);
};
```

---

## Amis 集成注意事项

### 可用的 Amis 组件

| 组件类型 | 在 type:app 页面中 | 在对象页面中 |
|----------|-------------------|-------------|
| tpl         | ✅ 正常 | ✅ 正常 |
| container   | ✅ 正常 | ✅ 正常 |
| flex        | ✅ 正常 | ✅ 正常 |
| panel       | ✅ 正常 | ✅ 正常 |
| grid        | ✅ 正常 | ✅ 正常 |
| action (link/url) | ❌ 不可点击 | ✅ 正常 |
| action (ajax/submit) | ❌ 不可用 | ✅ 正常 |
| form        | ❌ 可能异常 | ✅ 正常 |
| steedos-*   | ❌ 不可用 | ✅ 正常 |

**结论**：在 `type: app` 的独立页面中，导航请使用原生 `<a>` 标签，不要使用 Amis `action` 组件。

### schema 结构

```json
{
  "type": "page",
  "title": "页面标题",
  "css": {},           // ❌ 不要使用！MongoDB 会报错
  "body": [
    // 组件列表
  ]
}
```

css 属性中的 key 包含 `.`（CSS 类选择器），MongoDB 无法存储。改为在组件上使用 `style` 属性：

```json
{
  "type": "container",
  "style": {
    "background": "#fff",
    "borderRadius": "12px"
  }
}
```

---

## 对象页渲染管线

### 1. URL 路由

```
/app/:appId/:objectName
  ├─ appId = "mes"
  ├─ objectName = "mes_work_orders"  // 注意：不是 "object_mes_work_orders"！
  └─ tab 的 name 是 "object_mes_work_orders"
     但导航 URL 要用对象名 "mes_work_orders"
```

### 2. uiSchema 获取

```javascript
// 实际调用 URL
GET /service/api/@mes_work_orders/uiSchema
           ↑
    注意：没有 "object_" 前缀！

// 服务端处理
router.get("/service/api/:objectServiceName/uiSchema", ...)
    const objectName = objectServiceName.substring(1);  // 去掉 @ 前缀
    const result = await objectql.getRecordView(objectName);
```

### 3. recordView 数据源

`objectql.getRecordView()` 返回的对象定义中必须包含 `list_views` 字段。在 Steedos 3.0.14 中，YAML 加载器将 listview 定义写入 `object_listviews` 集合，但不会自动嵌入到 `objects` 集合的 `list_views` 字段。

**修复**：手动将 list_views 嵌入到 `objects` 记录中：

```javascript
const lvs = await db.collection('object_listviews').find({object: obj.name}).toArray();
const map = {};
for (const lv of lvs) {
    const { _id, object, space, ...data } = lv;
    map[lv.name] = data;
}
await db.collection('objects').updateOne({_id: obj._id}, {$set: {list_views: map}});
```

---

## 数据库操作

### 双数据库结构

| 数据库 | 用途 | 典型集合 |
|--------|------|---------|
| `steedos` | 主元数据库 | pages, page_versions, objects, object_fields, apps, tabs |
| `steedos_mes` | MES 业务数据 + 部分元数据 | mes_work_orders, mes_equipment, pages, page_versions |

**注意**：元数据可能存储在 `steedos` 数据库中（由 metadata-server 写入），而业务数据在 `steedos_mes` 中（由 API 写入）。修改元数据时需要在两个数据库都操作。

### page_versions 的 page 字段类型

`page_versions` 集合的 `page` 字段是 `master_detail` 类型，引用 `pages` 集合。

- 当页面的 `_id` 是 ObjectId 时，`page_versions.page` 存储为 ObjectId
- 当页面的 `_id` 是字符串（如 `"mes_process_flow"`）时，`page_versions.page` 存储为字符串

两种格式都可以工作，但必须保持一致。ObjectId 格式更可靠，因为 objectql 的 OData 层能正确处理 ObjectId 到字符串的转换。

---

## 踩坑点速查

| # | 问题 | 症状 | 根因 | 修复 |
|---|------|------|------|------|
| 1 | HTML 跨组件拆分 | 页面空白 | Amis 每个 tpl 独立渲染 | 用 container 组件 |
| 2 | CSS 点号 | MongoDB 500 | MongoDB key 不能含 `.` | 用 style 代替 css |
| 3 | API 路径 | 500 "Fail at 0" | V6 前端调 V3 后端路由 | 加路由转发 |
| 4 | OData 解析失败 | getLatestPageVersion 返回空 | master_detail 过滤 + sort/top 触发 OData bug | try-catch 降级 |
| 5 | action 不可点击 | 按钮无反应 | 独立页中 Amis 事件不绑定 | 用 `<a>` 标签 |
| 6 | URL object_ 前缀 | ObjectListView 报错 | tab 名和对象名混淆 | 用对象 API 名导航 |
| 7 | list_views 缺失 | 对象页崩溃 | objects 集合无 list_views 字段 | 从 object_listviews 嵌入 |
| 8 | 安装依赖 | 找不到包 | npm/pnpm/yarn 混用 | 统一用 yarn install |

---

## 开发建议

1. **先画链路再动手**：任何功能开发前，先在纸上画出完整的数据流和渲染链路
2. **从下游开始验证**：从最确定的部分（如 API 调用）开始排错，逐层向上游排查
3. **用 Playwright 做浏览器验证**：不要假设代码正确，每次修改后都跑一遍浏览器测试
4. **不要在 type:app 页面中用 Amis action 组件做导航**
5. **不要在 Amis schema 中使用顶级 css 属性**
6. **导航 URL 直接用对象 API 名，不要加 object_ 前缀**
7. **MongoDB 的 $set 操作会解析 key 中的点号**：存储 JSON 前确保 key 不含 `.`
8. **node_modules 的修改会被 yarn install 覆盖**：可以用，但要记录下来
