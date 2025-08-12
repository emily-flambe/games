/**
 * Test the complete flow: Start → Vote → Win
 */

const puppeteer = require('puppeteer');

async function testFullFlow() {
    console.log('🧪 Testing complete flow: Start → Vote → Win');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--window-size=1200,800']
    });
    
    const page = await browser.newPage();
    
    // Log all console messages
    page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
    
    try {
        await page.goto('http://localhost:8777');
        console.log('✅ Page loaded');
        
        // 1. Create room
        await page.waitForSelector('[data-game="everybody-votes"]', { timeout: 5000 });
        await page.click('[data-game="everybody-votes"]');
        console.log('✅ Room created');
        
        // Wait for room to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. Start game
        await page.click('#start-game-btn-header');
        console.log('✅ Game started');
        
        // Wait for voting UI
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 3. Check voting UI
        const voteButtons = await page.$$('[data-vote]');
        console.log(`✅ Vote buttons found: ${voteButtons.length}`);
        
        if (voteButtons.length === 0) {
            throw new Error('No vote buttons found!');
        }
        
        // Take screenshot before voting
        await page.screenshot({ path: 'test-before-vote.png', fullPage: true });
        console.log('📸 Screenshot before vote saved');
        
        // 4. Vote for Pizza
        console.log('🗳️ About to click Pizza button...');
        await page.click('[data-vote="Pizza"]');
        console.log('✅ Clicked Pizza button');
        
        // Wait and check what happens
        console.log('⏳ Waiting 3 seconds for results...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if anything changed
        const currentContent = await page.$eval('body', el => el.textContent);
        console.log('📄 Current content includes:', {
            voting: currentContent.includes('Time to Vote'),
            results: currentContent.includes('YOU WIN'),
            pizza: currentContent.includes('Pizza'),
            burgers: currentContent.includes('Burgers')
        });
        
        // 5. Check for win screen
        const bodyText = await page.$eval('body', el => el.textContent);
        const hasWinScreen = bodyText.includes('YOU WIN!');
        
        console.log(`🏆 Win screen displayed: ${hasWinScreen}`);
        
        if (hasWinScreen) {
            console.log('🎉 SUCCESS! Complete flow works!');
        } else {
            console.log('❌ Win screen not found');
            console.log('Current content:', bodyText.substring(0, 200));
        }
        
        // Take final screenshot
        await page.screenshot({ path: 'test-after-vote.png', fullPage: true });
        console.log('📸 Screenshot after vote saved');
        
        // Keep browser open
        console.log('🔍 Keeping browser open for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('Error:', error.message);
        await page.screenshot({ path: 'test-flow-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testFullFlow().then(() => console.log('Done')).catch(console.error);