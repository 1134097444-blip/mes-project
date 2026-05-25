const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.log(`[BROWSER ERROR] ${err.message}`);
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  try {
    console.log('Navigating to http://localhost:5100 ...');
    await page.goto('http://localhost:5100', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('Page loaded. URL:', page.url());
    
    // Wait a bit for any async rendering
    await new Promise(r => setTimeout(r, 3000));
    
    // Check page content
    const title = await page.title();
    console.log('Page title:', title);
    
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
    console.log('Body text:', bodyText);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'screenshot.png', fullPage: true });
    console.log('Screenshot saved to screenshot.png');
    
  } catch (err) {
    console.log('Navigation error:', err.message);
  }
  
  // Don't close - keep the browser open so user can see it
  console.log('\nBrowser is now open. Check the window on your desktop.');
})();
