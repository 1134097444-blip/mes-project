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
  console.log('=== Sync Work Centers from U8 ===\n');
  await sql.connect(U8);
  const result = await sql.query('SELECT WcId, WcCode, Description as WcName, DeptCode FROM sfc_workcenter ORDER BY WcCode');
  console.log('Total work centers in U8:', result.recordset.length);
  const existing = await api('GET', '/api/v6/data/mes_work_centers?skip=0&top=2000');
  const existingMap = {};
  (existing.data || []).forEach(wc => { if (wc.uf_wc_id) existingMap[wc.uf_wc_id] = wc; });
  console.log('Existing in MES:', Object.keys(existingMap).length);
  let c = 0, u = 0;
  for (const wc of result.recordset) {
    const ufId = String(wc.WcId);
    const payload = { name: (wc.WcName || wc.WcCode || '').slice(0, 40), wc_code: wc.WcCode, wc_name: wc.WcName || '', uf_wc_id: ufId, department: wc.DeptCode || '' };
    if (existingMap[ufId]) { await api('PATCH', '/api/v6/data/mes_work_centers/' + existingMap[ufId]._id, payload); u++; }
    else { await api('POST', '/api/v6/data/mes_work_centers', payload); c++; }
    if ((c + u) % 20 === 0) console.log('  Progress:', c, 'created,', u, 'updated');
  }
  console.log('\nDone:', c, 'created,', u, 'updated');
  await sql.close();
})();
