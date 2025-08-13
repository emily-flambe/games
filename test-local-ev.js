const puppeteer = require('puppeteer');

async function testLocalEverybodyVotes() {
  console.log('🧪 Testing local Everybody Votes game...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor console messages
  page.on('console', (msg) => {
    console.log('🖥️  Browser:', msg.text());
  });

  try {
    // Navigate to localhost
    console.log('📍 Navigating to http://localhost:8777');
    await page.goto('http://localhost:8777');
    
    // Wait for page to load
    await page.waitForSelector('.game-card');
    console.log('✅ Game selection page loaded');

    // Click on Everybody Votes
    await page.click('button.game-card[data-game="everybody-votes"]');
    console.log('🗳️  Clicked Everybody Votes');

    // Wait for game room to load
    await page.waitForSelector('#players-container', { timeout: 5000 });
    console.log('✅ Joined game room');

    // Look for start button and click it
    await page.waitForSelector('#start-game-btn-header', { timeout: 3000 });
    await page.click('#start-game-btn-header');
    console.log('🚀 Started game');

    // Wait for voting phase (game area)
    await page.waitForSelector('#game-area', { timeout: 5000 });
    console.log('🗳️  Voting phase loaded');

    // Vote for Pizza
    await page.click('button[data-vote="Pizza"]');
    console.log('🍕 Voted for Pizza');

    // Wait for results
    await page.waitForTimeout(2000);

    // Look for end game button
    const endButton = await page.$('button.btn-end');
    if (endButton) {
      await endButton.click();
      console.log('🏁 Ended game');
    }

    // Wait to see final state
    await page.waitForTimeout(2000);

    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testLocalEverybodyVotes();