/**
 * 同步 U8 生产订单明细视图到 Steedos（30条样例）
 * v_mom_orderdetail_ProcColMoIn → mes_work_orders
 * 使用已有字段存储翻译后的人话数据
 */
const sql = require('mssql');
const http = require('http');

const U8 = {
  server: '192.168.1.21', database: 'UFDATA_006_2025',
  user: 'rd01', password: 'triowin',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 60000
};

const BASE = 'http://localhost:5100';
let TOKEN = null;

function api(method, path, data) {
  return new Promise(async (resolve, reject) => {
    if (!TOKEN) {
      const b = JSON.stringify({ username: '1134097444@qq.com', password: '123456' });
      const r = await new Promise(r2 => {
        const q = http.request(BASE + '/api/v6/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
        }, s => { let d = ''; s.on('data', c => d += c); s.on('end', () => r2({ s: s.statusCode, b: d, h: s.headers })); });
        q.write(b); q.end();
      });
      TOKEN = JSON.parse(r.b).access_token;
    }
    const body = data ? JSON.stringify(data) : null;
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN };
    if (body) h['Content-Length'] = Buffer.byteLength(body);
    const req = http.request(BASE + path, { method, headers: h }, s => {
      let d = ''; s.on('data', c => d += c);
      s.on('end', () => {
        if (s.statusCode >= 400) reject(new Error(s.statusCode + ' ' + d.slice(0, 200)));
        else resolve(JSON.parse(d));
      });
    });
    req.on('error', reject); if (body) req.write(body); req.end();
  });
}

function statusCN(code) {
  const m = { 0: '草稿', 1: '已审核', 2: '执行中', 3: '已下达', 4: '已关闭', 5: '已取消' };
  return m[code] || ('状态' + code);
}

(async () => {
  console.log('=== 同步 U8 生产订单明细（30条） ===\n');

  await sql.connect(U8);
  const r = await sql.query(`
    SELECT TOP 30
      v.MoCode, v.InvCode, v.InvName,
      v.Qty, v.SoCode,
      c.cCusName AS CustomerName,
      v.DeptName, v.OpDesc, v.WhName,
      v.Status, v.Remark,
      v.Define28 AS PersonInCharge,
      v.StartDate, v.DueDate
    FROM v_mom_orderdetail_ProcColMoIn v
    LEFT JOIN SO_SOMain s ON v.SoCode = s.csocode
    LEFT JOIN Customer c ON s.cCusCode = c.cCusCode
    ORDER BY v.MoCode
  `);

  console.log(`U8 返回 ${r.recordset.length} 条\n`);

  let ok = 0;
  for (let i = 0; i < r.recordset.length; i++) {
    const row = r.recordset[i];
    const cnName = row.InvName || row.MoCode;
    const payload = {
      name: cnName.slice(0, 60),
      order_number: row.MoCode,
      status: statusCN(row.Status),
      quantity: row.Qty || 0,
      planned_qty: row.Qty || 0,
      description: `客户:${row.CustomerName || '-'} | 部门:${row.DeptName || '-'} | 工序:${row.OpDesc || '-'} | 仓库:${row.WhName || '-'} | 负责人:${row.PersonInCharge || '-'} | ${row.Remark || ''}`.slice(0, 255),
      // 利用已有字段存关键人话信息
      planned_start_date: row.StartDate || null,
      planned_end_date: row.DueDate || null,
      uf_mo_code: row.MoCode,
      uf_so_code: row.SoCode,
    };
    try {
      await api('POST', '/api/v6/data/mes_work_orders', payload);
      ok++;
      console.log(`  ${(i + 1).toString().padStart(2)}. ${cnName.slice(0, 20).padEnd(20)} ${statusCN(row.Status).padEnd(6)} ${row.Qty}件  客户:${(row.CustomerName || '-').slice(0, 20)}`);
    } catch (e) {
      console.log(`  ✗ ${e.message.slice(0, 80)}`);
    }
  }

  console.log(`\n✅ 写入 ${ok}/${r.recordset.length} 条`);
  console.log('   刷新 http://localhost:5173 查看工单列表');

  await sql.close();
})();
