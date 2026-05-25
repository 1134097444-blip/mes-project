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
  console.log('=== Sync Operations from U8 ===\n');
  await sql.connect(U8);
  const ops = await sql.query('SELECT OperationId, OpCode, Description, WcId FROM sfc_operation ORDER BY OpCode');
  console.log('Total operations in U8:', ops.recordset.length);

  const existing = await api('GET', '/api/v6/data/mes_operations?skip=0&top=2000');
  const map = {};
  (existing.data || []).forEach(o => { if (o.uf_operation_id) map[o.uf_operation_id] = o; });
  console.log('Existing in MES:', Object.keys(map).length);

  let c = 0, u = 0;
  for (const op of ops.recordset) {
    const ufId = String(op.OperationId);
    const payload = {
      name: (op.Description || op.OpCode).slice(0, 40),
      operation_code: op.OpCode,
      description: op.Description || '',
      uf_operation_id: ufId,
      sequence_no: 0
    };
    if (map[ufId]) { await api('PATCH', '/api/v6/data/mes_operations/' + map[ufId]._id, payload); u++; }
    else { await api('POST', '/api/v6/data/mes_operations', payload); c++; }
    if ((c + u) % 20 === 0) console.log('  Progress:', c, 'created,', u, 'updated');
  }
  console.log('\nDone:', c, 'created,', u, 'updated');
  await sql.close();
})();
