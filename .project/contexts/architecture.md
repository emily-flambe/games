# Architecture

## Overview
Single Cloudflare Worker managing multiple game types through WebSocket + Durable Objects.

## Core Components

### Edge Layer (Worker)
- HTTP → WebSocket upgrade
- Static asset serving
- URL routing: `/api/game/{sessionId}/ws`

### Durable Objects
- **GameSession**: Base class for all games
- Per-session isolation
- 100 WebSocket connections max
- In-memory state management

### Frontend (GameShell/GameModule)
- **GameShell.js**: Core WebSocket management, player state
- **GameModule.js**: Base class for game implementations
- Game modules extend GameModule for specific logic
- Automatic reconnection with exponential backoff
- 23KB bundled JavaScript

## Message Protocol

### Core Message Types
- `JOIN`: Player joining
- `LEAVE`: Player leaving
- `START_GAME`: Host starts game
- `game_action`: Game-specific actions
- `gameState`: Full state sync
- `host_assigned`: Host role changes

## Data Flow
```
Client → Worker → Durable Object → Broadcast → All Clients
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
├── index.ts              # Worker entry point
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