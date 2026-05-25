/**
 * 探索 U8 数据库：产品生命周期相关表
 * 项目创建 → 销售订单 → 生产执行 → 质量检验 → 入库交付
 */
const sql = require('mssql');
const cfg = {
  server: '192.168.1.21', database: 'UFDATA_006_2025',
  user: 'rd01', password: 'triowin',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 60000
};

(async () => {
  await sql.connect(cfg);

  // 1. 查找与产品/项目生命周期相关的表
  const keywords = ['Project', '项目', 'SO_SO', 'SaleOrder', 'Dispatch', '发货', 'Delivery',
    'Contract', '合同', 'Product', '产品', '完工', '入库', 'Inventory',
    'v_mom', 'mom_', 'CurrentStock', 'RdRecord'];
  
  console.log('=== 1. 相关表查询 ===');
  for (const kw of keywords) {
    try {
      const r = await sql.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME LIKE '%${kw}%'
      `);
      if (r.recordset.length > 0) {
        console.log(`\n--- ${kw} (${r.recordset.length} 张) ---`);
        r.recordset.slice(0, 15).forEach(t => console.log(`  ${t.TABLE_NAME}`));
        if (r.recordset.length > 15) console.log(`  ... 还有 ${r.recordset.length - 15} 张`);
      }
    } catch(e) {}
  }

  // 2. 关键表结构探查
  const keyTables = [
    'SO_SOMain',     // 销售订单主表
    'SO_SODetails',  // 销售订单明细
    'Customer',      // 客户
    'Department',    // 部门
    'Inventory',     // 物料
    'mom_order',     // 生产订单
    'mom_orderdetail',
    'CurrentStock',  // 现存量
    'RdRecords',     // 出入库记录
    'RdRecord',      // 出入库主表
    'DispatchList',  // 发货单
    'DispatchLists', // 发货单明细
  ];

  console.log('\n\n=== 2. 关键表字段 ===');
  for (const tbl of keyTables) {
    try {
      const r = await sql.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tbl}'
        ORDER BY ORDINAL_POSITION
      `);
      if (r.recordset.length > 0) {
        const rowCount = await sql.query(`SELECT COUNT(*) as n FROM ${tbl}`);
        console.log(`\n--- ${tbl} (${r.recordset.length} 列, ${rowCount.recordset[0].n} 行) ---`);
        r.recordset.slice(0, 12).forEach(c => 
          console.log(`  ${c.COLUMN_NAME.padEnd(30)} ${c.DATA_TYPE.padEnd(12)} ${c.CHARACTER_MAXIMUM_LENGTH ? '('+c.CHARACTER_MAXIMUM_LENGTH+')' : ''}`)
        );
        if (r.recordset.length > 12) console.log(`  ... 还有 ${r.recordset.length - 12} 列`);
        // 前3行样例
        const sample = await sql.query(`SELECT TOP 3 * FROM ${tbl}`);
        console.log(`  样例数据:`);
        const cols = Object.keys(sample.recordset[0] || {}).slice(0, 8);
        sample.recordset.forEach((row, i) => {
          const vals = cols.map(c => (row[c] ?? '').toString().slice(0, 20)).join(' | ');
          console.log(`  [${i+1}] ${vals}`);
        });
      } else {
        console.log(`\n--- ${tbl} (不存在) ---`);
      }
    } catch(e) {
      console.log(`\n--- ${tbl} (错误: ${e.message.slice(0,60)}) ---`);
    }
  }

  // 3. 生产订单的状态分布
  console.log('\n\n=== 3. 生产订单状态分布 ===');
  try {
    const st = await sql.query('SELECT Status, COUNT(*) as n FROM mom_order GROUP BY Status ORDER BY Status');
    console.log('  Status -> 数量');
    st.recordset.forEach(r => console.log(`  ${r.Status} -> ${r.n}`));
  } catch(e) { console.log('  mom_order 查询失败:', e.message.slice(0,60)); }

  // 4. 销售订单状态分布
  console.log('\n=== 4. 销售订单状态分布 ===');
  try {
    const cs = await sql.query('SELECT TOP 10 cState, COUNT(*) as n FROM SO_SOMain GROUP BY cState ORDER BY COUNT(*) DESC');
    console.log('  cState -> 数量');
    cs.recordset.forEach(r => console.log(`  ${r.cState} -> ${r.n}`));
  } catch(e) { console.log('  查询失败:', e.message.slice(0,60)); }

  // 5. 完工入库相关
  console.log('\n=== 5. 完工入库/发货相关 ===');
  try {
    const rd = await sql.query(`
      SELECT TOP 5 r.cVouchType, COUNT(*) as cnt
      FROM RdRecord r GROUP BY r.cVouchType ORDER BY COUNT(*) DESC
    `);
    console.log('  单据类型分布');
    rd.recordset.forEach(r => console.log(`  ${r.cVouchType} -> ${r.cnt}`));
  } catch(e) { console.log('  查询失败:', e.message.slice(0,60)); }

  await sql.close();
  console.log('\n=== 探库完成 ===');
})();
