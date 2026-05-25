const sql = require('mssql');
(async()=>{
await sql.connect({server:'192.168.1.21',database:'UFDATA_006_2025',user:'rd01',password:'triowin',options:{encrypt:false,trustServerCertificate:true},requestTimeout:30000});

const mc = 'J251100140';
const rows = await sql.query(`
  SELECT v.MoCode, v.InvCode, v.InvName, v.Qty, v.OpDesc, v.SoCode,
         v.MoSeq, v.MDept, v.DeptName, v.WhName, v.StartDate, v.DueDate,
         v.Status, v.Remark, v.Define28
  FROM v_mom_orderdetail_ProcColMoIn v 
  WHERE v.MoCode='${mc}' ORDER BY v.MoSeq`);

const r2 = await sql.query(`SELECT c.cCusName FROM v_mom_orderdetail_ProcColMoIn v
  LEFT JOIN SO_SOMain s ON v.SoCode=s.csocode LEFT JOIN Customer c ON s.cCusCode=c.cCusCode
  WHERE v.MoCode='${mc}' AND v.MoSeq=(SELECT MIN(MoSeq) FROM v_mom_orderdetail_ProcColMoIn WHERE MoCode='${mc}')`);

const custName = r2.recordset[0]?.cCusName || '-';

console.log('工单:', mc, rows.recordset.length, '道工序');
console.log('客户:', custName, '\n');

rows.recordset.forEach((r,i) => {
  console.log(`[${i+1}] MoSeq:${r.MoSeq} ${(r.InvName||'-').slice(0,20)} Qty:${r.Qty} 工序:${(r.OpDesc||'-').slice(0,15)} 部门:${(r.DeptName||'-').slice(0,10)} 负责人:${(r.Define28||'-').slice(0,8)}`);
});

const ops = rows.recordset.map(r=>r.OpDesc||'').filter(Boolean);
const first = rows.recordset[0];
const desc = `客户:${custName} | 部门:${first.DeptName||'-'} | 工序:${ops.join(',')} | 仓库:${first.WhName||'-'} | 负责人:${first.Define28||'-'} | ${first.Remark||''}`;

console.log('\n=== MES description ===');
console.log(desc.slice(0,255));

// 输出 API payload
const payload = {
  name: (first.InvName||mc).slice(0,60),
  order_number: mc,
  status: '执行中',
  quantity: first.Qty||0,
  planned_qty: first.Qty||0,
  planned_start_date: first.StartDate,
  planned_end_date: first.DueDate,
  description: desc.slice(0,255),
  wf_status: '开工'
};
console.log('\n=== 直接 POST 到 MES ===');
console.log('curl -X POST http://localhost:5100/api/v6/data/mes_work_orders -H "Content-Type:application/json" -d \''+JSON.stringify(payload)+'\'');

await sql.close();
})();
