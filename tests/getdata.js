const sql = require('mssql');
(async() => {
  await sql.connect({
    server: '192.168.1.21', database: 'UFDATA_006_2025',
    user: 'rd01', password: 'triowin',
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 120000
  });
  const op = await sql.query(`SELECT OperationId, OpCode, Description FROM sfc_operation ORDER BY OpCode`);
  console.log('=== sfc_operation (85 工序) ===');
  op.recordset.forEach(r => console.log(`  ${r.OpCode.padEnd(10)} ${r.Description||''}`));
  const wc = await sql.query(`SELECT WcCode, WcName FROM sfc_workcenter ORDER BY WcCode`);
  console.log('\n=== sfc_workcenter (84 工作中心) ===');
  wc.recordset.forEach(r => console.log(`  ${r.WcCode.padEnd(10)} ${r.WcName||''}`));
  const rd = await sql.query(`SELECT TOP 3 rd.PRoutingId, rd.OpSeq, rd.OperationId, op.Description as OpName, rd.WcId, wc.WcName, rd.SubFlag FROM sfc_proutingdetail rd LEFT JOIN sfc_operation op ON rd.OperationId=op.OperationId LEFT JOIN sfc_workcenter wc ON rd.WcId=wc.WcId ORDER BY rd.PRoutingId, rd.OpSeq`);
  console.log('\n=== 工艺路线工序样例 ===');
  rd.recordset.forEach(r => console.log(`  PRouting:${r.PRoutingId} OpSeq:${r.OpSeq} ${r.OpName||''} Wc:${r.WcName||''} Sub:${r.SubFlag}`));
  await sql.close();
})();
