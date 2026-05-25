const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: false, viewport: { width: 1400, height: 900 } });
  const p = await b.newPage();
  p.on('console', m => { if(m.type()==='error') console.log('[ERR]',m.text().slice(0,80)); });

  await p.goto('http://localhost:5100',{waitUntil:'networkidle0',timeout:30000});
  await p.waitForTimeout(2000);
  await p.fill('#loginId','1134097444@qq.com');
  await p.fill('#password','123456');
  await p.click('button[type="submit"]');
  await p.waitForURL('**/app/**',{timeout:15000});
  await p.waitForTimeout(3000);

  await p.goto('http://localhost:5100/app/desktop/page/mes_process_flow',{waitUntil:'networkidle0',timeout:20000});
  await p.waitForTimeout(6000);

  // Find ALL clickable elements and click the production order button
  const result = await p.evaluate(() => {
    const all = document.querySelectorAll('a[href*="object_mes"]');
    for (const el of all) {
      const t = el.textContent.trim();
      if (t.includes('生产工单')) {
        // Try clicking via DOM
        const rect = el.getBoundingClientRect();
        return { found: true, text: t.slice(0,30), x: rect.x, y: rect.y, w: rect.width, h: rect.height, tag: el.tagName };
      }
    }
    return { found: false };
  });
  console.log('Found button:', JSON.stringify(result));

  if (result.found) {
    // Click at the center of the element
    await p.mouse.click(result.x + result.w/2, result.y + result.h/2);
    await p.waitForTimeout(5000);
    console.log('After click URL:', p.url().slice(0,80));
    const txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,200));
    const hasErr = txt.includes('Unexpected Application Error') || txt.includes('list_views');
    console.log('Has error:', hasErr);
    console.log('Page text:', txt);
    await p.screenshot({ path: 'click_result.png', fullPage: true });
  }
  await b.close();
  console.log('DONE');
})();
