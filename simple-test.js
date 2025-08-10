#!/usr/bin/env node

const WebSocket = require('ws');
const { PORT, HOST } = require('./config');

async function createTestRoom() {
    const sessionId = 'TEST' + Math.random().toString(36).substr(2, 2).toUpperCase();
    console.log(`🎯 Test session: ${sessionId}`);
    console.log(`🎯 URL: http://${HOST}:${PORT}`);
    console.log(`🎯 Room code: ${sessionId}`);
    
    // Create host and start game
    console.log('Creating host connection...');
    const host = new WebSocket(`ws://${HOST}:${PORT}/api/game/${sessionId}/ws`);
    
    host.on('open', () => {
        console.log('✅ Host connected');
        
        setTimeout(() => {
            console.log('🚀 Starting game...');
            host.send(JSON.stringify({
                type: 'START_GAME',
                data: { gameType: 'checkbox-game' }
            }));
        }, 1000);
        
        setTimeout(() => {
            console.log('🔍 You can now:');
            console.log(`   1. Go to http://${HOST}:${PORT}`);
            console.log(`   2. Enter room code: ${sessionId}`);
            console.log(`   3. Join as spectator to test the UI`);
            console.log('   4. Check that "WATCHING" badge is removed');
        }, 2000);
    });
    
    host.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log(`📨 Host received: ${msg.type}`);
    });
    
    // Keep alive for 5 minutes
    setTimeout(() => {
        console.log('🕐 Test session ending...');
        host.close();
        process.exit(0);
    }, 300000);
}

createTestRoom().catch(console.error);