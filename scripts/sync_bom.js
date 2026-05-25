/**
 * 用友 U8 BOM → MES BOM 同步脚本
 * BOM_BOM + BOM_OPComponent → mes_bom_items
 * 
 * 用法: node scripts/sync_bom.js
 * 
 * 表映射:
 *   BOM_BOM.ParentInvCode  → mes_bom_items.product (通过 uf_inv_code)
 *   BOM_OPComponent.InvCode → mes_bom_items.component (通过 uf_inv_code)
 *   BOM_OPComponent.Qty     → mes_bom_items.quantity
 *   BOM_OPComponent.OpSeq   → mes_bom_items.op_seq
 *   BOM_BOM.EffDate         → mes_bom_items.effective_date
 */
const http = require('http');
const sql = require('mssql');

const U8 = {
  server: '192.168.1.21',
  database: 'UFDATA_006_2025',
  user: 'rd01',
  password: 'triowin',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 300000
};

const BASE = 'http://localhost:5100';
let TOKEN = null;

function api(method, path, data) {
  return new Promise(async (resolve, reject) => {
    if (!TOKEN) {
      const body = JSON.stringify({ username: '1134097444@qq.com', password: '123456' });
      const r = await new Promise(r2 => {
        const q = http.request(BASE + '/api/v6/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, s => { let d = ''; s.on('data', c => d += c); s.on('end', () => r2({ s: s.statusCode, b: d })); });
        q.write(body); q.end();
      });
      TOKEN = JSON.parse(r.b).access_token;
    }
    const body = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const req = http.request(BASE + path, { method, headers }, s => {
      let d = '';
      s.on('data', c => d += c);
      s.on('end', () => {
        if (s.statusCode >= 400) reject(new Error(`${method} ${path} ${s.statusCode} ${d.slice(0, 200)}`));
        else resolve(JSON.parse(d));
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  console.log('=== Sync BOM from U8 ===\n');

  // 1. 获取所有有效物料 (uf_inv_code → _id 映射)
  console.log('Loading existing materials...');
  const materials = await api('GET', '/api/v6/data/mes_materials?skip=0&top=5000&fields=_id,uf_inv_code');
  const matMap = {};
  (materials.data || []).forEach(m => {
    if (m.uf_inv_code) matMap[m.uf_inv_code] = m._id;
  });
  console.log(`  ${Object.keys(matMap).length} materials loaded`);

  // 2. 获取现有 BOM (用于去重更新)
  console.log('Loading existing BOM items...');
  const existingBom = await api('GET', '/api/v6/data/mes_bom_items?skip=0&top=5000&fields=_id,uf_bom_key');
  const bomMap = {};
  (existingBom.data || []).forEach(b => {
    if (b.uf_bom_key) bomMap[b.uf_bom_key] = b._id;
  });
  console.log(`  ${Object.keys(bomMap).length} existing BOM items`);

  // 3. 从 U8 查询 BOM_BOM + BOM_OPComponent
  console.log('\nQuerying U8 BOM data...');
  await sql.connect(U8);

  // 尝试表名: BOM_OPComponent 或 BOM_OPComponents
  let bomTable = null;
  try {
    const tables = await sql.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%BOM%Component%'");
    console.log('  Found BOM tables:', tables.recordset.map(t => t.TABLE_NAME).join(', '));
    if (tables.recordset.length > 0) {
      bomTable = tables.recordset[0].TABLE_NAME;
    }
  } catch (e) {
    console.log('  Table query error:', e.message);
  }

  if (!bomTable) {
    console.log('  Trying common table names...');
    for (const tbl of ['BOM_OPComponent', 'BOM_OPComponents', 'bom_opcomponent', 'bom_opcomponents']) {
      try {
        const r = await sql.query(`SELECT TOP 1 * FROM ${tbl}`);
        bomTable = tbl;
        console.log(`  Found: ${tbl}`);
        break;
      } catch (e) { /* try next */ }
    }
  }

  if (!bomTable) {
    console.log('ERROR: Could not find BOM subcomponent table');
    await sql.close();
    process.exit(1);
  }

  // 4. 查询 BOM 数据
  const bomData = await sql.query(`
    SELECT 
      b.BomId,
      b.ParentInvCode,
      c.InvCode,
      c.Qty,
      c.OpSeq,
      b.EffDate,
      b.Version
    FROM BOM_BOM b
    JOIN ${bomTable} c ON b.BomId = c.BomId
    WHERE b.EffDate IS NOT NULL
    ORDER BY b.ParentInvCode, c.OpSeq
  `);
  console.log(`  ${bomData.recordset.length} BOM records from U8`);

  // 5. 同步到 MES
  let created = 0, updated = 0, skipped = 0;
  let total = bomData.recordset.length;
  let batchNum = 0;

  for (const row of bomData.recordset) {
    const parentId = matMap[row.ParentInvCode];
    const compId = matMap[row.InvCode];

    if (!parentId || !compId) {
      skipped++;
      if (skipped % 1000 === 0) console.log(`  Skipped ${skipped} (missing material mapping)`);
      continue;
    }

    // 生成唯一键: parentInvCode|InvCode|OpSeq
    const key = `${row.ParentInvCode}|${row.InvCode}|${row.OpSeq || 0}`;

    const payload = {
      name: `${row.ParentInvCode} → ${row.InvCode}`,
      product: parentId,
      component: compId,
      quantity: row.Qty || 0,
      op_seq: row.OpSeq || 0,
      effective_date: row.EffDate,
      uf_bom_key: key
    };

    try {
      if (bomMap[key]) {
        await api('PATCH', `/api/v6/data/mes_bom_items/${bomMap[key]}`, payload);
        updated++;
      } else {
        await api('POST', '/api/v6/data/mes_bom_items', payload);
        created++;
      }
    } catch (e) {
      console.error(`  Error on ${key}: ${e.message.slice(0, 100)}`);
    }

    batchNum++;
    if (batchNum % 2000 === 0) {
      console.log(`  Progress: ${batchNum}/${total} (created: ${created}, updated: ${updated}, skipped: ${skipped})`);
    }
  }

  console.log(`\nDone: ${batchNum} total, ${created} created, ${updated} updated, ${skipped} skipped`);
  await sql.close();
})();
