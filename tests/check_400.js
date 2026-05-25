/**
 * 定位 400 错误来源
 */
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();

  // 捕获所有 400+ 的请求
  p.on('response', resp => {
    if (resp.status() >= 400) {
      console.log(`[${resp.status()}] ${resp.url().slice(0, 120)}`);
    }
  });

  await p.goto('http://localhost:5100', { waitUntil: 'networkidle0', timeout: 30000 });
  await p.waitForTimeout(2000);
  await p.fill('#loginId', '1134097444@qq.com');
  await p.fill('#password', '123456');
  await p.click('button[type="submit"]');
  await p.waitForURL('**/app/**', { timeout: 15000 });
  await p.waitForTimeout(5000);

  // 加载几个页面，看哪些出 400
  const urls = ['/app/mes/page_mes_home', '/app/mes/mes_work_orders', '/app/mes/mes_equipment'];
  for (const u of urls) {
    await p.goto('http://localhost:5100' + u, { waitUntil: 'networkidle0', timeout: 20000 });
    await p.waitForTimeout(3000);
  }

  console.log('\n--- DONE ---');
  await b.close();
})();
