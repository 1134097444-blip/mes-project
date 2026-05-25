/**
 * 恢复系统对象定义到 steedos_mes 数据库
 * 从 Steedos 核心包 YAML 文件中读取并插入
 */
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const yaml = require('js-yaml');

// Steedos 核心对象目录列表
const CORE_DIRS = [
  'node_modules/@steedos/service-core-objects/main/default/objects',
  'node_modules/@steedos/standard-permission/main/default/objects',
  'node_modules/@steedos/service-pages/main/default/objects',
  'node_modules/@steedos/standard-process-approval/main/default/objects',
  'node_modules/@steedos/service-metadata-database/main/default/objects',
];

async function loadCoreObjects() {
  const objects = {};

  for (const dir of CORE_DIRS) {
    const fullDir = path.resolve(dir);
    if (!fs.existsSync(fullDir)) {
      console.log('跳过不存在目录:', dir);
      continue;
    }

    const items = fs.readdirSync(fullDir);
    for (const item of items) {
      const itemDir = path.join(fullDir, item);
      if (!fs.statSync(itemDir).isDirectory()) continue;

      const objFile = path.join(itemDir, item + '.object.yml');
      if (!fs.existsSync(objFile)) {
        // 可能是单文件对象定义
        const singleFile = path.join(fullDir, item);
        if (item.endsWith('.object.yml')) {
          try {
            const def = yaml.load(fs.readFileSync(singleFile, 'utf8'));
            if (def && def.name) {
              objects[def.name] = { def, source: singleFile };
              console.log(`  ${def.name} <- ${singleFile}`);
            }
          } catch (e) { /* skip */ }
        }
        continue;
      }

      try {
        const def = yaml.load(fs.readFileSync(objFile, 'utf8'));
        if (def && def.name) {
          objects[def.name] = { def, source: objFile };
          console.log(`  ${def.name} <- ${objFile}`);
        }
      } catch (e) {
        console.log(`  解析失败 ${objFile}: ${e.message.slice(0, 60)}`);
      }
    }
  }

  return objects;
}

(async () => {
  console.log('=== 读取 Steedos 核心对象定义 ===');
  const objects = await loadCoreObjects();
  console.log(`\n共读取 ${Object.keys(objects).length} 个系统对象定义`);

  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = c.db('steedos_mes');
  
  let inserted = 0;
  let skipped = 0;

  for (const [name, { def }] of Object.entries(objects)) {
    const existing = await db.collection('objects').findOne({ name });
    if (existing && !name.startsWith('mes_')) {
      // 跳过已经存在的 MES 对象，但覆盖系统对象
      console.log(`  更新 ${name}: 覆盖系统对象定义`);
      await db.collection('objects').updateOne(
        { name },
        { $set: { ...def, _id: name } },
        { upsert: true }
      );
      inserted++;
    } else if (!existing) {
      // 新插入
      await db.collection('objects').updateOne(
        { name },
        { $set: { ...def, _id: name } },
        { upsert: true }
      );
      console.log(`  插入 ${name}`);
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`\n处理完成: 插入/更新 ${inserted}, 跳过 ${skipped}`);
  console.log(`总对象数: ${await db.collection('objects').countDocuments()}`);

  // 验证关键系统对象存在
  const criticalObjects = ['apps', 'permission_set', 'users', 'spaces', 'space_users', 'organizations', 'tabs', 'pages', 'permission_objects', 'permission_fields', 'permission_tabs', 'roles'];
  for (const name of criticalObjects) {
    const exists = await db.collection('objects').findOne({ name });
    console.log(`  ${exists ? '✅' : '❌'} ${name}: ${exists ? '存在' : '缺失'}`);
  }

  await c.close();
})();
