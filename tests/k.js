/**
 * 深入学习 U8 核心表结构
 */
const sql = require('mssql');
const CFG = { server: '192.168.1.21', database: 'UFDATA_006_2025', user: 'rd01', password: 'triowin', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 120000 };

const KEY_TABLES = [
  // 生产订单
  'mom_order', 'mom_orderdetail',
  // 工艺
  'sfc_prouting', 'sfc_proutingdetail', 'sfc_operation', 'sfc_workcenter',
  // 物料
  'Inventory',
  // BOM
  'bom_bom', 'bom_opcomponent', 'bom_parent',
  // 库存
  'CurrentStock',
  // 生产执行
  'sfc_morouting', 'sfc_moroutingdetail', 'sfc_optransform',
  // 财务
  'GL_accvouch',
  // 收发存
  'RdRecord', 'RdRecords',
  // 销售
  'DispatchList', 'DispatchLists',
  // 基础
  'Department', 'Person',
];

(async () => {
  const conn = await sql.connect(CFG);
  console.log('=== U8 核心表列结构 ===\n');

  for (const tbl of KEY_TABLES) {
    try {
      const cols = await conn.query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${tbl}'
        ORDER BY ORDINAL_POSITION
      `);
      const rc = await conn.query(`SELECT COUNT(*) AS cnt FROM ${tbl}`);

      console.log(`\n## ${tbl} (${String(rc.recordset[0].cnt).padStart(8)} 行, ${cols.recordset.length} 列)`);
      for (const c of cols.recordset) {
        const nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const len = c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH})` : '';
        console.log(`  ${(c.COLUMN_NAME || '').padEnd(30)} ${(c.DATA_TYPE + len).padEnd(20)} ${nullable}`);
      }
    } catch(e) {
      console.log(`\n## ${tbl} — ERROR: ${e.message.slice(0, 100)}`);
    }
  }

  await conn.close();
  console.log('\nDone.');
})().catch(e => console.log('❌ ' + e.message.slice(0, 300)));
