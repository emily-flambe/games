const puppeteer = require('puppeteer');

async function testFinalVotingFix() {
  console.log('🧪 Testing final voting fix');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor console for phase changes and errors
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('phase') || text.includes('Phase') || text.includes('result') || text.includes('Result') || text.includes('error') || text.includes('Error')) {
      console.log(`🖥️  ${text}`);
    }
  });

  try {
    console.log('📍 Navigate and start game');
    await page.goto('https://games.emilycogsdill.com');
    await page.click('button.game-card[data-game="everybody-votes"]');
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.click('#start-game-btn-header');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🍕 Vote for Pizza');
    await page.click('button[data-vote="Pizza"]');
    
    // Wait longer for results to appear
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check what's displayed now
    const gameAreaContent = await page.$eval('#game-area', el => el.innerHTML);
    
    if (gameAreaContent.includes('Winner') || gameAreaContent.includes('Results')) {
      console.log('✅ SUCCESS: Results are displayed after voting');
      
      // Try clicking a voting button to see if it's disabled
      const pizzaButtons = await page.$$('button[data-vote="Pizza"]');
      if (pizzaButtons.length === 0) {
        console.log('✅ SUCCESS: Voting buttons are no longer present in results phase');
      } else {
        console.log('❌ WARNING: Voting buttons still present in results phase');
        // Try clicking to see if error still occurs
        await page.click('button[data-vote="Pizza"]');
        console.log('Clicked Pizza button in results phase to test error handling');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log('❌ Results not displayed yet');
      console.log('Current content preview:', gameAreaContent.substring(0, 200));
    }

    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testFinalVotingFix();