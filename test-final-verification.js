const puppeteer = require('puppeteer');

async function testFinalVerification() {
  console.log('🧪 Final verification test...');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Monitor console messages for errors
  page.on('console', (msg) => {
    console.log(`🖥️  ${msg.text()}`);
  });

  // Monitor JavaScript errors
  page.on('pageerror', (error) => {
    console.log('❌ JavaScript Error:', error.message);
  });

  try {
    // Navigate to production
    console.log('📍 Navigating to https://games.emilycogsdill.com');
    await page.goto('https://games.emilycogsdill.com');
    
    // Click Everybody Votes
    await page.waitForSelector('.game-card');
    await page.click('button.game-card[data-game="everybody-votes"]');
    console.log('🗳️  Clicked Everybody Votes');

    // Wait for room to load and check if players appear
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if players are displayed
    const playersContainer = await page.$('#players-container');
    const playerItems = await page.$$('.player-item');
    
    console.log(`👥 Found ${playerItems.length} players in the UI`);
    
    if (playerItems.length > 0) {
      console.log('✅ SUCCESS: Players are visible in the UI!');
      
      // Try to start the game
      const startButton = await page.$('#start-game-btn-header');
      if (startButton) {
        await startButton.click();
        console.log('🚀 Clicked Start Game');
        
        // Wait for game to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if voting interface appears
        const gameArea = await page.$('#game-area');
        const gameAreaVisible = await page.evaluate(el => el.style.display !== 'none', gameArea);
        
        if (gameAreaVisible) {
          console.log('✅ SUCCESS: Game area is visible - voting phase loaded!');
          
          // Try to vote
          const pizzaButton = await page.$('button[data-vote="Pizza"]');
          if (pizzaButton) {
            await pizzaButton.click();
            console.log('🍕 Voted for Pizza');
            
            // Wait for results
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('✅ SUCCESS: Full Everybody Votes flow completed!');
          } else {
            console.log('❌ Pizza vote button not found');
          }
        } else {
          console.log('❌ Game area not visible after starting game');
        }
      } else {
        console.log('❌ Start Game button not found');
      }
    } else {
      console.log('❌ ISSUE: No players visible in the UI');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'final-verification-issue.png' });
      console.log('📸 Screenshot saved for debugging');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'final-verification-error.png' });
  } finally {
    await browser.close();
  }
}

testFinalVerification();