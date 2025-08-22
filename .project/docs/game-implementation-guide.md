# Game Implementation Guide

This guide provides a standardized approach for implementing new games using our modular GameSession architecture. Following these patterns ensures consistency, reliability, and maintainability.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Implementation Checklist](#implementation-checklist)
- [Required Methods](#required-methods)
- [Game State Management](#game-state-management)
- [Message Handling Patterns](#message-handling-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Testing Requirements](#testing-requirements)

---

## Architecture Overview

Our games follow a consistent pattern:

```
GameSession (Base Class)
├── Standard multiplayer functionality (chat, players, spectators)
├── WebSocket connection management
├── Room registry integration
└── Game-specific extensions (YourGameSession)
    ├── Game state definition
    ├── Game logic implementation
    └── Custom message handling
```

---

## Implementation Checklist

### 1. File Structure
- [ ] Create `src/durable-objects/YourGameSession.ts`
- [ ] Import and extend `GameSession`
- [ ] Define game-specific state interface
- [ ] Export default class for Durable Object binding

### 2. Required Methods
- [ ] `createInitialGameState()` - Define initial game state
- [ ] `handleStartGame()` - Override with game start logic
- [ ] `handleGameSpecificMessage()` - Handle custom messages
- [ ] Export default class

### 3. Game State Interface
- [ ] Include all base GameSession fields
- [ ] Add game-specific properties
- [ ] Use strict typing

### 4. Testing
- [ ] Test START_GAME functionality
- [ ] Test all game-specific message types
- [ ] Test game completion and scoring
- [ ] Verify WebSocket communication

---

## Required Methods

### 1. createInitialGameState()

**Purpose**: Define the initial state structure for your game.

**Pattern**:
```typescript
protected createInitialGameState(gameType: string): YourGameState {
  return {
    // Base GameSession fields (REQUIRED)
    type: 'your-game-type',
    status: 'waiting',
    players: {},
    hostId: null,
    gameStarted: false,
    gameFinished: false,
    spectatorCount: 0,
    spectators: {},
    
    // Your game-specific fields
    phase: 'WAITING',
    gameData: {},
    scores: {}
  };
}
```

**Requirements**:
- Must include ALL base GameSession fields
- Must return object matching your game state interface
- Use consistent naming conventions

### 2. handleStartGame()

**Purpose**: Override base class to implement game-specific start logic.

**Pattern**:
```typescript
protected async handleStartGame(ws: WebSocket, playerId: string) {
  // Validation (optional)
  const playerCount = Object.keys(this.gameState.players).length;
  if (playerCount < 2) {
    this.sendTo(ws, {
      type: 'error',
      message: 'Need at least 2 players to start'
    });
    return;
  }

  // Update game state
  this.gameState.gameStarted = true;
  this.gameState.status = 'started';
  this.gameState.phase = 'YOUR_FIRST_PHASE';
  
  // Save state
  await this.saveGameState();
  this.updateRegistryStatus('in-progress');
  
  // Notify all players
  this.broadcast({
    type: 'game_started',
    data: {
      gameType: this.gameState.type,
      gameState: this.gameState,
      phase: this.gameState.phase
    },
    timestamp: Date.now()
  });
}
```

**Requirements**:
- MUST call `this.saveGameState()`
- MUST call `this.updateRegistryStatus('in-progress')`
- MUST broadcast game_started message
- Use `this.sendTo()` for player-specific messages
- Use `this.broadcast()` for all-player messages

### 3. handleGameSpecificMessage()

**Purpose**: Handle custom message types specific to your game.

**Pattern**:
```typescript
protected async handleGameSpecificMessage(ws: WebSocket, playerId: string, data: any) {
  switch (data.type) {
    case 'your_action_type':
      await this.handleYourAction(ws, playerId, data);
      break;
    
    case 'another_action':
      await this.handleAnotherAction(ws, playerId, data);
      break;
    
    default:
      console.log(`Unknown message type: ${data.type}`);
  }
}
```

**Requirements**:
- Handle ALL custom message types
- Use consistent async/await pattern
- Include error handling for invalid actions
- Log unknown message types

---

## Game State Management

### State Interface Definition

```typescript
interface YourGameState {
  // Base GameSession fields (ALWAYS REQUIRED)
  type: 'your-game-type';
  status: 'waiting' | 'started' | 'finished';
  players: Record<string, any>;
  hostId: string | null;
  gameStarted: boolean;
  gameFinished: boolean;
  spectatorCount: number;
  spectators: Record<string, any>;
  
  // Game-specific fields
  phase: 'WAITING' | 'YOUR_PHASES';
  gameSpecificData: any;
}
```

### State Update Patterns

**Always follow this pattern for state updates**:
```typescript
// 1. Update state
this.gameState.phase = 'NEW_PHASE';
this.gameState.someData = newValue;

// 2. Save to storage
await this.saveGameState();

// 3. Notify players
this.broadcast({
  type: 'phase_changed',
  data: { 
    phase: this.gameState.phase,
    gameState: this.gameState 
  }
});
```

---

## Message Handling Patterns

### Validation Pattern
```typescript
private async handleYourAction(ws: WebSocket, playerId: string, data: any) {
  // Phase validation
  if (this.gameState.phase !== 'EXPECTED_PHASE') {
    this.sendTo(ws, {
      type: 'error',
      message: 'Action not allowed in current phase'
    });
    return;
  }
  
  // Data validation
  if (!data.requiredField) {
    this.sendTo(ws, {
      type: 'error',
      message: 'Missing required field'
    });
    return;
  }
  
  // Process action
  // ... game logic here ...
  
  // Update state and notify
  await this.saveGameState();
  this.broadcast({
    type: 'action_completed',
    data: { /* relevant data */ }
  });
}
```

### Available Utility Methods

From base GameSession class:
- `this.sendTo(ws, message)` - Send to specific player
- `this.broadcast(message)` - Send to all players
- `this.saveGameState()` - Persist state to storage
- `this.updateRegistryStatus(status)` - Update room registry
- `this.players` - Map of connected players
- `this.spectators` - Map of spectators

---

## Common Pitfalls

### 1. Missing Base State Fields
**Problem**: Forgetting required base GameSession fields in state interface.
**Solution**: Always include ALL base fields shown in examples above.

### 2. Not Overriding handleStartGame()
**Problem**: Using base class handleStartGame() which doesn't implement game logic.
**Solution**: Always override with game-specific start logic.

### 3. Forgetting to Save State
**Problem**: State changes not persisted, lost on restart.
**Solution**: Call `await this.saveGameState()` after state changes.

### 4. Missing Method Signatures
**Problem**: Method signatures don't match base class expectations.
**Solution**: Copy exact signatures from working examples.

### 5. Invalid Message Handling
**Problem**: handleGameSpecificMessage has wrong parameters.
**Solution**: Use exact signature: `(ws: WebSocket, playerId: string, data: any)`

### 6. Not Calling Parent Methods
**Problem**: Missing required base class functionality.
**Solution**: Call parent methods when needed (rare, but check patterns).

---

## Testing Requirements

### Manual Testing Checklist
- [ ] Game creation works
- [ ] Players can join
- [ ] START_GAME message triggers game start
- [ ] All game phases transition correctly
- [ ] Game completion works
- [ ] Scoring/results display properly
- [ ] Error messages appear for invalid actions

### Required Test Script
Create a Puppeteer test following the patterns in [testing-requirements.md](testing-requirements.md).

Test must verify:
- Game creation and joining
- START_GAME message handling
- Game-specific actions and state changes
- Game completion and results

---

## Working Examples

Reference these implementations:
- **CheckboxGameSession.ts** - Simple state management, direct actions
- **EverybodyVotesGameSession.ts** - Complex multi-phase game, voting mechanics

---

## Validation Checklist

Before submitting your game implementation:

### Code Structure
- [ ] Extends GameSession properly
- [ ] Defines complete state interface
- [ ] Implements all required methods
- [ ] Uses consistent naming conventions

### Functionality
- [ ] START_GAME message works
- [ ] Game progresses through phases
- [ ] State saves and loads correctly
- [ ] Game completes successfully

### Integration
- [ ] Durable Object binding configured
- [ ] Frontend module exists
- [ ] Game appears in selection screen
- [ ] WebSocket messages handled correctly

### Testing
- [ ] Manual testing completed
- [ ] Puppeteer test script written and passes
- [ ] Error handling tested
- [ ] Edge cases considered

Following these guidelines ensures your game integrates seamlessly with our platform architecture and provides a consistent player experience.