# Coding Standards & Guidelines

## TypeScript Standards

### General TypeScript Guidelines
- **Strict Mode**: Use `strict: true` in tsconfig.json
- **Explicit Types**: Prefer explicit type annotations over `any`
- **Interface over Type**: Use interfaces for object shapes, types for unions/primitives
- **Consistent Naming**: PascalCase for classes/interfaces, camelCase for variables/functions

### Cloudflare Workers Specific
- **No Node.js APIs**: Use only Web APIs compatible with Workers runtime
- **Module System**: Use ES modules exclusively, no CommonJS
- **Environment Variables**: Access via `env` parameter, never `process.env`
- **Async/Await**: Prefer async/await over Promises for readability

### Code Organization
```typescript
// File structure example
export interface GameMessage {
  type: 'JOIN' | 'LEAVE' | 'GAME_ACTION' | 'STATE_UPDATE';
  playerId: string;
  data: unknown;
}

export class GameSession implements DurableObject {
  private state: GameState;
  private players: Map<string, Player>;
  
  constructor(private env: Env) {
    this.state = new GameState();
    this.players = new Map();
  }
  
  async fetch(request: Request): Promise<Response> {
    // Implementation
  }
}
```

## WebSocket Implementation Standards

### Connection Management
```typescript
// Standard WebSocket handling pattern
export class GameSession {
  private websockets = new Set<WebSocket>();
  
  async handleWebSocket(websocket: WebSocket): Promise<void> {
    websocket.accept();
    this.websockets.add(websocket);
    
    websocket.addEventListener('message', (event) => {
      this.handleMessage(JSON.parse(event.data));
    });
    
    websocket.addEventListener('close', () => {
      this.websockets.delete(websocket);
    });
  }
  
  private broadcastToAll(message: GameMessage): void {
    const data = JSON.stringify(message);
    this.websockets.forEach(ws => {
      try {
        ws.send(data);
      } catch (error) {
        this.websockets.delete(ws);
      }
    });
  }
}
```

### Message Handling
- **Type Safety**: All WebSocket messages must have TypeScript interfaces
- **Error Handling**: Wrap all message processing in try-catch blocks  
- **Validation**: Validate all incoming messages against expected schemas
- **Response Pattern**: Always acknowledge critical messages

```typescript
interface DrawingMessage extends GameMessage {
  type: 'DRAW_STROKE';
  data: {
    x: number;
    y: number;
    color: string;
    brushSize: number;
    strokeId: string;
  };
}

private handleDrawingMessage(message: DrawingMessage): void {
  // Validate coordinates are within canvas bounds
  if (!this.isValidCoordinate(message.data.x, message.data.y)) {
    return;
  }
  
  // Update game state
  this.addStroke(message.data);
  
  // Broadcast to other players
  this.broadcastToOthers(message);
}
```

## Durable Objects Best Practices

### State Management
- **Immutable Updates**: Always create new state objects, never mutate directly
- **Periodic Persistence**: Save critical state periodically, not on every change
- **Memory Management**: Clean up unused data structures regularly
- **Concurrent Access**: Use proper locking for multi-client state updates

```typescript
export class GameSession implements DurableObject {
  private state: DurableObjectState;
  private gameState: GameStateData;
  
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }
  
  async initializeGameState(): Promise<void> {
    this.gameState = await this.state.storage.get<GameStateData>('gameState') || {
      players: {},
      status: 'waiting',
      createdAt: Date.now()
    };
  }
  
  private async saveState(): Promise<void> {
    await this.state.storage.put('gameState', this.gameState);
  }
}
```

### Performance Guidelines
- **Batch Operations**: Group multiple storage operations when possible
- **Lazy Loading**: Load data only when needed
- **Connection Limits**: Respect 100 WebSocket connection limit per object
- **Memory Limits**: Monitor memory usage, clean up inactive sessions

## Frontend TypeScript Standards

### DOM Manipulation
- **Type Safety**: Use proper DOM element types
- **Null Checking**: Always check for null before DOM operations
- **Event Handlers**: Use typed event handlers
- **Canvas API**: Properly type canvas context operations

```typescript
class DrawingCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Element ${canvasId} is not a canvas`);
    }
    
    this.canvas = canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    
    this.ctx = ctx;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.startDrawing(e.offsetX, e.offsetY);
    });
  }
}
```

### WebSocket Client Implementation
```typescript
class GameClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(gameType: string, sessionId: string): void {
    const wsUrl = `wss://${window.location.host}/ws/${gameType}/${sessionId}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('Connected to game session');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message: GameMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
    
    this.ws.onclose = () => {
      this.handleDisconnection();
    };
  }
}
```

## Error Handling Standards

### Server-Side Error Handling
```typescript
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  try {
    // Main request handling logic
    return await processGameRequest(request, env);
  } catch (error) {
    console.error('Request failed:', {
      url: request.url,
      method: request.method,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

### Client-Side Error Handling
- **Network Failures**: Implement retry logic with exponential backoff
- **WebSocket Disconnections**: Automatic reconnection with user notification
- **Validation Errors**: Show user-friendly error messages
- **State Corruption**: Reset to known good state when possible

## Testing Standards

### Unit Tests
- **Durable Object Logic**: Mock storage and WebSocket interfaces
- **Message Handling**: Test all message types and edge cases
- **State Transitions**: Verify correct state changes
- **Error Conditions**: Test error handling paths

### Integration Tests
- **WebSocket Flows**: End-to-end WebSocket communication tests
- **Multi-Player Scenarios**: Test concurrent player actions
- **Performance**: Load testing with multiple connections
- **Browser Compatibility**: Test across different browsers

## Code Review Guidelines

### Checklist for Reviews
- [ ] TypeScript strict mode compliance
- [ ] Proper error handling and logging
- [ ] WebSocket connection management
- [ ] Memory leak prevention
- [ ] Security input validation
- [ ] Performance considerations
- [ ] Test coverage for new features
- [ ] Documentation updates

### Security Review Points
- [ ] Input sanitization for all user data
- [ ] Rate limiting implementation
- [ ] WebSocket message size limits
- [ ] CORS configuration
- [ ] No sensitive data in logs
- [ ] Proper authentication checks