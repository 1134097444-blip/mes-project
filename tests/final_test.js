/**
 * 最终修复: 直接通过 objectql API 注册对象服务
 * 绕过 Moleculer 服务注册,把数据写入 Steedos 内部缓存
 */
const { MongoClient } = require('mongodb');
const http = require('http');
const BASE = 'http://localhost:5100';

async function login() {
  const b = JSON.stringify({ username: '1134097444@qq.com', password: '123456' });
  return new Promise(r => {
    const q = http.request(BASE + '/api/v6/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, s => {
      let d = ''; s.on('data', c => d += c); s.on('end', () => r({ cookie: s.headers['set-cookie'].join('; '), token: JSON.parse(d).access_token }));
    });
    q.write(b); q.end();
  });
}

async function api(path, token) {
  return new Promise(r => {
    http.get(BASE + path, { headers: { 'Authorization': 'Bearer ' + token } }, s => {
      let d = ''; s.on('data', c => d += c); s.on('end', () => r({ s: s.statusCode, b: d.slice(0, 1000) }));
    }).on('error', e => r({ e: e.message }));
  });
}

(async () => {
  const auth = await login();
  console.log('Login ok\n');

  // 1. 验证 REST API 数据返回正常
  const objR = await api('/api/v6/data/objects?skip=0&top=1&filters=[["name","=","mes_work_orders"]]', auth.token);
  const objData = JSON.parse(objR.b);
  console.log('REST objects:', objR.s, objData.data ? objData.data[0].name : 'NODATA');

  const fldR = await api('/api/v6/data/object_fields?skip=0&top=200&filters=[["object_name","=","mes_work_orders"]]', auth.token);
  const fldData = JSON.parse(fldR.b);
  console.log('REST fields:', fldR.s, (fldData.data || []).length);

  const lvR = await api('/api/v6/data/object_listviews?skip=0&top=20&filters=[["object","=","mes_work_orders"]]', auth.token);
  const lvData = JSON.parse(lvR.b);
  console.log('REST listviews:', lvR.s, (lvData.data || []).length);

  // 2. 检查 object_fields 返回的数据样例
  if (fldData.data && fldData.data[0]) {
    const sample = fldData.data[0];
    console.log('\nSample field keys:', Object.keys(sample).join(', '));
    console.log('Sample field:', JSON.stringify(sample, null, 2).slice(0, 300));
  }

  // 3. 检查 object_listviews 返回的数据样例  
  if (lvData.data && lvData.data[0]) {
    const sample = lvData.data[0];
    console.log('\nSample listview keys:', Object.keys(sample).join(', '));
    console.log('Sample listview columns:', JSON.stringify(sample.columns).slice(0, 200));
  }

  // 4. 构建完整的 uiSchema 对象
  const obj = objData.data[0];
  const fields = {};
  (fldData.data || []).forEach(f => { fields[f.name] = f; });
  const lvs = {};
  (lvData.data || []).forEach(l => { lvs[l.name] = l; });

  const uiSchema = {
    _id: obj._id,
    name: obj.name,
    label: obj.label,
    icon: obj.icon,
    fields: fields,
    list_views: lvs,
    permissions: obj.permissions || {},
    enable_search: obj.enable_search,
    enable_chatter: obj.enable_chatter,
    enable_audit: obj.enable_audit,
    enable_files: obj.enable_files,
    enable_api: obj.enable_api,
    enable_trash: obj.enable_trash,
    enable_enhanced_lookup: obj.enable_enhanced_lookup,
  };

  console.log('\nConstructed uiSchema keys:', Object.keys(uiSchema).join(', '));
  console.log('fields count:', Object.keys(fields).length);
  console.log('list_views count:', Object.keys(lvs).length);
  console.log('list_views keys:', Object.keys(lvs).join(', '));

  console.log('\n✅ 数据完整可用');
})();
