# Technology Stack

## Core Technologies
- **Language**: TypeScript 5.0+ (strict mode)
- **Runtime**: Cloudflare Workers (V8 isolates)
- **State Management**: Durable Objects
- **WebSockets**: Native WebSocket API
- **Frontend**: Vanilla TypeScript (no frameworks)
- **Testing**: Puppeteer for E2E, Jest for unit tests
- **Build Tool**: Wrangler CLI

## Key Dependencies
- `@cloudflare/workers-types`: TypeScript definitions for Workers
- `wrangler`: Cloudflare's CLI for development and deployment
- `puppeteer`: Browser automation for testing
- `jest`: Unit testing framework
- `typescript`: Type-safe JavaScript

## Development Setup

### Prerequisites
- Node.js version 18+ 
- npm or yarn
- Cloudflare account (for deployment)

### Environment Variables
```env
# No environment variables required for local development
# Port 8777 is hardcoded and must not be changed
```

### Commands
```bash
# Install dependencies
npm install

# Development (ALWAYS on port 8777)
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy

# Run tests
npm test

# Clean test artifacts (MANDATORY after testing)
./scripts/clean-test-artifacts.sh
```

## Architecture Decisions

### Durable Objects for State Management
**Context**: Need real-time multiplayer with consistent state
**Decision**: Use Durable Objects for per-session state
**Rationale**: Provides strong consistency, automatic scaling, and session isolation
**Trade-offs**: Limited to 100 WebSocket connections per DO, Cloudflare vendor lock-in

### Vanilla TypeScript Frontend
**Context**: Need lightweight, fast-loading frontend
**Decision**: No frameworks, pure TypeScript
**Rationale**: Minimal bundle size (~23KB), no framework overhead, full control
**Trade-offs**: More boilerplate code, no component reusability

### GameShell/GameModule Pattern
**Context**: Multiple games sharing common functionality
**Decision**: Base GameShell handles WebSocket, GameModules implement game logic
**Rationale**: Code reuse, consistent interface, easy to add new games
**Trade-offs**: Additional abstraction layer, learning curve

### Message-Based Communication
**Context**: Real-time updates between server and clients
**Decision**: JSON messages over WebSocket
**Rationale**: Simple, debuggable, works everywhere
**Trade-offs**: Larger payload than binary protocols

## Code Patterns

### WebSocket Message Handling
```typescript
// Preferred pattern - type-safe message handling
interface GameMessage {
  type: string;
  data?: any;
  playerId?: string;
}

handleMessage(message: GameMessage) {
  switch(message.type) {
    case 'START_GAME':
      this.startGame(message.data);
      break;
    // ... other cases
  }
}

// Avoid - untyped any usage
handleMessage(message: any) {
  // No type safety
}
```

### Durable Object Pattern
```typescript
// Preferred - extend base GameSession
export class CheckboxGameSession extends GameSession {
  protected handleGameSpecificMessage(
    ws: WebSocket, 
    message: any, 
    playerId: string
  ) {
    // Game-specific logic
  }
}

// Avoid - duplicating base functionality
export class CheckboxGameSession {
  // Don't reimplement chat, players, etc.
}
```

## Performance Considerations
- WebSocket message batching for high-frequency updates
- Lazy loading of game modules
- Delta updates instead of full state syncs
- Connection pooling and reuse
- Automatic cleanup of inactive sessions

## Security Practices
- Input validation on all messages
- Rate limiting (10 messages/second)
- Message size limits (1MB)
- WebSocket origin validation
- Sanitization of user-generated content
- No direct database access from frontend

## Testing Strategy
- **Unit tests**: Pure functions and utilities
- **Integration tests**: WebSocket message flow
- **E2E tests**: Full user workflows with Puppeteer
- **Visual tests**: Screenshot comparisons
- **Load tests**: Multiple concurrent connections

## Common Gotchas
- Port 8777 is hardcoded - changing breaks everything
- Durable Object 100 connection limit is hard limit
- WebSocket reconnection needs exponential backoff
- Test artifacts must be deleted immediately
- GameModule must receive continuous player updates
- Message structure varies between games

## Monitoring & Debugging
- Cloudflare dashboard for metrics
- `wrangler tail` for real-time logs
- Browser DevTools for WebSocket inspection
- Puppeteer for automated testing
- Console logging with emoji prefixes for clarity