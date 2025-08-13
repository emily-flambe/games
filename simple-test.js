/**
 * Ultra simple test to see if the voting UI appears
 */

const puppeteer = require('puppeteer');

async function simpleTest() {
    console.log('🧪 Simple test starting...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--window-size=1200,800']
    });
    
    const page = await browser.newPage();
    
    // Log all console messages
    page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
    page.on('pageerror', error => console.error(`[ERROR]: ${error.message}`));
    
    try {
        await page.goto('http://localhost:8777');
        console.log('✅ Page loaded');
        
        // Click Everybody Votes
        await page.waitForSelector('[data-game="everybody-votes"]', { timeout: 5000 });
        await page.click('[data-game="everybody-votes"]');
        console.log('✅ Clicked Everybody Votes');
        
        // Wait a bit for room to be created
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Take screenshot
        await page.screenshot({ path: 'simple-test.png', fullPage: true });
        console.log('📸 Screenshot saved');
        
        // Check what we have
        const hasGameRoom = await page.$('#game-room');
        const hasWaitingRoom = await page.$('.waiting-room-container');
        const hasStartButton = await page.$('#start-game-btn-header');
        
        console.log(`Game room: ${!!hasGameRoom}`);
        console.log(`Waiting room: ${!!hasWaitingRoom}`);
        console.log(`Start button: ${!!hasStartButton}`);
        
        if (hasStartButton) {
            console.log('🎮 Clicking start button...');
            await page.click('#start-game-btn-header');
            
            // Wait and check for phase changes
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check current phase
            const bodyText = await page.$eval('body', el => el.textContent);
            console.log('Body text contains:', {
                gameStarting: bodyText.includes('Game is starting'),
                timeToVote: bodyText.includes('Time to Vote'),
                pizzaOrBurgers: bodyText.includes('Pizza or Burgers'),
                votingUI: bodyText.includes('🗳️ Time to Vote')
            });
            
            // Wait more
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check for voting UI
            const hasVotingUI = await page.$('.everybody-votes-container');
            console.log(`Voting UI: ${!!hasVotingUI}`);
            
            if (hasVotingUI) {
                const voteButtons = await page.$$('[data-vote]');
                console.log(`Vote buttons: ${voteButtons.length}`);
            }
            
            // Final screenshot
            await page.screenshot({ path: 'simple-test-after.png', fullPage: true });
            console.log('📸 Final screenshot saved');
        }
        
        console.log('🔍 Keeping browser open...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
    } catch (error) {
        console.error('Error:', error.message);
        await page.screenshot({ path: 'simple-test-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

simpleTest().then(() => console.log('Done')).catch(console.error);