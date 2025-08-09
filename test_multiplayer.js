#!/usr/bin/env node

const WebSocket = require('ws');

class TestClient {
  constructor(sessionId, clientName) {
    this.sessionId = sessionId;
    this.clientName = clientName;
    this.ws = null;
    this.playerId = null;
  }

  connect() {
    return new Promise((resolve) => {
      const wsUrl = `ws://localhost:8777/api/game/${this.sessionId}/ws`;
      console.log(`[${this.clientName}] Connecting to: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log(`[${this.clientName}] Connected successfully`);
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`[${this.clientName}] Received:`, JSON.stringify(message, null, 2));
          
          // Extract player ID from gameState message
          if (message.type === 'gameState' && message.playerId) {
            this.playerId = message.playerId;
            console.log(`[${this.clientName}] Set playerId to: ${this.playerId}`);
          }
        } catch (error) {
          console.error(`[${this.clientName}] Failed to parse message:`, error.message);
        }
      });
      
      this.ws.on('close', () => {
        console.log(`[${this.clientName}] Connection closed`);
      });
      
      this.ws.on('error', (error) => {
        console.error(`[${this.clientName}] WebSocket error:`, error.message);
      });
    });
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log(`[${this.clientName}] Sent:`, JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runMultiplayerTest() {
  const sessionId = 'TEST' + Math.random().toString(36).substr(2, 2).toUpperCase();
  console.log(`\n=== Testing Multiplayer with Session ID: ${sessionId} ===\n`);

  // Create two test clients
  const client1 = new TestClient(sessionId, 'CLIENT-1');
  const client2 = new TestClient(sessionId, 'CLIENT-2');

  try {
    // Connect client 1
    console.log('Step 1: Connecting Client 1...');
    await client1.connect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    // Connect client 2
    console.log('\nStep 2: Connecting Client 2...');
    await client2.connect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    // Test name change from client 1
    console.log('\nStep 3: Client 1 changing name...');
    client1.sendMessage({
      type: 'change_name',
      data: { newName: 'Alice' }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test emoji change from client 2
    console.log('\nStep 4: Client 2 changing emoji...');
    client2.sendMessage({
      type: 'change_emoji',
      data: { newEmoji: '🎯' }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('\nDisconnecting clients...');
    client1.disconnect();
    client2.disconnect();
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

// Run the test
runMultiplayerTest();