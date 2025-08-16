# Deployment Best Practices for Cross-Environment Compatibility

## Core Principles

### 1. State Management
- **Always send complete state** in every message
- **Never assume client state** matches server state
- **Include phase/status explicitly** in all state updates
- **Implement state validation** before processing actions

### 2. Message Protocol
- **Define a strict message schema** with required fields
- **Version your message protocol** for backward compatibility
- **Always acknowledge messages** to confirm receipt
- **Include timestamps** for debugging timing issues

### 3. Error Handling
- **Fail gracefully** with user-friendly messages
- **Log extensively** but conditionally based on environment
- **Implement retry logic** for transient failures
- **Provide fallback behaviors** for edge cases

### 4. Testing Strategy
- **Test both environments** before deployment
- **Use automated tests** for critical flows
- **Monitor production logs** during initial deployment
- **Have rollback plan** ready

## Implementation Guidelines

### Server-Side Best Practices

```typescript
// Always send complete context
broadcast(type: string, data: any) {
  this.broadcast({
    type,
    data,
    gameState: this.gameState,
    timestamp: Date.now(),
    version: MESSAGE_PROTOCOL_VERSION
  });
}

// Validate before state changes
validateStateTransition(from: string, to: string): boolean {
  const validTransitions = {
    'WAITING': ['VOTING'],
    'VOTING': ['RESULTS'],
    'RESULTS': ['WAITING']
  };
  return validTransitions[from]?.includes(to) ?? false;
}
```

### Client-Side Best Practices

```javascript
// Defensive message handling
handleMessage(message) {
  // Validate message structure
  if (!message.type || !message.timestamp) {
    console.error('Invalid message structure', message);
    return;
  }
  
  // Update local state
  if (message.gameState) {
    this.syncLocalState(message.gameState);
  }
  
  // Process message
  super.handleMessage(message);
  
  // Verify UI consistency
  this.verifyUIState();
}

// State synchronization
syncLocalState(serverState) {
  const oldPhase = this.currentPhase;
  this.currentPhase = serverState.phase;
  
  if (oldPhase !== this.currentPhase) {
    console.log(`Phase transition: ${oldPhase} → ${this.currentPhase}`);
    this.render();
  }
}
```

## Environment-Specific Considerations

### Local Development (Node.js)
- More permissive WebSocket handling
- Different timing characteristics
- May mask race conditions
- Different error propagation

### Production (Cloudflare Workers)
- Stricter WebSocket lifecycle
- Different connection pooling
- More aggressive timeout handling
- Different error boundaries

## Testing Checklist

### Before Every Deployment
1. Run full test suite locally
2. Test critical user flows on staging
3. Verify WebSocket connections work
4. Check state transitions are smooth
5. Validate error handling works
6. Test with multiple concurrent users
7. Test reconnection scenarios
8. Verify cleanup on disconnect

### After Deployment
1. Monitor logs for errors
2. Test critical paths immediately
3. Check WebSocket stability
4. Verify state synchronization
5. Test edge cases
6. Monitor performance metrics

## Common Pitfalls to Avoid

1. **Assuming state consistency** - Always verify
2. **Partial state updates** - Send complete state
3. **Missing error handling** - Handle all edge cases
4. **Ignoring timing issues** - Add appropriate delays/retries
5. **Not testing production** - Always test deployed code
6. **Forgetting cleanup** - Properly clean up resources
7. **Hardcoding environments** - Use configuration
8. **Skipping logs** - Log important state changes

## Debugging Tools

### Development
```javascript
// Enhanced logging for development
if (isDevelopment) {
  window.debugGame = {
    getState: () => this.gameState,
    getPhase: () => this.currentPhase,
    forceRender: () => this.render(),
    simulateVote: (vote) => this.submitVote(vote)
  };
}
```

### Production
```javascript
// Conditional verbose logging
const debugMode = localStorage.getItem('debugMode') === 'true';
if (debugMode) {
  console.log('Debug mode enabled');
  // Add detailed logging
}
```

## Recovery Strategies

### Connection Loss
```javascript
// Implement exponential backoff
reconnect(attempt = 1) {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  setTimeout(() => {
    this.connect().catch(() => this.reconnect(attempt + 1));
  }, delay);
}
```

### State Desync
```javascript
// Request fresh state from server
requestStateSync() {
  if (this.ws?.readyState === WebSocket.OPEN) {
    this.ws.send(JSON.stringify({ 
      type: 'request_state_sync',
      timestamp: Date.now()
    }));
  }
}
```

## Monitoring and Alerts

### Key Metrics to Track
- WebSocket connection success rate
- Average connection duration
- State transition failures
- Message processing errors
- Client-server desync events

### Alert Conditions
- Connection failure rate > 5%
- State desync detected
- Unhandled client errors
- Server processing errors
- Abnormal disconnection patterns

## Continuous Improvement

1. **Log Analysis** - Regularly review production logs
2. **User Feedback** - Monitor user reports
3. **Performance Metrics** - Track key indicators
4. **A/B Testing** - Test improvements safely
5. **Post-Mortems** - Learn from incidents
6. **Documentation** - Keep docs updated
7. **Code Reviews** - Enforce best practices
8. **Automated Testing** - Expand test coverage