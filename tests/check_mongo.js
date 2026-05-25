const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('steedos');
  
  // Check object_fields
  const fieldCount = await db.collection('object_fields').countDocuments();
  console.log(`object_fields: ${fieldCount}`);
  if (fieldCount > 0) {
    const fields = await db.collection('object_fields').find().limit(5).toArray();
    fields.forEach(f => console.log(`  Field: ${f.name} on ${f.object} (${f.type})`));
  }
  
  // Check object_listviews
  const lvCount = await db.collection('object_listviews').countDocuments();
  console.log(`\nobject_listviews: ${lvCount}`);
  if (lvCount > 0) {
    const lvs = await db.collection('object_listviews').find().limit(5).toArray();
    lvs.forEach(l => console.log(`  ListView: ${l.name} on ${l.object}`));
  }
  
  // Check permission_objects
  const poCount = await db.collection('permission_objects').countDocuments();
  console.log(`\npermission_objects: ${poCount}`);
  if (poCount > 0) {
    const pos = await db.collection('permission_objects').find().limit(5).toArray();
    pos.forEach(p => console.log(`  Permission: ${p.object_name} / ${p.permission_set}`));
  }
  
  // Check steedos_packages
  const pkgCount = await db.collection('steedos_packages').countDocuments();
  console.log(`\nsteedos_packages: ${pkgCount}`);
  if (pkgCount > 0) {
    const pkgs = await db.collection('steedos_packages').find().toArray();
    pkgs.forEach(p => console.log(`  Package: ${p.name} (${p.version}) - ${p.is_loaded}`));
  }
  
  // Check the actual objects
  const objects = await db.collection('objects').find().toArray();
  console.log(`\n=== ALL OBJECT DEFINITIONS (${objects.length}) ===`);
  objects.forEach(o => console.log(`  ${o.name} | label: ${o.label} | table: ${o.table_name || 'N/A'}`));
  
  // Check for mes objects in any collection
  const col = await db.listCollections().toArray();
  const mesTables = col.filter(c => c.name.startsWith('mes_'));
  console.log(`\n=== MES DATA TABLES (${mesTables.length}) ===`);
  mesTables.forEach(c => console.log(`  - ${c.name}`));
  
  // Check a user
  const users = await db.collection('users').find().limit(2).toArray();
  console.log(`\n=== USERS ===`);
  users.forEach(u => console.log(`  ${u.name} (${u.username})`));
  
  await client.close();
}
main().catch(e => console.log('Error:', e));
