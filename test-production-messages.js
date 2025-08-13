const puppeteer = require('puppeteer');

async function testProductionMessages() {
  console.log('🧪 Testing production WebSocket messages...');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Inject message logging script
  await page.evaluateOnNewDocument(() => {
    // Override WebSocket to log all messages
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      console.log('🔗 Creating WebSocket:', url);
      const ws = new OriginalWebSocket(url, protocols);
      
      const originalSend = ws.send;
      ws.send = function(data) {
        console.log('📤 WebSocket SEND:', data);
        return originalSend.call(this, data);
      };
      
      ws.addEventListener('open', () => {
        console.log('✅ WebSocket OPENED');
      });
      
      ws.addEventListener('message', (event) => {
        console.log('📥 WebSocket MESSAGE:', event.data);
        try {
          const parsed = JSON.parse(event.data);
          console.log('📋 Parsed type:', parsed.type, 'Data keys:', Object.keys(parsed));
        } catch (e) {
          console.log('❌ Failed to parse message');
        }
      });
      
      ws.addEventListener('close', (event) => {
        console.log('❌ WebSocket CLOSED:', event.code, event.reason);
      });
      
      ws.addEventListener('error', (event) => {
        console.log('💥 WebSocket ERROR:', event);
      });
      
      return ws;
    };
  });

  // Monitor console messages
  page.on('console', (msg) => {
    console.log(`🖥️  ${msg.text()}`);
  });

  try {
    console.log('📍 Navigating to production...');
    await page.goto('https://games.emilycogsdill.com');
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForSelector('.game-card');

    console.log('🗳️  Clicking Everybody Votes...');
    await page.click('button.game-card[data-game="everybody-votes"]');

    console.log('⏳ Waiting 10 seconds to capture all WebSocket messages...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('✅ Message capture complete');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testProductionMessages();