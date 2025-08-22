# Coding Standards

## General Principles
- Clarity over cleverness
- Consistency throughout codebase
- Self-documenting code
- Minimal dependencies (vanilla TypeScript only for frontend)

## Language-Specific Standards

### TypeScript
- Style guide: TypeScript strict mode (`strict: true`)
- Formatting: Consistent indentation (2 spaces)
- Naming conventions:
  - Variables: camelCase
  - Functions: camelCase
  - Classes: PascalCase
  - Interfaces: PascalCase with 'I' prefix optional
  - Constants: UPPER_SNAKE_CASE
- Workers-specific: No Node.js APIs, use Web APIs only
- Avoid `any` type - use explicit types

## Code Patterns

### Preferred Patterns

#### WebSocket Connection Handling
```typescript
// Good: Standard connection handling in base GameSession
class GameSession {
  protected websockets = new Map<WebSocket, string>(); // WS -> playerId
  
  async fetch(request: Request) {
    // Handle WebSocket upgrade
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    // Store mapping, handle messages, etc.
  }
  
  broadcast(message: any) {
    const data = JSON.stringify(message);
    for (const ws of this.websockets.keys()) {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) {
        try { ws.send(data); } 
        catch { this.websockets.delete(ws); }
      }
    }
  }
}
```

#### Durable Objects Architecture
- Base GameSession: Shared functionality (chat, spectators, players)
- Game-Specific Classes: Extend GameSession for each game type
- Override Pattern: Use `handleGameSpecificMessage()` for game logic
- State Persistence: Use `saveGameState()` after important changes

### Anti-Patterns to Avoid
```typescript
// Bad: Using any type
let data: any = response;

// Bad: Not checking WebSocket state
ws.send(data); // May throw if connection closed

// Bad: Not handling DOM element null checks
document.getElementById('element').value; // May be null
```

## Error Handling
- Always handle errors explicitly
- Log errors with context
- Fail fast with clear messages
- User-friendly error messages in UI

## Testing Requirements
- Minimum coverage: Not enforced but all features must be tested
- Test naming: Descriptive names explaining what is tested
- Test structure: Arrange-Act-Assert pattern
- Always test on localhost:8777 with Puppeteer
- Evidence-based conclusions - verify through testing

## Documentation Standards
- Functions: TypeScript types serve as documentation
- Complex logic: Inline comments explaining "why" not "what"
- APIs: Document WebSocket message formats

## Performance Guidelines
- WebSocket latency: <100ms target
- Connection limit: 100 per Durable Object
- Bundle size: ~23KB frontend target
- Message size limits: 1MB maximum
- Optimization priorities: User experience > code elegance

## Security Practices
- Input validation with Zod
- Rate limiting per connection
- Sanitize all user content
- CORS configuration properly set
- Session isolation via Durable Objects
- No secrets in code - use environment variables

## Git Conventions
- Commit messages: Conventional commits format
- Branch naming: feature/[name], fix/[name], refactor/[name]
- PR requirements: Must pass Puppeteer tests, no test artifacts

## Frontend Standards
- No frameworks: Vanilla TypeScript only
- Null checks: Always check DOM elements exist
- WebSocket reconnection: Implement exponential backoff
- Error handling: Show user-friendly messages

## Protected Code Sections

### Emoji Picker Positioning
**Location**: `src/static/app.js` - `toggleEmojiPicker()`
- Uses `document.body` append to escape z-index issues
- Requires `setProperty('important')` for CSS override
- DO NOT MODIFY - extensively debugged solution

## File Structure
```
src/
├── durable-objects/    # Game session classes
├── static/            # Frontend assets
│   ├── js/           # JavaScript modules
│   └── styles.css    # All styles
├── lib/              # Utilities
└── index.ts          # Main worker
```