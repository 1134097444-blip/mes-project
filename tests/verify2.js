const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: false });
  const p = await b.newPage();
  
  const errUrls = [];
  p.on('response', resp => {
    if (resp.status() >= 500) {
      errUrls.push(resp.status() + ' ' + resp.url().slice(0, 120));
    }
  });

  await p.goto('http://localhost:5100',{waitUntil:'networkidle0',timeout:30000});
  await p.waitForTimeout(2000);
  await p.fill('#loginId','1134097444@qq.com');
  await p.fill('#password','123456');
  await p.click('button[type="submit"]');
  await p.waitForURL('**/app/**',{timeout:15000});
  await p.waitForTimeout(3000);

  // Navigate to work orders object page directly
  await p.goto('http://localhost:5100/app/mes/object_mes_work_orders',{waitUntil:'networkidle0',timeout:20000});
  await p.waitForTimeout(8000);

  console.log('URL:', p.url().slice(0, 70));
  console.log('\n500 errors:');
  errUrls.forEach(u => console.log('  ' + u));
  
  const txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,300));
  const hasErr = txt.includes('Unexpected Application Error');
  console.log('\nPage has error:', hasErr);
  if (hasErr) console.log('Error text:', txt);

  await b.close();
  console.log('\nDONE');
})();
