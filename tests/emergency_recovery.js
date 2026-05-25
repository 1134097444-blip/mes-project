/**
 * MES 项目急救脚本
 * 检测并修复数据库中的系统对象缺失/损坏
 * 用法: node tests/emergency_recovery.js
 */
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const yaml = require('js-yaml');

const ROOT = __dirname.replace(/\\/g, '/').replace(/\/tests$/, '');
const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'steedos_mes';

// 关键系统对象（缺失任何一个都会导致服务异常）
const CRITICAL_OBJECTS = [
  'apps', 'permission_set', 'users', 'spaces', 'space_users',
  'organizations', 'tabs', 'pages', 'permission_objects',
  'permission_fields', 'permission_tabs', 'roles', 'accounts',
  'objects', 'object_fields', 'object_listviews',
  'settings', 'company', 'datasources',
];

// 所有需要扫描的标准包目录
const STD_PKG_OBJECT_DIRS = [
  'node_modules/@steedos/service-core-objects/main/default/objects',
  'node_modules/@steedos/standard-permission/main/default/objects',
  'node_modules/@steedos/standard-ui/main/default/objects',
  'node_modules/@steedos/standard-accounts/main/default/objects',
  'node_modules/@steedos/standard-process-approval/main/default/objects',
  'node_modules/@steedos/standard-object-database/main/default/objects',
  'node_modules/@steedos/service-pages/main/default/objects',
];

// ============ 工具函数 ============

function log(prefix, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${prefix} ${msg}`);
}

function ok(msg) { log('✅', msg); }

function warn(msg) { log('⚠️', msg); }

function fail(msg) { log('❌', msg); }

function step(n, msg) { console.log(`\n--- [步骤 ${n}] ${msg} ---`); }

// ============ 扫描系统对象定义 ============

function scanSystemObjects() {
  const objects = {};

  for (const relDir of STD_PKG_OBJECT_DIRS) {
    const dir = path.join(ROOT, relDir.replace(/\//g, path.sep));
    if (!fs.existsSync(dir)) continue;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      let yamlFiles = [];

      if (fs.statSync(itemPath).isDirectory()) {
        const objFile = path.join(itemPath, item + '.object.yml');
        if (fs.existsSync(objFile)) yamlFiles.push(objFile);
      } else if (item.endsWith('.object.yml')) {
        yamlFiles.push(itemPath);
      }

      for (const file of yamlFiles) {
        try {
          const def = yaml.load(fs.readFileSync(file, 'utf8'));
          if (def && def.name) {
            objects[def.name] = def;
          }
        } catch (e) {
          warn(`解析失败 ${file}: ${e.message.slice(0, 60)}`);
        }
      }
    }
  }

  return objects;
}

// ============ 检查并修复 ============

async function checkAndFix(db, systemObjects) {
  let restored = 0;

  for (const name of CRITICAL_OBJECTS) {
    const existing = await db.collection('objects').findOne({ name });
    if (!existing) {
      const def = systemObjects[name];
      if (def) {
        await db.collection('objects').updateOne(
          { name },
          { $set: { ...def, _id: name } },
          { upsert: true }
        );
        ok(`恢复系统对象: ${name}`);
        restored++;
      } else {
        fail(`关键对象 ${name} 缺失，且未找到定义文件`);
      }
    }
  }

  // 扫描所有缺失的系统对象（不仅仅是关键列表）
  for (const [name, def] of Object.entries(systemObjects)) {
    if (CRITICAL_OBJECTS.includes(name)) continue;
    const existing = await db.collection('objects').findOne({ name });
    if (!existing) {
      await db.collection('objects').updateOne(
        { name },
        { $set: { ...def, _id: name } },
        { upsert: true }
      );
      ok(`恢复系统对象: ${name}`);
      restored++;
    }
  }

  return restored;
}

// ============ 检查 MES 对象 ============

async function checkMesObjects(db) {
  const MES_OBJ_NAMES = [
    'mes_tasks', 'mes_work_orders', 'mes_production_reports',
    'mes_routings', 'mes_operations', 'mes_work_centers', 'mes_workshops',
    'mes_bom_items', 'mes_inspection_records', 'mes_defects', 'mes_nonconformance',
    'mes_equipment', 'mes_maintenance_records', 'mes_equipment_faults',
    'mes_materials', 'mes_inventory'
  ];

  let missing = 0;
  for (const name of MES_OBJ_NAMES) {
    const existing = await db.collection('objects').findOne({ name });
    if (!existing) {
      fail(`MES 对象缺失: ${name}`);
      missing++;
    }
  }

  if (missing === 0) ok('全部 16 个 MES 对象存在');
  else warn(`${missing} 个 MES 对象缺失`);
  return missing;
}

// ============ 验证 API ============

async function verifyServer() {
  const http = require('http');
  const BASE = 'http://localhost:5100';

  // 1. 健康检查
  const health = await new Promise(r => {
    http.get(BASE + '/api/v6/health', { timeout: 5000 }, s => {
      let d = ''; s.on('data', c => d += c);
      s.on('end', () => r({ ok: s.statusCode === 200, body: d.slice(0, 80) }));
    }).on('error', e => r({ ok: false, body: e.message }));
  });

  if (!health.ok) {
    fail(`服务未响应: ${health.body}`);
    return false;
  }
  ok(`服务运行正常: ${health.body}`);

  // 2. 登录
  const loginBody = JSON.stringify({
    username: '1134097444@qq.com', password: '123456'
  });
  const login = await new Promise(r => {
    const q = http.request(BASE + '/api/v6/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginBody)
      }
    }, s => {
      let d = '';
      s.on('data', c => d += c);
      s.on('end', () => r({ ok: s.statusCode === 200, cookie: s.headers['set-cookie']?.join('; ') }));
    });
    q.write(loginBody);
    q.end();
  });

  if (!login.ok) {
    warn(`登录失败，跳过 API 验证`);
    return false;
  }

  // 3. 测试 MES 对象 uiSchema
  const testNames = ['mes_tasks', 'mes_work_orders', 'mes_workshops', 'mes_equipment'];
  let passed = 0;
  for (const name of testNames) {
    const r = await new Promise(r2 => {
      http.get(BASE + '/service/api/@' + name + '/uiSchema', { headers: { Cookie: login.cookie } }, s => {
        let d = '';
        s.on('data', c => d += c);
        s.on('end', () => r2({ ok: s.statusCode === 200, body: d.slice(0, 50) }));
      });
    });
    if (r.ok) { ok(`/service/api/@${name}/uiSchema → 200`); passed++; }
    else { fail(`/service/api/@${name}/uiSchema → ${r.body}`); }
  }

  return passed === testNames.length;
}

// ============ 主流程 ============

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   MES 项目急救脚本');
  console.log('   数据库: ' + DB_NAME);
  console.log('   工作目录: ' + ROOT);
  console.log('═══════════════════════════════════════════');

  step(1, '扫描系统对象定义');
  const systemObjects = scanSystemObjects();
  ok(`找到 ${Object.keys(systemObjects).length} 个系统对象定义`);

  step(2, '连接数据库');
  let client;
  try {
    client = await MongoClient.connect(MONGO_URL);
    ok('MongoDB 连接成功');
  } catch (e) {
    fail(`MongoDB 连接失败: ${e.message}`);
    process.exit(1);
  }

  const db = client.db(DB_NAME);

  step(3, '检查 objects 集合');
  const totalObjects = await db.collection('objects').countDocuments();
  ok(`当前对象数量: ${totalObjects}`);

  step(4, '检查并恢复缺失的系统对象');
  const restored = await checkAndFix(db, systemObjects);
  if (restored > 0) {
    ok(`恢复了 ${restored} 个系统对象`);
  } else {
    ok('所有系统对象正常，无需恢复');
  }

  step(5, '检查 MES 对象完整性');
  const mesMissing = await checkMesObjects(db);

  step(6, '验证 API');
  const apiOk = await verifyServer();

  // ============ 最终报告 ============
  console.log('\n═══════════════════════════════════════════');
  console.log('   修复报告');
  console.log('═══════════════════════════════════════════');
  console.log(`  系统对象定义: ${Object.keys(systemObjects).length} 个`);
  console.log(`  当前 DB 对象: ${await db.collection('objects').countDocuments()} 个`);
  console.log(`  本次恢复:     ${restored} 个`);
  console.log(`  MES 对象:     ${mesMissing > 0 ? '⚠️ ' + mesMissing + ' 缺失' : '✅ 完整'}`);
  console.log(`  API 验证:     ${apiOk ? '✅ 通过' : '❌ 失败'}`);

  if (restored > 0 && apiOk) {
    console.log('\n⚠️  注意：恢复系统对象后需要重启 Steedos 服务才能生效。');
    console.log('   如果服务未自动重启，请执行:');
    console.log('   1. 先 kill 当前 node 进程');
    console.log('   2. 再执行 yarn start');
  }

  await client.close();
  console.log('\n脚本执行完毕');
}

main().catch(e => {
  console.error('\n❌ 脚本异常:', e.message);
  process.exit(1);
});
