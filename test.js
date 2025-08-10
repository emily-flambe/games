const puppeteer = require('puppeteer');
const { PORT } = require('./config');
const fs = require('fs');
const path = require('path');

const isCI = process.env.CI === 'true';

(async () => {
  let browser;
  let page;
  
  try {
    console.log(`🚀 Starting test against localhost:${PORT} (CI: ${isCI})`);
    
    browser = await puppeteer.launch({
      headless: isCI ? 'new' : 'new', // Always headless for simplicity
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      executablePath: isCI ? '/usr/bin/google-chrome-stable' : undefined
    });
    
    page = await browser.newPage();
    
    // Set longer timeouts for CI stability
    const timeout = isCI ? 30000 : 10000;
    await page.setDefaultTimeout(timeout);
    
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log(`📡 Connecting to http://localhost:${PORT}...`);
    await page.goto(`http://localhost:${PORT}`, { 
      waitUntil: 'networkidle2',
      timeout: timeout 
    });
    
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    if (title.includes('Premium Web Games')) {
      console.log('✅ Test passed: Page loaded correctly');
      process.exit(0);
    } else {
      console.log('❌ Test failed: Unexpected title');
      console.log('Expected title to include "Premium Web Games"');
      
      // Take screenshot on failure for debugging
      await takeFailureScreenshot(page, 'title-mismatch');
      
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take screenshot on error for debugging
    if (page) {
      await takeFailureScreenshot(page, 'error');
    }
    
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

async function takeFailureScreenshot(page, type) {
  try {
    const screenshotDir = 'screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotDir, `test-failure-${type}-${timestamp}.png`);
    
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
  } catch (screenshotError) {
    console.error('Failed to take screenshot:', screenshotError.message);
  }
}