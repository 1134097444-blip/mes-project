/**
 * 将对象元数据从 steedos 库同步到 steedos_mes 库
 * 同时嵌入 list_views 到 objects 文档
 */
const { MongoClient } = require('mongodb');

(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const srcDb = c.db('steedos');
  const dstDb = c.db('steedos_mes');

  // 1. 从 steedos 库获取所有 mes_ 对象
  const srcObjects = await srcDb.collection('objects').find({ name: /^mes_/ }).toArray();
  console.log('Source objects (steedos):', srcObjects.length);

  // 2. 获取 listviews
  const listviews = await dstDb.collection('object_listviews').find({ object: /^mes_/ }).toArray();
  console.log('Listviews (steedos_mes):', listviews.length);

  // 3. 按 object 分组
  const lvMap = {};
  for (const lv of listviews) {
    if (!lvMap[lv.object]) lvMap[lv.object] = {};
    const { _id, object, space, ...data } = lv;
    lvMap[lv.object][lv.name] = data;
  }

  // 4. 写入 steedos_mes.objects
  let count = 0;
  for (const obj of srcObjects) {
    const doc = { ...obj };
    if (lvMap[obj.name]) {
      doc.list_views = lvMap[obj.name];
    }
    await dstDb.collection('objects').updateOne(
      { name: obj.name },
      { $set: doc },
      { upsert: true }
    );
    count++;
    console.log(`  ${obj.name}: ${doc.list_views ? Object.keys(doc.list_views).length + ' listviews' : 'no listviews'}`);
  }

  console.log(`\nSynced ${count} objects to steedos_mes`);
  await c.close();
})();
