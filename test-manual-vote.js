const WebSocket = require('ws');

async function testVoteDirectly() {
  console.log('🧪 Testing direct vote message handling');
  
  return new Promise((resolve, reject) => {
    // Connect to WebSocket directly
    const ws = new WebSocket('ws://localhost:8777/api/game/TEST123/ws?gameType=everybody-votes');
    
    let messageCount = 0;
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      
      // Wait a moment for connection to be fully established
      setTimeout(() => {
        console.log('🎮 Sending START_GAME message');
        ws.send(JSON.stringify({
          type: 'START_GAME',
          data: { gameType: 'everybody-votes' }
        }));
      }, 1000);
    });
    
    ws.on('message', (data) => {
      messageCount++;
      const message = JSON.parse(data.toString());
      console.log(`📨 Message ${messageCount}:`, message.type);
      
      if (message.type === 'game_started') {
        console.log('✅ Game started successfully');
        
        // Now send a vote
        setTimeout(() => {
          console.log('🗳️ Sending submit_vote message');
          ws.send(JSON.stringify({
            type: 'submit_vote',
            data: { vote: 'Pizza' }
          }));
        }, 500);
        
      } else if (message.type === 'game_ended') {
        console.log('🏆 SUCCESS! Game ended with consistent UX');
        console.log('📋 End game data:', {
          message: message.data?.message,
          winners: message.data?.winners,
          scores: message.data?.scores
        });
        
        // Verify it matches the expected pattern
        if (message.data?.message && message.data?.winners && message.data?.scores) {
          console.log('✅ Game end message has all required fields for consistent UX');
          ws.close();
          resolve(true);
        } else {
          console.log('❌ Game end message missing required fields');
          ws.close();
          resolve(false);
        }
        
      } else if (message.type === 'game_results') {
        console.log('❌ FAIL: Got old game_results message instead of game_ended');
        ws.close();
        resolve(false);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket closed');
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        reject(new Error('Test timed out'));
      }
    }, 10000);
  });
}

testVoteDirectly()
  .then(success => {
    console.log(success ? '🎉 TEST PASSED: Consistent game ending UX implemented!' : '❌ TEST FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });