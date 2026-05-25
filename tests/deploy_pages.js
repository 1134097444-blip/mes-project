/**
 * 直接插入 MES 对象 page 记录到 MongoDB
 * 跳过 API，直接操作数据库
 */
const { MongoClient, ObjectId } = require('mongodb');

const OBJ_NAMES = [
  'mes_tasks', 'mes_work_orders', 'mes_production_reports',
  'mes_routings', 'mes_operations', 'mes_work_centers', 'mes_workshops',
  'mes_bom_items', 'mes_inspection_records', 'mes_defects', 'mes_nonconformance',
  'mes_equipment', 'mes_maintenance_records', 'mes_equipment_faults',
  'mes_materials', 'mes_inventory'
];

const LABELS = {
  mes_workshops: '车间管理', mes_work_centers: '工作中心',
  mes_operations: '工序定义', mes_routings: '工艺路线',
  mes_work_orders: '生产工单', mes_tasks: '工人任务',
  mes_production_reports: '报工记录', mes_bom_items: 'BOM清单',
  mes_materials: '物料主数据', mes_inventory: '线边库存',
  mes_equipment: '设备台账', mes_maintenance_records: '维保记录',
  mes_equipment_faults: '故障报修', mes_inspection_records: '检验记录',
  mes_defects: '缺陷登记', mes_nonconformance: '不合格处理'
};

(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = c.db('steedos_mes');
  let count = 0;

  for (const name of OBJ_NAMES) {
    const existing = await db.collection('pages').findOne({ name: 'obj_' + name });
    if (existing) {
      console.log('跳过 ' + name + ' (已存在)');
      continue;
    }
    const doc = {
      _id: new ObjectId().toString(),
      name: 'obj_' + name,
      label: LABELS[name],
      description: LABELS[name],
      type: 'list',
      object_name: name,
      is_active: true,
      space: '6a0bb8ab00a1a396c0ca2001',
      created: '2026-05-22T06:00:00.000Z',
      modified: '2026-05-22T06:00:00.000Z'
    };
    await db.collection('pages').insertOne(doc);
    console.log('✅ 创建 ' + name + ' -> obj_' + name);
    count++;
  }

  console.log('\n共创建 ' + count + ' 个页面记录');
  await c.close();
})();
