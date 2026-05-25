/** 验证 schema API 用 cookie */
const h = require('http');
const BASE = 'http://localhost:5100';
(async () => {
  const b = JSON.stringify({ username: '1134097444@qq.com', password: '123456' });
  const L = await new Promise(r => {
    const q = h.request(BASE + '/api/v6/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, s => {
      let d = '';
      s.on('data', c => d += c);
      s.on('end', () => r({ h: s.headers, b: JSON.parse(d).access_token }));
    });
    q.write(b);
    q.end();
  });
  const ck = L.h['set-cookie'].join('; ');

  const eps = [
    '/api/v6/pages/schema/object?app=mes&objectName=mes_tasks',
    '/api/v6/pages/schema/object?app=mes&objectName=mes_work_orders',
    '/api/v6/pages/schema/app?app=mes&pageId=mes_tasks',
    '/api/v6/pages/schema/app?app=mes&pageId=mes_home',
  ];
  for (const ep of eps) {
    const r = await new Promise(r2 => {
      h.get(BASE + ep, { headers: { Cookie: ck } }, s => {
        let d = '';
        s.on('data', c => d += c);
        s.on('end', () => r2({ s: s.statusCode, b: d.slice(0, 400) }));
      }).on('error', e => r2({ e: e.message }));
    });
    const hasData = r.b && r.b.length > 10 && !r.b.includes('not found');
    console.log(`${r.s} ${hasData ? '✅' : '❌'} ${ep.split('?')[0].split('/').pop()}: ${r.b ? r.b.slice(0, 100) : r.e}`);
  }
  console.log('\nDone');
})();
