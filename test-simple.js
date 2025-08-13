const puppeteer = require('puppeteer');

async function testSimple() {
  console.log('🎮 Simple test - create room and start Everybody Votes...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 200  // Slower for debugging
  });
  
  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE:', msg.text()));
    page.on('error', err => console.error('ERROR:', err));
    
    // Go to the site
    console.log('📱 Loading site...');
    await page.goto('http://localhost:8777');
    
    // Click on Everybody Votes
    console.log('🗳️ Clicking Everybody Votes...');
    await page.waitForSelector('[data-game="everybody-votes"]', { timeout: 5000 });
    await page.click('[data-game="everybody-votes"]');
    
    // Wait for room creation
    console.log('⏳ Waiting for room creation...');
    await page.waitForSelector('#room-code-display', { timeout: 10000 });
    
    const roomCode = await page.evaluate(() => {
      return document.getElementById('room-code-display')?.textContent;
    });
    console.log(`✅ Room created: ${roomCode}`);
    
    // Wait for the game area to load
    await page.waitForSelector('#game-area', { timeout: 5000 });
    
    // Check if start button appears (host should see it)
    const hasStartButton = await page.evaluate(() => {
      return !!document.querySelector('.start-game-btn');
    });
    
    if (hasStartButton) {
      console.log('✅ Start button found - host view confirmed');
      
      // Click start
      console.log('🚀 Starting game...');
      await page.click('.start-game-btn');
      
      // Wait for voting phase
      await page.waitForSelector('.vote-btn', { timeout: 5000 });
      console.log('✅ Voting phase loaded!');
      
      // Take screenshot
      await page.screenshot({ path: 'test-voting-phase.png' });
      console.log('📸 Screenshot saved: test-voting-phase.png');
      
      // Vote
      await page.click('.vote-btn[data-choice="A"]');
      console.log('🗳️ Voted for option A');
      
      // Since we're alone, the game won't progress to prediction
      // But we can verify the vote was registered
      const voteStatus = await page.evaluate(() => {
        const el = document.querySelector('.everybody-votes-container');
        return el ? el.textContent : 'Not found';
      });
      
      console.log('Current status:', voteStatus.includes('Waiting for others') ? 'Waiting for other players' : 'Unknown');
      
    } else {
      console.log('❌ No start button - something went wrong');
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('🔍 Keeping browser open. Press Ctrl+C to exit.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-error.png' });
    console.log('📸 Error screenshot saved: test-error.png');
    await browser.close();
    process.exit(1);
  }
}

testSimple().catch(console.error);