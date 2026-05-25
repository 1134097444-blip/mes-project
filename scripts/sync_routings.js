const http = require('http');
const sql = require('mssql');
const U8 = { server: '192.168.1.21', database: 'UFDATA_006_2025', user: 'rd01', password: 'triowin', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 120000 };
const BASE = 'http://localhost:5100';
let TOKEN = null;
function api(m, p, d) {
  return new Promise(async (resolve, reject) => {
    if (!TOKEN) {
      const b = JSON.stringify({ username: '1134097444@qq.com', password: '123456' });
      const r = await new Promise(r2 => { const q = http.request(BASE + '/api/v6/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, s => { let d = ''; s.on('data', c => d += c); s.on('end', () => r2({ s: s.statusCode, b: d, h: s.headers })); }); q.write(b); q.end(); });
      TOKEN = JSON.parse(r.b).access_token;
    }
    const body = d ? JSON.stringify(d) : null;
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN };
    if (body) h['Content-Length'] = Buffer.byteLength(body);
    const req = http.request(BASE + p, { method: m, headers: h }, s => { let d2 = ''; s.on('data', c => d2 += c); s.on('end', () => { if (s.statusCode >= 400) { reject(new Error(m + ' ' + p + ' ' + s.statusCode + ' ' + d2.slice(0,100))); } else resolve(JSON.parse(d2)); }); });
    req.on('error', reject); if (body) req.write(body); req.end();
  });
}
(async () => {
  console.log('=== Sync Routings from U8 ===\n');
  await sql.connect(U8);
  // 只同步状态=3(已发布)的工艺路线，版本>0
  const r = await sql.query("SELECT PRoutingId, IdentCode, IdentDesc, Version, Status, VersionEffDate FROM sfc_prouting WHERE Status=3 ORDER BY PRoutingId");
  console.log('Released routings:', r.recordset.length);
  const existing = await api('GET', '/api/v6/data/mes_routings?skip=0&top=500');
  const mapped = {};
  (existing.data || []).forEach(rt => { if (rt.uf_prouting_id) mapped[rt.uf_prouting_id] = rt; });
  console.log('Existing in MES:', Object.keys(mapped).length);
  let c = 0, u = 0;
  for (const rt of r.recordset) {
    const ufId = String(rt.PRoutingId);
    const payload = { name: (rt.IdentDesc || rt.IdentCode || ('路线#' + rt.PRoutingId)).slice(0, 40), version: rt.Version || 1, routing_status: 'released', effective_date: rt.VersionEffDate, uf_prouting_id: ufId };
    try {
      if (mapped[ufId]) { await api('PATCH', '/api/v6/data/mes_routings/' + mapped[ufId]._id, payload); u++; }
      else { await api('POST', '/api/v6/data/mes_routings', payload); c++; }
    } catch(e) {
      console.error('  Error on', ufId, e.message.slice(0,100));
    }
    if ((c + u) % 50 === 0) console.log('  Progress:', c, 'created,', u, 'updated');
  }
  console.log('\nDone:', c, 'created,', u, 'updated');
  await sql.close();
})();
