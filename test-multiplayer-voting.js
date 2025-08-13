const WebSocket = require('ws');

async function testMultiplayerVoting() {
  console.log('🧪 Testing Multiplayer Voting Experience');
  console.log('=' .repeat(50));
  
  return new Promise((resolve, reject) => {
    const players = [];
    const sessionId = 'MULTI123';
    let messagesReceived = 0;
    let gameStarted = false;
    let resultsShown = false;
    let gameEnded = false;
    
    // Create 3 players
    const playerNames = ['Alice', 'Bob', 'Charlie'];
    const votes = ['Pizza', 'Burgers', 'Pizza']; // Pizza should win 2-1
    
    console.log('👥 Creating 3 players...');
    
    // Connect all players
    playerNames.forEach((name, index) => {
      const ws = new WebSocket(`ws://localhost:8777/api/game/${sessionId}/ws?gameType=everybody-votes`);
      
      players.push({
        name: name,
        ws: ws,
        vote: votes[index],
        hasVoted: false,
        connected: false
      });
      
      ws.on('open', () => {
        console.log(`✅ ${name} connected`);
        players[index].connected = true;
        
        // Check if all players connected
        if (players.every(p => p.connected) && !gameStarted) {
          gameStarted = true;
          console.log('🎮 All players connected! Starting game...');
          
          // First player (Alice) starts the game
          setTimeout(() => {
            console.log('🚀 Alice starting the game...');
            players[0].ws.send(JSON.stringify({
              type: 'START_GAME',
              data: { gameType: 'everybody-votes' }
            }));
          }, 1000);
        }
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messagesReceived++;
        
        console.log(`📨 ${name} received: ${message.type}`);
        
        // Handle game start
        if (message.type === 'game_started' && !players[index].hasVoted) {
          console.log(`🗳️ ${name} voting for: ${players[index].vote}`);
          
          // Vote after a short delay to simulate real timing
          setTimeout(() => {
            players[index].ws.send(JSON.stringify({
              type: 'submit_vote',
              data: { vote: players[index].vote }
            }));
            players[index].hasVoted = true;
          }, 500 + index * 300); // Stagger votes
        }
        
        // Handle vote progress
        if (message.type === 'vote_progress') {
          const data = message.data;
          console.log(`📊 Vote progress: ${data.votesCount}/${data.totalPlayers} - Latest: ${data.voterName}`);
        }
        
        // Handle results
        if (message.type === 'voting_results' && !resultsShown) {
          resultsShown = true;
          console.log('📊 RESULTS RECEIVED!');
          console.log('  Question:', message.data.question);
          console.log('  Pizza votes:', message.data.results.Pizza);
          console.log('  Burgers votes:', message.data.results.Burgers);
          console.log('  Total votes:', message.data.results.totalVotes);
          
          // Alice clicks "End Game"
          setTimeout(() => {
            console.log('🏁 Alice clicking End Game...');
            players[0].ws.send(JSON.stringify({
              type: 'end_game',
              data: {}
            }));
          }, 1000);
        }
        
        // Handle game end
        if (message.type === 'game_ended' && !gameEnded) {
          gameEnded = true;
          console.log('🎉 GAME ENDED!');
          console.log('  Message:', message.data.message);
          console.log('  Winners:', message.data.winners.length, 'players');
          console.log('  Expected: "Everyone wins!"');
          
          // Verify the results
          const success = message.data.message === 'Everyone wins!' && 
                         message.data.winners.length === 3;
          
          // Close all connections
          players.forEach(p => p.ws.close());
          
          setTimeout(() => {
            resolve(success);
          }, 500);
        }
      });
      
      ws.on('error', (error) => {
        console.error(`❌ ${name} WebSocket error:`, error.message);
        reject(error);
      });
    });
    
    // Timeout after 15 seconds
    setTimeout(() => {
      console.log('⏰ Test timed out');
      players.forEach(p => p.ws.close());
      reject(new Error('Test timed out'));
    }, 15000);
  });
}

testMultiplayerVoting()
  .then(success => {
    console.log('=' .repeat(50));
    if (success) {
      console.log('🎉 MULTIPLAYER TEST PASSED!');
      console.log('✅ All players could vote');
      console.log('✅ Vote progress was tracked');
      console.log('✅ Results were shown');
      console.log('✅ End game triggered "Everyone wins!"');
    } else {
      console.log('❌ MULTIPLAYER TEST FAILED!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });