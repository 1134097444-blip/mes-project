const sql=require('mssql');
(async()=>{
  await sql.connect({server:'192.168.1.21',database:'UFDATA_006_2025',user:'rd01',password:'triowin',options:{encrypt:false,trustServerCertificate:true}});
  // 找有报工的工单
  const r=await sql.query(`SELECT TOP 5 d.MoId,d.Qty,d.InvCode,o.MoCode FROM mom_orderdetail d JOIN mom_order o ON d.MoId=o.MoId WHERE EXISTS(SELECT 1 FROM sfc_moroutingdetail md WHERE md.MoId=d.MoId) ORDER BY d.Qty DESC`);
  console.log('有工序的工单:');
  r.recordset.forEach(x=>console.log(`  ${x.MoCode||'?'} ${x.Qty}件 ${x.InvCode}`));
  
  if(r.recordset.length>0){
    const f=r.recordset[0];
    // 查工序和报工
    const mds=await sql.query(`SELECT md.OpSeq,o.OpCode,o.Description FROM sfc_moroutingdetail md JOIN sfc_operation o ON md.OperationId=o.OperationId WHERE md.MoId=${f.MoId} ORDER BY md.OpSeq`);
    console.log(`\n${f.MoCode||f.MoId} 工序(${mds.recordset.length}道):`);
    mds.recordset.forEach(x=>console.log(`  ${x.OpSeq}. ${x.OpCode} ${x.Description||''}`));
    
    const tfs=await sql.query(`SELECT COUNT(*) as n,SUM(QualifiedQty) as q FROM sfc_optransform t JOIN sfc_moroutingdetail md ON t.MoRoutingDId=md.MoRoutingDId WHERE md.MoId=${f.MoId} AND t.OpStatus>=1`);
    console.log(`报工:${tfs.recordset[0].n}条,合格:${tfs.recordset[0].q||0}件/共${f.Qty}件`);
  }
  await sql.close();
})();
