const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, defaultViewport: { width: 1400, height: 900 } });
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message.slice(0,100)));
  p.on('console', msg => { if(msg.type()==='error') errors.push(msg.text().slice(0,120)); });

  try {
    await p.goto('http://localhost:5100', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(8000);
    await p.waitForSelector('#loginId', { timeout: 30000 });
    await p.fill('#loginId', '1134097444@qq.com');
    await p.fill('#password', '123456');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(8000);
    console.log('Login: ✅\n');

    const items = [
      'page_mes_home','page_mes_process_flow','page_mes_workshop_board',
      'page_mes_quality_board','page_mes_equipment_board',
      'mes_tasks','mes_work_orders','mes_production_reports','mes_routings',
      'mes_operations','mes_work_centers','mes_workshops','mes_bom_items',
      'mes_inspection_records','mes_defects','mes_nonconformance',
      'mes_equipment','mes_maintenance_records','mes_equipment_faults',
      'mes_materials','mes_inventory',
    ];

    let pass = 0, fail = 0;
    for (const name of items) {
      try {
        await p.goto('http://localhost:5100/app/mes/' + name, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await p.waitForTimeout(8000);
        const txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,300));
        const crashed = txt.includes('Unexpected Application Error') || txt.includes('接口报错');
        const hasViewErr = txt.includes('undefined视图') || txt.includes('视图不存在');
        console.log(`${crashed?'❌':hasViewErr?'⚠️':'✅'} ${(name||'').padEnd(25)} ${hasViewErr?'VIEW_ERR':'OK'}`);
        if (crashed) fail++; else pass++;
      } catch(e) {
        console.log(`⚠️  ${(name||'').padEnd(25)} ${e.message.slice(0,60)}`);
        fail++;
      }
    }

    console.log(`\n结果: ${pass}✅ ${fail}❌`);
    if (errors.length > 0) {
      console.log('\nConsole errors:');
      errors.slice(0,10).forEach(e => console.log('  ' + e.slice(0,100)));
    }
  } catch(e) {
    console.log('FAIL:', e.message.slice(0,100));
  }
  await b.close();
})();
