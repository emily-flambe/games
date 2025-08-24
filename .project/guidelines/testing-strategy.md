# Testing Strategy for Browser-Based Games Platform

## Core Testing Philosophy

This is a browser-based multiplayer games platform. The testing strategy acknowledges that **browser code needs a browser to test properly**. We use a three-tier testing approach that tests code where it actually runs.

## Three-Tier Testing Structure

### 1. Unit Tests (`tests/unit/`)
**Purpose**: Test isolated business logic that can run in Node.js

**What belongs here**:
- Pure functions (validation, formatting, calculations)
- Mock-based testing of game logic
- Utility functions that don't require DOM or browser APIs
- Algorithm testing (scoring, win conditions)

**What DOESN'T belong here**:
- Anything requiring `document`, `window`, or browser APIs
- WebSocket connections
- Actual GameShell.js or GameModule.js code

**Examples**:
- `input-validation.test.js` - Input validation logic
- `room-codes.test.js` - Room code generation/validation
- `GameSession-utils.test.js` - Game utility functions

**Run with**: `npm run test:unit`

### 2. Browser Integration Tests (`tests/browser/`)
**Purpose**: Test actual browser JavaScript in a real browser using Puppeteer

**What belongs here**:
- GameShell.js functionality
- GameModule loading and initialization
- WebSocket connection establishment
- DOM manipulation and event handling
- Browser API usage

**Key difference from E2E**: Tests individual components, not full user journeys

**Example**: `integration.test.js` - Tests real GameShell and GameModule code

**Run with**: `npm run test:browser`

### 3. End-to-End Tests (`tests/e2e/`)
**Purpose**: Test complete user journeys and multiplayer scenarios

**What belongs here**:
- Complete game flows from start to finish
- Multi-player room creation and joining
- Real-time synchronization between players
- Error recovery scenarios
- Host transfer and disconnection handling

**Examples**:
- `websocket-flow.test.js` - WebSocket message synchronization
- `critical-user-flows.test.js` - Complete user journeys
- `county-game.test.js` - Specific game testing

**Run with**: `npm run test:e2e`

## Why This Structure?

### The Problem with Traditional Jest Testing
Jest runs in Node.js, not in a browser. When you try to test browser JavaScript files in Jest:
- Browser APIs (`document`, `window`, `WebSocket`) don't exist
- DOM manipulation fails
- Module loading works differently
- Coverage metrics become misleading

**DON'T DO THIS**:
```javascript
// ❌ This will fail - Jest can't run browser code
const GameShell = require('../src/static/js/GameShell.js');

// ❌ This won't work properly either
eval(fs.readFileSync('GameShell.js', 'utf8'));
```

### The Solution
Test code where it actually runs:
- Node.js logic → Jest unit tests
- Browser code → Puppeteer browser tests
- User workflows → Puppeteer E2E tests

## Test Commands

```bash
# Main commands
npm test              # Runs unit + browser tests
npm run test:unit     # Fast unit tests only
npm run test:browser  # Browser integration tests
npm run test:e2e      # End-to-end tests
npm run test:all      # Everything

# Development
npm run test:watch    # Watch mode for unit tests
npm run test:coverage # Coverage for unit tests

# CI/CD
npm run test:e2e:ci   # E2E with CI optimizations
```

## Writing New Tests - Decision Tree

### Step 1: Can this code run without a browser?
- **YES** → Write a unit test with mocks in `tests/unit/`
- **NO** → Continue to Step 2

### Step 2: Am I testing a specific component?
- **YES** → Write a browser integration test in `tests/browser/`
- **NO** → Continue to Step 3

### Step 3: Am I testing a complete user workflow?
- **YES** → Write an E2E test in `tests/e2e/`

## Coverage Expectations

### Unit Test Coverage
- Run: `npm run test:coverage`
- Expected: ~15-20% (only isolated logic)
- This is NORMAL - most code requires a browser

### Browser Coverage
- Use Puppeteer's coverage API or Chrome DevTools
- Expected: 60-80% of GameShell/GameModule code
- This is the TRUE coverage metric

### E2E Coverage
- Not percentage-based
- Focus on critical user paths
- Each game should have at least one E2E test

## Prerequisites for Browser/E2E Tests

1. **Dev server must be running**: `npm run dev`
2. **Must use port 8777**: Hardcoded requirement
3. **Creates real game sessions**: Tests use actual WebSocket connections

## Common Patterns

### Unit Test Pattern (Mocked)
```javascript
// Mock the behavior you need to test
class MockGameSession {
  generateSillyName() {
    const adjectives = ['Happy', 'Silly'];
    const nouns = ['Cat', 'Dog'];
    return `${adjectives[0]} ${nouns[0]}`;
  }
}

test('generates silly names', () => {
  const session = new MockGameSession();
  expect(session.generateSillyName()).toMatch(/^\w+ \w+$/);
});
```

### Browser Test Pattern (Real Code)
```javascript
test('GameShell generates valid session IDs', async () => {
  await page.goto('http://localhost:8777');
  const sessionId = await page.evaluate(() => {
    return window.gameShell.generateSessionId();
  });
  expect(sessionId).toMatch(/^[A-Z0-9]{6}$/);
});
```

### E2E Test Pattern (User Journey)
```javascript
test('complete checkbox game flow', async () => {
  // Create room
  await host.click('.game-card[data-game="checkbox-game"]');
  const roomCode = await host.$eval('#room-code-display', el => el.textContent);
  
  // Player joins
  await player.type('#room-code-input', roomCode);
  await player.click('#join-room-btn');
  
  // Play game...
});
```

## Debugging Tests

### Unit Tests
- Use `console.log` freely
- Run specific: `npx jest path/to/test.js`

### Browser/E2E Tests
- Set `headless: false` to see browser
- Use `page.screenshot({ path: 'debug.png' })`
- Add `await new Promise(r => setTimeout(r, 30000))` to pause

### Check Dev Server
```bash
ps aux | grep wrangler     # Is it running?
curl http://localhost:8777  # Is it responding?
```

## CI/CD Considerations

1. **Unit tests**: Fast (~2s), run on every commit
2. **Browser tests**: Medium (~30s), run on PRs
3. **E2E tests**: Slow (~2min), run before deployment

## Key Takeaways

1. **Don't fight the environment** - Test browser code in a browser
2. **Mock responsibly** - Only mock what can't run in Node.js
3. **Coverage isn't everything** - Browser tests matter more than percentages
4. **Port 8777 is sacred** - Never change it
5. **Clean up test artifacts** - Within 30 seconds!