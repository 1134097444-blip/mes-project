/**
 * 深入学习：销售/采购/库存/凭证表
 */
const sql = require('mssql');
const CFG = { server: '192.168.1.21', database: 'UFDATA_006_2025', user: 'rd01', password: 'triowin', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 180000 };

const TABLES = [
  // 销售
  'SO_SOMain', 'SO_SODetails',
  // 采购
  'PO_POMain', 'PO_PODetails',
  // 收发存主表
  'RdRecord', 'RdRecords',
  // 凭证
  'GL_accvouch',
  // 存货档案
  'InventorySub', 'InventoryClass',
  // 仓库
  'Warehouse', 'Customer', 'Vendor',
  // 科目
  'Code', 'GL_CodeRemark',
];

(async () => {
  const conn = await sql.connect(CFG);
  console.log('=== 第2批核心表 ===\n');

  for (const tbl of TABLES) {
    try {
      const exists = await conn.query(`SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='${tbl}'`);
      if (exists.recordset[0].cnt === 0) {
        console.log(`\n## ${tbl} — ❌ 表不存在`);
        continue;
      }
      const cols = await conn.query(`SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${tbl}' ORDER BY ORDINAL_POSITION`);
      const rc = await conn.query(`SELECT COUNT(*) AS cnt FROM ${tbl}`);
      console.log(`\n## ${tbl} (${String(rc.recordset[0].cnt).padStart(8)} 行, ${cols.recordset.length} 列)`);
      // 只显示前25列（关键列），后面的略过自定义字段
      const showCols = cols.recordset.slice(0, 25);
      const hidden = cols.recordset.length - 25;
      for (const c of showCols) {
        const nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const len = c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH})` : '';
        console.log(`  ${(c.COLUMN_NAME || '').padEnd(30)} ${(c.DATA_TYPE + len).padEnd(20)} ${nullable}`);
      }
      if (hidden > 0) console.log(`  ... 还有 ${hidden} 列`);
    } catch(e) {
      console.log(`\n## ${tbl} — ERROR: ${e.message.slice(0, 100)}`);
    }
  }

  await conn.close();
  console.log('\nDone.');
})().catch(e => console.log('❌ ' + e.message.slice(0, 300)));
