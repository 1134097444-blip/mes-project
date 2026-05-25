/**
 * 诊断: 对象文档结构对比
 */
const { MongoClient } = require('mongodb');
(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');

  // steedos_mes 库的 work_orders
  const db = c.db('steedos_mes');
  const wo = await db.collection('objects').findOne({ name: 'mes_work_orders' });
  console.log('=== steedos_mes.mes_work_orders ===');
  console.log('_id type:', typeof wo._id, 'is String:', typeof wo._id === 'string');
  console.log('_id value:', wo._id);
  console.log('name:', wo.name);
  console.log('label:', wo.label);
  console.log('fields keys:', Object.keys(wo.fields || {}).slice(0, 5).join(', '), '...');
  console.log('list_views keys:', Object.keys(wo.list_views || {}).join(', '));
  console.log('has enable_api:', 'enable_api' in wo, wo.enable_api);

  // mes_tasks for comparison
  const tk = await db.collection('objects').findOne({ name: 'mes_tasks' });
  console.log('\n=== steedos_mes.mes_tasks ===');
  console.log('_id type:', typeof tk._id, tk._id);
  console.log('name:', tk.name);
  console.log('label:', tk.label);
  console.log('fields keys:', Object.keys(tk.fields || {}).slice(0, 5).join(', '), '...');
  console.log('list_views keys:', Object.keys(tk.list_views || {}).join(', '));
  console.log('has enable_api:', 'enable_api' in tk, tk.enable_api);

  // 对比 steedos 库
  const db2 = c.db('steedos');
  const wo2 = await db2.collection('objects').findOne({ name: 'mes_work_orders' });
  console.log('\n=== steedos.mes_work_orders ===');
  console.log('_id type:', typeof wo2._id, wo2._id);
  console.log('Keys:', Object.keys(wo2).slice(0, 20).join(', '));

  // Check if the field definitions match the expected format
  const sampleField = (wo.fields || {}).order_number;
  console.log('\n=== Sample field (work_orders.order_number) ===');
  console.log(JSON.stringify(sampleField, null, 2));

  const tkField = (tk.fields || {}).task_number;
  console.log('\n=== Sample field (tasks.task_number) ===');
  console.log(JSON.stringify(tkField, null, 2));

  await c.close();
})();
