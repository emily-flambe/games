#!/usr/bin/env node

const WebSocket = require('ws');

async function testRegistryAPI() {
  console.log('🧪 Testing GameSessionRegistry API...\n');
  
  const baseUrl = 'http://localhost:8777';
  const wsUrl = 'ws://localhost:8777';
  
  // Test 1: Check empty rooms initially
  console.log('1. Testing empty rooms API...');
  const initialResponse = await fetch(`${baseUrl}/api/active-rooms`);
  const initialData = await initialResponse.json();
  console.log('   Initial rooms:', initialData);
  console.log('   ✅ Expected empty array\n');
  
  // Test 2: Create a game session
  console.log('2. Creating a game session...');
  const sessionId = 'TEST123';
  const ws = new WebSocket(`${wsUrl}/api/game/${sessionId}/ws`);
  
  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('   ✅ WebSocket connected to session:', sessionId);
      resolve();
    });
    
    ws.on('error', (error) => {
      console.error('   ❌ WebSocket error:', error);
      reject(error);
    });
  });
  
  // Wait a moment for registry to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Check rooms API with active session
  console.log('3. Testing rooms API with active session...');
  const activeResponse = await fetch(`${baseUrl}/api/active-rooms`);
  const activeData = await activeResponse.json();
  console.log('   Active rooms:', JSON.stringify(activeData, null, 2));
  
  if (activeData.rooms && activeData.rooms.length > 0) {
    console.log('   ✅ Session registered successfully');
    const room = activeData.rooms[0];
    console.log('   Session details:');
    console.log('     ID:', room.sessionId);
    console.log('     Game Type:', room.gameType);
    console.log('     Player Count:', room.playerCount);
    console.log('     Status:', room.status);
  } else {
    console.log('   ❌ Expected at least one active room');
  }
  
  // Test 4: Close session and verify cleanup
  console.log('\n4. Closing session and testing cleanup...');
  ws.close();
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const finalResponse = await fetch(`${baseUrl}/api/active-rooms`);
  const finalData = await finalResponse.json();
  console.log('   Final rooms:', finalData);
  
  if (finalData.rooms && finalData.rooms.length === 0) {
    console.log('   ✅ Session unregistered successfully');
  } else {
    console.log('   ❌ Expected empty rooms after session close');
  }
  
  console.log('\n🎉 Registry API test complete!');
}

// Run the test
testRegistryAPI().catch(console.error);