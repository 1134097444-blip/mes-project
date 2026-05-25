# 同步执行器
# 依次执行所有 U8 → MES 同步脚本
# 用法: node scripts/sync_all.js

const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  'sync_work_centers.js',   // sfc_workcenter → mes_work_centers
  'sync_materials.js',      // Inventory → mes_materials (待创建)
  'sync_operations.js',     // sfc_operation → mes_operations (待创建)
  'sync_work_orders.js',    // mom_order → mes_work_orders (待创建)
  'sync_routings.js',       // sfc_prouting → mes_routings (待创建)
  'sync_from_ufida.js',     // 已有：sfc_optransform → mes_production_reports
  'sync_inventory.js',      // CurrentStock → mes_inventory (待创建)
  'sync_bom.js',            // BOM → mes_bom_items
];

console.log('=== MES U8 Sync All ===\n');
for (const script of scripts) {
  const fullPath = path.join(__dirname, script);
  try {
    require('fs').accessSync(fullPath);
    console.log(`\n--- Running ${script} ---`);
    execSync(`node "${fullPath}"`, { cwd: __dirname, stdio: 'inherit', timeout: 300000 });
    console.log(`--- ${script} OK ---`);
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log(`--- ${script} skipped (not yet created) ---`);
    } else {
      console.error(`--- ${script} FAILED: ${e.message.slice(0,200)} ---`);
    }
  }
}
console.log('\n=== Sync All Complete ===');
