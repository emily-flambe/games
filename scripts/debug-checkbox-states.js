#!/usr/bin/env node

const WebSocket = require('ws');

async function debugCheckboxStates() {
  console.log('🔍 Debugging checkbox states in production...\n');
  
  const wsUrl = 'wss://games.emilycogsdill.com';
  const sessionId = 'DEBUG' + Math.random().toString(36).substr(2, 4).toUpperCase();
  
  console.log('Session ID:', sessionId);
  
  const ws = new WebSocket(`${wsUrl}/api/game/${sessionId}/ws`);
  
  let playerId = null;
  let gameStarted = false;
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('🔍 Test completed - analyzing results...');
      resolve();
    }, 15000);
    
    ws.on('open', () => {
      console.log('✅ Connected');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'gameState':
            playerId = message.playerId;
            console.log(`👤 Player ID: ${playerId}`);
            
            if (!gameStarted && message.gameState.hostId === playerId) {
              console.log('🚀 Starting game...');
              ws.send(JSON.stringify({
                type: 'START_GAME',
                data: { gameType: 'checkbox-game' }
              }));
            }
            break;
            
          case 'game_started':
            gameStarted = true;
            console.log('✅ Game started! Testing checkbox toggles...');
            
            // Test just the first few checkboxes with detailed logging
            setTimeout(() => {
              console.log('📦 Toggling checkbox 0...');
              ws.send(JSON.stringify({
                type: 'toggle_checkbox',
                checkboxIndex: 0
              }));
            }, 500);
            
            setTimeout(() => {
              console.log('📦 Toggling checkbox 1...');
              ws.send(JSON.stringify({
                type: 'toggle_checkbox', 
                checkboxIndex: 1
              }));
            }, 1000);
            
            setTimeout(() => {
              console.log('📦 Toggling checkbox 2...');
              ws.send(JSON.stringify({
                type: 'toggle_checkbox',
                checkboxIndex: 2
              }));
            }, 1500);
            break;
            
          case 'checkbox_toggled':
            const idx = message.data.checkboxIndex;
            const state = message.data.newState;
            const scores = message.data.playerScores;
            
            console.log(`✅ Checkbox ${idx} toggled to: ${state}`);
            console.log(`📊 Current scores:`, scores);
            
            // Check if this should trigger game end
            if (message.data.gameState && message.data.gameState.checkboxStates) {
              const states = message.data.gameState.checkboxStates;
              const trueCount = states.filter(s => s === true).length;
              const allTrue = states.every(s => s === true);
              
              console.log(`🎯 Checkbox states: ${trueCount}/9 checked, all true: ${allTrue}`);
              console.log(`📋 States array:`, states);
            }
            break;
            
          case 'game_ended':
            console.log('🏆 GAME ENDED MESSAGE RECEIVED!');
            console.log('📋 End game data:', JSON.stringify(message.data, null, 2));
            clearTimeout(timeout);
            ws.close();
            resolve();
            break;
        }
      } catch (error) {
        console.log('📨 Raw message:', data.toString());
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('🔌 Connection closed');
    });
  });
}

debugCheckboxStates().catch(console.error);