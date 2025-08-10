#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testHostAfterGameEnd() {
    console.log('🧪 Testing host functionality after game completion...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => console.log('PAGE:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
        
        // STEP 1: Host creates and starts a game
        console.log('📝 Step 1: Creating game room as host...');
        await page.goto('http://localhost:8777');
        
        await page.waitForSelector('[data-game="checkbox-game"]');
        await page.click('[data-game="checkbox-game"]');
        
        // Wait for room creation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const sessionId = await page.evaluate(() => {
            const roomCodeElement = document.getElementById('room-code-display');
            return roomCodeElement ? roomCodeElement.textContent : null;
        });
        
        console.log(`✅ Host created room: ${sessionId}`);
        
        // Verify host status and start game button
        const isHostBadgeVisible = await page.evaluate(() => {
            const hostElements = document.querySelectorAll('.player-status span');
            return Array.from(hostElements).some(el => el.textContent.includes('👑 HOST'));
        });
        const startButtonEnabled = await page.evaluate(() => {
            const btn = document.getElementById('start-game-btn-header');
            return btn && !btn.disabled && btn.style.opacity !== '0.5';
        });
        
        console.log(`🔍 Before starting: Host badge visible: ${isHostBadgeVisible}, Start button enabled: ${startButtonEnabled}`);
        
        // Start the game
        await page.click('#start-game-btn-header');
        console.log('✅ Host started the game');
        
        // Wait for game to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // STEP 2: Simulate game completion by toggling some checkboxes
        console.log('🎮 Step 2: Playing the game (clicking checkboxes)...');
        
        // Click several checkboxes to simulate gameplay
        for (let i = 0; i < 9; i++) {
            await page.click(`.checkbox-item[data-index="${i}"]`);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Wait for potential game end
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if game ended (end screen should appear)
        const endGameScreenVisible = await page.evaluate(() => {
            const endScreen = document.getElementById('end-game-screen');
            return endScreen && endScreen.style.display !== 'none';
        });
        
        console.log(`🏁 Game ended: ${endGameScreenVisible}`);
        
        if (endGameScreenVisible) {
            // STEP 3: Click OK to return to home
            console.log('📱 Step 3: Clicking OK to return to home...');
            await page.click('#ok-btn');
            
            // Wait for transition
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // STEP 4: Try to create a new game as host
            console.log('🎯 Step 4: Testing host functionality after returning home...');
            
            // Verify we're back at home screen
            const atHomeScreen = await page.evaluate(() => {
                const portal = document.getElementById('game-portal');
                return portal && portal.classList.contains('active');
            });
            
            console.log(`🏠 Back at home screen: ${atHomeScreen}`);
            
            if (atHomeScreen) {
                // Try to create a new game
                await page.click('[data-game="checkbox-game"]');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check if we can start the game (this should work!)
                const newSessionId = await page.evaluate(() => {
                    const roomCodeElement = document.getElementById('room-code-display');
                    return roomCodeElement ? roomCodeElement.textContent : null;
                });
                
                console.log(`🆕 New room created: ${newSessionId}`);
                
                // Check host status and start button functionality
                const isHostAfterRestart = await page.evaluate(() => {
                    const hostBadge = document.querySelector('.player-status span');
                    return hostBadge && hostBadge.textContent.includes('👑 HOST');
                });
                
                const startButtonEnabledAfterRestart = await page.evaluate(() => {
                    const btn = document.getElementById('start-game-btn-header');
                    return btn && !btn.disabled && btn.style.opacity !== '0.5';
                });
                
                const startButtonClickable = await page.evaluate(() => {
                    const btn = document.getElementById('start-game-btn-header');
                    const client = window.gameClient;
                    return btn && client && client.isCurrentPlayerHost();
                });
                
                console.log(`🔍 After restart: Host badge: ${isHostAfterRestart}, Button enabled: ${startButtonEnabledAfterRestart}, Client thinks is host: ${startButtonClickable}`);
                
                // Take screenshot for verification
                await page.screenshot({ 
                    path: '/Users/emilycogsdill/Desktop/test-host-after-restart.png', 
                    fullPage: true 
                });
                
                // Try to click start game button
                try {
                    await page.click('#start-game-btn-header');
                    console.log('✅ SUCCESS: Start game button clicked successfully!');
                    
                    // Wait and verify game actually started
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const gameStarted = await page.evaluate(() => {
                        const gameBoard = document.getElementById('checkbox-game-board');
                        return gameBoard && gameBoard.style.display !== 'none';
                    });
                    
                    console.log(`🎮 Game started successfully: ${gameStarted}`);
                    
                    if (gameStarted) {
                        console.log('🎉 TEST PASSED: Host can start new games after completing a game!');
                    } else {
                        console.log('❌ TEST FAILED: Start button clicked but game didn\'t start');
                    }
                    
                } catch (error) {
                    console.log('❌ TEST FAILED: Could not click start game button');
                    console.log('Error:', error.message);
                }
                
            } else {
                console.log('❌ TEST FAILED: Not back at home screen after clicking OK');
            }
        } else {
            console.log('ℹ️ Game did not end automatically - this is expected for some game types');
        }
        
        console.log('📸 Test screenshot saved to ~/Desktop/test-host-after-restart.png');
        console.log('🔍 Test complete. Browser left open for manual inspection.');
        
        // Keep browser open for inspection
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Test error:', error);
        await browser.close();
    }
}

testHostAfterGameEnd().catch(console.error);