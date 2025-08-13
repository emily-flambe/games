const puppeteer = require('puppeteer');

async function testEndGameFix() {
  console.log('🧪 Testing End Game button fix on production');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Monitor console for game ending messages
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('End') || text.includes('end') || text.includes('Complete')) {
      console.log(`🖥️  ${text}`);
    }
  });

  try {
    console.log('📍 Navigate to games.emilycogsdill.com');
    await page.goto('https://games.emilycogsdill.com');
    
    console.log('🗳️  Start Everybody Votes game');
    await page.click('button.game-card[data-game="everybody-votes"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.click('#start-game-btn-header');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🍕 Vote for Pizza');
    await page.click('button[data-vote="Pizza"]');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🏁 Click End Game button');
    const endButton = await page.$('#end-game-btn');
    if (endButton) {
      await endButton.click();
      console.log('✅ End Game button clicked');
      
      // Wait for game to end
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if we're back at the portal
      const gamePortal = await page.$('#game-portal');
      const gameRoom = await page.$('#game-room');
      
      const portalActive = await page.evaluate(el => 
        el && el.classList.contains('active'), gamePortal);
      const roomActive = await page.evaluate(el => 
        el && el.classList.contains('active'), gameRoom);
      
      console.log(`Portal active: ${portalActive}`);
      console.log(`Room active: ${roomActive}`);
      
      // Check for end game screen
      const endGameScreen = await page.$('#end-game-screen');
      const endGameVisible = await page.evaluate(el => 
        el && window.getComputedStyle(el).display !== 'none', endGameScreen);
      
      if (endGameVisible) {
        console.log('✅ SUCCESS: End game screen is displayed');
        
        // Check for OK button
        const okButton = await page.$('#ok-btn');
        if (okButton) {
          console.log('✅ OK button found - game can be properly ended');
        }
      } else if (portalActive) {
        console.log('✅ SUCCESS: Returned to game portal');
      } else {
        console.log('❌ Game did not end properly - still in room');
      }
      
    } else {
      console.log('❌ End Game button not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testEndGameFix();