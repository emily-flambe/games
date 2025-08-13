const puppeteer = require('puppeteer');

async function testVotingButtons() {
  console.log('🧪 Testing if voting buttons work after fix');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor console messages  
  page.on('console', (msg) => {
    console.log(`🖥️  ${msg.text()}`);
  });

  try {
    console.log('📍 Navigate to games.emilycogsdill.com');
    await page.goto('https://games.emilycogsdill.com');
    
    console.log('🗳️  Click Everybody Votes');
    await page.waitForSelector('.game-card');
    await page.click('button.game-card[data-game="everybody-votes"]');

    console.log('🚀 Click Start Game');
    await page.waitForSelector('#start-game-btn-header', { timeout: 10000 });
    await page.click('#start-game-btn-header');

    console.log('⏳ Wait for voting interface');
    await page.waitForSelector('#game-area', { timeout: 10000 });
    await page.waitForFunction(() => {
      const gameArea = document.getElementById('game-area');
      return gameArea && gameArea.style.display !== 'none';
    }, { timeout: 10000 });

    console.log('🍕 Click Pizza button');
    await page.waitForSelector('button[data-vote="Pizza"]', { timeout: 5000 });
    await page.click('button[data-vote="Pizza"]');

    console.log('⏳ Wait for response after clicking Pizza');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if game progressed to results or if voting is still active
    const gameAreaContent = await page.$eval('#game-area', el => el.innerHTML);
    
    if (gameAreaContent.includes('results') || gameAreaContent.includes('Results')) {
      console.log('✅ SUCCESS: Vote was processed - game shows results');
    } else if (gameAreaContent.includes('Pizza') && gameAreaContent.includes('Burgers')) {
      console.log('⚠️  Voting interface still visible - checking if single player voting works');
    } else {
      console.log('❓ Unclear state after voting');
    }

    console.log('Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'voting-buttons-test.png' });
  } finally {
    await browser.close();
  }
}

testVotingButtons();