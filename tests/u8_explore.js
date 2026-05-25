/**
 * U8 数据库全景探索
 * 连接 UFDATA_006_2025，输出所有业务表、视图、关键列
 */
const sql = require('mssql');
const CFG = { server: '192.168.1.21', database: 'UFDATA_006_2025', user: 'rd01', password: 'triowin', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 120000 };

(async () => {
  const conn = await sql.connect(CFG);
  console.log('✅ Connected to UFDATA_006_2025\n');

  // 1. 所有 MES 相关表
  const tables = await conn.query(`SELECT TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`);
  const mesTables = tables.recordset.filter(t =>
    /^(sfc_|mom_|bom_|inventory|currentstock|dispatch|rdrecord|department|person|so_|po_|gl_|ua_|v_)/i.test(t.TABLE_NAME)
  );
  console.log('=== 业务相关表 (' + mesTables.length + '/' + tables.recordset.length + ') ===');
  for (const t of mesTables) {
    const rc = await conn.query(`SELECT COUNT(*) AS cnt FROM ${t.TABLE_NAME}`);
    console.log(`  ${(t.TABLE_NAME || '').padEnd(35)} ${String(rc.recordset[0].cnt).padStart(8)} 行`);
  }

  // 2. 视图
  const views = await conn.query(`SELECT TABLE_NAME, VIEW_DEFINITION FROM INFORMATION_SCHEMA.VIEWS ORDER BY TABLE_NAME`);
  console.log('\n=== 全部视图 (' + views.recordset.length + ') ===');
  for (const v of views.recordset) {
    const def = (v.VIEW_DEFINITION || '').replace(/\s+/g, ' ').slice(0, 120);
    console.log(`  ${(v.TABLE_NAME || '').padEnd(35)} ${def}`);
  }

  await conn.close();
  console.log('\nDone.');
})().catch(e => console.log('❌ ' + e.message.slice(0, 300)));
