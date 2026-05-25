const sql = require('mssql');
const { MongoClient } = require('mongodb');

async function sync() {
  const ms = await sql.connect({
    server: '192.168.1.21', database: 'UFDATA_006_2025',
    user: 'rd01', password: 'triowin',
    options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 300000
  });
  const mc = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = mc.db('steedos_mes');
  const sid = '6a0bb8ab00a1a396c0ca2001';

  // 建 sfc_operation U8 ID → MES _id 映射
  const ops = await db.collection('mes_operations').find({space:sid}).toArray();
  const opMap = {};
  for(const o of ops) opMap[o.uf_operation_id] = o._id;

  // 同步报工：sfc_optransform JOIN sfc_moroutingdetail → mes_production_reports
  console.log('=== 同步报工记录 ===');
  const sfc = await ms.query(`
    SELECT t.*, md.OperationId, md.OpSeq, md.WcId 
    FROM sfc_optransform t
    JOIN sfc_moroutingdetail md ON t.MoRoutingDId = md.MoRoutingDId
    WHERE t.OpStatus >= 1
    ORDER BY t.DocDate DESC
  `);
  let cnt = 0;
  for(const r of sfc.recordset) {
    const opId = opMap[String(r.OperationId)];
    if(!opId) continue;
    await db.collection('mes_production_reports').updateOne(
      { uf_transform_id: String(r.TransformId) },
      { $set: {
        name: `报工 ${r.DocCode || r.TransformId}`,
        operation: opId,
        completed_qty: r.QualifiedQty || 0,
        defect_qty: (r.ScrapQty || 0) + (r.RefusedQty || 0),
        refused_qty: r.RefusedQty || 0,
        rework_qty: r.ReworkQty || 0,
        good_qty: r.QualifiedQty || 0,
        report_date: r.DocDate,
        uf_transform_id: String(r.TransformId),
        space: sid,
        created: new Date(), modified: new Date()
      }},
      { upsert: true }
    );
    cnt++;
    if(cnt % 5000 === 0) console.log(`  已处理 ${cnt} 条`);
  }
  console.log(`报工记录同步完成: ${cnt}`);
  await mc.close(); await ms.close();
}
sync().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
