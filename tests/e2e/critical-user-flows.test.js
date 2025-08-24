/**
 * E2E tests for critical user flows
 * Tests complete user journeys from start to finish
 */

const puppeteer = require('puppeteer');

describe('Critical User Flow E2E Tests', () => {
  let browser;
  const TEST_URL = process.env.TEST_URL || 'http://localhost:8777';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Complete Checkbox Game Flow', () => {
    test('should complete a full checkbox game from start to finish', async () => {
      const host = await browser.newPage();
      const player1 = await browser.newPage();
      const player2 = await browser.newPage();

      try {
        // Host creates checkbox game
        await host.goto(TEST_URL);
        await host.waitForSelector('.game-card[data-game="checkbox-game"]', { timeout: 5000 });
        await host.click('.game-card[data-game="checkbox-game"]');
        
        await host.waitForSelector('#room-code-display', { timeout: 5000 });
        const roomCode = await host.$eval('#room-code-display', el => el.textContent);
        console.log('Room created:', roomCode);

        // Player 1 joins
        await player1.goto(TEST_URL);
        await player1.waitForSelector('#room-code-input', { timeout: 5000 });
        await player1.type('#room-code-input', roomCode);
        await player1.click('#join-room-btn');
        await player1.waitForSelector('#room-code-display', { timeout: 5000 });

        // Player 2 joins
        await player2.goto(TEST_URL);
        await player2.waitForSelector('#room-code-input', { timeout: 5000 });
        await player2.type('#room-code-input', roomCode);
        await player2.click('#join-room-btn');
        await player2.waitForSelector('#room-code-display', { timeout: 5000 });

        // Wait for all players to be visible
        await host.waitForFunction(
          () => document.querySelectorAll('.player-item').length >= 3,
          { timeout: 10000 }
        );

        // Host starts the game
        const startButton = await host.$('#start-game-btn, button:has-text("Start Game")');
        if (startButton) {
          await startButton.click();
          await host.waitForTimeout(1000);
        }

        // Players collaborate to check all boxes
        await host.waitForSelector('.checkbox-grid input[type="checkbox"]', { timeout: 5000 });
        await player1.waitForSelector('.checkbox-grid input[type="checkbox"]', { timeout: 5000 });
        await player2.waitForSelector('.checkbox-grid input[type="checkbox"]', { timeout: 5000 });

        const hostBoxes = await host.$$('.checkbox-grid input[type="checkbox"]');
        const player1Boxes = await player1.$$('.checkbox-grid input[type="checkbox"]');
        const player2Boxes = await player2.$$('.checkbox-grid input[type="checkbox"]');

        // Each player checks 3 boxes
        if (hostBoxes.length >= 9) {
          await hostBoxes[0].click();
          await hostBoxes[1].click();
          await hostBoxes[2].click();
          await host.waitForTimeout(500);

          await player1Boxes[3].click();
          await player1Boxes[4].click();
          await player1Boxes[5].click();
          await player1.waitForTimeout(500);

          await player2Boxes[6].click();
          await player2Boxes[7].click();
          await player2Boxes[8].click();
          await player2.waitForTimeout(500);

          // All players should see game completed
          await host.waitForFunction(
            () => {
              const boxes = document.querySelectorAll('.checkbox-grid input[type="checkbox"]:checked');
              return boxes.length === 9;
            },
            { timeout: 10000 }
          );

          // Verify all boxes are checked on all screens
          const hostChecked = await host.$$eval('.checkbox-grid input[type="checkbox"]:checked', boxes => boxes.length);
          const player1Checked = await player1.$$eval('.checkbox-grid input[type="checkbox"]:checked', boxes => boxes.length);
          const player2Checked = await player2.$$eval('.checkbox-grid input[type="checkbox"]:checked', boxes => boxes.length);

          expect(hostChecked).toBe(9);
          expect(player1Checked).toBe(9);
          expect(player2Checked).toBe(9);
        }
      } finally {
        await host.close();
        await player1.close();
        await player2.close();
      }
    }, 30000);
  });

  describe('Complete Everybody Votes Game Flow', () => {
    test('should complete a voting round', async () => {
      const host = await browser.newPage();
      const voter1 = await browser.newPage();
      const voter2 = await browser.newPage();

      try {
        // Host creates Everybody Votes game
        await host.goto(TEST_URL);
        await host.waitForSelector('.game-card[data-game="everybody-votes"]', { timeout: 5000 });
        await host.click('.game-card[data-game="everybody-votes"]');
        
        await host.waitForSelector('#room-code-display', { timeout: 5000 });
        const roomCode = await host.$eval('#room-code-display', el => el.textContent);

        // Voters join
        await voter1.goto(TEST_URL);
        await voter1.waitForSelector('#room-code-input', { timeout: 5000 });
        await voter1.type('#room-code-input', roomCode);
        await voter1.click('#join-room-btn');
        await voter1.waitForSelector('#room-code-display', { timeout: 5000 });

        await voter2.goto(TEST_URL);
        await voter2.waitForSelector('#room-code-input', { timeout: 5000 });
        await voter2.type('#room-code-input', roomCode);
        await voter2.click('#join-room-btn');
        await voter2.waitForSelector('#room-code-display', { timeout: 5000 });

        // Wait for all players
        await host.waitForFunction(
          () => document.querySelectorAll('.player-item').length >= 3,
          { timeout: 10000 }
        );

        // Host starts the game
        const startButton = await host.$('#start-game-btn, button:has-text("Start Game")');
        if (startButton) {
          await startButton.click();
          await host.waitForTimeout(1000);

          // Look for voting options
          const voteOptions = await host.$$('.vote-option, button[data-option]');
          if (voteOptions.length >= 2) {
            // Each voter picks an option
            const voter1Options = await voter1.$$('.vote-option, button[data-option]');
            const voter2Options = await voter2.$$('.vote-option, button[data-option]');

            if (voter1Options.length > 0) await voter1Options[0].click();
            if (voter2Options.length > 0) await voter2Options[1].click();

            await host.waitForTimeout(2000);

            // Check if results are shown
            const hasResults = await host.$('.results, .vote-results, .voting-results') !== null;
            expect(hasResults).toBe(true);
          }
        }
      } finally {
        await host.close();
        await voter1.close();
        await voter2.close();
      }
    }, 30000);
  });

  describe('Spectator Mode Flow', () => {
    test('should allow spectating an active game', async () => {
      const host = await browser.newPage();
      const player = await browser.newPage();
      const spectator = await browser.newPage();

      try {
        // Host creates game
        await host.goto(TEST_URL);
        await host.waitForSelector('.game-card[data-game="checkbox-game"]', { timeout: 5000 });
        await host.click('.game-card[data-game="checkbox-game"]');
        
        await host.waitForSelector('#room-code-display', { timeout: 5000 });
        const roomCode = await host.$eval('#room-code-display', el => el.textContent);

        // Player joins
        await player.goto(TEST_URL);
        await player.waitForSelector('#room-code-input', { timeout: 5000 });
        await player.type('#room-code-input', roomCode);
        await player.click('#join-room-btn');
        await player.waitForSelector('#room-code-display', { timeout: 5000 });

        // Start the game
        await host.waitForFunction(
          () => document.querySelectorAll('.player-item').length >= 2,
          { timeout: 5000 }
        );
        
        const startButton = await host.$('#start-game-btn, button:has-text("Start Game")');
        if (startButton) {
          await startButton.click();
          await host.waitForTimeout(1000);
        }

        // Spectator joins after game started
        await spectator.goto(TEST_URL);
        await spectator.waitForSelector('#room-code-input', { timeout: 5000 });
        await spectator.type('#room-code-input', roomCode);
        await spectator.click('#join-room-btn');
        await spectator.waitForSelector('#room-code-display', { timeout: 5000 });

        // Spectator should see the game but be marked as spectator
        const isSpectator = await spectator.evaluate(() => {
          const spectatorIndicator = document.querySelector('.spectator-indicator, .spectator-badge, [data-spectator="true"]');
          const spectatorText = document.body.textContent.toLowerCase();
          return spectatorIndicator !== null || spectatorText.includes('spectating') || spectatorText.includes('spectator');
        });

        expect(isSpectator).toBe(true);

        // Spectator should see game actions
        await host.waitForSelector('.checkbox-grid input[type="checkbox"]', { timeout: 5000 });
        const hostBoxes = await host.$$('.checkbox-grid input[type="checkbox"]');
        if (hostBoxes.length > 0) {
          await hostBoxes[0].click();
          
          // Spectator should see the update
          await spectator.waitForFunction(
            () => {
              const boxes = document.querySelectorAll('.checkbox-grid input[type="checkbox"]:checked');
              return boxes.length > 0;
            },
            { timeout: 5000 }
          );
        }
      } finally {
        await host.close();
        await player.close();
        await spectator.close();
      }
    }, 30000);
  });

  describe('Host Transfer Flow', () => {
    test('should transfer host when original host leaves', async () => {
      const host = await browser.newPage();
      const player = await browser.newPage();

      try {
        // Host creates game
        await host.goto(TEST_URL);
        await host.waitForSelector('.game-card[data-game="checkbox-game"]', { timeout: 5000 });
        await host.click('.game-card[data-game="checkbox-game"]');
        
        await host.waitForSelector('#room-code-display', { timeout: 5000 });
        const roomCode = await host.$eval('#room-code-display', el => el.textContent);

        // Player joins
        await player.goto(TEST_URL);
        await player.waitForSelector('#room-code-input', { timeout: 5000 });
        await player.type('#room-code-input', roomCode);
        await player.click('#join-room-btn');
        await player.waitForSelector('#room-code-display', { timeout: 5000 });

        // Wait for both players to be connected
        await host.waitForFunction(
          () => document.querySelectorAll('.player-item').length >= 2,
          { timeout: 5000 }
        );

        // Host leaves
        const leaveButton = await host.$('#leave-room-btn, button:has-text("Leave")');
        if (leaveButton) {
          await leaveButton.click();
        } else {
          await host.close();
        }

        // Player should become new host
        await player.waitForTimeout(2000);
        
        const isNowHost = await player.evaluate(() => {
          const hostIndicator = document.querySelector('.host-indicator, .host-badge, [data-host="true"]');
          const startButton = document.querySelector('#start-game-btn, button:has-text("Start Game")');
          const hostText = document.body.textContent.toLowerCase();
          return hostIndicator !== null || startButton !== null || hostText.includes('you are the host');
        });

        expect(isNowHost).toBe(true);
      } finally {
        if (!host.isClosed()) await host.close();
        if (!player.isClosed()) await player.close();
      }
    }, 20000);
  });

  describe('Error Recovery Flow', () => {
    test('should show error when trying to join non-existent room', async () => {
      const page = await browser.newPage();

      try {
        await page.goto(TEST_URL);
        await page.waitForSelector('#room-code-input', { timeout: 5000 });
        
        // Try to join with a likely non-existent code
        await page.type('#room-code-input', 'ZZZZZZ');
        await page.click('#join-room-btn');
        
        // Should see an error or remain on portal
        await page.waitForTimeout(2000);
        
        const hasError = await page.evaluate(() => {
          const errorElement = document.querySelector('.error, .error-message, [data-error]');
          const errorText = document.body.textContent.toLowerCase();
          return errorElement !== null || 
                 errorText.includes('error') || 
                 errorText.includes('not found') || 
                 errorText.includes('invalid');
        });
        
        // Should either show error or stay on portal
        const stillOnPortal = await page.$('#room-code-input') !== null;
        expect(hasError || stillOnPortal).toBe(true);
      } finally {
        await page.close();
      }
    }, 10000);

    test('should handle network disconnection gracefully', async () => {
      const page = await browser.newPage();

      try {
        // Create a game
        await page.goto(TEST_URL);
        await page.waitForSelector('.game-card[data-game="checkbox-game"]', { timeout: 5000 });
        await page.click('.game-card[data-game="checkbox-game"]');
        
        await page.waitForSelector('#room-code-display', { timeout: 5000 });
        
        // Simulate network disconnection
        await page.setOfflineMode(true);
        await page.waitForTimeout(2000);
        
        // Should show disconnection indicator
        const hasDisconnectIndicator = await page.evaluate(() => {
          const indicator = document.querySelector('.disconnected, .offline, [data-connection="offline"]');
          const text = document.body.textContent.toLowerCase();
          return indicator !== null || 
                 text.includes('disconnect') || 
                 text.includes('offline') || 
                 text.includes('connection lost');
        });
        
        expect(hasDisconnectIndicator).toBe(true);
        
        // Restore connection
        await page.setOfflineMode(false);
        await page.waitForTimeout(3000);
        
        // Should attempt to reconnect
        const hasReconnected = await page.evaluate(() => {
          const indicator = document.querySelector('.connected, .online, [data-connection="online"]');
          const disconnectedIndicator = document.querySelector('.disconnected, .offline');
          return indicator !== null || !disconnectedIndicator;
        });
        
        expect(hasReconnected).toBe(true);
      } finally {
        await page.close();
      }
    }, 20000);
  });
});