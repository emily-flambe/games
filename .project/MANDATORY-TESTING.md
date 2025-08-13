# MANDATORY TESTING REQUIREMENTS

## ⚠️ CRITICAL: ALWAYS TEST YOUR CHANGES ⚠️

### STOP MAKING UNTESTED CHANGES

**This is non-negotiable**: You MUST test every change you make to this codebase using Puppeteer on localhost:8777.

### Why This Document Exists
- Too many times changes have been made without verification
- The user has repeatedly had to point out that changes don't work
- This wastes everyone's time and causes frustration

### MANDATORY Testing Protocol

1. **BEFORE claiming something is fixed:**
   - Write a Puppeteer test script
   - Actually run it on localhost:8777
   - Take screenshots as proof
   - Verify the behavior matches expectations

2. **DO NOT say "it should work now" without testing**
   - No more theoretical fixes
   - No more "the changes should..."
   - Test it or don't claim it's done

3. **Puppeteer Test Template - USE HEADLESS MODE:**
```javascript
const puppeteer = require('puppeteer');

async function testChanges() {
  const browser = await puppeteer.launch({ 
    headless: true,  // 🚨 MUST BE TRUE FOR AUTOMATED TESTING
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:8777');
  
  // ACTUALLY TEST THE SPECIFIC CHANGE
  // Take screenshots for verification
  // Verify the behavior programmatically
  // Log results to console
  
  await page.screenshot({ path: 'proof-of-testing.png' });
  
  // VERIFY RESULTS PROGRAMMATICALLY
  const result = await page.evaluate(() => {
    // Check DOM elements, game state, etc.
    return { /* test results */ };
  });
  
  console.log('Test results:', result);
  await browser.close();
}

// RUN THE TEST
testChanges().catch(console.error);
```

**🚨 HEADLESS MODE IS MANDATORY FOR CI/CD 🚨**

4. **For Everybody Votes specifically:**
   - Create a room
   - Click Start Game in waiting room
   - VERIFY what actually appears next
   - Don't assume - CHECK

### The Current Issue That Prompted This
- Changed code to remove double "Start Game" button
- Claimed it was fixed
- Never actually tested it
- User still sees the button
- This is unacceptable

### Going Forward
Every single change to game behavior MUST be tested with Puppeteer before claiming completion.

**NO EXCEPTIONS.**