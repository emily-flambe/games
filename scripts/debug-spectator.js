#!/usr/bin/env node

const WebSocket = require('ws');
const { PORT, HOST } = require('../config');

async function debugSpectator() {
    const sessionId = 'DBG' + Math.random().toString(36).substr(2, 4).toUpperCase();
    console.log(`\n🔍 Debug Session: ${sessionId}`);
    
    // Create host and start game
    const host = new WebSocket(`ws://${HOST}:${PORT}/api/game/${sessionId}/ws`);
    await new Promise(resolve => host.once('open', resolve));
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    host.send(JSON.stringify({
        type: 'START_GAME',
        data: { gameType: 'checkbox-game' }
    }));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Connect spectator and listen to all messages
    console.log('\n🔍 Connecting spectator...');
    const spectator = new WebSocket(`ws://${HOST}:${PORT}/api/game/${sessionId}/ws`);
    
    spectator.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log(`📨 Spectator received: ${msg.type}`, msg.data ? 'with data' : 'no data');
        
        if (msg.type === 'spectator_identity') {
            console.log(`✅ Spectator identity: ${msg.data.spectator.emoji} ${msg.data.spectator.name}`);
        }
    });
    
    await new Promise(resolve => spectator.once('open', resolve));
    
    console.log(`\n🎯 Manual test URL: http://${HOST}:${PORT}`);
    console.log(`🎯 Room code: ${sessionId}`);
    console.log('📋 Check browser console for spectator setup logs');
    console.log('📋 Expected: "Showing spectator indicator" and "Spectator indicator added to room info"');
    
    // Keep alive
    return new Promise(() => {});
}

debugSpectator().catch(console.error);