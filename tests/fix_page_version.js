const fs = require('fs');
const { MongoClient } = require('mongodb');
(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = c.db('steedos_mes');
  
  // Read the schema JSON and parse it into an object
  const schemaStr = fs.readFileSync('steedos-packages/mes/main/default/pages/mes_process_flow.page.amis.json', 'utf8');
  const schemaObj = JSON.parse(schemaStr);
  console.log('Schema read, title:', schemaObj.title);
  
  // Get the page record to find its _id
  const page = await db.collection('pages').findOne({name: 'mes_process_flow'});
  if (!page) {
    console.log('ERROR: page not found');
    process.exit(1);
  }
  console.log('Page _id:', page._id);
  
  // Insert page_version record (schema as OBJECT, not string)
  const result = await db.collection('page_versions').insertOne({
    page: page._id,
    schema: schemaObj,
    is_active: true,
    version: 1,
    created: new Date(),
    modified: new Date(),
    owner: page.owner,
    created_by: page.created_by,
    modified_by: page.modified_by,
    space: page.space
  });
  console.log('page_version inserted:', result.insertedId);
  
  // Also write to steedos database
  try {
    const db2 = c.db('steedos');
    await db2.collection('page_versions').insertOne({
      page: page._id,
      schema: schemaObj,
      is_active: true,
      version: 1,
      created: new Date(),
      modified: new Date(),
      owner: page.owner,
      created_by: page.created_by,
      modified_by: page.modified_by,
      space: page.space
    });
    console.log('Also written to steedos db');
  } catch(e) { console.log('steedos db error:', e.message); }
  
  // Verify
  const verify = await db.collection('page_versions').findOne({page: page._id});
  console.log('\nVerified:');
  console.log('  exists:', !!verify);
  console.log('  has schema:', !!verify.schema);
  console.log('  schema type:', typeof verify.schema);
  console.log('  version:', verify.version);
  
  await c.close();
  console.log('\nDONE');
})();
