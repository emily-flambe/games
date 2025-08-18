# UI Contract Documentation

**GameShell ↔ Game Module Interface Specification**

This document defines the complete contract between GameShell and game modules to prevent integration issues and ensure consistent behavior across all games.

## Table of Contents
- [Overview](#overview)
- [Core Principles](#core-principles)
- [GameShell Responsibilities](#gameshell-responsibilities)
- [Game Module Responsibilities](#game-module-responsibilities)
- [Message Contract](#message-contract)
- [UI Element Ownership](#ui-element-ownership)
- [Initialization Contract](#initialization-contract)
- [Game End Contract](#game-end-contract)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)
- [Developer Checklist](#developer-checklist)

## Overview

The GameShell acts as the host environment providing common functionality (WebSocket, players, chat, room management), while game modules implement specific game logic and UI within a designated container.

**Key Insight**: GameShell owns the shell UI and lifecycle, game modules own only their game-specific UI and logic.

## Core Principles

### 1. Clear Separation of Concerns
- **GameShell**: Room management, player management, WebSocket communication, shell UI elements
- **Game Module**: Game-specific logic, game-specific UI, game state management

### 2. Data Flow Direction
- **Upstream (Module → Shell)**: Player actions, state change notifications
- **Downstream (Shell → Module)**: WebSocket messages, player updates, initialization data

### 3. UI Container Model
- GameShell provides a container (`gameAreaElement`)
- Game modules render ONLY within their container
- Game modules NEVER directly manipulate shell UI elements

## GameShell Responsibilities

### WebSocket Management
```javascript
// GameShell handles ALL WebSocket communication
this.ws.send(JSON.stringify(action)); // ✅ GameShell sends
this.ws.onmessage = (event) => this.handleWebSocketMessage(event); // ✅ GameShell receives
```

### Player Management
```javascript
// GameShell maintains player state
this.players = message.gameState.players || {};
this.currentPlayerId = message.playerId;
this.currentPlayer = this.players[this.currentPlayerId];

// GameShell notifies modules of player changes
if (this.gameModule) {
    this.gameModule.updatePlayers(this.players);
}
```

### Shell UI Elements
GameShell owns and manages:
- Room header (game title, room code, leave button)
- Player list and controls (name input, emoji picker)
- Start game button (host only)
- Chat area and functionality
- Rules display box
- Loading overlays
- End game screen and final scores display

### Game Module Lifecycle
```javascript
// GameShell creates and initializes modules
await this.loadGameModule(gameType);
this.gameModule.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);

// GameShell cleans up modules
this.gameModule.cleanup();
this.gameModule = null;
```

### End Game Handling
```javascript
// GameShell displays unified end screen for ALL games
showGameEndScreen(gameEndData) {
    // Handles both score-based and score-less games
    if (scores && Object.keys(scores).length > 0) {
        // Show scores UI
    } else {
        // Remove scores element entirely for score-less games
        finalScores.remove();
    }
}
```

## Game Module Responsibilities

### Base Interface Implementation
All game modules MUST extend `GameModule` and implement:

```javascript
class MyGameModule extends GameModule {
    // Required methods
    render() { /* Update game UI */ }
    cleanup() { /* Clean up resources */ }
    
    // Optional methods
    getRules() { /* Return HTML string or null */ }
    handleMessage(message) { /* Handle WebSocket messages */ }
    handleStateUpdate(gameSpecificState) { /* Handle state updates */ }
    handlePlayerAction(playerId, action) { /* Handle player actions */ }
    updatePlayers(players) { /* Handle player updates */ }
}
```

### Game-Specific UI Management
```javascript
render() {
    if (!this.gameAreaElement) return;
    
    // Render ONLY within the provided container
    this.gameAreaElement.innerHTML = `
        <div class="my-game-container">
            <!-- Game-specific UI only -->
        </div>
    `;
    
    this.attachEventListeners();
}
```

### Player Actions
```javascript
// Send actions through the provided callback
if (this.onPlayerAction) {
    this.onPlayerAction({
        type: 'my_action',
        data: { /* action data */ }
    });
}
```

### State Management
```javascript
handleStateUpdate(gameSpecificState) {
    super.handleStateUpdate(gameSpecificState);
    
    // Update local game state
    this.myGameProperty = gameSpecificState.myGameProperty;
    this.render();
}
```

## Message Contract

### WebSocket Message Flow

1. **Server → GameShell**: Raw WebSocket messages
2. **GameShell → Module**: Filtered messages via `handleMessage()`
3. **Module → GameShell**: Player actions via `onPlayerAction()` callback
4. **GameShell → Server**: Actions sent via WebSocket

### Standard Message Types

#### Game Lifecycle Messages
```javascript
// Handled by GameShell, passed to modules
{
    type: 'game_started',
    data: {
        gameSpecificState: { /* module-specific data */ }
    }
}

{
    type: 'game_ended',
    data: {
        message: 'Game Complete!',
        scores: { playerId: score, ... } // Optional - can be null/undefined
    }
}
```

#### Game-Specific Messages
```javascript
// Passed directly to modules
{
    type: 'custom_game_message',
    data: { /* game-specific data */ }
}
```

#### Player Management Messages
```javascript
// Handled by GameShell, then forwarded to modules via updatePlayers()
{
    type: 'playerJoined' | 'playerLeft' | 'playerUpdated',
    gameState: {
        players: { playerId: playerData, ... }
    }
}
```

### Module-to-Shell Actions
```javascript
// Standard action format
this.onPlayerAction({
    type: 'action_type',
    data: { /* action-specific data */ }
});

// Common action types
this.onPlayerAction({ type: 'submit_vote', data: { vote: 'option1' } });
this.onPlayerAction({ type: 'make_move', data: { position: 5 } });
this.onPlayerAction({ type: 'end_game', data: {} });
```

## UI Element Ownership

### GameShell Elements (DO NOT TOUCH)
```html
<!-- Player management -->
<div id="players-container"><!-- Shell owned --></div>
<input id="player-name-input"><!-- Shell owned -->
<button id="current-emoji-btn"><!-- Shell owned -->

<!-- Game controls -->
<button id="start-game-btn-header"><!-- Shell owned -->
<button id="leave-room-btn"><!-- Shell owned -->

<!-- Chat -->
<div id="chat-area"><!-- Shell owned --></div>

<!-- Rules -->
<div id="rules-box"><!-- Shell owned -->
    <div id="game-rules-content"><!-- Module provides content -->
</div>

<!-- End game -->
<div id="end-game-screen"><!-- Shell owned -->
    <div id="game-result-message"><!-- Shell sets content -->
    <div id="final-scores"><!-- Shell manages, module scores via data -->
</div>
```

### Game Module Elements (FULL CONTROL)
```html
<!-- Game container - module owns all content inside -->
<div id="game-area">
    <!-- Everything inside here is module-controlled -->
    <div class="my-game-ui">
        <button class="game-specific-btn">Module Button</button>
        <div class="game-board">Module Content</div>
    </div>
</div>
```

## Initialization Contract

### GameShell Initialization Sequence
```javascript
1. loadGameModule(gameType)
2. Set module properties: currentPlayerId, isSpectator  
3. Call module.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement)
4. Call updateRulesDisplay() if module provides rules
5. Module renders initial UI
```

### Module Initialization Requirements
```javascript
init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
    // Call parent initialization
    super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);
    
    // Set initial state from server data
    if (initialState) {
        this.gamePhase = initialState.phase || 'WAITING';
        this.gameData = initialState.gameData || {};
        // Process hostId if needed
        if (initialState.hostId) {
            this.isHost = (this.currentPlayerId === initialState.hostId);
        }
    }
    
    // Initial render
    this.render();
}
```

### Critical Initialization Data
```javascript
// Always provided by GameShell
gameAreaElement  // DOM container for game UI
players         // Current players object
onPlayerAction  // Callback for sending actions to server
onStateChange   // Callback for notifying shell of state changes

// Optional but important
initialState    // Server state (may include hostId, phase, gameData)
rulesElement    // DOM element for rules content (optional)

// Module properties set by GameShell
this.currentPlayerId  // Current player's ID (null for spectators)
this.isSpectator     // Boolean indicating spectator status
```

## Game End Contract

### Score-Based Games
```javascript
// Server sends scores in game_ended message
{
    type: 'game_ended',
    data: {
        message: 'Game Complete!',
        scores: {
            'player1': 10,
            'player2': 5
        }
    }
}

// GameShell automatically displays scores in final-scores element
// Module does NOT handle final display - cleanup only
```

### Score-Less Games (like County Game)
```javascript
// Server sends NO scores in game_ended message
{
    type: 'game_ended',
    data: {
        message: 'Everyone Wins! 🎉'
        // scores: undefined/null - no scores property
    }
}

// GameShell removes final-scores element entirely
// Module does NOT handle final display - cleanup only
```

### Module End Game Responsibilities
```javascript
handleMessage(message) {
    switch (message.type) {
        case 'game_ended':
            // DO: Clean up timers, reset state
            this.clearTimer();
            
            // DON'T: Show end screen UI (GameShell handles this)
            // DON'T: Display scores (GameShell handles this)
            // DON'T: Manage OK button (GameShell handles this)
            break;
    }
}
```

## Error Handling

### Module Error Handling
```javascript
// Always check for required elements
if (!this.gameAreaElement) {
    console.error('Game area element not provided');
    return;
}

// Validate callbacks before use
if (this.onPlayerAction) {
    this.onPlayerAction(action);
} else {
    console.error('onPlayerAction callback not available');
}

// Handle missing players gracefully
const player = this.players?.[playerId];
if (!player) {
    console.warn(`Player ${playerId} not found`);
    return;
}
```

### GameShell Error Handling
```javascript
// Check module exists before calling methods
if (this.gameModule && this.gameModule.handleMessage) {
    this.gameModule.handleMessage(message);
}

// Validate game state before initialization
if (!this.gameAreaElement) {
    console.error('Game area element not found - games will not render properly');
}
```

## Best Practices

### 1. State Synchronization
```javascript
// ✅ Update local state then render
handleStateUpdate(gameSpecificState) {
    super.handleStateUpdate(gameSpecificState);
    this.currentPhase = gameSpecificState.phase;
    this.render(); // Always re-render after state change
}

// ❌ Don't assume state without validation
this.currentPhase = gameSpecificState.phase; // Could be undefined
```

### 2. Player Data Access
```javascript
// ✅ Safe player access
getPlayerName(playerId) {
    return this.players?.[playerId]?.name || `Player ${playerId.slice(-4)}`;
}

// ❌ Unsafe player access
return this.players[playerId].name; // Could throw if player doesn't exist
```

### 3. Event Listener Management
```javascript
// ✅ Attach listeners after render
render() {
    this.gameAreaElement.innerHTML = this.getHTML();
    this.attachEventListeners(); // Always call after DOM update
}

// ✅ Clean up listeners
cleanup() {
    this.clearEventListeners();
    super.cleanup();
}
```

### 4. Responsive Design
```javascript
// ✅ Use CSS classes for styling
this.gameAreaElement.innerHTML = `
    <div class="my-game-container">
        <button class="my-game-btn">Action</button>
    </div>
`;

// ❌ Don't use inline styles excessively
style="background: red; padding: 10px;" // Hard to maintain
```

## Common Pitfalls

### 1. UI Ownership Violations
```javascript
// ❌ NEVER manipulate shell elements from modules
document.getElementById('players-container').innerHTML = '...'; // WRONG
document.getElementById('chat-area').style.display = 'none';    // WRONG

// ✅ Only manipulate your container
this.gameAreaElement.innerHTML = '...'; // CORRECT
```

### 2. Direct WebSocket Access
```javascript
// ❌ NEVER access WebSocket directly from modules
this.ws.send(JSON.stringify(action)); // WRONG - ws not available

// ✅ Use provided callback
this.onPlayerAction(action); // CORRECT
```

### 3. Assuming Data Structure
```javascript
// ❌ Don't assume data exists
const playerName = this.players[playerId].name; // Could crash

// ✅ Validate data first
const player = this.players?.[playerId];
const playerName = player?.name || 'Unknown Player';
```

### 4. End Game UI Management
```javascript
// ❌ Don't show custom end screens
handleMessage(message) {
    if (message.type === 'game_ended') {
        this.showCustomEndScreen(); // WRONG - Shell handles this
    }
}

// ✅ Let shell handle end screen
handleMessage(message) {
    if (message.type === 'game_ended') {
        this.clearTimer(); // CORRECT - cleanup only
    }
}
```

### 5. State Initialization Errors
```javascript
// ❌ Don't assume initialState structure
init(gameAreaElement, players, initialState, ...) {
    this.phase = initialState.phase; // Could be undefined
}

// ✅ Provide defaults and validate
init(gameAreaElement, players, initialState, ...) {
    this.phase = initialState?.phase || 'WAITING';
    this.isHost = initialState?.hostId === this.currentPlayerId;
}
```

## Developer Checklist

### Pre-Development
- [ ] Read this contract document completely
- [ ] Understand the separation between shell and module responsibilities
- [ ] Plan game-specific messages and state structure
- [ ] Design game UI to fit within provided container

### During Development
- [ ] Extend `GameModule` base class
- [ ] Implement required methods: `render()`, `cleanup()`
- [ ] Use only `this.gameAreaElement` for UI rendering
- [ ] Send actions via `this.onPlayerAction()` callback only
- [ ] Handle `updatePlayers()` and `handleStateUpdate()` appropriately
- [ ] Validate all data before use (players, state, etc.)

### Game Logic
- [ ] Handle all relevant message types in `handleMessage()`
- [ ] Manage game state transitions properly
- [ ] Implement proper error handling for edge cases
- [ ] Support both player and spectator modes if applicable

### UI Implementation
- [ ] Render only within provided `gameAreaElement`
- [ ] Use CSS classes for styling (avoid excessive inline styles)
- [ ] Attach event listeners after each render
- [ ] Clean up event listeners in `cleanup()`
- [ ] Test responsive design on mobile devices

### End Game Handling
- [ ] Send appropriate game end actions to server
- [ ] Clean up timers and resources on game end
- [ ] Do NOT implement custom end screens
- [ ] Let GameShell handle final score display and OK button

### Testing & Integration
- [ ] Test with multiple players (minimum 2)
- [ ] Test spectator mode if applicable
- [ ] Test game end scenarios (with and without scores)
- [ ] Test error conditions (disconnections, invalid actions)
- [ ] Test on mobile devices and different screen sizes
- [ ] Verify no shell UI elements are being manipulated

### Final Checks
- [ ] No console errors during normal gameplay
- [ ] All player actions reach the server correctly
- [ ] Game state synchronizes properly across clients
- [ ] Rules display correctly if implemented
- [ ] Chat functionality remains unaffected
- [ ] Leave game and return to lobby works properly

## Examples

### Minimal Game Module Template
```javascript
class ExampleGameModule extends GameModule {
    constructor() {
        super();
        this.gamePhase = 'WAITING';
        this.gameData = {};
    }

    init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
        super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);
        
        if (initialState) {
            this.gamePhase = initialState.phase || 'WAITING';
            this.gameData = initialState.gameData || {};
        }
        
        this.render();
    }

    render() {
        if (!this.gameAreaElement) return;
        
        this.gameAreaElement.innerHTML = `
            <div class="example-game">
                <h3>Example Game - Phase: ${this.gamePhase}</h3>
                <button id="example-action-btn">Take Action</button>
            </div>
        `;
        
        this.attachEventListeners();
    }

    attachEventListeners() {
        const actionBtn = this.gameAreaElement.querySelector('#example-action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                if (this.onPlayerAction) {
                    this.onPlayerAction({
                        type: 'example_action',
                        data: { timestamp: Date.now() }
                    });
                }
            });
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'phase_changed':
                this.gamePhase = message.phase;
                this.render();
                break;
            case 'game_ended':
                // Clean up only - GameShell handles end screen
                this.cleanup();
                break;
        }
    }

    getRules() {
        return `
            <h3>Example Game Rules</h3>
            <ul>
                <li>Click the button to take an action</li>
                <li>Have fun!</li>
            </ul>
        `;
    }

    cleanup() {
        super.cleanup();
        this.gamePhase = 'WAITING';
        this.gameData = {};
    }
}
```

---

**Remember**: This contract prevents bugs like the County Game scores issue by clearly defining who owns what parts of the UI and when. When in doubt, follow the principle: **GameShell owns the shell, modules own only their game area.**