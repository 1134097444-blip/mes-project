const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: false, viewport: { width: 1400, height: 900 } });
  const p = await b.newPage();
  p.on('console', msg => { if(msg.type()==='error' && !msg.text().includes('400')) console.log('[ERR]', msg.text().slice(0,80)); });
  p.on('pageerror', err => console.log('[PE]', err.message.slice(0,80)));

  await p.goto('http://localhost:5100',{waitUntil:'networkidle0',timeout:30000});
  await p.waitForTimeout(2000);
  await p.fill('#loginId','1134097444@qq.com');
  await p.fill('#password','123456');
  await p.click('button[type="submit"]');
  await p.waitForURL('**/app/**',{timeout:15000});
  await p.waitForTimeout(3000);
  console.log('1. LOGGED IN');

  // MES Home via page route
  await p.goto('http://localhost:5100/app/mes/page_mes_home',{waitUntil:'networkidle0',timeout:20000});
  await p.waitForTimeout(7000);
  console.log('2. MES HOME:', p.url().slice(0,70));
  let txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,200));
  console.log('   ', txt.includes('Unexpected') ? 'ERR' : 'OK', '-', txt.slice(0,60));

  // Work Centers (synced data)
  await p.goto('http://localhost:5100/app/mes/mes_work_centers',{waitUntil:'networkidle0',timeout:20000});
  await p.waitForTimeout(6000);
  console.log('3. WORK CENTERS:', p.url().slice(0,70));
  txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,200));
  console.log('   ', txt.includes('Unexpected') ? 'ERR' : 'OK', '-', txt.slice(0,60));

  // Operations
  await p.goto('http://localhost:5100/app/mes/mes_operations',{waitUntil:'networkidle0',timeout:20000});
  await p.waitForTimeout(6000);
  console.log('4. OPERATIONS:', p.url().slice(0,70));
  txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,200));
  console.log('   ', txt.includes('Unexpected') ? 'ERR' : 'OK', '-', txt.slice(0,60));

  // Work Orders (synced)
  await p.goto('http://localhost:5100/app/mes/mes_work_orders',{waitUntil:'networkidle0',timeout:20000});
  await p.waitForTimeout(6000);
  console.log('5. WORK ORDERS:', p.url().slice(0,70));
  txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,200));
  console.log('   ', txt.includes('Unexpected') ? 'ERR' : 'OK', '-', txt.slice(0,60));

  // Flow Diagram
  await p.goto('http://localhost:5100/app/mes/page_mes_process_flow',{waitUntil:'networkidle0',timeout:20000});
  await p.waitForTimeout(6000);
  console.log('6. FLOW DIAGRAM:', p.url().slice(0,70));
  txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,200));
  console.log('   ', txt.includes('Unexpected') ? 'ERR' : 'OK', '-', txt.includes('生产工单') ? 'has nodes' : 'no nodes');

  await b.close();
  console.log('\nDONE');
})();
