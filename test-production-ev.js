const puppeteer = require('puppeteer');

async function testProductionEverybodyVotes() {
  console.log('🧪 Testing production Everybody Votes game...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor console messages
  page.on('console', (msg) => {
    console.log('🖥️  Browser:', msg.text());
  });

  // Monitor network errors
  page.on('requestfailed', (request) => {
    console.log('❌ Network failure:', request.url(), request.failure().errorText);
  });

  try {
    // Navigate to production
    console.log('📍 Navigating to https://games.emilycogsdill.com');
    await page.goto('https://games.emilycogsdill.com');
    
    // Wait for page to load
    await page.waitForSelector('.game-card');
    console.log('✅ Game selection page loaded');

    // Click on Everybody Votes
    await page.click('button.game-card[data-game="everybody-votes"]');
    console.log('🗳️  Clicked Everybody Votes');

    // Wait for game room to load
    try {
      await page.waitForSelector('#players-container', { timeout: 10000 });
      console.log('✅ Joined game room');
    } catch (error) {
      console.log('❌ Failed to load game room:', error.message);
      // Take screenshot for debugging
      await page.screenshot({ path: 'production-error-1.png' });
      throw error;
    }

    // Look for start button and click it
    try {
      await page.waitForSelector('#start-game-btn-header', { timeout: 3000 });
      await page.click('#start-game-btn-header');
      console.log('🚀 Started game');
    } catch (error) {
      console.log('❌ Failed to start game:', error.message);
      await page.screenshot({ path: 'production-error-2.png' });
      throw error;
    }

    // Wait for voting phase (game area)
    try {
      await page.waitForSelector('#game-area', { timeout: 10000 });
      console.log('🗳️  Voting phase loaded');
    } catch (error) {
      console.log('❌ Failed to load voting phase:', error.message);
      await page.screenshot({ path: 'production-error-3.png' });
      throw error;
    }

    // Vote for Pizza
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.click('button[data-vote="Pizza"]');
      console.log('🍕 Voted for Pizza');
    } catch (error) {
      console.log('❌ Failed to vote:', error.message);
      await page.screenshot({ path: 'production-error-4.png' });
      throw error;
    }

    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testProductionEverybodyVotes();