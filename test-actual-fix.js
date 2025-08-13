const puppeteer = require('puppeteer');

async function testActualFix() {
  console.log('🔍 TESTING: Does Everybody Votes go straight to voting after Start Game?');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100,
    devtools: false
  });
  
  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE:', msg.text()));
    await page.setViewport({ width: 1200, height: 800 });
    
    // Step 1: Go to main page
    console.log('1. Opening localhost:8777...');
    await page.goto('http://localhost:8777');
    await page.waitForSelector('[data-game="everybody-votes"]', { timeout: 5000 });
    
    // Step 2: Click Everybody Votes to create room
    console.log('2. Creating Everybody Votes room...');
    await page.click('[data-game="everybody-votes"]');
    
    // Step 3: Wait for room creation (waiting room screen)
    console.log('3. In waiting room...');
    await page.waitForSelector('#room-code-display', { timeout: 5000 });
    
    // Take screenshot of waiting room
    await page.screenshot({ path: 'test-1-waiting-room.png' });
    console.log('   📸 Screenshot: test-1-waiting-room.png');
    
    // Step 4: Click Start Game button in waiting room
    console.log('4. Clicking Start Game button in waiting room header...');
    await page.waitForSelector('#start-game-btn-header', { timeout: 5000 });
    await page.click('#start-game-btn-header');
    
    // Step 5: Wait a moment for game to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 6: Check what we see now
    console.log('5. Checking what appears after Start Game...');
    await page.screenshot({ path: 'test-2-after-start-game.png' });
    console.log('   📸 Screenshot: test-2-after-start-game.png');
    
    // Check if we see the voting question
    const hasVotingQuestion = await page.evaluate(() => {
      const text = document.body.textContent;
      return text.includes('Which would you rather have for breakfast?') ||
             text.includes('Time to Vote!');
    });
    
    // Check if there's another Start button
    const hasAnotherStartButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => 
        btn.textContent.includes('Start Game') || 
        btn.textContent.includes('Start Voting')
      );
    });
    
    // Check for vote buttons
    const hasVoteButtons = await page.evaluate(() => {
      return document.querySelector('.vote-btn') !== null ||
             document.querySelector('[data-choice]') !== null;
    });
    
    console.log('\n📊 RESULTS:');
    console.log(`   Voting question visible: ${hasVotingQuestion ? '✅ YES' : '❌ NO'}`);
    console.log(`   Another Start button: ${hasAnotherStartButton ? '❌ YES (BAD!)' : '✅ NO (GOOD!)'}`);
    console.log(`   Vote buttons present: ${hasVoteButtons ? '✅ YES' : '❌ NO'}`);
    
    if (hasVotingQuestion && !hasAnotherStartButton && hasVoteButtons) {
      console.log('\n🎉 SUCCESS! The game goes straight to voting!');
    } else {
      console.log('\n❌ FAILED! The game is not working correctly.');
      
      // Get more details about what's on screen
      const pageContent = await page.evaluate(() => {
        const container = document.querySelector('.everybody-votes-container');
        if (container) {
          const h2 = container.querySelector('h2');
          return h2 ? h2.textContent : 'No h2 found';
        }
        return 'No everybody-votes-container found';
      });
      console.log(`   Current screen shows: "${pageContent}"`);
    }
    
    console.log('\n👀 Browser left open. Press Ctrl+C to exit.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await browser.close();
  }
}

testActualFix().catch(console.error);