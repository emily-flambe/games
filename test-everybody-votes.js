const puppeteer = require('puppeteer');

async function testEverybodyVotes() {
  console.log('🎮 Testing Everybody Votes game...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100,  // Slow down for visibility
    devtools: true
  });
  
  try {
    // Create multiple players
    console.log('📱 Creating host and 2 players...');
    const host = await browser.newPage();
    const player1 = await browser.newPage();
    const player2 = await browser.newPage();
    
    // Set up console logging for debugging
    host.on('console', msg => console.log('HOST:', msg.text()));
    player1.on('console', msg => console.log('P1:', msg.text()));
    player2.on('console', msg => console.log('P2:', msg.text()));
    
    // Position windows for visibility
    await host.setViewport({ width: 600, height: 800 });
    await player1.setViewport({ width: 600, height: 800 });
    await player2.setViewport({ width: 600, height: 800 });
    
    // Host creates room
    console.log('🏠 Host creating room...');
    await host.goto('http://localhost:8777');
    await host.waitForSelector('[data-game="everybody-votes"]');
    await host.click('[data-game="everybody-votes"]');
    
    // Wait for room to be created
    await host.waitForSelector('#room-code-display', { timeout: 5000 });
    const sessionId = await host.evaluate(() => 
      document.getElementById('room-code-display')?.textContent
    );
    console.log(`📍 Room created: ${sessionId}`);
    
    // Player 1 joins
    console.log('👤 Player 1 joining...');
    await player1.goto('http://localhost:8777');
    await player1.waitForSelector('#room-code-input');
    await player1.type('#room-code-input', sessionId);
    await player1.click('#join-room-btn');
    await player1.waitForSelector('#room-code-display', { timeout: 5000 });
    
    // Player 2 joins
    console.log('👤 Player 2 joining...');
    await player2.goto('http://localhost:8777');
    await player2.waitForSelector('#room-code-input');
    await player2.type('#room-code-input', sessionId);
    await player2.click('#join-room-btn');
    await player2.waitForSelector('#room-code-display', { timeout: 5000 });
    
    // Give time for all connections to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Host starts the game
    console.log('🚀 Host starting game...');
    await host.waitForSelector('.start-game-btn');
    await host.click('.start-game-btn');
    
    // Wait for voting phase
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Everyone votes
    console.log('🗳️ Voting phase...');
    await host.waitForSelector('.vote-btn[data-choice="A"]', { timeout: 5000 });
    await player1.waitForSelector('.vote-btn[data-choice="A"]', { timeout: 5000 });
    await player2.waitForSelector('.vote-btn[data-choice="A"]', { timeout: 5000 });
    
    await host.click('.vote-btn[data-choice="A"]'); // Host votes Pancakes
    await player1.click('.vote-btn[data-choice="B"]'); // Player 1 votes Waffles
    await player2.click('.vote-btn[data-choice="A"]'); // Player 2 votes Pancakes
    
    // Wait for prediction phase
    console.log('⏳ Waiting for prediction phase...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Everyone predicts
    console.log('🔮 Prediction phase...');
    await host.waitForSelector('.predict-btn[data-prediction="A"]', { timeout: 5000 });
    await player1.waitForSelector('.predict-btn[data-prediction="A"]', { timeout: 5000 });
    await player2.waitForSelector('.predict-btn[data-prediction="A"]', { timeout: 5000 });
    
    await host.click('.predict-btn[data-prediction="A"]'); // Host predicts Pancakes
    await player1.click('.predict-btn[data-prediction="A"]'); // Player 1 predicts Pancakes
    await player2.click('.predict-btn[data-prediction="B"]'); // Player 2 predicts Waffles
    
    // Wait for results
    console.log('📊 Waiting for results...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshots of results
    await host.screenshot({ path: 'test-results-host.png' });
    await player1.screenshot({ path: 'test-results-player1.png' });
    await player2.screenshot({ path: 'test-results-player2.png' });
    
    console.log('✅ Test completed! Check screenshots for results.');
    console.log('📸 Screenshots saved: test-results-host.png, test-results-player1.png, test-results-player2.png');
    
    // Keep browser open for inspection
    console.log('🔍 Keeping browser open for inspection. Press Ctrl+C to exit.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await browser.close();
    process.exit(1);
  }
}

testEverybodyVotes().catch(console.error);