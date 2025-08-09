#!/usr/bin/env node

const WebSocket = require('ws');

console.log('Setting up players to test host UI display...');

// Connect multiple players so we can see the host indicator in the browser
const players = [];

async function connectPlayer(name, delay = 0) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const ws = new WebSocket('ws://localhost:8777/ws');
      
      ws.on('open', () => {
        console.log(`${name} connected`);
        players.push({ name, ws });
        resolve();
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'host_assigned') {
            console.log(`🎉 ${name} became the host!`);
          }
        } catch (e) {
          // ignore
        }
      });
      
    }, delay);
  });
}

async function setupPlayers() {
  // Connect 3 players with small delays
  await connectPlayer('Alice', 0);
  await connectPlayer('Bob', 500);
  await connectPlayer('Charlie', 1000);
  
  console.log('\n✅ Players connected! You can now check the browser at http://localhost:8777/games/hello-world');
  console.log('The host indicator should show next to the first player (Alice)');
  console.log('\nPress Ctrl+C to disconnect all players and exit');
  
  // Keep alive
  process.on('SIGINT', () => {
    console.log('\nDisconnecting all players...');
    players.forEach(p => p.ws.close());
    process.exit(0);
  });
}

setupPlayers();