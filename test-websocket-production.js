const puppeteer = require('puppeteer');

async function testProductionWebSocket() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        slowMo: 100
    });
    
    try {
        console.log('🧪 Testing Production WebSocket Implementation');
        
        const page = await browser.newPage();
        
        // Capture console messages
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
        });
        
        console.log('📍 Loading games.emilycogsdill.com...');
        await page.goto('https://games.emilycogsdill.com');
        
        // Wait for page load
        await page.waitForSelector('[data-game="checkbox-game"]', { timeout: 10000 });
        
        // Click to start checkbox game
        console.log('🎮 Starting checkbox game...');
        await page.click('[data-game="checkbox-game"]');
        
        // Wait for room creation and WebSocket connection
        console.log('⏳ Waiting for WebSocket connection...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Check if player appears in Players section
        const playersSection = await page.$('.players-list, #players-container');
        const hasPlayers = await page.evaluate(() => {
            const container = document.querySelector('#players-container');
            return container && container.children.length > 0;
        });
        
        // Check if Start Game button is visible
        const startGameVisible = await page.evaluate(() => {
            const startBtn = document.querySelector('#start-game-btn-header') || 
                           document.querySelector('button[id*="start"]') ||
                           Array.from(document.querySelectorAll('button')).find(btn => 
                               btn.textContent.includes('Start Game'));
            return startBtn && startBtn.style.display !== 'none' && !startBtn.disabled;
        });
        
        // Check WebSocket state
        const wsState = await page.evaluate(() => {
            if (window.gameClient && window.gameClient.ws) {
                return {
                    readyState: window.gameClient.ws.readyState,
                    url: window.gameClient.ws.url,
                    playerId: window.gameClient.currentPlayerId
                };
            }
            return 'No WebSocket';
        });
        
        console.log('\n📊 RESULTS:');
        console.log('Players shown:', hasPlayers ? '✅ YES' : '❌ NO');
        console.log('Start Game button:', startGameVisible ? '✅ VISIBLE' : '❌ HIDDEN');
        console.log('WebSocket state:', wsState);
        
        // Take screenshot
        await page.screenshot({ path: 'test-production-websocket.png', fullPage: true });
        
        // Show console messages
        console.log('\n🔍 Console Messages:');
        consoleMessages.slice(-10).forEach(msg => console.log(`  ${msg}`));
        
        if (hasPlayers && startGameVisible) {
            console.log('\n🎉 SUCCESS: Production WebSocket is working!');
        } else {
            console.log('\n❌ ISSUE: WebSocket connection or player initialization failed');
        }
        
        // Keep browser open for manual inspection
        console.log('\n👀 Browser left open for inspection...');
        await new Promise(() => {}); // Keep alive
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        await browser.close();
    }
}

testProductionWebSocket().catch(console.error);