const puppeteer = require('puppeteer');

async function testProductionWebSocket() {
  console.log('🧪 Testing production WebSocket connection...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor console messages
  page.on('console', (msg) => {
    console.log('🖥️  Browser:', msg.text());
  });

  // Monitor network events
  page.on('requestfailed', (request) => {
    console.log('❌ Network failure:', request.url(), request.failure().errorText);
  });

  // Monitor WebSocket connections
  page.on('websocketconnection', (websocket) => {
    console.log('🔗 WebSocket opened:', websocket.url());
    
    websocket.on('framereceived', (frame) => {
      console.log('📥 WebSocket received:', frame.payload);
    });
    
    websocket.on('framesent', (frame) => {
      console.log('📤 WebSocket sent:', frame.payload);
    });
    
    websocket.on('close', () => {
      console.log('❌ WebSocket closed');
    });
  });

  try {
    // Navigate to production
    console.log('📍 Navigating to https://games.emilycogsdill.com');
    await page.goto('https://games.emilycogsdill.com');
    
    // Wait for page to load
    await page.waitForSelector('.game-card');
    console.log('✅ Game selection page loaded');

    // Click on Everybody Votes
    await page.click('button.game-card[data-game="everybody-votes"]');
    console.log('🗳️  Clicked Everybody Votes');

    // Wait longer to see what happens with WebSocket connection
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('⏰ Waited 10 seconds for connection attempt');

    // Check what's displayed on screen
    await page.screenshot({ path: 'production-websocket-debug.png' });
    console.log('📸 Screenshot saved');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testProductionWebSocket();