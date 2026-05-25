const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: false });
  const p = await b.newPage();
  p.on('pageerror', err => console.log('[PE]', err.message.slice(0,100)));

  await p.goto('http://localhost:5100',{waitUntil:'networkidle0',timeout:30000});
  await p.waitForTimeout(2000);
  await p.fill('#loginId','1134097444@qq.com');
  await p.fill('#password','123456');
  await p.click('button[type="submit"]');
  await p.waitForURL('**/app/**',{timeout:15000});
  await p.waitForTimeout(3000);
  console.log('1. Logged in');

  // Go to MES app
  await p.goto('http://localhost:5100/app/mes/page_mes_home',{waitUntil:'networkidle0',timeout:20000});
  await p.waitForTimeout(5000);
  
  // Check sidebar for new tabs
  const side = await p.evaluate(() => {
    const links = document.querySelectorAll('a, [class*="menu-item"]');
    return Array.from(links).map(a => a.textContent.trim().slice(0,30)).filter(t => t.length > 0);
  });
  console.log('2. Sidebar items:', side.filter(s => s.includes('车间') || s.includes('任务') || s.includes('工单')).join(' | '));

  // Click 车间管理 tab
  const found = await p.evaluate(() => {
    const links = document.querySelectorAll('a');
    for(const a of links){ if(a.textContent.includes('车间管理')){ a.click(); return true; } }
    return false;
  });
  console.log('3. Workshops tab clicked:', found);
  await p.waitForTimeout(5000);
  console.log('   URL:', p.url().slice(0,60));
  
  // Check if workshops page has data
  const txt = await p.evaluate(() => (document.body?.innerText||'').replace(/\s+/g,' ').slice(0,200));
  console.log('4. Page:', txt.slice(0,120));

  await p.screenshot({ path: 'workshops.png', fullPage: true });
  console.log('5. Screenshot saved');
  await b.close();
  console.log('=== DONE ===');
})();
