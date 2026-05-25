const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('PAGE_ERR: ' + e.message.slice(0,100)));
  p.on('console', msg => { if(msg.type()==='error') errors.push('CONSOLE: ' + msg.text().slice(0,120)); });

  try {
    await p.goto('http://localhost:5100', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(8000);
    await p.waitForSelector('#loginId', { timeout: 30000 });
    await p.fill('#loginId', '1134097444@qq.com');
    await p.fill('#password', '123456');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(5000);
    await p.waitForSelector('.sidebar, [class*=sidebar]', { timeout: 15000 });
    console.log('登录: ✅\n');

    const pages = [
      { n: 'MES首页', u: '/app/mes/page_mes_home' },
      { n: '工艺流程导航', u: '/app/mes/page_mes_process_flow' },
      { n: '车间看板', u: '/app/mes/page_mes_workshop_board' },
      { n: '质量看板', u: '/app/mes/page_mes_quality_board' },
      { n: '设备看板', u: '/app/mes/page_mes_equipment_board' },
      { n: '工人任务', u: '/app/mes/mes_tasks' },
      { n: '生产工单', u: '/app/mes/mes_work_orders' },
      { n: '报工记录', u: '/app/mes/mes_production_reports' },
      { n: '工艺路线', u: '/app/mes/mes_routings' },
      { n: '工序定义', u: '/app/mes/mes_operations' },
      { n: '工作中心', u: '/app/mes/mes_work_centers' },
      { n: '车间管理', u: '/app/mes/mes_workshops' },
      { n: 'BOM清单', u: '/app/mes/mes_bom_items' },
      { n: '检验记录', u: '/app/mes/mes_inspection_records' },
      { n: '缺陷登记', u: '/app/mes/mes_defects' },
      { n: '不合格处理', u: '/app/mes/mes_nonconformance' },
      { n: '设备台账', u: '/app/mes/mes_equipment' },
      { n: '维保记录', u: '/app/mes/mes_maintenance_records' },
      { n: '故障报修', u: '/app/mes/mes_equipment_faults' },
      { n: '物料主数据', u: '/app/mes/mes_materials' },
      { n: '线边库存', u: '/app/mes/mes_inventory' },
    ];

    let failed = 0;
    for (const pg of pages) {
      try {
        await p.goto('http://localhost:5100' + pg.u, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await p.waitForTimeout(5000);
        const txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,250));
        const hasErr = txt.includes('Unexpected Application Error') || txt.includes('接口报错') || txt.includes('is not found');
        console.log(`${hasErr?'❌':'✅'} ${(pg.n||'').padEnd(14)} ${hasErr ? 'ERR: '+txt.slice(0,80) : 'OK'}`);
        if (hasErr) failed++;
      } catch(e) {
        console.log(`⚠️  ${(pg.n||'').padEnd(14)} ${e.message.slice(0,80)}`);
        failed++;
      }
    }

    console.log(`\n=== 结果: ${pages.length} 页, 失败 ${failed} ===`);
    if (errors.length) {
      console.log('\n控制台错误:');
      errors.forEach(e => console.log('  ' + e));
    }
  } catch(e) {
    console.log('登录失败:', e.message.slice(0,100));
  }
  await b.close();
})();
