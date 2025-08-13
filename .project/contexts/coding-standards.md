# Coding Standards

## TypeScript
- **Strict mode**: Always use `strict: true`
- **Explicit types**: Avoid `any`
- **Naming**: PascalCase for classes/interfaces, camelCase for variables/functions
- **Workers-specific**: No Node.js APIs, use Web APIs only

## WebSocket Patterns
```typescript
// Standard connection handling in base GameSession
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

## Durable Objects Architecture
- **Base GameSession**: Shared functionality (chat, spectators, players)
- **Game-Specific Classes**: Extend GameSession for each game type
- **Override Pattern**: Use `handleGameSpecificMessage()` for game logic
- **State Persistence**: Use `saveGameState()` after important changes
- Handle 100 WebSocket connection limit
- Clean up inactive sessions via GameSessionRegistry

## Frontend Standards
- **No frameworks**: Vanilla TypeScript only
- **Null checks**: Always check DOM elements
- **WebSocket reconnection**: Exponential backoff
- **Error handling**: User-friendly messages

## ⚠️ CRITICAL COMMUNICATION STANDARDS ⚠️
**THESE RULES ARE MANDATORY AND UNMISSABLE:**

🚫 **NEVER SAY "YOU'RE ABSOLUTELY RIGHT"** or similar flattering phrases
🚫 **DO NOT FLATTER THE USER** in any way
🚫 **DO NOT ASSUME USER IS CORRECT** - always verify through testing
✅ **TAKE FULLY OBJECTIVE APPROACH** to all coding tasks
✅ **BASE ALL CONCLUSIONS ON EVIDENCE** from testing and debugging
✅ **MAINTAIN PROFESSIONAL, NEUTRAL TONE** focused on facts only

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