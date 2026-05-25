const { MongoClient } = require('mongodb');
const fs = require('fs');
(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const schemaStr = fs.readFileSync('steedos-packages/mes/main/default/pages/mes_process_flow.page.amis.json', 'utf8');

  for (const dbName of ['steedos_mes', 'steedos']) {
    const db = c.db(dbName);
    // Delete all OLD page_versions (trigger creates one with null schema)
    await db.collection('page_versions').deleteMany({page: 'mes_process_flow'});
    
    // Clean the app data to re-load tab config
    const result = await db.collection('apps').updateOne(
      {code: 'mes'},
      {$addToSet: {tabs: 'page_mes_process_flow'}}
    );
    console.log(dbName + ': apps updated, modified:', result.modifiedCount);
  }
  
  // Now restart the server - the YAML trigger will create a null-schema version,
  // BUT we need to fix it AFTER trigger runs
  console.log('After server restart, run page_version_fix.js');
  await c.close();
})();
