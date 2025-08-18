# Testing Requirements

## MANDATORY: TEST EVERYTHING

Every change to this codebase MUST be tested using Puppeteer on localhost:8777.

## Why This Document Exists
- Changes have been made without verification
- Users have found bugs that should have been caught
- This wastes everyone's time and damages credibility

## Testing Protocol

### 1. Before Claiming Anything Works
- Write a Puppeteer test script
- Actually run it on localhost:8777
- Take screenshots as proof
- Verify behavior matches expectations

### 2. NO Theoretical Fixes
- "It should work now" (NO)
- "The changes should fix it" (NO)
- "I tested it and confirmed it works" (YES)

### 3. Puppeteer Test Template

```javascript
const puppeteer = require('puppeteer');

async function testFeature() {
  const browser = await puppeteer.launch({ 
    headless: true,  // MUST BE TRUE - ALWAYS use headless mode except when taking screenshots
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:8777');
    
    // YOUR TEST LOGIC HERE
    // Take screenshots: await page.screenshot({ path: 'test.png' });
    // Verify elements: await page.waitForSelector('.element');
    // Check results: const result = await page.evaluate(() => {...});
    
    console.log('Test passed');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

testFeature().catch(console.error);
```

## Game-Specific Testing

### Checkbox Game
1. Navigate to game selection
2. Click Checkbox Game card
3. Fill in player name and join room
4. Start the game
5. Click checkboxes systematically
6. Verify state updates in real-time
7. Complete the game (all 9 boxes)
8. Verify end screen with scores
9. Test OK button functionality

### Everybody Votes
1. Navigate to game selection
2. Click Everybody Votes card
3. Fill in player name and join room
4. Start the game
5. Submit vote for each round
6. Make prediction when prompted
7. View results after each round
8. Complete all rounds
9. Verify final screen with working OK button
10. Test multiplayer scenarios with 2+ players

### County Game (CRITICAL TEST)
1. Navigate to game selection (`document.querySelector('[data-game="county-game"]').click()`)
2. Fill in player name (`#player-name-input` - NOT `#player-name`)
3. Click Join Room button (`#join-room-btn`)
4. Wait for room to load (3 seconds minimum)
5. Start the game (`#start-game-btn`)
6. Wait for county input field (`#county-input`)
7. Enter county name (e.g., "Rock")
8. Submit county (`#submit-county-btn`)
9. Wait for win screen (`#end-game-screen` visible)
10. **CRITICAL**: Verify NO extra box before OK button
11. Verify message shows "Yaaaay" exactly
12. Verify final-scores div is completely hidden:
    - `display: none`
    - `visibility: hidden` 
    - `height: 0px`
    - `padding: 0px`
    - `margin: 0px`
    - `border: 0px`
13. Test OK button functionality
14. Screenshot as proof: `await page.screenshot({ path: 'county-game-proof.png' })`

### Systematic Testing Approach (MANDATORY)

#### Phase 1: Setup & Navigation
- Launch Puppeteer in headless mode
- Navigate to localhost:8777
- Wait for page load and script initialization
- Verify game selection screen appears

#### Phase 2: Game Selection & Entry
- Click specific game card using correct selector
- Fill in player name using correct selector
- Join room and wait for room setup
- Verify player appears in room

#### Phase 3: Gameplay Simulation
- Start the game using correct button
- Execute all game-specific actions
- Verify state changes at each step
- Handle timing and async operations properly

#### Phase 4: End Game Verification
- Wait for end screen to appear
- Verify all visual elements are correct
- Check for any unwanted UI elements
- Test interactive elements (buttons)
- Take proof screenshots

#### Phase 5: Loop & Retry Logic
- Implement retry mechanism (max 5 attempts)
- Handle timeouts and errors gracefully
- Log progress and failures clearly
- Clean up resources properly

## After Testing

### 🛑 IMMEDIATE CLEANUP REQUIRED 🛑

Within 30 seconds of test completion:

```bash
# Delete test file
rm test-feature.js

# Delete screenshots
rm -f *.png

# Or use the cleanup script
./scripts/clean-test-artifacts.sh

# Verify clean
git status
```

## Common Testing Mistakes

### 1. Not Actually Running Tests
- Writing test code but not executing it
- Assuming it works without verification

### 2. Testing Wrong Environment
- Testing on wrong port
- Testing with stale build
- Not restarting dev server

### 3. Incomplete Testing
- Only testing happy path
- Not testing edge cases
- Not testing multiplayer scenarios

### 4. Keeping Test Files
- Committing test scripts
- Leaving screenshots around
- Creating "temporary" test directories

## Testing Checklist

Before claiming any feature/fix is complete:

- [ ] Dev server running on port 8777
- [ ] Puppeteer test written
- [ ] Test executed successfully
- [ ] Edge cases tested
- [ ] Multiplayer scenario tested (if applicable)
- [ ] All test artifacts deleted
- [ ] `git status` shows clean working directory

## CI/CD Integration

### Automated Testing in GitHub Actions
- **Unit Tests**: `npm run test:unit` - Fast, isolated component tests
- **Integration Tests**: Included in `npm test` - Component interaction tests  
- **E2E Tests**: `npm run test:e2e` - Full browser automation tests
- **All Tests**: `npm test` - Runs everything including County Game E2E

### Test Commands Available
```bash
npm test              # Run all tests (unit + integration + E2E)
npm run test:unit     # Run only unit tests
npm run test:e2e      # Run only E2E tests (requires dev server)
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### CI/CD Pipeline
1. **Install dependencies** (including Puppeteer)
2. **Start dev server** in background
3. **Wait for server ready** (health check)
4. **Run all tests** (unit + E2E automatically)
5. **Kill dev server** 
6. **Build project** (only if tests pass)
7. **Deploy** (only if build succeeds)

## Critical Puppeteer Requirements

**🚨 MANDATORY HEADLESS MODE 🚨**
- **ALWAYS** use `headless: true` in Puppeteer launch options
- **NEVER** use `headless: false` except when debugging manually
- **EXCEPTION**: Only disable headless when taking manual screenshots for debugging
- This prevents browser windows from popping up during automated testing

## Enforcement

**Every PR must include evidence of testing:**
- Description of what was tested
- Confirmation that tests passed locally
- No test artifacts in commits
- All CI/CD checks must pass

**CI/CD Pipeline Requirements:**
- All tests must pass before merge
- County Game E2E test must pass specifically
- No deployment without successful test suite

**Failure to test = PR rejected**
**Failed CI/CD tests = Deployment blocked**

Remember: If you didn't test it, it doesn't work.