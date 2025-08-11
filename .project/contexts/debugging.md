# Debugging Guide

## Puppeteer Testing

### Basic Setup
```javascript
const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 50  // Slow down for visibility
  });
  
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));
  
  // Your test code here
}
```

### Multi-Player Testing
```javascript
async function testMultiplayer() {
  const browser = await puppeteer.launch({ headless: false });
  
  // Create multiple players
  const host = await browser.newPage();
  const player = await browser.newPage();
  
  // Host creates room
  await host.goto('http://localhost:8777');
  await host.click('[data-game="checkbox-game"]');
  
  // Get room code
  const sessionId = await host.evaluate(() => 
    document.getElementById('room-code-display')?.textContent
  );
  
  // Player joins
  await player.goto('http://localhost:8777');
  await player.type('#room-code-input', sessionId);
  await player.click('#join-room-btn');
  
  // Test interactions...
}
```

## Architecture Debugging

### GameShell/GameModule Data Flow
During refactoring, watch for:
1. **Missing data propagation** - GameShell must pass player updates to GameModule
2. **Message structure variations** - Handle multiple formats:
```javascript
// Handle various message structures
const playerId = message.data?.toggledBy || 
                 message.playerId || 
                 message.data?.playerId;
```
3. **State synchronization** - Modules need continuous updates, not just initial state

### Debug Logging Pattern
```javascript
console.log('📨 Message:', message.type, message);
console.log('🔄 Extracted:', { playerId, exists: !!players[playerId] });
console.log('🖼️ UI Update:', { index, emoji: players[playerId]?.emoji });
```

## WebSocket Debugging

### Direct WebSocket Testing
```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8777/api/game/TEST123/ws');

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`Received: ${msg.type}`, msg);
});

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'START_GAME',
    data: { gameType: 'checkbox-game' }
  }));
});
```

## Common Issues

### Player Emojis Not Showing
- Check GameModule receives player updates
- Verify message.data structure matches expectations
- Ensure playerId extraction logic handles all formats

### WebSocket Connection Delays
- Add delays after navigation
- Use `waitForSelector()` instead of immediate clicks
- Check for race conditions

### Host Assignment Problems
- Monitor `host_assigned` messages
- Check host transfer on disconnect
- Verify spectator vs player logic

## Best Practices
1. **Screenshot key points**: `await page.screenshot({ path: 'debug.png' })`
2. **Keep browsers open**: `await new Promise(() => {})` for inspection
3. **Use slowMo**: Better visibility of interactions
4. **Log at boundaries**: Track data through architecture layers