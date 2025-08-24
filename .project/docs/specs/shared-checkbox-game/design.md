# Design Document

## Overview

The Shared Checkbox Game is a minimal multiplayer web application that demonstrates real-time shared state synchronization between multiple connected players. Players can join a shared session and interact with a 3x3 grid of checkboxes, with all actions immediately visible to other connected players. This serves as a foundational proof-of-concept for multiplayer functionality within the existing Cloudflare Workers-based games platform.

## Architecture

### System Components

The implementation follows the existing platform architecture:

1. **Cloudflare Worker**: Main entry point handling HTTP requests and WebSocket upgrades
2. **Durable Object**: `CheckboxGameSession` managing game state and player connections
3. **Frontend Client**: Vanilla JavaScript/TypeScript interface for player interaction
4. **WebSocket Communication**: Real-time bidirectional messaging between clients and server

### Technology Stack

- **Backend**: Cloudflare Workers with Durable Objects
- **Frontend**: Vanilla TypeScript (no framework dependencies)
- **Communication**: WebSocket API for real-time updates
- **State Management**: Server-authoritative with client-side predictions
- **Build System**: Custom TypeScript compiler (existing platform tooling)

## Components and Interfaces

### Backend Components

#### CheckboxGameSession (Durable Object)
```typescript
interface CheckboxGameSession extends DurableObject {
  sessionId: string;
  players: Map<string, Player>;
  checkboxStates: boolean[]; // 9 checkboxes (3x3 grid)
  websockets: Set<WebSocket>;
  lastActivity: number;
}
```

#### Player Interface
```typescript
interface Player {
  id: string;
  name: string;
  connected: boolean;
  joinedAt: number;
  lastAction: number;
}
```

#### Message Types
```typescript
interface CheckboxMessage {
  type: 'TOGGLE_CHECKBOX' | 'PLAYER_JOINED' | 'PLAYER_LEFT' | 'STATE_UPDATE';
  playerId: string;
  data: {
    checkboxIndex?: number; // 0-8 for 3x3 grid
    checkboxStates?: boolean[];
    players?: Player[];
    playerCount?: number;
  };
}
```

### Frontend Components

#### CheckboxGameClient
```typescript
class CheckboxGameClient {
  private ws: WebSocket | null;
  private sessionId: string;
  private playerId: string;
  private checkboxStates: boolean[];
  private playerCount: number;
  
  connect(sessionId: string): void;
  toggleCheckbox(index: number): void;
  handleMessage(message: CheckboxMessage): void;
  updateUI(): void;
}
```

#### UI Elements
- **Checkbox Grid**: 3x3 grid of interactive checkboxes
- **Player Counter**: Display of currently connected players
- **Connection Status**: Visual indicator of connection state
- **Session ID Display**: Shows current room code for sharing

## Data Models

### Game State Structure
```typescript
interface CheckboxGameState {
  sessionId: string;
  checkboxStates: boolean[]; // Array of 9 boolean values
  players: Map<string, Player>;
  createdAt: number;
  lastActivity: number;
}
```

### WebSocket Message Flow
```typescript
// Client to Server
{
  type: 'TOGGLE_CHECKBOX',
  playerId: 'player_123',
  data: { checkboxIndex: 4 }
}

// Server to All Clients
{
  type: 'STATE_UPDATE',
  playerId: 'player_123',
  data: {
    checkboxStates: [true, false, true, false, true, false, true, false, true],
    players: [...],
    playerCount: 3
  }
}
```

### State Persistence
- **In-Memory**: Active game state stored in Durable Object memory
- **Automatic Cleanup**: Sessions cleaned up after 1 hour of inactivity
- **No External Storage**: Simple enough to not require persistent storage

## Error Handling

### Connection Management
- **Automatic Reconnection**: Client attempts reconnection with exponential backoff
- **Connection Timeout**: 30-second timeout for inactive connections
- **Graceful Degradation**: UI shows connection status and disables interactions when disconnected

### State Synchronization
- **Server Authority**: Server state always takes precedence over client predictions
- **Conflict Resolution**: Last action wins for simultaneous checkbox toggles
- **State Recovery**: Full state sync on reconnection

### Input Validation
- **Checkbox Index Validation**: Ensure index is 0-8 for 3x3 grid
- **Rate Limiting**: Maximum 10 actions per second per player
- **Message Size Limits**: Maximum 1KB per WebSocket message

## Testing Strategy

### Unit Tests
- **Checkbox State Logic**: Test toggle operations and state transitions
- **Player Management**: Test join/leave operations
- **Message Handling**: Test all message types and edge cases
- **Input Validation**: Test boundary conditions and invalid inputs

### Integration Tests
- **WebSocket Communication**: End-to-end message flow testing
- **Multi-Player Scenarios**: Test concurrent player actions
- **Connection Handling**: Test disconnect/reconnect scenarios
- **State Synchronization**: Verify state consistency across clients

### Manual Testing Scenarios
1. **Single Player**: Verify checkbox toggling works correctly
2. **Multiple Players**: Confirm real-time synchronization between players
3. **Connection Issues**: Test behavior during network interruptions
4. **Session Sharing**: Verify players can join via session ID
5. **Browser Compatibility**: Test across different browsers

## Performance Considerations

### Scalability Limits
- **Players per Session**: Maximum 50 concurrent players (well within Durable Object limits)
- **Message Throughput**: ~100 messages/second per session (checkbox toggles)
- **Memory Usage**: ~1KB per player, ~50KB total per session
- **Session Lifetime**: 1 hour maximum, auto-cleanup on inactivity

### Optimization Strategies
- **Message Batching**: Batch multiple state updates if needed
- **Delta Updates**: Send only changed checkbox states (not implemented initially)
- **Client Prediction**: Immediate UI updates with server confirmation
- **Connection Pooling**: Reuse WebSocket connections where possible

## Security Considerations

### Input Sanitization
- **Checkbox Index Bounds**: Validate 0-8 range for grid positions
- **Player ID Validation**: Ensure player IDs are properly formatted UUIDs
- **Message Size Limits**: Prevent oversized WebSocket messages
- **Rate Limiting**: Prevent spam clicking and DoS attempts

### Session Security
- **Session ID Generation**: Use cryptographically secure random session IDs
- **No Authentication**: Intentionally simple - no user accounts or passwords
- **Temporary Sessions**: Sessions expire automatically, no persistent data
- **CORS Configuration**: Proper CORS headers for WebSocket connections

## Deployment Integration

### Existing Platform Integration
- **URL Structure**: `/checkbox-game/{sessionId}` following existing pattern
- **WebSocket Endpoint**: `/api/game/{sessionId}/ws` using existing routing
- **Static Assets**: Served via existing static file handling
- **Build Process**: Integrated with existing custom TypeScript compiler

### Configuration Updates
```toml
# wrangler.toml additions
[durable_objects]
bindings = [
  # ... existing bindings
  { name = "CHECKBOX_GAME_SESSION", class_name = "CheckboxGameSession" }
]

[[migrations]]
tag = "v2"
new_classes = ["CheckboxGameSession"]
```

### Frontend Integration
- **Game Selection**: Add checkbox game option to existing game portal
- **Shared Components**: Reuse existing WebSocket client patterns
- **UI Consistency**: Follow existing styling and layout patterns
- **Bundle Size**: Minimal impact (~2KB additional JavaScript)

## Monitoring and Observability

### Key Metrics
- **Active Sessions**: Number of concurrent checkbox game sessions
- **Player Connections**: Total WebSocket connections for checkbox games
- **Message Rate**: Checkbox toggle messages per second
- **Session Duration**: Average time players spend in sessions
- **Error Rate**: Connection failures and message processing errors

### Logging Strategy
- **Session Events**: Log session creation, player joins/leaves
- **Error Conditions**: Log WebSocket errors, validation failures
- **Performance Metrics**: Log message processing times
- **Cleanup Events**: Log automatic session cleanup operations

This design provides a minimal but complete multiplayer experience that demonstrates the core concepts of real-time shared state while serving as a foundation for more complex multiplayer games.