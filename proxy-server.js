/**
 * 最终方案: 启动一个 Express 代理服务,拦截 /service/api/@xxx/uiSchema
 * 返回从 MongoDB 读取的数据
 * 这样前端不需要任何修改
 */
const express = require('express');
const { MongoClient } = require('mongodb');
const http = require('http');
const { execSync } = require('child_process');

const PROXY_PORT = 5199;
const STEEDOS_PORT = 5100;

const app = express();

// 前置代理: 处理 /service/api/@xxx/uiSchema
// 其他请求转发到 Steedos
app.use('/service/api/@', async (req, res) => {
  // 解析 /@objectName/uiSchema
  const pathParts = req.path.split('/');
  // req.path 是 /objectName/uiSchema 或 /objectName/xxx
  const objectName = pathParts[0]; 
  const action = pathParts[1]; // uiSchema, uiSchemaTemplate, etc.
  
  if (action === 'uiSchema') {
    try {
      const client = await MongoClient.connect('mongodb://127.0.0.1:27017');
      const db = client.db('steedos_mes');
      
      const objDef = await db.collection('objects').findOne({ name: objectName });
      if (!objDef) {
        await client.close();
        return res.status(500).json({ error: `Object @${objectName} is not found` });
      }
      
      const fields = await db.collection('object_fields').find({ object_name: objectName }).toArray();
      const fieldsMap = {};
      for (const f of fields) {
        const { _id, object_name, space, ...data } = f;
        fieldsMap[f.name] = data;
      }
      
      const lvDocs = await db.collection('object_listviews').find({ object: objectName }).toArray();
      const lvMap = {};
      for (const lv of lvDocs) {
        const { _id, object, space, ...data } = lv;
        lvMap[lv.name] = data;
      }
      
      const uiSchema = {
        _id: objDef._id,
        name: objDef.name,
        label: objDef.label,
        icon: objDef.icon,
        fields: fieldsMap,
        list_views: lvMap,
        permissions: objDef.permissions || {},
        enable_search: objDef.enable_search,
        enable_chatter: objDef.enable_chatter,
        enable_audit: objDef.enable_audit,
        enable_files: objDef.enable_files,
        enable_api: objDef.enable_api,
        enable_trash: objDef.enable_trash,
        enable_enhanced_lookup: objDef.enable_enhanced_lookup,
      };
      
      await client.close();
      return res.json(uiSchema);
    } catch (e) {
      return res.status(500).json({ error: `Object @${objectName} is not found` });
    }
  }
  
  // 其他 action 转发到 Steedos
  proxyToSteedos(req, res);
});

// 转发其他请求到 Steedos
app.use((req, res) => {
  proxyToSteedos(req, res);
});

function proxyToSteedos(clientReq, clientRes) {
  const options = {
    hostname: '127.0.0.1',
    port: STEEDOS_PORT,
    path: clientReq.originalUrl || clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers },
  };
  
  // Fix Host header
  delete options.headers['host'];
  
  const proxyReq = http.request(options, proxyRes => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });
  
  proxyReq.on('error', e => {
    clientRes.status(500).send('Proxy error: ' + e.message);
  });
  
  if (clientReq.body) {
    proxyReq.write(clientReq.body);
  }
  clientReq.pipe(proxyReq);
}

// 启动代理服务
const server = app.listen(PROXY_PORT, () => {
  console.log(`Proxy running on port ${PROXY_PORT}, forwarding to Steedos :${STEEDOS_PORT}`);
  console.log(`Use http://localhost:${PROXY_PORT} instead of http://localhost:${STEEDOS_PORT}`);
});

process.on('SIGINT', () => {
  server.close();
  process.exit();
});
