const puppeteer = require('puppeteer');

async function testActualBehavior() {
  console.log('🔍 ACTUALLY TESTING the Everybody Votes game behavior...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 50,
    devtools: true
  });
  
  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE:', msg.text()));
    
    // Go to the main page
    console.log('1. Going to localhost:8777...');
    await page.goto('http://localhost:8777');
    
    // Click Everybody Votes to create a room
    console.log('2. Clicking Everybody Votes to create room...');
    await page.waitForSelector('[data-game="everybody-votes"]');
    await page.click('[data-game="everybody-votes"]');
    
    // Wait for room to be created and we're in waiting room
    console.log('3. Waiting for room creation...');
    await page.waitForSelector('#room-code-display', { timeout: 5000 });
    
    // Now click Start Game in the waiting room
    console.log('4. Looking for Start Game button in waiting room...');
    // The button might be .start-game-btn or #start-game-btn
    await page.waitForSelector('button', { timeout: 5000 });
    
    // Find and click the Start Game button
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(btn => 
        btn.textContent.includes('Start Game') || 
        btn.textContent.includes('Start Voting')
      );
      if (startBtn) {
        startBtn.click();
        return true;
      }
      return false;
    });
    
    if (!clicked) {
      console.log('❌ Could not find Start Game button in waiting room');
      throw new Error('Start Game button not found');
    }
    
    // Wait a moment for the game to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // NOW - what do we actually see?
    console.log('5. Checking what appears after clicking Start Game...');
    
    // Take a screenshot of what we see
    await page.screenshot({ path: 'actual-behavior-after-start.png' });
    console.log('📸 Screenshot saved: actual-behavior-after-start.png');
    
    // Check if we see another Start Game button
    const hasAnotherStartButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => btn.textContent.includes('Start'));
    });
    
    if (hasAnotherStartButton) {
      console.log('❌ PROBLEM: There IS another Start button after clicking Start Game!');
      
      // Get the actual text
      const buttonText = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const startBtn = buttons.find(btn => btn.textContent.includes('Start'));
        return startBtn ? startBtn.textContent : null;
      });
      console.log(`   Button text: "${buttonText}"`);
    } else {
      console.log('✅ Good: No Start button found');
    }
    
    // Check what phase we're in
    const pageContent = await page.evaluate(() => {
      const container = document.querySelector('.everybody-votes-container');
      if (container) {
        const h2 = container.querySelector('h2');
        return h2 ? h2.textContent : 'No h2 found';
      }
      return 'No everybody-votes-container found';
    });
    
    console.log(`\n📋 Current screen shows: "${pageContent}"`);
    
    // Keep browser open
    console.log('\n👀 Browser left open for inspection. Press Ctrl+C to exit.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await browser.close();
  }
}

testActualBehavior().catch(console.error);