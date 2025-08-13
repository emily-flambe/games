const puppeteer = require('puppeteer');

async function testExactUserFlow() {
  console.log('🧪 Testing exact user flow: games.emilycogsdill.com → everybody votes → start game → vote');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor console messages
  page.on('console', (msg) => {
    console.log(`🖥️  ${msg.text()}`);
  });

  // Monitor errors
  page.on('pageerror', (error) => {
    console.log('❌ Page Error:', error.message);
  });

  try {
    // Step 1: Navigate to games.emilycogsdill.com
    console.log('📍 Step 1: Navigate to games.emilycogsdill.com');
    await page.goto('https://games.emilycogsdill.com');
    await page.waitForSelector('.game-card');
    console.log('✅ Page loaded');

    // Step 2: Click "everybody votes"
    console.log('🗳️  Step 2: Click "everybody votes"');
    await page.click('button.game-card[data-game="everybody-votes"]');
    
    // Wait for room to load
    await page.waitForSelector('#start-game-btn-header', { timeout: 10000 });
    console.log('✅ Room loaded, start button visible');

    // Step 3: Click "start game"
    console.log('🚀 Step 3: Click "start game"');
    await page.click('#start-game-btn-header');
    
    // Wait for game area to appear
    await page.waitForSelector('#game-area', { timeout: 10000 });
    await page.waitForFunction(() => {
      const gameArea = document.getElementById('game-area');
      return gameArea && gameArea.style.display !== 'none';
    }, { timeout: 10000 });
    console.log('✅ Game area is now visible');

    // Step 4: Try to click "pizza" button
    console.log('🍕 Step 4: Try to click "pizza" button');
    
    // Wait a moment for voting buttons to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if pizza button exists and is clickable
    const pizzaButton = await page.$('button[data-vote="Pizza"]');
    if (!pizzaButton) {
      console.log('❌ ISSUE: Pizza button not found in DOM');
      
      // Check what voting buttons exist
      const votingButtons = await page.$$('[data-vote]');
      console.log(`Found ${votingButtons.length} voting buttons`);
      
      // Check game area content
      const gameAreaContent = await page.$eval('#game-area', el => el.innerHTML);
      console.log('Game area content:', gameAreaContent.substring(0, 500));
      
      throw new Error('Pizza button not found');
    }

    // Check if button is visible and enabled
    const buttonVisible = await page.evaluate(btn => {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return {
        visible: rect.width > 0 && rect.height > 0,
        display: style.display,
        disabled: btn.disabled,
        textContent: btn.textContent
      };
    }, pizzaButton);
    
    console.log('Pizza button state:', buttonVisible);

    if (!buttonVisible.visible) {
      console.log('❌ ISSUE: Pizza button exists but is not visible');
      throw new Error('Pizza button not visible');
    }

    // Try to click the pizza button
    await pizzaButton.click();
    console.log('🍕 Clicked pizza button');

    // Wait for any response
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if anything changed after clicking
    const gameAreaAfterVote = await page.$eval('#game-area', el => el.innerHTML);
    console.log('Game area after vote (first 500 chars):', gameAreaAfterVote.substring(0, 500));

    console.log('✅ Test completed - analyzing results');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'exact-user-flow-error.png' });
    console.log('📸 Screenshot saved: exact-user-flow-error.png');
  } finally {
    await browser.close();
  }
}

testExactUserFlow();