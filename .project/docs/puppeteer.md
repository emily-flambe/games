# Puppeteer Development & Testing Guide

A comprehensive guide for using Puppeteer in development workflows, testing, and troubleshooting across any project.

## Table of Contents
- [Installation & Setup](#installation--setup)
- [Core Concepts](#core-concepts)
- [Essential Patterns](#essential-patterns)
- [Screenshot Strategies](#screenshot-strategies)
- [Testing Workflows](#testing-workflows)
- [Debugging Techniques](#debugging-techniques)
- [Performance Optimization](#performance-optimization)
- [Common Pitfalls](#common-pitfalls)
- [Code Templates](#code-templates)

---

## Installation & Setup

### Basic Installation
```bash
# As a dev dependency
npm install --save-dev puppeteer

# For production use
npm install puppeteer

# Puppeteer-core (without bundled Chromium)
npm install puppeteer-core
```

### Environment Configuration
```javascript
// Use environment variables for flexibility
const puppeteer = require('puppeteer');

const browserOptions = {
  headless: process.env.PUPPETEER_HEADLESS !== 'false',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',  // Overcome limited resource problems
    '--disable-gpu',             // Applicable to Windows systems
    '--no-first-run',
    '--no-zygote',
    '--single-process',         // For Docker environments
  ],
  defaultViewport: {
    width: 1280,
    height: 720
  }
};
```

---

## Core Concepts

### Browser vs Page vs Context

```javascript
// Browser Instance - The actual browser process
const browser = await puppeteer.launch();

// Browser Context - Isolated browser session (incognito-like)
const context = await browser.createIncognitoBrowserContext();

// Page - Individual tab/window
const page = await browser.newPage();
// or
const page = await context.newPage();
```

### Lifecycle Events

```javascript
// Navigation options
await page.goto('https://example.com', {
  waitUntil: 'networkidle2',    // No more than 2 network connections for 500ms
  // Other options:
  // 'load' - Consider navigation finished when load event fired
  // 'domcontentloaded' - DOM content loaded
  // 'networkidle0' - No network connections for 500ms
  timeout: 30000
});
```

---

## Essential Patterns

### Reliable Element Interaction

```javascript
// Wait for element before interacting
async function safeClick(page, selector) {
  await page.waitForSelector(selector, { 
    visible: true,
    timeout: 10000 
  });
  await page.click(selector);
}

// Type with clear first
async function safeType(page, selector, text) {
  await page.waitForSelector(selector);
  await page.click(selector, { clickCount: 3 }); // Select all
  await page.type(selector, text);
}

// Handle dynamic content
async function waitForContent(page, text) {
  await page.waitForFunction(
    text => document.body.innerText.includes(text),
    {},
    text
  );
}
```

### Error Handling

```javascript
async function robustTest() {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set up error handlers
    page.on('error', err => {
      console.error('Page crashed:', err);
    });
    
    page.on('pageerror', err => {
      console.error('Page error:', err);
    });
    
    // Your test logic here
    
  } catch (error) {
    console.error('Test failed:', error);
    
    // Take debug screenshot on failure
    if (page) {
      await page.screenshot({ 
        path: `error-${Date.now()}.png`,
        fullPage: true 
      });
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
```

---

## Screenshot Strategies

### Basic Screenshots

```javascript
// Viewport screenshot
await page.screenshot({ path: 'screenshot.png' });

// Full page screenshot
await page.screenshot({ 
  path: 'fullpage.png',
  fullPage: true 
});

// Element screenshot
const element = await page.$('.specific-element');
await element.screenshot({ path: 'element.png' });

// High quality screenshot
await page.screenshot({
  path: 'high-quality.png',
  type: 'png',
  quality: 100,  // Only for jpeg
  omitBackground: true  // Transparent background
});
```

### Advanced Screenshot Patterns

```javascript
// Progressive screenshots for debugging
async function captureWorkflow(page, baseDir = './screenshots') {
  let stepCounter = 1;
  
  const capture = async (label) => {
    const filename = `${baseDir}/step-${stepCounter.toString().padStart(2, '0')}-${label}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`📸 Captured: ${filename}`);
    stepCounter++;
  };
  
  return capture;
}

// Usage
const screenshot = await captureWorkflow(page);
await screenshot('initial-load');
await page.click('#submit');
await screenshot('after-submit');
```

### Visual Regression Testing

```javascript
// Before/after comparison
async function visualDiff(page, action, name) {
  await page.screenshot({ path: `${name}-before.png` });
  await action();
  await page.waitForTimeout(500); // Allow for animations
  await page.screenshot({ path: `${name}-after.png` });
}

// Grid-based screenshots for responsive testing
async function responsiveScreenshots(page, url, sizes) {
  for (const [name, viewport] of Object.entries(sizes)) {
    await page.setViewport(viewport);
    await page.goto(url);
    await page.screenshot({ 
      path: `responsive-${name}.png`,
      fullPage: true 
    });
  }
}

const viewports = {
  'mobile': { width: 375, height: 667 },
  'tablet': { width: 768, height: 1024 },
  'desktop': { width: 1920, height: 1080 }
};
```

---

## Testing Workflows

### E2E Test Structure

```javascript
const puppeteer = require('puppeteer');

describe('E2E Test Suite', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',  // Headless in CI
      slowMo: process.env.SLOW ? 250 : 0    // Slow down for debugging
    });
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  beforeEach(async () => {
    page = await browser.newPage();
    
    // Consistent viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
  });
  
  afterEach(async () => {
    // Clean up
    await page.close();
  });
  
  test('should complete user flow', async () => {
    await page.goto('http://localhost:3000');
    // Test implementation
  });
});
```

### Performance Testing

```javascript
async function measurePerformance(page, url) {
  // Enable performance metrics
  await page.evaluateOnNewDocument(() => {
    window.performanceMarks = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.performanceMarks.push(entry);
      }
    });
    observer.observe({ entryTypes: ['measure', 'navigation'] });
  });
  
  await page.goto(url);
  
  // Get metrics
  const metrics = await page.metrics();
  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );
  
  // Calculate key metrics
  const loadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
  const domContentLoaded = performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart;
  
  return {
    loadTime,
    domContentLoaded,
    jsHeapUsedSize: metrics.JSHeapUsedSize,
    layoutDuration: metrics.LayoutDuration,
    scriptDuration: metrics.ScriptDuration
  };
}
```

---

## Debugging Techniques

### Interactive Debugging

```javascript
// Launch in headful mode with DevTools
const browser = await puppeteer.launch({
  headless: false,
  devtools: true,
  args: ['--start-maximized']
});

// Pause execution for manual inspection
await page.evaluate(() => { debugger; });

// Slow down actions for visibility
const browser = await puppeteer.launch({
  headless: false,
  slowMo: 250  // Slow down by 250ms
});
```

### Debugging Helpers

```javascript
// Log all network requests
page.on('request', request => {
  console.log('Request:', request.method(), request.url());
});

page.on('response', response => {
  console.log('Response:', response.status(), response.url());
});

// Capture console output
page.on('console', msg => {
  console.log('Browser console:', msg.type(), msg.text());
});

// Save page content for inspection
async function saveDebugInfo(page, prefix) {
  const timestamp = Date.now();
  
  // Save HTML
  const html = await page.content();
  fs.writeFileSync(`${prefix}-${timestamp}.html`, html);
  
  // Save screenshot
  await page.screenshot({ 
    path: `${prefix}-${timestamp}.png`,
    fullPage: true 
  });
  
  // Save cookies
  const cookies = await page.cookies();
  fs.writeFileSync(
    `${prefix}-${timestamp}-cookies.json`, 
    JSON.stringify(cookies, null, 2)
  );
}
```

---

## Performance Optimization

### Resource Management

```javascript
// Disable unnecessary resources
await page.setRequestInterception(true);
page.on('request', (request) => {
  const resourceType = request.resourceType();
  
  // Block images and stylesheets for faster loading
  if (['image', 'stylesheet', 'font'].includes(resourceType)) {
    request.abort();
  } else {
    request.continue();
  }
});

// Reuse browser context
const context = await browser.createIncognitoBrowserContext();
const page1 = await context.newPage();
const page2 = await context.newPage();
// Work with multiple pages in same context
await context.close(); // Closes all pages in context
```

### Parallel Execution

```javascript
// Process multiple pages in parallel
async function parallelScraping(urls) {
  const browser = await puppeteer.launch();
  
  const promises = urls.map(async (url) => {
    const page = await browser.newPage();
    try {
      await page.goto(url);
      const title = await page.title();
      return { url, title };
    } finally {
      await page.close();
    }
  });
  
  const results = await Promise.all(promises);
  await browser.close();
  return results;
}

// Limit concurrency
async function limitedParallel(urls, limit = 3) {
  const browser = await puppeteer.launch();
  const results = [];
  
  for (let i = 0; i < urls.length; i += limit) {
    const batch = urls.slice(i, i + limit);
    const batchResults = await Promise.all(
      batch.map(url => processUrl(browser, url))
    );
    results.push(...batchResults);
  }
  
  await browser.close();
  return results;
}
```

---

## Common Pitfalls

### Issue: Elements Not Found

```javascript
// Problem: Element not ready
await page.click('.button'); // May fail

// Solution: Wait for element
await page.waitForSelector('.button', { visible: true });
await page.click('.button');

// Alternative: Use XPath for complex selectors
const [button] = await page.$x("//button[contains(text(), 'Submit')]");
await button.click();
```

### Issue: Navigation Timing

```javascript
// Problem: Navigation happens after action
await page.click('a[href="/next"]');
await page.waitForSelector('.next-page'); // May fail

// Solution: Wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.click('a[href="/next"]')
]);
```

### Issue: Dynamic Content

```javascript
// Problem: Content loaded via JavaScript
const text = await page.$eval('.dynamic', el => el.textContent); // May be empty

// Solution: Wait for content
await page.waitForFunction(
  () => document.querySelector('.dynamic')?.textContent?.length > 0
);
const text = await page.$eval('.dynamic', el => el.textContent);
```

---

## Code Templates

### Complete Test Template

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PuppeteerTest {
  constructor(options = {}) {
    this.options = {
      headless: true,
      screenshots: true,
      screenshotDir: './screenshots',
      timeout: 30000,
      ...options
    };
    this.browser = null;
    this.page = null;
    this.stepCounter = 1;
  }
  
  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(this.options.timeout);
    
    // Set up error handling
    this.page.on('error', err => console.error('Page error:', err));
    this.page.on('pageerror', err => console.error('Page script error:', err));
    
    // Create screenshot directory
    if (this.options.screenshots) {
      await fs.mkdir(this.options.screenshotDir, { recursive: true });
    }
  }
  
  async screenshot(label) {
    if (!this.options.screenshots) return;
    
    const filename = path.join(
      this.options.screenshotDir,
      `${this.stepCounter.toString().padStart(2, '0')}-${label}.png`
    );
    
    await this.page.screenshot({ 
      path: filename,
      fullPage: true 
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    this.stepCounter++;
  }
  
  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }
  
  async run(testFn) {
    try {
      await this.initialize();
      await testFn(this.page, this.screenshot.bind(this));
      console.log('✅ Test completed successfully');
    } catch (error) {
      console.error('❌ Test failed:', error);
      
      // Take failure screenshot
      if (this.page) {
        await this.screenshot('ERROR');
      }
      
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Usage
async function myTest() {
  const test = new PuppeteerTest({
    headless: process.env.HEADLESS !== 'false',
    screenshotDir: './test-screenshots'
  });
  
  await test.run(async (page, screenshot) => {
    await page.goto('http://localhost:3000');
    await screenshot('initial-load');
    
    await page.type('#username', 'testuser');
    await screenshot('after-username');
    
    await page.click('#submit');
    await page.waitForNavigation();
    await screenshot('after-submit');
    
    // Assertions
    const title = await page.title();
    if (!title.includes('Success')) {
      throw new Error('Test failed: Invalid title');
    }
  });
}

// Run if called directly
if (require.main === module) {
  myTest().catch(console.error);
}

module.exports = { PuppeteerTest };
```

### Reusable Utilities

```javascript
// utils/puppeteer-helpers.js
module.exports = {
  // Wait and click with retry
  async clickWithRetry(page, selector, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.waitForSelector(selector, { 
          visible: true, 
          timeout: 5000 
        });
        await page.click(selector);
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await page.waitForTimeout(1000);
      }
    }
  },
  
  // Smart wait for text
  async waitForText(page, text, selector = 'body') {
    await page.waitForFunction(
      (text, selector) => {
        const element = document.querySelector(selector);
        return element && element.textContent.includes(text);
      },
      {},
      text,
      selector
    );
  },
  
  // Get element by text content
  async getElementByText(page, text, tag = '*') {
    const [element] = await page.$x(
      `//${tag}[contains(text(), '${text}')]`
    );
    return element;
  },
  
  // Fill form helper
  async fillForm(page, formData) {
    for (const [selector, value] of Object.entries(formData)) {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Form field not found: ${selector}`);
      }
      
      const tagName = await element.evaluate(el => el.tagName);
      
      if (tagName === 'SELECT') {
        await page.select(selector, value);
      } else if (tagName === 'INPUT') {
        const type = await element.evaluate(el => el.type);
        
        if (type === 'checkbox' || type === 'radio') {
          const isChecked = await element.evaluate(el => el.checked);
          if (value !== isChecked) {
            await element.click();
          }
        } else {
          await page.click(selector, { clickCount: 3 });
          await page.type(selector, value);
        }
      } else {
        await page.click(selector, { clickCount: 3 });
        await page.type(selector, value);
      }
    }
  }
};
```

---

## Best Practices Summary

1. **Always use headless mode in CI/CD** - Set via environment variables
2. **Take screenshots at every critical step** - Essential for debugging failures
3. **Use proper wait strategies** - Never rely on fixed timeouts alone
4. **Clean up resources** - Always close browsers in finally blocks
5. **Handle errors gracefully** - Capture debug info on failures
6. **Test in multiple viewports** - Ensure responsive behavior
7. **Monitor console errors** - Catch client-side issues
8. **Use Page.evaluate() carefully** - It runs in browser context
9. **Implement retry logic** - Handle transient failures
10. **Keep selectors maintainable** - Use data-testid attributes when possible

---

## Quick Reference

```javascript
// Most common operations
await page.goto(url);                          // Navigate
await page.click(selector);                    // Click element
await page.type(selector, text);               // Type text
await page.waitForSelector(selector);          // Wait for element
await page.screenshot({ path: 'file.png' });   // Take screenshot
await page.pdf({ path: 'file.pdf' });          // Generate PDF
await page.evaluate(() => {});                 // Run JS in browser
await page.$(selector);                        // Get single element
await page.$$(selector);                       // Get multiple elements
await page.$eval(selector, el => {});          // Evaluate on element
await page.$$eval(selector, els => {});        // Evaluate on elements
await page.waitForNavigation();                // Wait for navigation
await page.waitForTimeout(ms);                 // Wait fixed time
await page.content();                          // Get HTML content
await page.title();                           // Get page title
```

This guide should serve as a comprehensive reference for Puppeteer development across any project.