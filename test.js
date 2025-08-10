const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8080');
    
    const title = await page.title();
    console.log('Page title:', title);
    
    if (title.includes('Premium Web Games')) {
      console.log('✅ Test passed: Page loaded correctly');
      process.exit(0);
    } else {
      console.log('❌ Test failed: Unexpected title');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();