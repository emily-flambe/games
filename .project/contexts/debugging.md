# Debugging Guide: Using Puppeteer for Testing User Actions

This guide explains how to use Puppeteer to test different user scenarios and interactions in the multiplayer games platform.

## Overview

Puppeteer is a Node.js library that provides a high-level API to control Chrome/Chromium browsers programmatically. It's particularly useful for testing multiplayer scenarios where you need to simulate multiple users interacting with the same game session.

## Setup Requirements

- Node.js installed
- Puppeteer package installed (`npm install puppeteer`)
- Development server running (`npm run dev`)

## Core Testing Patterns

### 1. Basic Browser Management

```javascript
const puppeteer = require('puppeteer');

async function createTestBrowser() {
    const browser = await puppeteer.launch({ 
        headless: false,           // Show browser window for debugging
        defaultViewport: { width: 1200, height: 800 },
        slowMo: 50                 // Add delay between actions for visibility
    });
    
    return browser;
}
```

### 2. Multi-User Scenario Template

```javascript
async function testMultiUserScenario() {
    const browser = await puppeteer.launch({ headless: false });
    
    try {
        // Create multiple pages for different users
        const hostPage = await browser.newPage();
        const playerPage = await browser.newPage();
        const spectatorPage = await browser.newPage();
        
        // Test your scenario...
        
    } finally {
        await browser.close();
    }
}
```

## Common Testing Scenarios

### Host-Player-Spectator Flow

This is the most comprehensive test pattern, covering all user roles:

```javascript
async function testHostPlayerSpectatorFlow() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    
    try {
        // STEP 1: Host creates and starts game
        const hostPage = await browser.newPage();
        await hostPage.goto('http://localhost:8777');
        
        // Host selects game type
        await hostPage.waitForSelector('[data-game="checkbox-game"]');
        await hostPage.click('[data-game="checkbox-game"]');
        
        // Wait for room creation and get session ID
        await new Promise(resolve => setTimeout(resolve, 2000));
        const sessionId = await hostPage.evaluate(() => {
            const roomCodeElement = document.getElementById('room-code-display');
            return roomCodeElement ? roomCodeElement.textContent : null;
        });
        
        console.log(`Host created room: ${sessionId}`);
        
        // Host starts the game
        const startButton = await hostPage.$('#start-game-btn-header');
        if (startButton) {
            await startButton.click();
            console.log('Host started the game');
        }
        
        // STEP 2: Player joins active game
        const playerPage = await browser.newPage();
        await playerPage.goto('http://localhost:8777');
        
        await playerPage.waitForSelector('#room-code-input');
        await playerPage.type('#room-code-input', sessionId);
        await playerPage.click('#join-room-btn');
        
        console.log('Player joined the game');
        
        // STEP 3: Spectator joins active game
        const spectatorPage = await browser.newPage();
        await spectatorPage.goto('http://localhost:8777');
        
        await spectatorPage.waitForSelector('#room-code-input');
        await spectatorPage.type('#room-code-input', sessionId);
        await spectatorPage.click('#join-room-btn');
        
        console.log('Spectator joined the game');
        
        // Wait for all connections to establish
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Take screenshots for verification
        await hostPage.screenshot({ path: 'debug-host.png', fullPage: true });
        await playerPage.screenshot({ path: 'debug-player.png', fullPage: true });
        await spectatorPage.screenshot({ path: 'debug-spectator.png', fullPage: true });
        
        // Keep browsers open for manual inspection
        console.log('Test complete. Browsers left open for inspection.');
        await new Promise(() => {}); // Keep alive
        
    } catch (error) {
        console.error('Test failed:', error);
        await browser.close();
    }
}
```

### Game Interaction Testing

Test specific game mechanics like checkbox toggling:

```javascript
async function testCheckboxInteractions() {
    const browser = await puppeteer.launch({ headless: false });
    
    try {
        // Create two players
        const player1 = await browser.newPage();
        const player2 = await browser.newPage();
        
        // Player 1 creates and starts game
        await player1.goto('http://localhost:8777');
        await player1.click('[data-game="checkbox-game"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const sessionId = await player1.evaluate(() => 
            document.getElementById('room-code-display')?.textContent
        );
        
        await player1.click('#start-game-btn-header');
        
        // Player 2 joins
        await player2.goto('http://localhost:8777');
        await player2.type('#room-code-input', sessionId);
        await player2.click('#join-room-btn');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test checkbox interactions
        console.log('Testing checkbox interactions...');
        
        // Player 1 clicks first checkbox
        await player1.click('.checkbox-item[data-index="0"]');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Player 2 clicks second checkbox
        await player2.click('.checkbox-item[data-index="1"]');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify synchronization by checking both pages
        const p1Checkbox0 = await player1.$('.checkbox-item[data-index="0"].checked');
        const p2Checkbox0 = await player2.$('.checkbox-item[data-index="0"].checked');
        
        console.log('Checkbox sync test:', {
            player1SawCheckbox0: !!p1Checkbox0,
            player2SawCheckbox0: !!p2Checkbox0
        });
        
    } catch (error) {
        console.error('Checkbox test failed:', error);
    } finally {
        await browser.close();
    }
}
```

### Real-time Updates Testing

Test WebSocket synchronization between users:

```javascript
async function testRealTimeUpdates() {
    const browser = await puppeteer.launch({ headless: false });
    
    try {
        const pages = [];
        const numPlayers = 3;
        
        // Create multiple players
        for (let i = 0; i < numPlayers; i++) {
            pages.push(await browser.newPage());
        }
        
        // First player creates game
        await pages[0].goto('http://localhost:8777');
        await pages[0].click('[data-game="checkbox-game"]');
        
        const sessionId = await pages[0].evaluate(() => 
            document.getElementById('room-code-display')?.textContent
        );
        
        // Other players join
        for (let i = 1; i < numPlayers; i++) {
            await pages[i].goto('http://localhost:8777');
            await pages[i].type('#room-code-input', sessionId);
            await pages[i].click('#join-room-btn');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Start game
        await pages[0].click('#start-game-btn-header');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test rapid interactions
        console.log('Testing rapid interactions...');
        
        for (let round = 0; round < 5; round++) {
            const playerIndex = round % numPlayers;
            const checkboxIndex = Math.floor(Math.random() * 9);
            
            await pages[playerIndex].click(`.checkbox-item[data-index="${checkboxIndex}"]`);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log(`Round ${round + 1}: Player ${playerIndex + 1} clicked checkbox ${checkboxIndex}`);
        }
        
        // Verify all pages show same state
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        for (let i = 0; i < numPlayers; i++) {
            await pages[i].screenshot({ 
                path: `debug-sync-player${i + 1}.png`, 
                fullPage: true 
            });
        }
        
        console.log('Sync test complete. Check screenshots for consistency.');
        
    } catch (error) {
        console.error('Real-time test failed:', error);
    } finally {
        await browser.close();
    }
}
```

## UI State Validation

### Checking Element Visibility

```javascript
async function checkSpectatorUI(page) {
    // Check for spectator indicator
    const spectatorIndicator = await page.$('#spectator-indicator');
    if (spectatorIndicator) {
        const text = await page.evaluate(el => el.textContent, spectatorIndicator);
        console.log(`Spectator indicator: "${text}"`);
    }
    
    // Check for (YOU) indicator in spectator list
    const youIndicator = await page.evaluate(() => {
        const spectatorItems = document.querySelectorAll('.spectator-item');
        for (let item of spectatorItems) {
            if (item.textContent.includes('(YOU)')) {
                return item.textContent.trim();
            }
        }
        return null;
    });
    
    console.log('(YOU) indicator found:', youIndicator);
}
```

### Checking Game State

```javascript
async function checkGameState(page) {
    const gameState = await page.evaluate(() => {
        // Check if game has started
        const gameBoard = document.getElementById('checkbox-game-board');
        const gameStarted = gameBoard && gameBoard.style.display !== 'none';
        
        // Count checked boxes
        const checkedBoxes = document.querySelectorAll('.checkbox-item.checked').length;
        
        // Get player count
        const players = document.querySelectorAll('.player').length;
        
        // Get spectator count
        const spectators = document.querySelectorAll('.spectator-item').length;
        
        return {
            gameStarted,
            checkedBoxes,
            playerCount: players,
            spectatorCount: spectators
        };
    });
    
    console.log('Game state:', gameState);
    return gameState;
}
```

## Debugging Best Practices

### 1. Use Console Logging
```javascript
// Enable console messages in Puppeteer
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
```

### 2. Take Screenshots at Key Points
```javascript
await page.screenshot({ 
    path: `debug-step-${stepNumber}.png`, 
    fullPage: true 
});
```

### 3. Add Delays for Visual Debugging
```javascript
// Add delays to observe interactions
await new Promise(resolve => setTimeout(resolve, 1000));

// Or use slowMo in launch options
const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 250 
});
```

### 4. Keep Browsers Open for Inspection
```javascript
// For debugging, keep browsers open
console.log('Test complete. Press Ctrl+C to close browsers.');
await new Promise(() => {}); // Keep alive indefinitely
```

## Common Issues and Solutions

### WebSocket Connection Delays
- Always add delays after navigation and before WebSocket-dependent actions
- Wait for specific elements to appear rather than using fixed delays

### Element Not Found
- Use `waitForSelector()` instead of immediate clicks
- Check if elements are hidden by CSS `display: none`

### Race Conditions
- Add appropriate delays between rapid actions
- Verify state changes before proceeding to next action

### Session ID Retrieval
```javascript
// Robust session ID extraction
const sessionId = await page.evaluate(() => {
    const element = document.getElementById('room-code-display');
    if (!element) return null;
    
    // Wait for content to load
    const text = element.textContent || element.innerText;
    return text.trim();
});

if (!sessionId) {
    throw new Error('Could not retrieve session ID');
}
```

## Running Tests

Create test files in the project root and run them directly:

```bash
# Run a specific test
node test-spectator-proper.js

# Run with debug output
DEBUG=puppeteer:* node test-multiplayer.js
```

## Advanced Debugging Strategies

### WebSocket Testing with Raw Connections

For testing WebSocket functionality directly without the UI layer:

```javascript
const WebSocket = require('ws');

async function debugWebSocketFlow() {
    const sessionId = 'DEBUG' + Math.random().toString(36).substr(2, 4).toUpperCase();
    console.log('Testing session:', sessionId);
    
    // Connect as host
    const host = new WebSocket(`ws://localhost:8777/api/game/${sessionId}/ws`);
    await new Promise(resolve => host.once('open', resolve));
    
    // Start game
    host.send(JSON.stringify({
        type: 'START_GAME',
        data: { gameType: 'checkbox-game' }
    }));
    
    // Connect as spectator (after game started)
    const spectator = new WebSocket(`ws://localhost:8777/api/game/${sessionId}/ws`);
    
    spectator.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log(`Spectator received: ${msg.type}`);
        
        if (msg.type === 'spectator_identity') {
            console.log(`Spectator assigned: ${msg.data.spectator.emoji} ${msg.data.spectator.name}`);
        }
    });
    
    await new Promise(resolve => spectator.once('open', resolve));
}
```

### Checkbox Game State Debugging

Test checkbox synchronization and game end conditions:

```javascript
async function debugCheckboxGame() {
    const ws = new WebSocket('ws://localhost:8777/api/game/TEST123/ws');
    let playerId = null;
    
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
            case 'gameState':
                playerId = message.playerId;
                if (message.gameState.hostId === playerId) {
                    // Start game if host
                    ws.send(JSON.stringify({
                        type: 'START_GAME',
                        data: { gameType: 'checkbox-game' }
                    }));
                }
                break;
                
            case 'game_started':
                // Test checkbox toggles with detailed logging
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: 'toggle_checkbox',
                        checkboxIndex: 0
                    }));
                }, 500);
                break;
                
            case 'checkbox_toggled':
                const { checkboxIndex, newState, playerScores } = message.data;
                console.log(`Checkbox ${checkboxIndex} → ${newState}`);
                console.log('Scores:', playerScores);
                
                // Check game end condition
                if (message.data.gameState?.checkboxStates) {
                    const states = message.data.gameState.checkboxStates;
                    const checkedCount = states.filter(s => s === true).length;
                    console.log(`Progress: ${checkedCount}/9 boxes checked`);
                }
                break;
                
            case 'game_ended':
                console.log('Game ended!', message.data);
                ws.close();
                break;
        }
    });
}
```

### Environment Comparison Testing

Test differences between local and production environments:

```javascript
async function compareEnvironments() {
    const environments = [
        { name: 'local', url: 'http://localhost:8777' },
        { name: 'production', url: 'https://games.emilycogsdill.com' }
    ];
    
    const results = [];
    
    for (const env of environments) {
        const page = await browser.newPage();
        
        // Capture console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        await page.goto(env.url);
        await page.click('[data-game="checkbox-game"]');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check Start Game button state
        const startGameEnabled = await page.evaluate(() => {
            const btn = document.querySelector('#start-game-btn-header, #start-game-btn');
            return btn && !btn.disabled && btn.style.display !== 'none';
        });
        
        // Check WebSocket state
        const wsState = await page.evaluate(() => {
            if (window.gameClient?.ws) {
                return {
                    readyState: window.gameClient.ws.readyState,
                    url: window.gameClient.ws.url,
                    isHost: window.gameClient.gameState?.hostId === window.gameClient.currentPlayerId
                };
            }
            return 'no connection';
        });
        
        results.push({
            environment: env.name,
            startGameEnabled,
            wsState,
            consoleErrors
        });
        
        // Take screenshot for comparison
        await page.screenshot({ 
            path: `debug-${env.name}-state.png`, 
            fullPage: true 
        });
    }
    
    // Compare results
    console.log('\n=== ENVIRONMENT COMPARISON ===');
    results.forEach(result => {
        console.log(`${result.environment.toUpperCase()}:`);
        console.log(`  Start Game Button: ${result.startGameEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        console.log(`  WebSocket State:`, result.wsState);
        console.log(`  Console Errors:`, result.consoleErrors.length);
    });
    
    return results;
}
```

### Host Assignment and Player State Debugging

Debug common issues with host assignment and player roles:

```javascript
async function debugHostAssignment() {
    // Test the flow: join as host → leave → new player becomes host
    const sessionId = 'HOST' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    // Player 1 joins (becomes host)
    const player1 = new WebSocket(`ws://localhost:8777/api/game/${sessionId}/ws`);
    await new Promise(resolve => player1.once('open', resolve));
    
    // Player 2 joins (regular player)  
    const player2 = new WebSocket(`ws://localhost:8777/api/game/${sessionId}/ws`);
    await new Promise(resolve => player2.once('open', resolve));
    
    // Monitor host assignment messages
    [player1, player2].forEach((ws, index) => {
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            
            if (msg.type === 'host_assigned') {
                console.log(`Player ${index + 1} received host assignment:`, msg.data.hostId);
            }
            
            if (msg.type === 'gameState') {
                console.log(`Player ${index + 1} game state - Host ID:`, msg.gameState.hostId);
            }
        });
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Host leaves
    console.log('Host (Player 1) leaving...');
    player1.close();
    
    // Wait and check if Player 2 becomes host
    await new Promise(resolve => setTimeout(resolve, 2000));
}
```

## Integration with Development Workflow

1. **Start development server**: `npm run dev`
2. **Run Puppeteer test**: `node your-test-file.js`
3. **Review screenshots**: Check generated PNG files
4. **Manual inspection**: Leave browsers open to inspect state
5. **Iterate**: Modify code and re-run tests

### Production vs Development Debugging

When debugging issues that only occur in production:

1. **Use environment comparison scripts** to identify differences
2. **Check WebSocket connection states** in both environments
3. **Monitor console errors** for environment-specific issues
4. **Screenshot comparison** to visually identify UI differences
5. **Test host assignment logic** across environments

### Common Debug Patterns

- **Spectator Mode Testing**: Connect after game starts, verify read-only behavior
- **Rapid Interaction Testing**: Send multiple quick actions to test race conditions
- **Connection State Monitoring**: Track WebSocket readyState and connection timing
- **UI Synchronization**: Verify all clients show same game state
- **Host Transfer Testing**: Test host reassignment when original host leaves

This comprehensive debugging approach ensures robust multiplayer functionality and helps catch issues early in development.

## Architecture Refactor Debugging Principles

### Lessons from GameShell/GameModule Refactor

During the GameShell architecture refactor, we encountered a regression where player emojis weren't displaying in checkbox games. This debugging exercise revealed several key principles:

#### 1. **Data Flow Mapping in Modular Architectures**

**Problem**: When separating monolithic code into modules, data dependencies can break silently.

**Solution**: Map data flow explicitly:
```
Server → WebSocket → GameShell → GameModule → UI
```

**Debugging Strategy**:
- Add targeted logs at each boundary
- Verify data structure at each step  
- Check for missing data transformation

#### 2. **Message Structure Validation**

**Problem**: WebSocket message handlers assume consistent message structures, but server may vary formats.

**Solution**: Handle message structure variations explicitly:
```javascript
// ❌ Fragile - assumes playerId always exists
this.gameModule.handlePlayerAction(message.playerId, message);

// ✅ Robust - handles multiple possible structures  
const playerId = message.data?.toggledBy || message.playerId || message.data?.playerId;
this.gameModule.handlePlayerAction(playerId, message);
```

**Debugging Strategy**:
- Log actual message structures received
- Add fallback extraction logic
- Handle null/undefined cases gracefully

#### 3. **State Synchronization Between Components**

**Problem**: Game modules need continuous state updates, not just initial state.

**Root Cause**: GameShell updated its internal player state but didn't propagate changes to GameModule.

**Solution**: Create explicit update methods:
```javascript
// In GameModule base class
updatePlayers(players) {
    this.players = players;
    this.render(); // Re-render with new player data
}

// In GameShell
handleGameStateUpdate(message) {
    this.players = message.gameState.players;
    
    // Propagate to module
    if (this.gameModule) {
        this.gameModule.updatePlayers(this.players);
    }
}
```

#### 4. **Systematic Debug Logging**

**Strategy**: Add debug logs at data flow boundaries to trace exactly where information gets lost.

**Pattern**:
```javascript
// At message receipt
console.log('📨 Message received:', message.type, message);

// At data extraction  
console.log('🔄 Extracted data:', { playerId, players, exists: !!players[playerId] });

// At UI update
console.log('🖼️ Updating UI:', { checkboxIndex, playerId, emoji: players[playerId]?.emoji });
```

**Result**: Pinpoint exactly where `playerId` becomes null or `players[playerId]` becomes undefined.

#### 5. **Regression Testing for Architecture Changes**

**Testing Pattern**:
1. **Before refactor**: Document expected behavior (player emojis show in checkboxes)
2. **After refactor**: Verify same behavior still works
3. **On regression**: Systematic comparison between old and new data flows

#### 6. **Message Type Handling Consistency**

**Problem**: New architecture may handle different message types than original monolithic code.

**Solution**: Map all message types explicitly:
```javascript
// Add specific handlers for game-specific message types
case 'checkbox_toggled':
    if (this.gameModule && message.data) {
        const playerId = message.data.toggledBy || message.playerId;
        this.gameModule.handlePlayerAction(playerId, message);
    }
    break;
```

### General Debugging Principles for Multiplayer Games

1. **Always verify WebSocket message structures** - log complete messages when debugging
2. **Trace data flow through architectural boundaries** - GameShell ↔ GameModule communication
3. **Test with multiple simultaneous connections** - issues often only appear with >1 player
4. **Check both client-side and server-side logs** simultaneously  
5. **Add temporary debug UI** to visualize internal state during development
6. **Use systematic elimination** - isolate each component to find the failure point

### Architecture Change Checklist

When refactoring game architecture:

- [ ] **Map all data dependencies** between old and new components
- [ ] **Verify WebSocket message handling** matches expected message structures  
- [ ] **Test state synchronization** between shell and game modules
- [ ] **Check player-specific data flows** (emojis, names, scores)
- [ ] **Validate with multiple concurrent players**
- [ ] **Compare behavior before/after refactor** systematically
- [ ] **Clean up debug logs** before committing

This systematic debugging approach prevented a subtle but visible regression from reaching production.