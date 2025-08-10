#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testSpectatorExperience() {
    console.log('🔍 Testing proper spectator experience...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    try {
        // STEP 1: Create host page and start a game
        console.log('📝 Step 1: Creating host and starting game...');
        const hostPage = await browser.newPage();
        await hostPage.goto('http://localhost:8777');
        
        // Host clicks on checkbox game to create room
        await hostPage.waitForSelector('[data-game="checkbox-game"]');
        await hostPage.click('[data-game="checkbox-game"]');
        
        // Wait for room to be created and get session ID
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the session ID from the room code display
        const sessionId = await hostPage.evaluate(() => {
            const roomCodeElement = document.getElementById('room-code-display');
            return roomCodeElement ? roomCodeElement.textContent : null;
        });
        
        console.log(`✅ Host created room with ID: ${sessionId}`);
        
        // Host starts the game
        const startButton = await hostPage.$('#start-game-btn-header');
        if (startButton) {
            await startButton.click();
            console.log('✅ Host started the game');
        } else {
            console.log('⚠️ Start button not found');
        }
        
        // Wait for game to actually start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // STEP 2: Create spectator page and join the ALREADY STARTED game
        console.log('👀 Step 2: Creating spectator and joining started game...');
        const spectatorPage = await browser.newPage();
        await spectatorPage.goto('http://localhost:8777');
        
        // Spectator joins the existing room
        await spectatorPage.waitForSelector('#room-code-input');
        await spectatorPage.type('#room-code-input', sessionId);
        await spectatorPage.click('#join-room-btn');
        
        // Wait for spectator to join the room
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check spectator UI elements
        console.log('🔍 Checking spectator UI elements...');
        
        // Check for spectator indicator at the top
        const spectatorIndicator = await spectatorPage.$('#spectator-indicator');
        if (spectatorIndicator) {
            const indicatorText = await spectatorPage.evaluate(el => el.textContent, spectatorIndicator);
            console.log(`   ✅ Spectator indicator found: "${indicatorText}"`);
        } else {
            console.log('   ❌ Spectator indicator NOT found');
        }
        
        // Check for spectator message
        const spectatorMessage = await spectatorPage.$('#spectator-message');
        if (spectatorMessage) {
            const messageText = await spectatorPage.evaluate(el => el.textContent, spectatorMessage);
            console.log(`   ✅ Spectator message found: "${messageText}"`);
        } else {
            console.log('   ❌ Spectator message NOT found');
        }
        
        // Check for spectators section
        const spectatorsSection = await spectatorPage.$('#spectators-section');
        if (spectatorsSection) {
            console.log('   ✅ Spectators section found');
            
            // Check for (YOU) indicator
            const youIndicator = await spectatorPage.evaluate(() => {
                const spectatorItems = document.querySelectorAll('.spectator-item');
                for (let item of spectatorItems) {
                    if (item.textContent.includes('(YOU)')) {
                        return item.textContent;
                    }
                }
                return null;
            });
            
            if (youIndicator) {
                console.log(`   ✅ (YOU) indicator found: "${youIndicator}"`);
            } else {
                console.log('   ❌ (YOU) indicator NOT found');
            }
        } else {
            console.log('   ❌ Spectators section NOT found');
        }
        
        // Take screenshot of spectator view
        await spectatorPage.screenshot({ 
            path: '/Users/emilycogsdill/Desktop/spectator-proper-test.png', 
            fullPage: true 
        });
        console.log('📸 Spectator screenshot saved to /Users/emilycogsdill/Desktop/spectator-proper-test.png');
        
        // Take screenshot of host view for comparison
        await hostPage.screenshot({ 
            path: '/Users/emilycogsdill/Desktop/host-view-test.png', 
            fullPage: true 
        });
        console.log('📸 Host screenshot saved to /Users/emilycogsdill/Desktop/host-view-test.png');
        
        console.log('🔍 Test complete. Both browser windows left open for manual inspection.');
        console.log('Press Ctrl+C to close.');
        
        // Keep browsers open for inspection
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Error during test:', error);
    }
}

testSpectatorExperience().catch(console.error);