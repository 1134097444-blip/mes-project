/** 追踪 Object not found API */
const http = require('http');
const BASE = 'http://localhost:5100';

async function login() {
  const body = JSON.stringify({username:'1134097444@qq.com',password:'123456'});
  return new Promise(r => {
    const req = http.request(BASE+'/api/v6/auth/login',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}}, res => {
      let d='';res.on('data',c=>d+=c);res.on('end',()=>r(JSON.parse(d).access_token));
    });
    req.write(body);req.end();
  });
}

async function api(method, path, token) {
  return new Promise(r => {
    const req = http.request(BASE+path,{method,headers:{'Authorization':'Bearer '+token}}, res => {
      let d='';res.on('data',c=>d+=c);res.on('end',()=>r({s:res.statusCode,b:d.slice(0,500)}));
    });
    req.on('error',e=>r({e:e.message}));req.end();
  });
}

(async () => {
  const token = await login();
  console.log('Token obtained\n');

  // 1. 查询 object_fields API
  const r1 = await api('GET', '/api/v6/data/object_fields?skip=0&top=3&filters=[["object_name","=","mes_tasks"]]', token);
  console.log('1. object_fields query:', r1.s, r1.b.slice(0,200));

  // 2. 查询 objects API
  const r2 = await api('GET', '/api/v6/data/objects?skip=0&top=1&filters=[["name","=","mes_tasks"]]', token);
  console.log('\n2. objects query:', r2.s, r2.b.slice(0,200));

  // 3. 模拟前端获取对象 schema
  const r3 = await api('GET', '/api/v6/pages/schema/app?app=mes&pageId=mes_tasks', token);
  console.log('\n3. schema API:', r3.s, r3.b.slice(0,200));

  // 4. 模拟 UI schema 查询
  const r4 = await api('GET', '/api/v6/pages/schema/object?app=mes&objectName=mes_tasks', token);
  console.log('\n4. object schema API:', r4.s, r4.b.slice(0,200));

  // 5. 尝试列表视图 API
  const r5 = await api('GET', '/api/v6/data/object_listviews?skip=0&top=3&filters=[["object","=","mes_tasks"]]', token);
  console.log('\n5. listviews:', r5.s, r5.b.slice(0,200));
})();
