const puppeteer = require('puppeteer');

async function testEndGameButton() {
  console.log('🧪 Testing End Game button on localhost and production');
  
  // Test localhost first
  console.log('\n📍 Testing localhost:8777');
  const localBrowser = await puppeteer.launch({ headless: true });
  const localPage = await localBrowser.newPage();
  
  // Monitor console for end_game messages
  localPage.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('End') || text.includes('end') || text.includes('game_ended')) {
      console.log(`🖥️  LOCAL: ${text}`);
    }
  });

  try {
    await localPage.goto('http://localhost:8777');
    await localPage.click('button.game-card[data-game="everybody-votes"]');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await localPage.click('#start-game-btn-header');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await localPage.click('button[data-vote="Pizza"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Look for End Game button
    const endButton = await localPage.$('#end-game-btn');
    if (endButton) {
      console.log('✅ LOCAL: End Game button found');
      await endButton.click();
      console.log('🖱️  LOCAL: Clicked End Game button');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check what happened
      const gameAreaVisible = await localPage.$eval('#game-area', el => 
        window.getComputedStyle(el).display !== 'none').catch(() => false);
      const gamePortalVisible = await localPage.$eval('#game-portal', el => 
        window.getComputedStyle(el).display !== 'none').catch(() => false);
      
      console.log(`LOCAL: Game area visible: ${gameAreaVisible}`);
      console.log(`LOCAL: Game portal visible: ${gamePortalVisible}`);
    } else {
      console.log('❌ LOCAL: End Game button not found');
    }
  } catch (error) {
    console.error('❌ LOCAL test failed:', error.message);
  } finally {
    await localBrowser.close();
  }

  // Test production
  console.log('\n📍 Testing games.emilycogsdill.com');
  const prodBrowser = await puppeteer.launch({ headless: true });
  const prodPage = await prodBrowser.newPage();
  
  // Monitor console for end_game messages
  prodPage.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('End') || text.includes('end') || text.includes('game_ended')) {
      console.log(`🖥️  PROD: ${text}`);
    }
  });

  try {
    await prodPage.goto('https://games.emilycogsdill.com');
    await prodPage.click('button.game-card[data-game="everybody-votes"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await prodPage.click('#start-game-btn-header');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await prodPage.click('button[data-vote="Pizza"]');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Look for End Game button
    const endButton = await prodPage.$('#end-game-btn');
    if (endButton) {
      console.log('✅ PROD: End Game button found');
      await endButton.click();
      console.log('🖱️  PROD: Clicked End Game button');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check what happened
      const gameAreaVisible = await prodPage.$eval('#game-area', el => 
        window.getComputedStyle(el).display !== 'none').catch(() => false);
      const gamePortalVisible = await prodPage.$eval('#game-portal', el => 
        window.getComputedStyle(el).display !== 'none').catch(() => false);
      
      console.log(`PROD: Game area visible: ${gameAreaVisible}`);
      console.log(`PROD: Game portal visible: ${gamePortalVisible}`);
    } else {
      console.log('❌ PROD: End Game button not found');
    }
  } catch (error) {
    console.error('❌ PROD test failed:', error.message);
  } finally {
    await prodBrowser.close();
  }

  console.log('\n✅ Tests completed');
}

testEndGameButton();