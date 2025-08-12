const puppeteer = require('puppeteer');

async function testSimpleConnection() {
  console.log('🧪 Simple connection test');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Set a shorter timeout
  page.setDefaultTimeout(15000);

  try {
    console.log('📍 Navigate to games.emilycogsdill.com');
    await page.goto('https://games.emilycogsdill.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
    console.log('✅ Page loaded');
    
    console.log('🗳️  Look for Everybody Votes button');
    const everybodyVotesButton = await page.$('button.game-card[data-game="everybody-votes"]');
    if (everybodyVotesButton) {
      console.log('✅ Everybody Votes button found');
      
      console.log('🖱️  Click Everybody Votes');  
      await everybodyVotesButton.click();
      
      // Wait briefly to see what happens
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check current URL and page state
      const currentUrl = page.url();
      console.log('Current URL after click:', currentUrl);
      
      // Look for key elements
      const playersContainer = await page.$('#players-container');
      const loadingOverlay = await page.$('#loading-overlay');
      const gamePortal = await page.$('#game-portal');
      const gameRoom = await page.$('#game-room');
      
      console.log('Players container present:', !!playersContainer);
      console.log('Loading overlay present:', !!loadingOverlay);
      console.log('Game portal present:', !!gamePortal);
      console.log('Game room present:', !!gameRoom);
      
      if (loadingOverlay) {
        const overlayVisible = await page.evaluate(el => 
          window.getComputedStyle(el).display !== 'none', loadingOverlay);
        console.log('Loading overlay visible:', overlayVisible);
      }
      
    } else {
      console.log('❌ Everybody Votes button not found');
    }

    console.log('✅ Simple test completed');

  } catch (error) {
    console.error('❌ Simple test failed:', error.message);
    await page.screenshot({ path: 'simple-connection-error.png' });
  } finally {
    await browser.close();
  }
}

testSimpleConnection();