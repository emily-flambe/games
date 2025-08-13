const puppeteer = require('puppeteer');

async function testVotingFunctionality() {
  console.log('🧪 Testing voting functionality');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Monitor console for voting messages
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('vote') || text.includes('Vote') || text.includes('result') || text.includes('Result')) {
      console.log(`🖥️  ${text}`);
    }
  });

  try {
    console.log('📍 Navigate and start game');
    await page.goto('https://games.emilycogsdill.com');
    await page.click('button.game-card[data-game="everybody-votes"]');
    
    // Wait for WebSocket connection
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start the game
    await page.click('#start-game-btn-header');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🍕 Click Pizza button to vote');
    const pizzaButton = await page.$('button[data-vote="Pizza"]');
    if (pizzaButton) {
      await pizzaButton.click();
      console.log('✅ Pizza button clicked');
      
      // Wait for vote processing
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check for results or confirmation
      const gameAreaContent = await page.$eval('#game-area', el => el.innerHTML);
      
      if (gameAreaContent.includes('results') || gameAreaContent.includes('Results') || gameAreaContent.includes('Winner')) {
        console.log('✅ SUCCESS: Vote triggered results display');
      } else if (gameAreaContent.includes('Pizza') && gameAreaContent.includes('Burgers')) {
        console.log('⚠️  Voting interface still visible - may be waiting for more votes');
        
        // Try clicking Burgers to see if that changes anything
        console.log('🍔 Try clicking Burgers button');
        const burgersButton = await page.$('button[data-vote="Burgers"]');
        if (burgersButton) {
          await burgersButton.click();
          console.log('✅ Burgers button clicked');
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check again
          const updatedContent = await page.$eval('#game-area', el => el.innerHTML);
          if (updatedContent.includes('results') || updatedContent.includes('Results')) {
            console.log('✅ SUCCESS: Second vote triggered results');
          } else {
            console.log('❌ Voting may not be working correctly');
            console.log('Content preview:', updatedContent.substring(0, 300));
          }
        }
      } else {
        console.log('❓ Unexpected state after voting');
        console.log('Content preview:', gameAreaContent.substring(0, 300));
      }
      
    } else {
      console.log('❌ Pizza button not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testVotingFunctionality();