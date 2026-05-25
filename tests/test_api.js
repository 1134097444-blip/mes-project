/**
 * 追踪 schema API 错误
 */
const http = require('http');
const BASE = 'http://localhost:5100';
(async () => {
  // Login
  const lb = JSON.stringify({ username: '1134097444@qq.com', password: '123456' });
  const lr = await new Promise(r => {
    const req = http.request(BASE + '/api/v6/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(lb) } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r({ h: res.headers, b: d }));
    });
    req.write(lb); req.end();
  });
  const cookie = lr.h['set-cookie'].join('; ');

  // Test all schema-related endpoints
  const endpoints = [
    '/api/v6/pages/schema/object?app=mes&objectName=mes_tasks',
    '/api/v6/pages/schema/object?app=mes&objectName=mes_work_orders',
    '/api/v6/pages/schema/app?app=mes&pageId=mes_tasks',
    '/api/v6/ui-schema/object/mes_tasks',
    '/api/v6/object_schema/mes_tasks',
  ];

  for (const ep of endpoints) {
    const r = await new Promise(r2 => {
      http.get(BASE + ep, { headers: { Cookie: cookie } }, res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => r2({ s: res.statusCode, b: d.slice(0, 300) }));
      }).on('error', e => r2({ e: e.message }));
    });
    console.log(`${ep}\n  ${r.s || r.e}: ${r.b || ''}\n`);
  }
})();
