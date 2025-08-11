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

## WebSocket Communication Flow

### Connection Establishment
1. Client requests WebSocket upgrade at `/ws/{gameType}/{sessionId}`
2. Worker routes to appropriate Durable Object
3. Durable Object accepts connection and adds to session
4. Initial state sent to newly connected client

### Message Flow
```
Client → Worker → Durable Object → Game Logic → Broadcast → All Clients
```

### Message Types
- **JOIN**: Player joining session
- **LEAVE**: Player leaving session
- **GAME_ACTION**: Game-specific actions (draw, vote, guess, etc.)
- **STATE_UPDATE**: Broadcast game state changes
- **HEARTBEAT**: Connection keepalive

## Data Flow Architecture

### State Management
- **Authoritative Server**: All game state managed server-side
- **Client Predictions**: UI updates immediately, server confirms
- **Conflict Resolution**: Server state always wins
- **Rollback**: Client state rollback on server rejection

### Persistence Strategy
- **In-Memory**: Active game state in Durable Object memory
- **Periodic Snapshots**: Optional state snapshots to KV/D1
- **Session Recovery**: Ability to restore session state
- **Cleanup**: Automatic cleanup of inactive sessions

## Scalability Considerations

### Horizontal Scaling
- **Per-Session Scaling**: Each game session is an independent Durable Object
- **Geographic Distribution**: Durable Objects automatically distributed globally
- **Connection Limits**: Max 100 WebSocket connections per Durable Object
- **Session Splitting**: Large sessions can be split across multiple objects

### Performance Optimizations
- **Message Batching**: Combine multiple updates into single broadcast
- **Delta Updates**: Send only changed state, not full state
- **Client-Side Interpolation**: Smooth animations between server updates
- **Compression**: WebSocket message compression for large payloads

## Security Architecture

### Authentication & Authorization
- **Session-Based**: Players identified by session tokens
- **Rate Limiting**: Per-connection and per-IP rate limits
- **Input Validation**: All client messages validated server-side
- **CORS**: Proper CORS headers for cross-origin WebSocket connections

### Data Sanitization
- **Message Filtering**: Sanitize all user-generated content
- **Size Limits**: Maximum message and payload sizes
- **Type Validation**: Strict TypeScript interfaces for all messages
- **XSS Prevention**: HTML sanitization for any displayed content

## Deployment Architecture

### Single Worker Deployment
```
games.yourdomain.com/
├── / (Game selection/lobby)
├── /drawing/{sessionId}
├── /bracket/{sessionId} 
├── /voting/{sessionId}
├── /price-guessing/{sessionId}
└── /ws/{gameType}/{sessionId} (WebSocket endpoints)
```

### Frontend Build System
- **Custom TypeScript Compiler**: No external build dependencies
- **Single Bundle Output**: Compiled to `src/static/bundle.js`
- **Development Mode**: Watch mode for rapid iteration
- **Import Resolution**: Automatic bundling of ES modules

### Frontend File Structure
```
├── src/static/           # Static assets served by backend
│   ├── index.html        # Main HTML template
│   ├── styles.css        # CSS styles
│   └── bundle.js         # Compiled JavaScript bundle
├── frontend-src/         # TypeScript source files
│   ├── main.ts           # Application entry point
│   ├── GamePortal.ts     # Game selection interface
│   └── GameRoom.ts       # Game room functionality
├── build-scripts/        # Build tooling
│   └── build-frontend.js # Custom TypeScript compiler
```

### Asset Bundling Strategy
- **Inline Assets**: Small assets embedded in Worker code
- **Dynamic Loading**: Larger assets served as separate endpoints
- **Caching**: Aggressive caching headers for static assets
- **Compression**: Gzip/Brotli compression for all text assets
- **Single Bundle**: 23KB JavaScript bundle for optimal performance

## Monitoring & Observability

### Key Metrics
- **Connection Count**: Active WebSocket connections per game type
- **Message Throughput**: Messages per second per session
- **Latency**: End-to-end message latency
- **Error Rates**: Connection failures, message processing errors
- **Resource Usage**: CPU/memory usage per Durable Object

### Logging Strategy
- **Structured Logging**: JSON-formatted logs with consistent fields
- **Correlation IDs**: Track requests across Worker invocations
- **Performance Tracing**: Detailed timing for critical operations
- **Error Context**: Full context capture for debugging failures