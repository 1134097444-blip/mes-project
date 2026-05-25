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
    const req = http.request(BASE + p, { method: m, headers: h }, s => { let d2 = ''; s.on('data', c => d2 += c); s.on('end', () => { if (s.statusCode >= 400) reject(new Error(s.statusCode + ' ' + d2.slice(0, 200))); else resolve(JSON.parse(d2)); }); });
    req.on('error', reject); if (body) req.write(body); req.end();
  });
}
(async () => {
  console.log('=== Sync Inventory (CurrentStock) from U8 ===\n');
  await sql.connect(U8);
  const r = await sql.query("SELECT i.cInvCode, cs.iQuantity, cs.cWhCode, cs.iLowQty, cs.iHighQty FROM CurrentStock cs JOIN Inventory i ON cs.cInvCode=i.cInvCode WHERE cs.iQuantity > 0");
  console.log('Total stock records:', r.recordset.length);
  const existing = await api('GET', '/api/v6/data/mes_inventory?skip=0&top=5000');
  const mapped = {};
  (existing.data || []).forEach(s => { const k = s.uf_inv_code + '|' + (s.location||''); mapped[k] = s; });
  console.log('Existing in MES:', Object.keys(mapped).length);
  let c = 0, u = 0;
  for (const s of r.recordset) {
    const k = s.cInvCode + '|' + (s.cWhCode || '');
    const payload = { name: s.cInvCode + '@' + (s.cWhCode||''), material: '', quantity: s.iQuantity || 0, location: s.cWhCode || '', min_qty: s.iLowQty || 0, max_qty: s.iHighQty || 0, uf_inv_code: s.cInvCode };
    if (mapped[k]) { await api('PATCH', '/api/v6/data/mes_inventory/' + mapped[k]._id, payload); u++; }
    else { await api('POST', '/api/v6/data/mes_inventory', payload); c++; }
    if ((c + u) % 200 === 0) console.log('  Progress:', c, 'created,', u, 'updated');
  }
  console.log('\nDone:', c, 'created,', u, 'updated');
  await sql.close();
})();
