const puppeteer = require('puppeteer');

async function testWebSocketEstablishment() {
  console.log('🧪 Testing WebSocket establishment');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor console for WebSocket messages
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('WebSocket') || text.includes('gameState') || text.includes('Connected') || text.includes('Error')) {
      console.log(`🖥️  ${text}`);
    }
  });

  // Inject WebSocket monitoring
  await page.evaluateOnNewDocument(() => {
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      console.log('🔗 Creating WebSocket connection to:', url);
      const ws = new originalWebSocket(url, protocols);
      
      ws.addEventListener('open', () => {
        console.log('✅ WebSocket connection opened successfully');
      });
      
      ws.addEventListener('close', (event) => {
        console.log('❌ WebSocket connection closed. Code:', event.code, 'Reason:', event.reason);
      });
      
      ws.addEventListener('error', (event) => {
        console.log('💥 WebSocket connection error:', event);
      });
      
      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 WebSocket message type:', data.type);
        } catch (e) {
          console.log('📥 WebSocket raw message:', event.data.substring(0, 100));
        }
      });
      
      return ws;
    };
  });

  try {
    console.log('📍 Navigate and click Everybody Votes');
    await page.goto('https://games.emilycogsdill.com', { waitUntil: 'domcontentloaded' });
    await page.click('button.game-card[data-game="everybody-votes"]');
    
    console.log('⏳ Wait for WebSocket connection establishment (10 seconds)');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if we have players in the room (indicating successful connection)
    const playerItems = await page.$$('.player-item');
    console.log(`Found ${playerItems.length} players in room`);
    
    if (playerItems.length > 0) {
      console.log('✅ WebSocket connection appears successful - found players');
      
      // Try to start the game
      const startButton = await page.$('#start-game-btn-header');
      if (startButton) {
        console.log('🚀 Start button found - attempting to start game');
        await startButton.click();
        
        // Wait for game start
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check for voting interface
        const votingButtons = await page.$$('button[data-vote]');
        console.log(`Found ${votingButtons.length} voting buttons`);
        
        if (votingButtons.length > 0) {
          console.log('✅ SUCCESS: Voting interface is available');
        } else {
          console.log('❌ No voting buttons found after starting game');
        }
      } else {
        console.log('❌ Start button not found');
      }
    } else {
      console.log('❌ No players found - WebSocket connection likely failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testWebSocketEstablishment();