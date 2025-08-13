# Architecture

## Overview
Modular Cloudflare Workers platform with separate Durable Objects for each game type, sharing common functionality through inheritance.

## Core Components

### Edge Layer (Worker)
- HTTP → WebSocket upgrade
- Static asset serving
- URL routing: `/api/game/{sessionId}/ws`

### Durable Objects
- **GameSession**: Abstract base class with shared functionality (chat, spectators, player management)
- **CheckboxGameSession**: Checkbox game implementation
- **EverybodyVotesGameSession**: Everybody Votes game implementation  
- **GameSessionRegistry**: Tracks and manages active game sessions
- Per-session isolation with 100 WebSocket connections max
- In-memory state management with storage persistence

### Frontend (GameShell/GameModule)
- **GameShell.js**: Core WebSocket management, player state
- **GameModule.js**: Base class for game implementations
- Game modules extend GameModule for specific logic
- Automatic reconnection with exponential backoff
- 23KB bundled JavaScript

## Message Protocol

### Core Message Types (Base GameSession)
- `JOIN`: Player joining
- `LEAVE`: Player leaving  
- `START_GAME`: Host starts game
- `gameState`: Full state sync
- `host_assigned`: Host role changes
- `chat_message`: Chat functionality
- `change_name`/`change_emoji`: Player customization

### Game-Specific Messages
**CheckboxGameSession:**
- `toggle_checkbox`: Toggle checkbox state

**EverybodyVotesGameSession:**
- `submit_vote`: Submit vote choice
- `submit_prediction`: Submit prediction
- `phase_changed`: Game phase transitions
- `game_results`: Final results

## Data Flow
```
Client → Worker → Game-Specific Durable Object → Broadcast → All Clients
         ↓
    Route by gameType:
    - 'checkbox-game' → CheckboxGameSession
    - 'everybody-votes' → EverybodyVotesGameSession
    - others → Base GameSession
```

### State Management
- Server authoritative
- Client predictions with server confirmation
- Automatic session cleanup on inactivity

### Performance
- Message batching for efficiency
- Delta updates where possible
- WebSocket compression enabled

## File Structure
```
src/
├── index.ts              # Worker entry point (routes to appropriate DO)
├── durable-objects/
│   ├── GameSession.ts    # Base class with shared functionality
│   ├── CheckboxGameSession.ts      # Checkbox game logic
│   ├── EverybodyVotesGameSession.ts # Everybody Votes logic
│   └── GameSessionRegistry.ts      # Active session tracking
├── static/
│   ├── index.html        # Main HTML
│   ├── app.js            # Frontend entry
│   ├── js/
│   │   ├── GameShell.js   # Core game manager
│   │   ├── GameModule.js  # Base game class
│   │   └── games/        # Game implementations
│   └── styles.css        # Styles
└── lib/
    └── static.ts         # Asset serving
```

## Monitoring
- Cloudflare Analytics (built-in)
- Real-time logs: `wrangler tail`
- WebSocket metrics in dashboard