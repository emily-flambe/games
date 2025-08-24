/**
 * Browser-based integration tests using Puppeteer
 * These tests run the actual application in a real browser environment
 * 
 * NOTE: Tests that require WebSocket connections may timeout if the
 * dev server isn't properly handling WebSocket connections. Run with
 * npm run dev first to ensure the server is ready.
 */

const puppeteer = require('puppeteer');

describe('Browser Integration Tests', () => {
  let browser;
  let page;
  const TEST_URL = process.env.TEST_URL || 'http://localhost:8777';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set up console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser error:', msg.text());
      }
    });
    
    // Set viewport for consistent testing
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterEach(async () => {
    if (page && !page.isClosed()) {
      await page.close();
    }
  });

  describe('GameShell Core Functions', () => {
    test('should load application and initialize GameShell', async () => {
      await page.goto(TEST_URL);
      
      // Wait for GameShell to be initialized
      await page.waitForFunction(() => window.gameApp && window.gameApp.gameShell !== undefined, {
        timeout: 5000
      });
      
      // Verify GameShell is properly initialized
      const gameShellState = await page.evaluate(() => {
        const shell = window.gameApp.gameShell;
        return {
          exists: typeof shell === 'object',
          hasWebSocket: 'ws' in shell,
          hasSessionId: 'sessionId' in shell,
          hasPlayers: 'players' in shell,
          currentView: shell.currentView
        };
      });
      
      expect(gameShellState.exists).toBe(true);
      expect(gameShellState.hasWebSocket).toBe(true);
      expect(gameShellState.hasSessionId).toBe(true);
      expect(gameShellState.hasPlayers).toBe(true);
      expect(gameShellState.currentView).toBe('portal');
    });

    test('should format game names correctly', async () => {
      await page.goto(TEST_URL);
      await page.waitForFunction(() => window.gameApp && window.gameApp.gameShell !== undefined);
      
      const formattedNames = await page.evaluate(() => {
        const shell = window.gameApp.gameShell;
        return {
          checkbox: shell.formatGameName('checkbox-game'),
          votes: shell.formatGameName('votes-game'),
          county: shell.formatGameName('county-game'),
          custom: shell.formatGameName('my-custom-game')
        };
      });
      
      expect(formattedNames.checkbox).toBe('Checkbox Game');
      expect(formattedNames.votes).toBe('Everybody Votes');
      expect(formattedNames.county).toBe('County Game');
      expect(formattedNames.custom).toBe('My Custom Game');
    });

    test('should generate valid session IDs', async () => {
      await page.goto(TEST_URL);
      await page.waitForFunction(() => window.gameApp && window.gameApp.gameShell !== undefined);
      
      const sessionIds = await page.evaluate(() => {
        const shell = window.gameApp.gameShell;
        const ids = [];
        for (let i = 0; i < 10; i++) {
          ids.push(shell.generateSessionId());
        }
        return ids;
      });
      
      sessionIds.forEach(id => {
        expect(id).toMatch(/^[A-Z0-9]{6}$/);
      });
      
      // Check uniqueness
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBeGreaterThan(8); // Most should be unique
    });

    test('should format room code input correctly', async () => {
      await page.goto(TEST_URL);
      await page.waitForSelector('#room-code-input');
      
      // Type various inputs and check formatting
      const testCases = [
        { input: 'abc123', expected: 'ABC123' },
        { input: 'xyz789!!!', expected: 'XYZ789' },
        { input: '  test  ', expected: 'TEST' },
        { input: '1234567890', expected: '123456' }
      ];
      
      for (const testCase of testCases) {
        await page.evaluate(() => {
          document.getElementById('room-code-input').value = '';
        });
        
        await page.type('#room-code-input', testCase.input);
        
        const value = await page.$eval('#room-code-input', el => el.value);
        expect(value).toBe(testCase.expected);
      }
    });
  });
});