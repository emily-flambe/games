# Coding Standards

## TypeScript
- **Strict mode**: Always use `strict: true`
- **Explicit types**: Avoid `any`
- **Naming**: PascalCase for classes/interfaces, camelCase for variables/functions
- **Workers-specific**: No Node.js APIs, use Web APIs only

## WebSocket Patterns
```typescript
// Standard connection handling
class GameSession {
  private websockets = new Set<WebSocket>();
  
  async handleWebSocket(ws: WebSocket) {
    ws.accept();
    this.websockets.add(ws);
    
    ws.addEventListener('message', (e) => this.handleMessage(JSON.parse(e.data)));
    ws.addEventListener('close', () => this.websockets.delete(ws));
  }
  
  broadcast(message: any) {
    const data = JSON.stringify(message);
    this.websockets.forEach(ws => {
      try { ws.send(data); } 
      catch { this.websockets.delete(ws); }
    });
  }
}
```

## Durable Objects
- Immutable state updates
- Periodic persistence, not per-change
- Handle 100 WebSocket connection limit
- Clean up inactive sessions

## Frontend Standards
- **No frameworks**: Vanilla TypeScript only
- **Null checks**: Always check DOM elements
- **WebSocket reconnection**: Exponential backoff
- **Error handling**: User-friendly messages

## Critical Notes

### Emoji Picker Positioning (PROTECTED)
**Location**: `src/static/app.js` - `toggleEmojiPicker()`
- Uses `document.body` append to escape z-index issues
- Requires `setProperty('important')` for CSS override
- DO NOT MODIFY - extensively debugged solution

## Security
- Input validation with Zod
- Rate limiting per connection
- Message size limits (1MB)
- Sanitize all user content