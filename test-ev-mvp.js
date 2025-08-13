/**
 * Puppeteer test for Everybody Votes MVP
 * Tests the complete flow: create room → join → start → vote → results
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:8777';
const ROOM_CODE = 'TEST' + Math.random().toString(36).substring(2, 6).toUpperCase();

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEverybodyVotesMVP() {
    console.log('\n🧪 Starting Everybody Votes MVP Test');
    console.log('====================================');
    console.log(`Room code: ${ROOM_CODE}`);
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: false,
        args: ['--window-size=1400,900']
    });
    
    try {
        // Create Player 1 (Host)
        console.log('\n📱 Creating Player 1 (Host)...');
        const page1 = await browser.newPage();
        await page1.setViewport({ width: 600, height: 800 });
        await page1.goto(BASE_URL);
        
        // Player 1 clicks on Everybody Votes game card
        await page1.waitForSelector('[data-game="everybody-votes"]', { timeout: 5000 });
        await page1.click('[data-game="everybody-votes"]');
        
        // Room is created automatically, wait for game room to load
        await page1.waitForSelector('#game-room', { timeout: 10000 });
        
        // Get the room code that was generated
        await page1.waitForSelector('#room-code-display', { timeout: 5000 });
        const generatedRoomCode = await page1.$eval('#room-code-display', el => el.textContent.trim());
        console.log(`✅ Player 1 created room: ${generatedRoomCode}`);
        
        // Wait for waiting room UI
        await page1.waitForSelector('.waiting-room-container', { timeout: 5000 });
        
        // Create Player 2
        console.log('\n📱 Creating Player 2...');
        const page2 = await browser.newPage();
        await page2.setViewport({ width: 600, height: 800 });
        await page2.goto(BASE_URL);
        
        // Player 2 joins using room code
        await page2.waitForSelector('#room-code-input', { timeout: 5000 });
        await page2.type('#room-code-input', generatedRoomCode);
        await page2.click('#join-room-btn');
        
        // Wait for Player 2 to join the room
        await page2.waitForSelector('#game-room', { timeout: 10000 });
        await page2.waitForSelector('.waiting-room-container', { timeout: 5000 });
        console.log('✅ Player 2 joined room');
        
        // Give time for WebSocket to sync
        await delay(2000);
        
        // Check that both players see each other
        const player1Count = await page1.$$eval('.player-item', items => items.length);
        const player2Count = await page2.$$eval('.player-item', items => items.length);
        
        if (player1Count < 2) {
            throw new Error(`Player 1 should see 2 players, but sees ${player1Count}`);
        }
        if (player2Count < 2) {
            throw new Error(`Player 2 should see 2 players, but sees ${player2Count}`);
        }
        console.log('✅ Both players see each other in waiting room');
        
        // Screenshot: Waiting room with 2 players
        await page1.screenshot({ 
            path: 'test-ev-mvp-1-waiting.png',
            fullPage: true
        });
        console.log('📸 Screenshot: Waiting room saved');
        
        // Host starts the game
        console.log('\n🎮 Host starting the game...');
        const startButton = await page1.$('#start-game-btn');
        if (!startButton) {
            throw new Error('Start button not found for host');
        }
        
        // Check button is visible and enabled
        const isDisabled = await page1.$eval('#start-game-btn', btn => btn.disabled);
        if (isDisabled) {
            throw new Error('Start button is disabled');
        }
        
        await startButton.click();
        console.log('✅ Clicked start button');
        
        // Wait for voting phase to begin
        await delay(3000);
        
        // Check for voting UI on both pages
        console.log('\n🗳️ Checking voting phase...');
        
        // Player 1 should see voting UI
        await page1.waitForSelector('.everybody-votes-container', { timeout: 5000 });
        const player1VoteButtons = await page1.$$('[data-vote]');
        if (player1VoteButtons.length !== 2) {
            // Take diagnostic screenshot
            await page1.screenshot({ 
                path: 'test-ev-mvp-error-p1.png',
                fullPage: true
            });
            const content = await page1.$eval('body', el => el.textContent);
            console.log('Page 1 content:', content.substring(0, 500));
            throw new Error(`Player 1 should see 2 vote buttons, found ${player1VoteButtons.length}`);
        }
        console.log('✅ Player 1 sees voting UI');
        
        // Player 2 should see voting UI
        await page2.waitForSelector('.everybody-votes-container', { timeout: 5000 });
        const player2VoteButtons = await page2.$$('[data-vote]');
        if (player2VoteButtons.length !== 2) {
            // Take diagnostic screenshot
            await page2.screenshot({ 
                path: 'test-ev-mvp-error-p2.png',
                fullPage: true
            });
            const content = await page2.$eval('body', el => el.textContent);
            console.log('Page 2 content:', content.substring(0, 500));
            throw new Error(`Player 2 should see 2 vote buttons, found ${player2VoteButtons.length}`);
        }
        console.log('✅ Player 2 sees voting UI');
        
        // Check that question is "Pizza or Burgers?"
        const question1 = await page1.$eval('.everybody-votes-container h3', el => el.textContent);
        if (!question1.includes('Pizza') || !question1.includes('Burgers')) {
            throw new Error(`Wrong question displayed: ${question1}`);
        }
        console.log('✅ Correct question displayed: Pizza or Burgers?');
        
        // Screenshot: Voting phase
        await page1.screenshot({ 
            path: 'test-ev-mvp-2-voting.png',
            fullPage: true
        });
        console.log('📸 Screenshot: Voting phase saved');
        
        // Player 1 votes for Pizza
        console.log('\n🍕 Player 1 voting for Pizza...');
        const pizzaButton1 = await page1.$('[data-vote="Pizza"]');
        if (!pizzaButton1) {
            throw new Error('Pizza button not found for Player 1');
        }
        await pizzaButton1.click();
        await delay(1000);
        
        // Verify Player 1 sees vote confirmation
        const voteConfirm1 = await page1.$eval('.everybody-votes-container', el => el.textContent);
        if (!voteConfirm1.includes('Vote submitted') && !voteConfirm1.includes('✅')) {
            throw new Error('Player 1 vote confirmation not shown');
        }
        console.log('✅ Player 1 voted for Pizza');
        
        // Player 2 votes for Burgers
        console.log('\n🍔 Player 2 voting for Burgers...');
        const burgersButton2 = await page2.$('[data-vote="Burgers"]');
        if (!burgersButton2) {
            throw new Error('Burgers button not found for Player 2');
        }
        await burgersButton2.click();
        await delay(1000);
        
        // Verify Player 2 sees vote confirmation
        const voteConfirm2 = await page2.$eval('.everybody-votes-container', el => el.textContent);
        if (!voteConfirm2.includes('Vote submitted') && !voteConfirm2.includes('✅')) {
            throw new Error('Player 2 vote confirmation not shown');
        }
        console.log('✅ Player 2 voted for Burgers');
        
        // Wait for results (should auto-transition after all votes)
        console.log('\n⏳ Waiting for results...');
        await delay(3000);
        
        // Check for results on both pages
        console.log('\n📊 Checking results phase...');
        
        // Player 1 should see results
        await page1.waitForSelector('.everybody-votes-container', { timeout: 10000 });
        const results1 = await page1.$eval('.everybody-votes-container', el => el.textContent);
        if (!results1.includes('Results')) {
            // Take diagnostic screenshot
            await page1.screenshot({ 
                path: 'test-ev-mvp-error-results-p1.png',
                fullPage: true
            });
            console.log('Player 1 content:', results1.substring(0, 500));
            throw new Error('Player 1 not seeing results');
        }
        
        // Check that results show the votes
        if (!results1.includes('Pizza') || !results1.includes('Burgers')) {
            throw new Error('Results missing vote options');
        }
        
        // Should show it's a tie (1 vote each)
        if (!results1.includes('tie')) {
            console.log('⚠️ Warning: Expected a tie with 1 vote each');
        }
        
        console.log('✅ Player 1 sees results');
        
        // Player 2 should see results
        await page2.waitForSelector('.everybody-votes-container', { timeout: 10000 });
        const results2 = await page2.$eval('.everybody-votes-container', el => el.textContent);
        if (!results2.includes('Results')) {
            // Take diagnostic screenshot
            await page2.screenshot({ 
                path: 'test-ev-mvp-error-results-p2.png',
                fullPage: true
            });
            console.log('Player 2 content:', results2.substring(0, 500));
            throw new Error('Player 2 not seeing results');
        }
        console.log('✅ Player 2 sees results');
        
        // Screenshot: Results phase
        await page1.screenshot({ 
            path: 'test-ev-mvp-3-results.png',
            fullPage: true
        });
        console.log('📸 Screenshot: Results phase saved');
        
        // Final verification
        console.log('\n✅ MVP Test Complete!');
        console.log('====================');
        console.log('✓ Room created successfully');
        console.log('✓ Both players joined');
        console.log('✓ Game started successfully');
        console.log('✓ Both players could vote');
        console.log('✓ Results displayed correctly');
        console.log('✓ Game flow completed');
        
        // Save test results
        const testResults = {
            success: true,
            roomCode: generatedRoomCode,
            timestamp: new Date().toISOString(),
            steps: [
                'Room created',
                'Players joined',
                'Game started',
                'Votes submitted',
                'Results displayed'
            ],
            screenshots: [
                'test-ev-mvp-1-waiting.png',
                'test-ev-mvp-2-voting.png',
                'test-ev-mvp-3-results.png'
            ]
        };
        
        fs.writeFileSync('test-ev-mvp-results.json', JSON.stringify(testResults, null, 2));
        console.log('\n📄 Test results saved to test-ev-mvp-results.json');
        
    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        console.error('Stack:', error.stack);
        
        // Take error screenshots
        const pages = await browser.pages();
        for (let i = 0; i < pages.length; i++) {
            if (pages[i].url() !== 'about:blank') {
                await pages[i].screenshot({ 
                    path: `test-ev-mvp-error-final-${i}.png`,
                    fullPage: true
                });
            }
        }
        
        // Save error report
        const errorReport = {
            success: false,
            error: error.message,
            stack: error.stack,
            roomCode: ROOM_CODE,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync('test-ev-mvp-error.json', JSON.stringify(errorReport, null, 2));
        console.log('📄 Error report saved to test-ev-mvp-error.json');
        
        throw error;
        
    } finally {
        // Keep browser open for 5 seconds to observe final state
        console.log('\n🔍 Keeping browser open for observation...');
        await delay(5000);
        await browser.close();
    }
}

// Run the test
testEverybodyVotesMVP()
    .then(() => {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Test suite failed:', error);
        process.exit(1);
    });