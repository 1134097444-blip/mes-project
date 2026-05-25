const http = require('http');
let T = null;
async function api(m, p, d) {
  if (!T) { const r = await raw('POST', '/api/v6/auth/login', JSON.stringify({ username: '1134097444@qq.com', password: '123456' }), { 'Content-Type': 'application/json' }); T = JSON.parse(r).access_token; }
  const b = d ? JSON.stringify(d) : null; const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + T }; if (b) h['Content-Length'] = Buffer.byteLength(b);
  return JSON.parse(await raw(m, p, b, h));
}
function raw(m, p, b, h) { return new Promise((r, j) => { const q = http.request({ method: m, hostname: 'localhost', port: 5100, path: p, headers: h }, s => { let d = ''; s.on('data', c => d += c); s.on('end', () => { if (s.statusCode >= 400) j(new Error(`HTTP ${s.statusCode}: ${d.slice(0, 200)}`)); else r(d); }); }); q.on('error', j); if (b) q.write(b); q.end(); }); }

(async () => {
  console.log('=== 导入完整演示链路 ===\n');
  const wc = await api('POST', '/api/v6/data/mes_work_centers', { wc_code: 'DEMO-WC', wc_name: '演示工作中心', name: '演示工作中心' });
  console.log('1. 工作中心');
  const ops = []; let i = 0;
  for (const d of [{ c: 'OP001', n: '下料切割' }, { c: 'OP002', n: '焊接组装' }, { c: 'OP003', n: '检验包装' }]) {
    const op = await api('POST', '/api/v6/data/mes_operations', { operation_code: d.c, name: d.n, description: d.n, sequence_no: (++i) * 10, work_center: wc._id });
    ops.push(op);
  }
  console.log('2. 3道工序');
  const rt = await api('POST', '/api/v6/data/mes_routings', { name: '演示产品工艺路线', description: '演示用标准工艺路线', routing_status: 'released', version: 1 });
  console.log('3. 工艺路线');
  i = 0; for (const op of ops) { await api('PATCH', '/api/v6/data/mes_operations/' + op._id, { routing: rt._id, sequence_no: (++i) * 10 }); }
  console.log('4. 工序关联路线');
  const rm = await api('POST', '/api/v6/data/mes_materials', { name: '304不锈钢板(演示)', material_code: 'MTL-DEMO-001', material_type: 'raw_material' });
  const fin = await api('POST', '/api/v6/data/mes_materials', { name: '演示成品设备', material_code: 'MTL-DEMO-F001', material_type: 'finished_good' });
  console.log('5. 物料');
  await api('POST', '/api/v6/data/mes_bom_items', { name: '演示BOM', parent_material: fin._id, component_material: rm._id, quantity: 2.5 });
  console.log('6. BOM');
  const wo = await api('POST', '/api/v6/data/mes_work_orders', { name: '演示生产工单', status: 'released', priority: 'high', product: fin._id, routing: rt._id, planned_qty: 10 });
  console.log('7. 生产工单:', wo.order_number);
  i = 0; for (const op of ops) { await api('POST', '/api/v6/data/mes_production_reports', { name: op.name + '报工', work_order: wo._id, operation: op._id, completed_qty: (++i) < 3 ? 10 : 8, defect_qty: i === 2 ? 1 : 0 }); }
  console.log('8. 3条报工');
  console.log('\n✅ 完成！打开 MES 应用查看');
})();
