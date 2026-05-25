/**
 * 运行时补丁: 让 /service/api/@objectName/uiSchema 返回 MongoDB 数据
 * 通过将数据写入缓存来绕过服务注册问题
 */
const http = require('http');
const { MongoClient } = require('mongodb');

const BASE = 'http://localhost:5100';

async function login() {
  const b = JSON.stringify({ username: '1134097444@qq.com', password: '123456' });
  return new Promise(r => {
    const q = http.request(BASE + '/api/v6/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, s => {
      let d = ''; s.on('data', c => d += c); s.on('end', () => {
        try { r({ token: JSON.parse(d).access_token, cookie: s.headers['set-cookie'].join('; ') }); } catch (e) { r({ error: e.message }); }
      });
    });
    q.write(b); q.end();
  });
}

async function api(method, path, token, body) {
  const headers = { 'Authorization': 'Bearer ' + token };
  if (body) headers['Content-Type'] = 'application/json';
  return new Promise(r => {
    const q = http.request(BASE + path, { method, headers }, s => {
      let d = ''; s.on('data', c => d += c); s.on('end', () => r({ status: s.statusCode, body: d.slice(0, 500) }));
    });
    if (body) q.write(typeof body === 'string' ? body : JSON.stringify(body));
    q.end();
  });
}

(async () => {
  const auth = await login();
  if (!auth.token) { console.log('Login failed:', auth.error); return; }
  console.log('Logged in\n');

  // 读取 MongoDB 中的对象定义
  const mc = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = mc.db('steedos_mes');

  const objects = await db.collection('objects').find({ name: /^mes_/ }).toArray();
  const fields = await db.collection('object_fields').find({ object_name: /^mes_/ }).toArray();
  const lvs = await db.collection('object_listviews').find({ object: /^mes_/ }).toArray();

  // 构建 fields 映射
  const fieldMap = {};
  for (const f of fields) {
    if (!fieldMap[f.object_name]) fieldMap[f.object_name] = {};
    const { _id, object_name, space, ...rest } = f;
    fieldMap[f.object_name][f.name] = rest;
  }

  // 构建 listview 映射
  const lvMap = {};
  for (const lv of lvs) {
    if (!lvMap[lv.object]) lvMap[lv.object] = {};
    const { _id, object, space, ...rest } = lv;
    lvMap[lv.object][lv.name] = rest;
  }

  // 尝试通过 API 将对象 schema 注册到 Steedos 缓存
  // Steedos 内部使用 getObject 来获取对象定义
  // 我们可以通过直接更新 objects 集合来让 getObject 读取到
  
  let success = 0;
  let fail = 0;

  for (const obj of objects) {
    // 构建完整的 uiSchema
    const uiSchema = {
      ...obj,
      fields: fieldMap[obj.name] || {},
      list_views: lvMap[obj.name] || {},
    };

    // 尝试通过 REST API 写入 ui_schema 缓存
    // 有些 Steedos 版本支持通过 object_ui_schemas 集合存储
    try {
      await db.collection('object_ui_schemas').updateOne(
        { name: obj.name },
        { $set: { name: obj.name, uiSchema: uiSchema, modified: new Date() } },
        { upsert: true }
      );
      success++;
    } catch (e) {
      fail++;
    }
  }

  console.log(`Written ${success} object_ui_schemas (${fail} failed)`);

  // 验证: 尝试获取 uiSchema
  const test = await api('GET', '/service/api/@mes_work_orders/uiSchema', auth.token);
  console.log('\nTest uiSchema:', test.status, test.body.slice(0, 100));

  await mc.close();
  console.log('\nDone');
})();
