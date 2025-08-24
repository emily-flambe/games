# Test-Driven Development Approach

## Testing Philosophy
**Strict verification-based approach** - Every change MUST be tested on localhost:8777 using Puppeteer. No theoretical fixes or assumptions allowed.

**NOTE**: For detailed testing structure and patterns, see `testing-strategy.md` which explains our three-tier testing approach for browser-based code.

## When We Write Tests

### Test-First (TDD)
- Bug fixes - Write failing test that reproduces the bug first
- New game features - Test the expected behavior before implementing
- WebSocket message handlers - Test message flow before coding
- Critical game logic - Test win conditions, scoring, state transitions

### Test-During
- UI components after initial implementation
- Integration between frontend and Durable Objects
- Multiplayer interactions and synchronization

### Test-After (Acceptable Cases)
- Visual styling changes (but still verify rendering)
- Documentation updates
- Refactoring with existing test coverage
- Infrastructure configuration

## Test Coverage Standards
- Minimum coverage: Not enforced numerically but ALL features must work
- Critical paths: 100% manual verification via Puppeteer
- Game mechanics: Every rule and interaction tested
- Multiplayer: Test with multiple browser instances

## Testing Stack
- Unit tests: Jest (for utilities and pure functions)
- Integration tests: Puppeteer on localhost:8777
- E2E tests: Puppeteer with multi-player scenarios
- Visual tests: Puppeteer screenshots for UI verification

## Test Patterns

### Naming Convention
```javascript
// Pattern: describe what you're testing clearly
// test-checkbox-game-multiplayer.js
// test-county-game-celebration.js
// test-everybody-votes-tallying.js
```

### Test Structure
```javascript
const puppeteer = require('puppeteer');

async function testFeature() {
  const browser = await puppeteer.launch({ 
    headless: true,  // MUST BE TRUE except for screenshots
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8777');
    
    // Arrange - Set up test conditions
    // Act - Perform the action
    // Assert - Verify the result
    
    console.log('Test passed');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}
```

### Multi-Player Testing
```javascript
async function testMultiplayer() {
  const browser = await puppeteer.launch({ headless: true });
  
  // Create multiple players
  const host = await browser.newPage();
  const player = await browser.newPage();
  
  // Host creates room
  await host.goto('http://localhost:8777');
  await host.click('[data-game="checkbox-game"]');
  
  // Get room code
  const sessionId = await host.evaluate(() => 
    document.getElementById('room-code-display')?.textContent
  );
  
  // Player joins
  await player.goto('http://localhost:8777');
  await player.type('#room-code-input', sessionId);
  await player.click('#join-room-btn');
  
  // Test interactions...
}
```

## AI Assistant Testing Guidelines

### When generating tests:
1. Always use Puppeteer on localhost:8777
2. Test the actual behavior, not mocked responses
3. Include multi-player scenarios for games
4. Take screenshots as proof when needed
5. Clean up test files immediately after use

### When implementing features:
1. Write the test that verifies the feature first
2. Run it to see it fail (confirms test is valid)
3. Implement minimal code to make test pass
4. Refactor only after test passes
5. Delete test files within 30 seconds of completion

## Common Testing Pitfalls
- Testing without running `npm run dev` first
- Not using port 8777 (hardcoded requirement)
- Leaving test artifacts in the repository
- Testing in headful mode (except for debugging)
- Not testing multiplayer synchronization
- Assuming WebSocket messages work without verification

## Quick Commands
```bash
# Start development server (REQUIRED for testing)
npm run dev  # Always on port 8777

# Run a specific test
node scripts/testing/test-game-name.js

# Clean up after testing (MANDATORY)
./scripts/clean-test-artifacts.sh

# Check for leftover test files
git status
```

## Enforcement Rules
- **NO PR without Puppeteer verification**
- **NO "it should work" - only "I tested and it works"**
- **DELETE test files immediately**
- **Port 8777 is non-negotiable**

## Test File Management
- Create test files in `scripts/testing/` for permanent tests
- Create temporary tests anywhere but DELETE within 30 seconds
- Never commit files matching: `test-*.js`, `debug-*.js`, `*.png`
- Run cleanup script after every test session