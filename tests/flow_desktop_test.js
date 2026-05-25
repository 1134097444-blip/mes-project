const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, defaultViewport: { width: 1400, height: 900 } });
  const page = await browser.newPage();

  page.on('console', msg => { if(msg.type()==='error') console.log('[ERR]',msg.text()); });
  page.on('pageerror', err => console.log('[PE]',err.message));

  await page.goto('http://localhost:5100',{waitUntil:'networkidle0',timeout:30000});
  await page.waitForTimeout(2000);
  await page.fill('#loginId','1134097444@qq.com');
  await page.fill('#password','123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/**',{timeout:15000});
  await page.waitForTimeout(3000);
  console.log('1. Logged in');

  // Navigate to the process flow page 
  console.log('2. Navigating to process flow...');
  await page.goto('http://localhost:5100/app/desktop/page/mes_process_flow',{waitUntil:'networkidle0',timeout:20000});
  await page.waitForTimeout(8000);

  const r = await page.evaluate(() => ({
    url: location.href,
    errCount: document.querySelectorAll('.alert-danger').length,
    text: (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,800),
    lanes: document.querySelectorAll('[class*=mfp-lane]').length,
    nodes: document.querySelectorAll('[class*=mfp-node]').length,
  }));
  console.log('3. URL:', r.url);
  console.log('4. Errors:', r.errCount, 'Lanes:', r.lanes, 'Nodes:', r.nodes);
  console.log('5. Text:', r.text);

  await page.screenshot({ path: 'flow_result.png', fullPage: true });
  console.log('6. Screenshot: flow_result.png');
  console.log('=== DONE ===');
})();
