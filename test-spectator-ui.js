#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testSpectatorUI() {
    const sessionId = 'DBG' + Math.random().toString(36).substr(2, 4).toUpperCase();
    console.log(`🔍 Testing spectator UI with session: ${sessionId}`);
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    try {
        // Create host page and start game
        const hostPage = await browser.newPage();
        await hostPage.goto(`http://localhost:8777/?room=${sessionId}`);
        
        // Click on checkbox game to create room
        await hostPage.waitForSelector('[data-game="checkbox-game"]');
        await hostPage.click('[data-game="checkbox-game"]');
        
        // Wait for room to be created and start game
        await hostPage.waitForTimeout(2000);
        const startButton = await hostPage.$('#start-game-btn-header');
        if (startButton) {
            await startButton.click();
            console.log('✅ Host started the game');
        }
        
        // Wait for game to start
        await hostPage.waitForTimeout(1000);
        
        // Create spectator page
        const spectatorPage = await browser.newPage();
        await spectatorPage.goto(`http://localhost:8777`);
        
        // Join the room as spectator
        await spectatorPage.waitForSelector('#room-code-input');
        await spectatorPage.type('#room-code-input', sessionId);
        await spectatorPage.click('#join-room-btn');
        
        // Wait for room to load
        await spectatorPage.waitForTimeout(3000);
        
        // Check if spectator indicator appears
        const spectatorIndicator = await spectatorPage.$('#spectator-indicator');
        const roomInfo = await spectatorPage.$('.room-info');
        
        console.log('🔍 Checking spectator UI elements:');
        console.log(`   - Room info found: ${!!roomInfo}`);
        console.log(`   - Spectator indicator found: ${!!spectatorIndicator}`);
        
        if (spectatorIndicator) {
            const indicatorText = await spectatorPage.evaluate(el => el.textContent, spectatorIndicator);
            console.log(`   - Indicator text: "${indicatorText}"`);
        }
        
        // Check for spectator message
        const spectatorMessage = await spectatorPage.$('#spectator-message');
        if (spectatorMessage) {
            const messageText = await spectatorPage.evaluate(el => el.textContent, spectatorMessage);
            console.log(`   - Spectator message: "${messageText}"`);
        }
        
        // Take screenshot
        await spectatorPage.screenshot({ path: '/Users/emilycogsdill/Desktop/spectator-test.png', fullPage: true });
        console.log('📸 Screenshot saved to /Users/emilycogsdill/Desktop/spectator-test.png');
        
        // Keep browser open for manual inspection
        console.log('🔍 Browser left open for manual inspection. Press Ctrl+C to close.');
        await new Promise(() => {}); // Keep alive
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // Don't close browser automatically for debugging
        // await browser.close();
    }
}

testSpectatorUI().catch(console.error);