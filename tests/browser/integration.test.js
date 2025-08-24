/**
 * Browser-based integration tests using Puppeteer
 * These tests run the actual application in a real browser environment
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

  describe('Game Module Loading', () => {
    test('should load CheckboxGameModule when creating checkbox game', async () => {
      await page.goto(TEST_URL);
      await page.waitForSelector('.game-card[data-game="checkbox-game"]');
      
      // Click on checkbox game
      await page.click('.game-card[data-game="checkbox-game"]');
      
      // Wait for game to load
      await page.waitForSelector('#room-code-display', { timeout: 5000 });
      
      // Verify CheckboxGameModule is loaded
      const moduleState = await page.evaluate(() => {
        const shell = window.gameApp.gameShell;
        return {
          hasModule: shell.gameModule !== null,
          moduleType: shell.gameModule ? shell.gameModule.constructor.name : null,
          gameType: shell.gameType
        };
      });
      
      expect(moduleState.hasModule).toBe(true);
      expect(moduleState.moduleType).toBe('CheckboxGameModule');
      expect(moduleState.gameType).toBe('checkbox-game');
    });

    test('should render checkbox grid correctly', async () => {
      await page.goto(TEST_URL);
      await page.waitForSelector('.game-card[data-game="checkbox-game"]');
      
      await page.click('.game-card[data-game="checkbox-game"]');
      await page.waitForSelector('.checkbox-grid', { timeout: 5000 });
      
      // Count checkboxes
      const checkboxCount = await page.$$eval(
        '.checkbox-grid input[type="checkbox"]',
        boxes => boxes.length
      );
      
      expect(checkboxCount).toBe(9); // 3x3 grid
    });
  });

  describe('WebSocket Connection', () => {
    test('should establish WebSocket connection when creating room', async () => {
      await page.goto(TEST_URL);
      await page.waitForSelector('.game-card[data-game="checkbox-game"]');
      
      // Set up WebSocket monitoring
      const wsConnected = page.waitForFunction(
        () => window.gameApp && window.gameApp.gameShell && window.gameApp.gameShell.isConnected === true,
        { timeout: 10000 }
      );
      
      await page.click('.game-card[data-game="checkbox-game"]');
      
      await wsConnected;
      
      const connectionState = await page.evaluate(() => {
        const shell = window.gameApp.gameShell;
        return {
          isConnected: shell.isConnected,
          hasWebSocket: shell.ws !== null,
          hasSessionId: shell.sessionId.length === 6
        };
      });
      
      expect(connectionState.isConnected).toBe(true);
      expect(connectionState.hasWebSocket).toBe(true);
      expect(connectionState.hasSessionId).toBe(true);
    });

    test('should handle room joining', async () => {
      // Host creates room
      const hostPage = await browser.newPage();
      await hostPage.goto(TEST_URL);
      await hostPage.waitForSelector('.game-card[data-game="checkbox-game"]');
      await hostPage.click('.game-card[data-game="checkbox-game"]');
      
      await hostPage.waitForSelector('#room-code-display', { timeout: 5000 });
      const roomCode = await hostPage.$eval('#room-code-display', el => el.textContent);
      
      // Player joins room
      await page.goto(TEST_URL);
      await page.waitForSelector('#room-code-input');
      await page.type('#room-code-input', roomCode);
      await page.click('#join-room-btn');
      
      // Wait for connection
      await page.waitForSelector('#room-code-display', { timeout: 5000 });
      
      // Verify both are in same room
      const playerRoomCode = await page.$eval('#room-code-display', el => el.textContent);
      expect(playerRoomCode).toBe(roomCode);
      
      // Clean up
      await hostPage.close();
    });
  });

  describe('Player Management', () => {
    test('should track players correctly', async () => {
      const host = await browser.newPage();
      const player = await browser.newPage();
      
      try {
        // Host creates room
        await host.goto(TEST_URL);
        await host.waitForSelector('.game-card[data-game="checkbox-game"]');
        await host.click('.game-card[data-game="checkbox-game"]');
        
        await host.waitForSelector('#room-code-display', { timeout: 5000 });
        const roomCode = await host.$eval('#room-code-display', el => el.textContent);
        
        // Player joins
        await player.goto(TEST_URL);
        await player.waitForSelector('#room-code-input');
        await player.type('#room-code-input', roomCode);
        await player.click('#join-room-btn');
        
        await player.waitForSelector('#room-code-display', { timeout: 5000 });
        
        // Wait for player list to update
        await host.waitForFunction(
          () => document.querySelectorAll('.player-item').length >= 2,
          { timeout: 5000 }
        );
        
        // Check player count on both sides
        const hostPlayerCount = await host.$$eval('.player-item', items => items.length);
        const playerPlayerCount = await player.$$eval('.player-item', items => items.length);
        
        expect(hostPlayerCount).toBeGreaterThanOrEqual(2);
        expect(playerPlayerCount).toBeGreaterThanOrEqual(2);
        
        // Verify player data in GameShell
        const hostPlayerData = await host.evaluate(() => {
          return Object.keys(window.gameApp.gameShell.players).length;
        });
        
        expect(hostPlayerData).toBeGreaterThanOrEqual(2);
      } finally {
        await host.close();
        await player.close();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid room codes gracefully', async () => {
      await page.goto(TEST_URL);
      await page.waitForSelector('#room-code-input');
      
      // Try to join with invalid code
      await page.type('#room-code-input', 'INVALID');
      await page.click('#join-room-btn');
      
      // Wait a bit for any error handling
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should still be on portal, not in a game room
      const stillOnPortal = await page.$('#room-code-input') !== null;
      const notInRoom = await page.$('#room-code-display') === null;
      
      expect(stillOnPortal).toBe(true);
      expect(notInRoom).toBe(true);
    });
  });
});