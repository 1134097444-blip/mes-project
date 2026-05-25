const { MongoClient } = require('mongodb');
(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = c.db('steedos_mes');
  
  // Get equipment board page and all its versions
  const page = await db.collection('pages').findOne({name:'mes_equipment_board'});
  console.log('equipment_board page _id:', page?._id, 'type:', typeof page?._id);
  
  const versions = await db.collection('page_versions').find({page: page?._id}).toArray();
  console.log('versions count:', versions.length);
  versions.forEach(v => console.log('  _id:', v._id, 'page type:', typeof v.page, 'page val:', v.page, 'schema:', v.schema ? 'YES' : 'NO', 'ver:', v.version));
  
  // Get all page_versions with string page references vs ObjectId
  const stringRefs = await db.collection('page_versions').find({page: {$type: 'string'}}).project({page:1}).limit(5).toArray();
  const objRefs = await db.collection('page_versions').find({page: {$type: 'object'}}).project({page:1}).limit(5).toArray();
  console.log('\nString refs:', stringRefs.length, '-', stringRefs.map(v => v.page).join(', '));
  console.log('Object refs:', objRefs.length, '-', objRefs.map(v => v.page).join(', '));
  
  await c.close();
})();
