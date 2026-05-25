/**
 * 探库 Part 2：更精确的产品链相关表结构
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

  // 1. mom_order 的列名（看状态在哪里）
  console.log('=== mom_order 全部列 ===');
  const moCols = await sql.query(`
    SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'mom_order' ORDER BY ORDINAL_POSITION
  `);
  moCols.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME.padEnd(25)} ${c.DATA_TYPE}`));

  // 2. SO_SOMain 的列
  console.log('\n=== SO_SOMain 关键列 ===');
  const soCols = await sql.query(`
    SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'SO_SOMain' AND (
      COLUMN_NAME LIKE '%Stat%' OR COLUMN_NAME LIKE '%State%'
      OR COLUMN_NAME LIKE '%Clos%' OR COLUMN_NAME LIKE '%Verif%'
      OR COLUMN_NAME LIKE '%Flag%'
    ) ORDER BY ORDINAL_POSITION
  `);
  soCols.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME.padEnd(25)} ${c.DATA_TYPE}`));
  // 前5行看状态值
  const soSample = await sql.query('SELECT TOP 5 cSOCode, cCusCode, dDate, cCloser, cVerifier, cMaker FROM SO_SOMain');
  console.log('  样例:');
  soSample.recordset.forEach(r => console.log(`  ${r.cSOCode} ${r.dDate||''} ${r.cCusCode||''} 制单:${r.cMaker||''} 审核:${r.cVerifier||''} 关闭:${r.cCloser||''}`));

  // 3. 项目表
  console.log('\n=== 项目相关表探针 ===');
  const projTables = ['ATP_ProjectMain', 'CM_ProjectClass', 'CM_ProjectContrastRelation', 'crp_planproject'];
  for (const tbl of projTables) {
    try {
      const r = await sql.query(`
        SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tbl}' ORDER BY ORDINAL_POSITION
      `);
      const cnt = await sql.query(`SELECT COUNT(*) as n FROM ${tbl}`);
      console.log(`\n--- ${tbl} (${cnt.recordset[0].n} 行, ${r.recordset.length} 列) ---`);
      r.recordset.slice(0, 8).forEach(c => console.log(`  ${c.COLUMN_NAME.padEnd(25)} ${c.DATA_TYPE}`));
      if (r.recordset.length > 8) console.log(`  ... 还有 ${r.recordset.length-8} 列`);
      const s = await sql.query(`SELECT TOP 2 * FROM ${tbl}`);
      const cols = Object.keys(s.recordset[0] || {}).slice(0, 6);
      s.recordset.forEach((row, i) => {
        const vals = cols.map(c => (row[c] ?? '').toString().slice(0, 25)).join(' | ');
        console.log(`  [${i+1}] ${vals}`);
      });
    } catch(e) { console.log(`  ${tbl}: ${e.message.slice(0,60)}`); }
  }

  // 4. 客户 + 销售订单 + 物料关联链
  console.log('\n=== 客户-销售-物料-生产 关联链 ===');
  // SO_SOMain 与 Customer 关联
  const link = await sql.query(`
    SELECT TOP 8 s.cSOCode, s.dDate, c.cCusName, s.cPersonCode, s.cDepCode
    FROM SO_SOMain s 
    LEFT JOIN Customer c ON s.cCusCode = c.cCusCode
    ORDER BY s.dDate DESC
  `);
  console.log('  最近销售订单:');
  link.recordset.forEach(r => console.log(`  ${r.cSOCode} ${r.dDate||''} ${(r.cCusName||'').slice(0,20)} 业务员:${r.cPersonCode||''} 部门:${r.cDepCode||''}`));

  // 5. 视图 v_mom_orderdetail_ProcColMoIn 结构
  console.log('\n=== v_mom_orderdetail_ProcColMoIn 视图列 ===');
  try {
    const vCols = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'v_mom_orderdetail_ProcColMoIn' ORDER BY ORDINAL_POSITION
    `);
    console.log(`  ${vCols.recordset.length} 列`);
    vCols.recordset.slice(0, 20).forEach(c => console.log(`  ${c.COLUMN_NAME.padEnd(30)} ${c.DATA_TYPE}`));
    if (vCols.recordset.length > 20) console.log(`  ... 还有 ${vCols.recordset.length-20} 列`);
  } catch(e) { console.log(`  视图错误: ${e.message.slice(0,60)}`); }

  // 6. DispatchList 的订单号关联
  console.log('\n=== DispatchList 发货单关联 ===');
  const dlSample = await sql.query(`
    SELECT TOP 5 cDLCode, dDate, cSOCode, cCusCode, cPersonCode, cDepCode
    FROM DispatchList ORDER BY dDate DESC
  `);
  dlSample.recordset.forEach(r => console.log(`  ${r.cDLCode} ${r.dDate||''} 订单:${r.cSOCode||''} 客户:${(r.cCusCode||'').slice(0,15)}`));

  // 7. 查看是否有品牌/产品系列表
  console.log('\n=== 产品/物料分类 ===');
  const invClass = await sql.query('SELECT TOP 10 cInvCCode, cInvCName FROM InventoryClass ORDER BY cInvCCode');
  invClass.recordset.forEach(r => console.log(`  ${r.cInvCCode} ${r.cInvCName}`));

  await sql.close();
  console.log('\n=== 探库完成 ===');
})();
