const fs = require('fs');
const { MongoClient } = require('mongodb');
(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = c.db('steedos_mes');
  
  const pv = await db.collection('page_versions').find({}).project({page:1,version:1,is_active:1,modified:1}).sort({modified:-1}).limit(10).toArray();
  console.log('page_versions records:');
  pv.forEach(v => console.log('  page='+v.page+' ver='+v.version+' active='+v.is_active+' modified='+(v.modified||'')));
  
  const home = await db.collection('page_versions').findOne({page:'6a0c12f1252a6a3abccdab9f'});
  if (home) {
    console.log('\nmes_home page_version:');
    console.log('  has schema:', !!home.schema);
    console.log('  schema type:', typeof home.schema);
    if (home.schema) console.log('  schema start:', home.schema.slice(0, 50));
  }
  
  const flowPage = await db.collection('pages').findOne({name:'mes_process_flow'});
  if (flowPage) {
    console.log('\nmes_process_flow _id:', flowPage._id);
    const flowPv = await db.collection('page_versions').findOne({page: flowPage._id});
    if (flowPv) console.log('  HAS page_version, schema:', !!flowPv.schema);
    else console.log('  NO page_version record');
  }
  
  await c.close();
})();
