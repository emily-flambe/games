const WebSocket = require('ws');

console.log('Testing WebSocket connection...');

const ws = new WebSocket('ws://localhost:8777/api/game/TEST123/ws');

ws.on('open', function() {
    console.log('✅ WebSocket connected');
});

ws.on('message', function(data) {
    try {
        const message = JSON.parse(data);
        console.log('📨 Received message:', JSON.stringify(message, null, 2));
    } catch (error) {
        console.log('📨 Received raw data:', data.toString());
    }
});

ws.on('error', function(error) {
    console.log('❌ WebSocket error:', error);
});

ws.on('close', function() {
    console.log('🔌 WebSocket closed');
    process.exit(0);
});

// Keep the connection open for a few seconds
setTimeout(() => {
    ws.close();
}, 5000);