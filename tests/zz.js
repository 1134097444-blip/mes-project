/**
 * 加载 YAML 对象定义到 MongoDB
 * 补充 mes_tasks, mes_work_centers, mes_workshops
 */
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const yaml = require('js-yaml');

const OBJ_DIR = 'steedos-packages/mes/main/default/objects';
const MISSING = ['mes_tasks', 'mes_work_centers', 'mes_workshops'];

(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db1 = c.db('steedos_mes');
  const db2 = c.db('steedos');

  for (const objName of MISSING) {
    const objFile = path.join(OBJ_DIR, objName, objName + '.object.yml');
    if (!fs.existsSync(objFile)) {
      console.log(objName, '❌ object.yml not found');
      continue;
    }

    const objDef = yaml.load(fs.readFileSync(objFile, 'utf8'));
    
    // Build the object document with minimal required fields
    const doc = {
      _id: objName,
      name: objDef.name,
      label: objDef.label,
      icon: objDef.icon || 'default',
      description: objDef.description || '',
      enable_api: true,
      enable_audit: true,
      enable_files: true,
      enable_trash: true,
      enable_search: true,
      enable_chatter: true,
      enable_enhanced_lookup: true,
      fields: {},
      list_views: {}
    };

    // Load field definitions
    const fieldsDir = path.join(OBJ_DIR, objName, 'fields');
    if (fs.existsSync(fieldsDir)) {
      for (const f of fs.readdirSync(fieldsDir)) {
        if (f.endsWith('.field.yml')) {
          try {
            const fieldDef = yaml.load(fs.readFileSync(path.join(fieldsDir, f), 'utf8'));
            doc.fields[fieldDef.name] = fieldDef;
          } catch(e) {
            console.log(`  ${objName}.${f}: YAML error: ${e.message.slice(0, 60)}`);
          }
        }
      }
    }

    // Load listviews
    const lvDir = path.join(OBJ_DIR, objName, 'listviews');
    if (fs.existsSync(lvDir)) {
      for (const f of fs.readdirSync(lvDir)) {
        if (f.endsWith('.listview.yml')) {
          try {
            const lvDef = yaml.load(fs.readFileSync(path.join(lvDir, f), 'utf8'));
            doc.list_views[lvDef.name] = lvDef;
          } catch(e) {
            console.log(`  ${objName}.${f}: YAML error: ${e.message.slice(0, 60)}`);
          }
        }
      }
    }

    // Write to both databases
    for (const db of [db1, db2]) {
      await db.collection('objects').updateOne(
        { name: objName },
        { $set: doc },
        { upsert: true }
      );
    }

    const fieldCount = Object.keys(doc.fields).length;
    const lvCount = Object.keys(doc.list_views).length;
    console.log(`${objName}: ✅ loaded (${fieldCount} fields, ${lvCount} listviews)`);
  }

  await c.close();
  console.log('\nDone. 3 objects loaded.');
})();
