const puppeteer = require('puppeteer');

async function testHostInitialization() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        slowMo: 100
    });
    
    try {
        console.log('🧪 Testing host initialization on both local and production...\n');
        
        // Test local environment
        console.log('📍 Testing LOCAL (localhost:8777)');
        const localPage = await browser.newPage();
        const localResult = await testEnvironment(localPage, 'http://localhost:8777', 'local');
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test production environment  
        console.log('\n📍 Testing PRODUCTION (games.emilycogsdill.com)');
        const prodPage = await browser.newPage();
        const prodResult = await testEnvironment(prodPage, 'https://games.emilycogsdill.com', 'production');
        
        // Compare results
        console.log('\n🔍 COMPARISON RESULTS:');
        console.log('Local Start Game Button:', localResult.startGameEnabled ? '✅ ENABLED' : '❌ DISABLED');
        console.log('Prod Start Game Button:', prodResult.startGameEnabled ? '✅ ENABLED' : '❌ DISABLED');
        
        if (localResult.startGameEnabled && !prodResult.startGameEnabled) {
            console.log('\n🚨 ISSUE CONFIRMED: Production is not enabling Start Game button');
            console.log('Local WebSocket State:', localResult.wsState);
            console.log('Prod WebSocket State:', prodResult.wsState);
            console.log('Local Console Errors:', localResult.consoleErrors);
            console.log('Prod Console Errors:', prodResult.consoleErrors);
        }
        
        // Keep browsers open for manual inspection
        console.log('\n👀 Browsers left open for manual inspection...');
        await new Promise(() => {}); // Keep alive
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        await browser.close();
    }
}

async function testEnvironment(page, baseUrl, envName) {
    const consoleErrors = [];
    
    // Capture console messages
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    console.log(`  🌐 Loading ${baseUrl}...`);
    await page.goto(baseUrl);
    
    // Wait for page to load
    await page.waitForSelector('[data-game="checkbox-game"]', { timeout: 10000 });
    
    // Click to start checkbox game
    console.log(`  🎮 Starting checkbox game...`);
    await page.click('[data-game="checkbox-game"]');
    
    // Wait for room creation (longer timeout for WebSocket connection)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take screenshot of room state
    await page.screenshot({ 
        path: `debug-${envName}-room-state.png`, 
        fullPage: true 
    });
    
    // Check if Start Game button exists and is enabled
    let startGameEnabled = false;
    let wsState = 'unknown';
    
    try {
        // Check for Start Game button
        const startButton = await page.$('#start-game-btn-header, #start-game-btn, button:contains("Start Game")');
        
        if (startButton) {
            startGameEnabled = await page.evaluate(btn => {
                return !btn.disabled && btn.style.display !== 'none';
            }, startButton);
            console.log(`  🔘 Start Game button found and ${startGameEnabled ? 'ENABLED' : 'DISABLED'}`);
        } else {
            console.log(`  ❌ Start Game button NOT FOUND`);
        }
        
        // Check WebSocket connection state
        wsState = await page.evaluate(() => {
            if (window.gameClient && window.gameClient.ws) {
                return {
                    readyState: window.gameClient.ws.readyState,
                    url: window.gameClient.ws.url,
                    playerId: window.gameClient.currentPlayerId,
                    isHost: window.gameClient.gameState?.hostId === window.gameClient.currentPlayerId
                };
            }
            return 'no gameClient or ws';
        });
        
        console.log(`  🔌 WebSocket state:`, wsState);
        
        // Check player state
        const playerState = await page.evaluate(() => {
            if (window.gameClient) {
                return {
                    currentPlayerId: window.gameClient.currentPlayerId,
                    currentPlayer: window.gameClient.currentPlayer,
                    gameState: window.gameClient.gameState,
                    sessionId: window.gameClient.sessionId
                };
            }
            return null;
        });
        
        console.log(`  👤 Player state:`, JSON.stringify(playerState, null, 2));
        
    } catch (error) {
        console.log(`  ⚠️  Error checking button state: ${error.message}`);
    }
    
    return {
        startGameEnabled,
        wsState,
        consoleErrors,
        envName
    };
}

// Run the test
testHostInitialization().catch(console.error);