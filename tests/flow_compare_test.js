const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, defaultViewport: { width: 1400, height: 900 } });
  const page = await browser.newPage();
  page.on('console', msg => { if(msg.type()==='error') console.log('[ERR]',msg.text().slice(0,100)); });
  page.on('pageerror', err => console.log('[PE]',err.message.slice(0,100)));

  await page.goto('http://localhost:5100',{waitUntil:'networkidle0',timeout:30000});
  await page.waitForTimeout(2000);
  await page.fill('#loginId','1134097444@qq.com');
  await page.fill('#password','123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/**',{timeout:15000});
  await page.waitForTimeout(3000);

  // Load the flow page
  await page.goto('http://localhost:5100/app/desktop/page/mes_process_flow',{waitUntil:'networkidle0',timeout:20000});
  await page.waitForTimeout(5000);

  // Find all clickable elements with links to object pages
  const links = await page.evaluate(() => {
    const all = document.querySelectorAll('[href*="object_mes"], [data-href*="object_mes"], a[href*="object_mes"]');
    return Array.from(all).map(a => ({text: a.textContent.trim().slice(0,40), href: a.href || ''}));
  });
  console.log('Found links:', links.length);
  links.slice(0,5).forEach((l,i) => console.log(`  ${i+1}. "${l.text}" -> ${l.href.slice(0,60)}...`));

  // Click the first link
  if (links.length > 0) {
    console.log('\nClicking:', links[0].text);
    await page.click(`a[href="${links[0].href}"]`);
    await page.waitForTimeout(5000);
    console.log('After click URL:', page.url().slice(0, 80));
    
    // Check if the target page loaded (might be object page or error)
    const targetText = await page.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,300));
    const hasError = targetText.includes('Unexpected Application Error') || targetText.includes('list_views');
    console.log('Target has error:', hasError);
    console.log('Target text:', targetText);
  }

  await page.screenshot({ path: 'flow_click.png', fullPage: true });
  console.log('\nDONE');
})();
