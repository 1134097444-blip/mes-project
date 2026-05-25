const http=require('http');
let T=null;
async function api(m,p,d){
  if(!T){const x=await raw('POST','/api/v6/auth/login',JSON.stringify({username:'1134097444@qq.com',password:'123456'}),{'Content-Type':'application/json'});T=JSON.parse(x).access_token;}
  const b=d?JSON.stringify(d):null;const h={'Content-Type':'application/json','Authorization':'Bearer '+T};if(b)h['Content-Length']=Buffer.byteLength(b);
  return JSON.parse(await raw(m,encodeURI(p),b,h));
}
function raw(m,p,b,h){return new Promise((r,j)=>{const q=http.request({method:m,hostname:'localhost',port:5100,path:p,headers:h},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>{if(s.statusCode>=400)j(new Error(`HTTP ${s.statusCode}`));else r(d)});});q.on('error',j);if(b)q.write(b);q.end();});}

(async()=>{
  // 1. 物料（人能看懂的名字）
  const raw1=await api('POST','/api/v6/data/mes_materials',{name:'304不锈钢板 2.0mm',material_code:'MTL-001',material_type:'raw_material'});
  const raw2=await api('POST','/api/v6/data/mes_materials',{name:'不锈钢焊丝 ER308',material_code:'MTL-002',material_type:'raw_material'});
  const fin=await api('POST','/api/v6/data/mes_materials',{name:'食品级不锈钢罐体（立式夹套）',material_code:'MTL-F001',material_type:'finished_good'});
  console.log('物料: 3个');

  // 2. 工作中心
  const wc1=await api('POST','/api/v6/data/mes_work_centers',{wc_code:'W01',wc_name:'钣金下料组',name:'钣金下料组'});
  const wc2=await api('POST','/api/v6/data/mes_work_centers',{wc_code:'W02',wc_name:'焊接组',name:'焊接组'});
  const wc3=await api('POST','/api/v6/data/mes_work_centers',{wc_code:'W03',wc_name:'表面处理组',name:'表面处理组'});
  console.log('工作中心: 3个');

  // 3. 工艺路线
  const rt=await api('POST','/api/v6/data/mes_routings',{name:'食品罐体标准工艺',description:'304不锈钢食品级罐体生产工艺路线',routing_status:'released',version:2});
  console.log('路线: '+rt.name);

  // 4. 工序
  const ops=[
    {code:'XSG01',name:'手工下料',wc:wc1._id,seq:10},
    {code:'BPZ01',name:'板焊拼装（碳钢）',wc:wc2._id,seq:20},
    {code:'BYH01',name:'氩弧焊（食品级）',wc:wc2._id,seq:30},
    {code:'MDM02',name:'打磨拉丝抛光',wc:wc3._id,seq:40},
    {code:'PYX01',name:'喷漆',wc:wc3._id,seq:50},
  ];
  const opIds=[];
  for(const d of ops){
    const op=await api('POST','/api/v6/data/mes_operations',{operation_code:d.code,name:d.name,description:d.name,sequence_no:d.seq,work_center:d.wc,routing:rt._id});
    opIds.push(op._id);
    console.log('  '+d.name);
  }

  // 5. BOM
  await api('POST','/api/v6/data/mes_bom_items',{name:'不锈钢板→罐体',parent_material:fin._id,component_material:raw1._id,quantity:350,unit:'kg'});
  await api('POST','/api/v6/data/mes_bom_items',{name:'焊丝→罐体',parent_material:fin._id,component_material:raw2._id,quantity:12,unit:'kg'});
  console.log('BOM: 2条');

  // 6. 生产工单
  const wo=await api('POST','/api/v6/data/mes_work_orders',{name:'上海瑛尔迪-食品罐体3台',planned_qty:3,status:'released',priority:'high',product:fin._id,routing:rt._id});
  console.log('工单: '+wo.order_number);

  // 7. 报工（模拟真实生产进度）
  await api('POST','/api/v6/data/mes_production_reports',{name:'手工下料-第1批',work_order:wo._id,operation:opIds[0],completed_qty:3,report_date:'2026-05-15'});
  await api('POST','/api/v6/data/mes_production_reports',{name:'板焊拼装',work_order:wo._id,operation:opIds[1],completed_qty:3,report_date:'2026-05-17'});
  await api('POST','/api/v6/data/mes_production_reports',{name:'氩弧焊',work_order:wo._id,operation:opIds[2],completed_qty:2,defect_qty:1,report_date:'2026-05-19'});
  await api('POST','/api/v6/data/mes_production_reports',{name:'打磨抛光',work_order:wo._id,operation:opIds[3],completed_qty:2,report_date:'2026-05-20'});
  console.log('报工: 4条（下料3→拼装3→焊接2+1不良→打磨2）');

  console.log('\n✅ 一条完整链路:');
  console.log('   客户订单 → 生产工单WO-xxxxx → 5道工序 → 4次报工');
  console.log('   http://localhost:5100/app/mes/mes_work_orders');
})();
