/**
 * Basic E2E tests for critical flows
 * Simplified to work reliably in CI environment
 */

const puppeteer = require('puppeteer');

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Basic E2E Flow Tests', () => {
  let browser;
  const TEST_URL = process.env.TEST_URL || 'http://localhost:8777';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('should load the game portal', async () => {
    const page = await browser.newPage();
    
    try {
      await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Check for game cards
      const gameCards = await page.$$('.game-card');
      expect(gameCards.length).toBeGreaterThan(0);
      
      // Check for specific games
      const checkboxGame = await page.$('.game-card[data-game="checkbox-game"]');
      expect(checkboxGame).not.toBeNull();
      
    } finally {
      await page.close();
    }
  }, 15000);

  test('should create a room when clicking a game', async () => {
    const page = await browser.newPage();
    
    try {
      await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Click checkbox game
      await page.click('.game-card[data-game="checkbox-game"]');
      
      // Wait for room creation (URL change)
      await page.waitForFunction(
        () => window.location.pathname.length > 1,
        { timeout: 10000 }
      );
      
      // Give it a moment for the room code to render
      await delay(1000);
      
      // Check for room code in URL or display
      const roomInfo = await page.evaluate(() => {
        const display = document.querySelector('#room-code-display');
        const urlPath = window.location.pathname;
        const roomFromUrl = urlPath.substring(1); // Remove leading slash
        
        return {
          displayText: display ? display.textContent.trim() : null,
          urlRoom: roomFromUrl,
          hasDisplay: !!display
        };
      });
      
      // Room code should be in URL even if display isn't updated yet
      const roomCode = roomInfo.displayText || roomInfo.urlRoom;
      // Room codes are 6 characters, alphanumeric uppercase
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
      
    } finally {
      await page.close();
    }
  }, 15000);

  test('should be able to navigate to portal and see room input', async () => {
    const page = await browser.newPage();
    
    try {
      await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Should have room input field
      const roomInput = await page.$('#room-code-input');
      expect(roomInput).not.toBeNull();
      
      // Should have join button
      const joinButton = await page.$('#join-room-btn');
      expect(joinButton).not.toBeNull();
      
      // Should be able to type in the room input
      await page.type('#room-code-input', 'TEST');
      const inputValue = await page.$eval('#room-code-input', el => el.value);
      expect(inputValue).toBe('TEST');
      
    } finally {
      await page.close();
    }
  }, 15000);
});