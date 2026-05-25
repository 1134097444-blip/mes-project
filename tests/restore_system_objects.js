/**
 * Scan standard Steedos packages and restore missing system objects
 */
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const yaml = require('js-yaml');

const ROOT = 'E:\\Object\\my-project\\mes-project';
const STD_PKGS = [
  'node_modules/@steedos/standard-accounts',
  'node_modules/@steedos/standard-permission',
  'node_modules/@steedos/standard-ui',
  'node_modules/@steedos/standard-process-approval',
  'node_modules/@steedos/standard-object-database',
  'node_modules/@steedos/service-core-objects',
  'node_modules/@steedos/service-pages',
];

async function main() {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = c.db('steedos_mes');
  let total = 0;

  for (const pkg of STD_PKGS) {
    const objDir = path.join(ROOT, pkg, 'main', 'default', 'objects');
    if (!fs.existsSync(objDir)) {
      console.log('SKIP dir not found:', pkg);
      continue;
    }
    const items = fs.readdirSync(objDir);
    for (const item of items) {
      const itemPath = path.join(objDir, item);
      let objFiles = [];

      if (fs.statSync(itemPath).isDirectory()) {
        // Directory-based object: mes_xxx/mes_xxx.object.yml
        const objFile = path.join(itemPath, item + '.object.yml');
        if (fs.existsSync(objFile)) {
          objFiles.push(objFile);
        }
      } else if (item.endsWith('.object.yml')) {
        // Flat object file: xxx.object.yml
        objFiles.push(itemPath);
      }

      for (const file of objFiles) {
        try {
          const def = yaml.load(fs.readFileSync(file, 'utf8'));
          if (!def || !def.name) continue;
          const existing = await db.collection('objects').findOne({ name: def.name });
          if (!existing) {
            await db.collection('objects').insertOne({ ...def, _id: def.name });
            console.log('  INSERT ' + def.name);
            total++;
          }
        } catch (e) {
          console.log('  ERR ' + file + ': ' + e.message.slice(0, 60));
        }
      }
    }
  }

  console.log('\nTotal inserted: ' + total);
  const count = await db.collection('objects').countDocuments();
  console.log('Total objects in DB: ' + count);
  await c.close();
}

main().catch(e => console.log('FATAL:', e));
