/**
 * 前端控制台全量抓取 — 不猜,只看
 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();

  // 抓所有控制台输出
  const logs = [];
  p.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text().slice(0, 300)}`);
  });
  p.on('pageerror', err => {
    logs.push(`[PAGE_CRASH] ${err.message.slice(0, 300)}`);
  });

  // 抓所有网络请求
  p.on('request', req => {
    const url = req.url().replace('http://localhost:5100', '');
    if (url.includes('/service/api/@') || url.includes('uiSchema') || url.includes('schema/object') || url.includes('uischema')) {
      logs.push(`[REQ] ${req.method()} ${url}`);
    }
  });
  p.on('response', resp => {
    const url = resp.url().replace('http://localhost:5100', '');
    if (resp.status() >= 400 || url.includes('uiSchema') || url.includes('uischema')) {
      logs.push(`[RES ${resp.status()}] ${url}`);
    }
  });

  // 登录
  console.log('=== 登录 ===');
  await p.goto('http://localhost:5100', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(8000);
  await p.waitForSelector('#loginId', { timeout: 30000 });
  await p.fill('#loginId', '1134097444@qq.com');
  await p.fill('#password', '123456');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(8000);

  // 导航到工单页面
  console.log('=== 导航到 mes_work_orders ===');
  await p.goto('http://localhost:5100/app/mes/mes_work_orders', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForTimeout(15000);

  // 输出页面文本
  const txt = await p.evaluate(() => document.body?.innerText || '');
  console.log('\n=== 页面内容 ===');
  txt.split('\n').filter(l => l.trim()).slice(0, 40).forEach(l => console.log('  ' + l));

  // 输出所有控制台日志
  console.log('\n=== 控制台日志 (按时间顺序) ===');
  logs.forEach(l => console.log(l));

  // 输出关键发现
  const uiSchemaCalls = logs.filter(l => l.includes('/service/api/@') || l.includes('uiSchema'));
  console.log('\n=== uiSchema 相关请求 ===');
  uiSchemaCalls.forEach(l => console.log(l));

  await b.close();
  console.log('\n=== DONE ===');
})();
