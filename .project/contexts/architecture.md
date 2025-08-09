# Architecture Documentation

## System Overview
The multiplayer games platform is built as a single Cloudflare Worker that manages multiple game types through a unified WebSocket architecture using Durable Objects for session management.

## Architecture Layers

### 1. Edge Layer (Cloudflare Workers)
- **Entry Point**: Single Worker handling all requests
- **Static Assets**: Bundled HTML/CSS/JS served directly from Worker
- **Routing**: URL-based routing to different game interfaces
- **WebSocket Upgrade**: HTTP → WebSocket connection establishment

### 2. Session Management Layer (Durable Objects)
- **GameSession**: Base session management for all games
- **Game-Specific Objects**: Specialized Durable Objects per game type
- **State Persistence**: In-memory state with optional persistence
- **Connection Management**: WebSocket connection lifecycle

### 3. Game Logic Layer
- **Drawing Game**: Canvas synchronization, brush strokes, collaborative editing
- **Bracket Tournament**: Tournament tree management, match progression
- **Voting System**: Real-time vote tallying, result broadcasting
- **Price Guessing**: Round management, scoring, leaderboards

### 4. Client Layer (Frontend)
- **Vanilla TypeScript**: No framework dependencies
- **WebSocket Client**: Persistent connection to game sessions
- **HTML5 Canvas**: For drawing game rendering
- **Responsive UI**: Mobile-first design approach

## Durable Objects Design

### GameSession (Base Class)
```typescript
interface GameSession {
  sessionId: string;
  gameType: 'drawing' | 'bracket' | 'voting' | 'price_guessing';
  players: Map<string, Player>;
  state: GameState;
  websockets: Set<WebSocket>;
  
  handleMessage(message: GameMessage): void;
  broadcastToAll(message: GameMessage): void;
  addPlayer(playerId: string, websocket: WebSocket): void;
  removePlayer(playerId: string): void;
}
```

### Specialized Game Objects
- **DrawingSession**: Extends GameSession with canvas state, brush data
- **BracketSession**: Tournament tree, match results, progression logic  
- **VotingSession**: Vote counts, options, timing controls
- **PriceGuessingSession**: Round data, guesses, scoring calculations

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

### Asset Bundling Strategy
- **Inline Assets**: Small assets embedded in Worker code
- **Dynamic Loading**: Larger assets served as separate endpoints
- **Caching**: Aggressive caching headers for static assets
- **Compression**: Gzip/Brotli compression for all text assets

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