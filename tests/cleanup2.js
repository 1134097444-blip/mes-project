const { MongoClient } = require('mongodb');
(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = c.db('steedos_mes');
  const all = await db.collection('page_versions').find({page:'mes_process_flow'}).sort({created:-1}).toArray();
  console.log('Total:', all.length);
  for (const v of all) {
    const hasS = v.schema != null && v.schema !== '';
    console.log('  _id:'+v._id+' ver:'+v.version+' active:'+v.is_active+' schema:'+hasS+' created:'+(v.created||'?'));
  }
  
  // Keep the last one with schema, delete the rest
  if (all.length > 1) {
    const keep = all.find(v => v.schema != null && v.schema !== '');
    if (keep) {
      for (const v of all) {
        if (v._id.toString() !== keep._id.toString() && v._id !== keep._id) {
          await db.collection('page_versions').deleteOne({_id: v._id});
          console.log('Deleted:', v._id);
        }
      }
    }
  }
  const remaining = await db.collection('page_versions').find({page:'mes_process_flow'}).toArray();
  console.log('Remaining:', remaining.length);
  remaining.forEach(v => console.log('  has schema:', v.schema != null));
  await c.close();
})();
