/** 捕获前端加载对象时的 500 错误 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();

  // 捕获所有 500 响应
  p.on('response', resp => {
    if (resp.status() === 500) {
      resp.text().then(t => {
        const ep = resp.url().replace('http://localhost:5100', '');
        console.log(`\n[500] ${ep}`);
        console.log(`  Body: ${t.slice(0, 200)}`);
      }).catch(() => {});
    }
    if (resp.status() === 400) {
      console.log(`[400] ${resp.url().replace('http://localhost:5100', '')}`);
    }
  });

  // 登录
  await p.goto('http://localhost:5100', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(8000);
  await p.waitForSelector('#loginId', { timeout: 30000 });
  await p.fill('#loginId', '1134097444@qq.com');
  await p.fill('#password', '123456');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(8000);

  // 直接导航到工单页面
  await p.goto('http://localhost:5100/app/mes/mes_work_orders', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(8000);

  const txt = await p.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 500));
  console.log(`\nPage text: ${txt.slice(0, 200)}`);
  console.log('\nWaiting for 500 responses...');
  await p.waitForTimeout(3000);
  await b.close();
})();
