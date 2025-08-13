const puppeteer = require('puppeteer');

async function testVoteWinFlow() {
  console.log('🧪 Testing: Vote → Win Screen Flow');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Load page
    await page.goto('http://localhost:8777');
    await page.waitForSelector('.game-card[data-game="everybody-votes"]', { timeout: 5000 });
    console.log('✅ Page loaded');
    
    // Select Everybody Votes game
    await page.click('.game-card[data-game="everybody-votes"]');
    await page.waitForSelector('#start-game-btn', { timeout: 5000 });
    console.log('✅ Room created for Everybody Votes');
    
    // Start game
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for UI to be ready
    await page.screenshot({ path: 'test-before-start.png', fullPage: true });
    console.log('📸 Screenshot before start saved');
    
    // Check if start button exists and is visible
    const startBtn = await page.$('#start-game-btn');
    if (!startBtn) {
      throw new Error('Start game button not found!');
    }
    
    // Use evaluate to click the button directly
    await page.evaluate(() => {
      document.getElementById('start-game-btn').click();
    });
    console.log('🎮 Start game button clicked');
    
    // Wait a moment and take screenshot to see what happened
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'test-after-start.png', fullPage: true });
    console.log('📸 Screenshot after start saved');
    
    await page.waitForSelector('.vote-btn', { timeout: 10000 });
    console.log('✅ Game started - vote buttons found');
    
    // Take screenshot before vote
    await page.screenshot({ path: 'test-before-vote.png', fullPage: true });
    console.log('📸 Screenshot before vote saved');
    
    // Click vote button
    await page.click('.vote-btn[data-vote="Pizza"]');
    console.log('✅ Clicked Pizza vote button');
    
    // Wait for game end screen - look for the standard end screen elements
    try {
      await page.waitForSelector('#end-game-screen', { timeout: 5000 });
      console.log('✅ Game end screen appeared');
      
      // Check if win message is displayed
      const winMessage = await page.$eval('#game-result-message', el => el.textContent);
      console.log('🏆 Win message:', winMessage);
      
      // Take screenshot of win screen
      await page.screenshot({ path: 'test-win-screen.png', fullPage: true });
      console.log('📸 Win screen screenshot saved');
      
      // Check if it's the standard game end screen (not custom)
      const endScreenVisible = await page.$eval('#end-game-screen', el => 
        window.getComputedStyle(el).display !== 'none'
      );
      
      if (endScreenVisible && winMessage) {
        console.log('🎉 SUCCESS: Vote triggered standard game end screen!');
        console.log('🎯 Consistent UX achieved - same as checkbox game');
        return true;
      } else {
        console.log('❌ FAIL: Standard game end screen not properly displayed');
        return false;
      }
      
    } catch (error) {
      console.log('❌ FAIL: Game end screen did not appear');
      await page.screenshot({ path: 'test-failure.png', fullPage: true });
      console.log('📸 Failure screenshot saved');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testVoteWinFlow().then(success => {
  console.log(success ? '✅ Test PASSED' : '❌ Test FAILED');
  process.exit(success ? 0 : 1);
});