const puppeteer = require('puppeteer');

async function testComprehensiveFlow() {
  console.log('🧪 Comprehensive test of Everybody Votes flow');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor all console messages
  page.on('console', (msg) => {
    console.log(`🖥️  ${msg.text()}`);
  });

  // Monitor errors
  page.on('pageerror', (error) => {
    console.log('❌ Page Error:', error.message);
  });

  try {
    console.log('📍 Step 1: Navigate to games.emilycogsdill.com');
    await page.goto('https://games.emilycogsdill.com', { waitUntil: 'networkidle0' });
    
    console.log('🗳️  Step 2: Click Everybody Votes');
    await page.waitForSelector('.game-card', { timeout: 10000 });
    await page.click('button.game-card[data-game="everybody-votes"]');

    console.log('⏳ Step 3: Wait for room to establish');
    // Wait longer for WebSocket connection
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if we're in the waiting room state
    const playersContainer = await page.$('#players-container');
    if (!playersContainer) {
      console.log('❌ Players container not found - WebSocket connection may have failed');
      throw new Error('Room did not load properly');
    }

    console.log('🚀 Step 4: Click Start Game');
    const startButton = await page.waitForSelector('#start-game-btn-header', { timeout: 10000 });
    await startButton.click();

    console.log('⏳ Step 5: Wait for game area to appear');
    await page.waitForSelector('#game-area', { timeout: 15000 });
    
    // Wait for game area to be visible
    await page.waitForFunction(() => {
      const gameArea = document.getElementById('game-area');
      return gameArea && gameArea.style.display !== 'none';
    }, { timeout: 15000 });

    console.log('✅ Game area is visible');

    console.log('🍕 Step 6: Look for voting buttons');
    // Wait for voting buttons to appear
    await page.waitForSelector('button[data-vote]', { timeout: 10000 });
    
    const votingButtons = await page.$$('button[data-vote]');
    console.log(`Found ${votingButtons.length} voting buttons`);

    if (votingButtons.length === 0) {
      console.log('❌ No voting buttons found');
      throw new Error('Voting buttons not found');
    }

    console.log('🍕 Step 7: Click Pizza button');
    const pizzaButton = await page.$('button[data-vote="Pizza"]');
    if (!pizzaButton) {
      console.log('❌ Pizza button not found');
      throw new Error('Pizza button not found');
    }

    await pizzaButton.click();
    console.log('✅ Successfully clicked Pizza button');

    console.log('⏳ Step 8: Wait for vote processing');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check the final state
    const gameAreaContent = await page.$eval('#game-area', el => el.innerHTML);
    
    if (gameAreaContent.includes('results') || gameAreaContent.includes('Results') || gameAreaContent.includes('Winner')) {
      console.log('✅ SUCCESS: Vote was processed and results are shown');
    } else {
      console.log('⚠️  Vote may not have been processed correctly');
      console.log('Game area content preview:', gameAreaContent.substring(0, 200) + '...');
    }

    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed at step:', error.message);
    
    // Save screenshot and page content for debugging
    await page.screenshot({ path: 'comprehensive-test-error.png' });
    
    // Get current page state
    const url = page.url();
    console.log('Current URL:', url);
    
    // Check if we're still on the loading screen
    const loadingOverlay = await page.$('#loading-overlay');
    if (loadingOverlay) {
      const overlayVisible = await page.evaluate(el => 
        window.getComputedStyle(el).display !== 'none', loadingOverlay);
      if (overlayVisible) {
        console.log('❌ Still showing loading overlay - connection issue');
      }
    }

  } finally {
    await browser.close();
  }
}

testComprehensiveFlow();