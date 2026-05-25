const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => { if(msg.type()!=='verbose') console.log(`[BROWSER] ${msg.text()}`); });
  page.on('response', resp => { if(resp.status()>=500) console.log(`[HTTP ${resp.status()}] ${resp.url().slice(0,150)}`); });
  
  console.log('1. Login...');
  await page.goto('http://localhost:5100', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.fill('#loginId', '1134097444@qq.com');
  await page.fill('#password', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/**', { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('2. Logged in, current:', page.url());
  
  // 截图默认页面
  await page.screenshot({ path: 'login_default.png' });
  
  // 直接导航到 MES 首页
  console.log('3. Navigating to /app/mes/page/mes_home...');
  await page.goto('http://localhost:5100/app/mes/page/mes_home', { waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'mes_home.png' });
  
  const text = await page.evaluate(() => document.body?.innerText || '');
  console.log('4. Page text (first 1000):', text.slice(0, 1000));
  
  // 检查是否有报错
  const errors = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.alert, .error, [class*="danger"], [class*="error"]'))
      .map(e => e.textContent?.trim())
      .filter(Boolean);
  });
  if(errors.length) console.log('5. Errors on page:', errors);
  else console.log('5. No visible errors');
  
  // 截图工单看板
  await page.goto('http://localhost:5100/app/mes/page/mes_workshop_board', { waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'workshop_board.png' });
  const wsText = await page.evaluate(() => document.body?.innerText || '');
  console.log('6. Workshop board text:', wsText.slice(0, 500));
  
  console.log('\n=== Browser open on desktop ===');
})();
