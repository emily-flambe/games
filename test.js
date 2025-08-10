const puppeteer = require('puppeteer');
const { PORT } = require('./config');

(async () => {
  let browser;
  
  try {
    console.log(`🚀 Starting test against localhost:${PORT}`);
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set a timeout and wait for the page to load
    await page.setDefaultTimeout(10000);
    
    console.log(`📡 Connecting to http://localhost:${PORT}...`);
    await page.goto(`http://localhost:${PORT}`, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    if (title.includes('Premium Web Games')) {
      console.log('✅ Test passed: Page loaded correctly');
      process.exit(0);
    } else {
      console.log('❌ Test failed: Unexpected title');
      console.log('Expected title to include "Premium Web Games"');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Additional debug info
    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error('💡 Hint: Make sure the development server is running on port', PORT);
    }
    
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();