const puppeteer = require('puppeteer');

async function testProductionDetailed() {
  console.log('🧪 Testing production with detailed debugging...');
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();

  // Capture all console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    console.log(`🖥️  [${type.toUpperCase()}] ${text}`);
  });

  // Capture errors
  page.on('pageerror', (error) => {
    console.log('❌ Page Error:', error.message);
  });

  // Capture request failures  
  page.on('requestfailed', (request) => {
    console.log('❌ Request Failed:', request.url(), request.failure().errorText);
  });

  // Track responses
  page.on('response', (response) => {
    if (response.url().includes('/api/game/') && response.url().includes('/ws')) {
      console.log(`🌐 WebSocket request response: ${response.url()} - Status: ${response.status()}`);
    }
  });

  try {
    console.log('📍 Navigating to production...');
    await page.goto('https://games.emilycogsdill.com');
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForSelector('.game-card');

    console.log('🗳️  Clicking Everybody Votes...');
    await page.click('button.game-card[data-game="everybody-votes"]');

    console.log('⏳ Waiting to see what happens...');
    // Wait 15 seconds to see the full flow
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'production-detailed-test.png' });

    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'production-error-detailed.png' });
  }

  // Keep browser open for manual inspection
  console.log('🔍 Browser left open for manual inspection.');
}

testProductionDetailed();