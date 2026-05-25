const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, defaultViewport: { width: 1400, height: 900 } });
  const p = await b.newPage();
  const results = [];

  p.on('pageerror', err => results.push('PAGE_ERR: ' + err.message.slice(0, 80)));

  try {
    await p.goto('http://localhost:5100', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForSelector('#loginId', { timeout: 20000 });
    await p.fill('#loginId', '1134097444@qq.com');
    await p.fill('#password', '123456');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(5000);
    await p.waitForSelector('.sidebar, [class*=sidebar], [class*=app]', { timeout: 15000 });
    console.log('登录: ✅');

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
        await p.goto('http://localhost:5100' + url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await p.waitForTimeout(5000);
        const text = await p.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 200));
        const hasErr = text.includes('Unexpected Application Error') || text.includes('接口报错') || text.includes('is not found');
        const name = url.split('/').pop();
        console.log(`${hasErr ? '❌' : '✅'} ${name.padEnd(30)} ${hasErr ? 'ERR: ' + text.slice(0, 50) : 'OK'}`);
      } catch (e) {
        console.log(`⚠️  ${url.split('/').pop().padEnd(30)} ${e.message.slice(0, 60)}`);
      }
    }

  } catch (e) {
    console.log('Login failed:', e.message.slice(0, 100));
  }

  if (results.length) {
    console.log('\nIssues:', results.join(', '));
  }
  console.log('\nDONE');
  await b.close();
})();
