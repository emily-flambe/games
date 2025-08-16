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
    headless: true,  // MUST BE TRUE for CI/CD
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
1. Create a room
2. Start the game
3. Click checkboxes
4. Verify state updates
5. Complete the game
6. Verify end screen

### Everybody Votes
1. Create a room
2. Start the game
3. Submit vote
4. Make prediction
5. View results
6. Complete all rounds
7. Verify final screen with working OK button

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

## Enforcement

**Every PR must include evidence of testing:**
- Description of what was tested
- Confirmation that tests passed
- No test artifacts in commits

**Failure to test = PR rejected**

Remember: If you didn't test it, it doesn't work.