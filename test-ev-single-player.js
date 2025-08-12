/**
 * Single player test for Everybody Votes MVP
 * Tests with just one player to debug the Start Game issue
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSinglePlayer() {
    console.log('\n🧪 Testing Everybody Votes with Single Player');
    console.log('==============================================');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--window-size=1200,800']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1000, height: 700 });
        
        // Enable console logging
        page.on('console', msg => {
            console.log(`🌐 [BROWSER]: ${msg.text()}`);
        });
        
        page.on('pageerror', error => {
            console.error(`🔴 [PAGE ERROR]: ${error.message}`);
        });
        
        await page.goto('http://localhost:8777');
        
        console.log('\n📱 Creating single player room...');
        
        // Click on Everybody Votes game card
        await page.waitForSelector('[data-game="everybody-votes"]', { timeout: 5000 });
        await page.click('[data-game="everybody-votes"]');
        
        // Wait for room to be created
        await page.waitForSelector('#game-room', { timeout: 10000 });
        
        // Get the room code
        await page.waitForSelector('#room-code-display', { timeout: 5000 });
        const roomCode = await page.$eval('#room-code-display', el => el.textContent.trim());
        console.log(`✅ Created room: ${roomCode}`);
        
        // Wait for waiting room UI
        await page.waitForSelector('.waiting-room-container', { timeout: 5000 });
        
        // Check player count
        const playerCount = await page.$$eval('.player-item', items => items.length);
        console.log(`👤 Players in room: ${playerCount}`);
        
        // Screenshot: Single player waiting room
        await page.screenshot({ 
            path: 'test-single-1-waiting.png',
            fullPage: true
        });
        console.log('📸 Screenshot: Single player waiting room saved');
        
        // Check if Start Game button exists and is enabled
        const startButton = await page.$('#start-game-btn-header');
        if (!startButton) {
            console.log('❌ Start button not found');
            return;
        }
        
        const isDisabled = await page.$eval('#start-game-btn-header', btn => btn.disabled);
        const isVisible = await page.$eval('#start-game-btn-header', btn => getComputedStyle(btn).display !== 'none');
        
        console.log(`🎮 Start button - Disabled: ${isDisabled}, Visible: ${isVisible}`);
        
        if (isDisabled) {
            console.log('⚠️ Start button is disabled, trying anyway...');
        }
        
        console.log('\n🎮 Clicking Start Game...');
        await startButton.click();
        
        // Wait and see what happens
        await delay(3000);
        
        // Check what's displayed now
        const bodyText = await page.$eval('body', el => el.textContent);
        console.log('\n📄 Current page content (first 500 chars):');
        console.log(bodyText.substring(0, 500));
        
        // Look for specific elements
        const hasVotingUI = await page.$('.everybody-votes-container');
        const hasWaitingUI = await page.$('.waiting-room-container');
        
        console.log(`\n🔍 UI State:`);
        console.log(`- Voting UI present: ${!!hasVotingUI}`);
        console.log(`- Waiting UI present: ${!!hasWaitingUI}`);
        
        if (hasVotingUI) {
            console.log('✅ Voting UI appeared!');
            
            // Check for vote buttons
            const voteButtons = await page.$$('[data-vote]');
            console.log(`🗳️ Vote buttons found: ${voteButtons.length}`);
            
            if (voteButtons.length > 0) {
                // Try to vote
                console.log('🍕 Attempting to vote for Pizza...');
                await page.click('[data-vote="Pizza"]');
                await delay(2000);
                
                // Check for results
                const resultsText = await page.$eval('body', el => el.textContent);
                if (resultsText.includes('Results')) {
                    console.log('✅ Results appeared!');
                } else {
                    console.log('⏳ Still waiting for results...');
                }
            }
        } else {
            console.log('❌ Voting UI did not appear');
        }
        
        // Final screenshot
        await page.screenshot({ 
            path: 'test-single-2-after-start.png',
            fullPage: true
        });
        console.log('📸 Screenshot: After start game saved');
        
        // Keep browser open for observation
        console.log('\n🔍 Keeping browser open for 10 seconds...');
        await delay(10000);
        
    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
testSinglePlayer()
    .then(() => {
        console.log('\n🎉 Single player test completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Test failed:', error);
        process.exit(1);
    });