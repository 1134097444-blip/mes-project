/**
 * 全量页面验证 v2 — 更稳定的等待策略
 */
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ headless: true, defaultViewport: { width: 1400, height: 900 } });
  const p = await b.newPage();
  const results = [];
  const issues = [];

  p.on('console', msg => {
    if (msg.type() === 'error') issues.push('[CONSOLE] ' + msg.text().slice(0, 120));
  });
  p.on('pageerror', err => issues.push('[PAGE_ERR] ' + err.message.slice(0, 120)));

  // 登录
  await p.goto('http://localhost:5100', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForSelector('#loginId', { timeout: 30000 });
  await p.fill('#loginId', '1134097444@qq.com');
  await p.fill('#password', '123456');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(5000);
  await p.waitForSelector('.sidebar, [class*=sidebar], [class*=app], .app-wrapper', { timeout: 20000 });
  results.push({ name: '登录', status: '✅' });

  // 页面清单
  const pages = [
    '/app/mes/page_mes_home', '/app/mes/page_mes_process_flow',
    '/app/mes/page_mes_workshop_board', '/app/mes/page_mes_quality_board',
    '/app/mes/page_mes_equipment_board',
    '/app/mes/mes_tasks', '/app/mes/mes_work_orders', '/app/mes/mes_production_reports',
    '/app/mes/mes_routings', '/app/mes/mes_operations', '/app/mes/mes_work_centers',
    '/app/mes/mes_workshops', '/app/mes/mes_bom_items',
    '/app/mes/mes_inspection_records', '/app/mes/mes_defects', '/app/mes/mes_nonconformance',
    '/app/mes/mes_equipment', '/app/mes/mes_maintenance_records', '/app/mes/mes_equipment_faults',
    '/app/mes/mes_materials', '/app/mes/mes_inventory',
  ];

  for (const url of pages) {
    try {
      await p.goto('http://localhost:5100' + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(5000);
      const text = await p.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 200));
      const hasErr = text.includes('Unexpected Application Error') || text.includes('接口报错');
      const name = url.split('/').pop();
      results.push({ name, status: hasErr ? '❌' : '✅', text: text.slice(0, 60) });
      if (hasErr) issues.push('[FAIL] ' + name + ': ' + text.slice(0, 100));
    } catch (e) {
      const name = url.split('/').pop();
      results.push({ name, status: '❌', text: e.message.slice(0, 60) });
      issues.push('[FAIL] ' + name + ': ' + e.message.slice(0, 100));
    }
  }

  console.log('\n=== 页面验证结果 ===\n');
  for (const r of results) {
    console.log((r.name || '').padEnd(30), r.status, r.text || '');
  }
  const fails = results.filter(r => r.status === '❌').length;
  console.log(`\n总计: ${results.length}, 通过: ${results.length - fails}, 失败: ${fails}`);
  if (issues.length) {
    console.log('\n=== 问题 ===');
    issues.forEach(i => console.log(i));
  }
  await b.close();
})();
