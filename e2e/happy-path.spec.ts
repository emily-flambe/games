import { test, expect } from '@playwright/test';

// Track console errors across tests
let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
});

test.afterEach(async () => {
  const realErrors = consoleErrors.filter(
    (err) => !err.includes('WebSocket') && !err.includes('net::ERR_')
  );
  expect(realErrors, 'Console errors detected').toHaveLength(0);
});

// Helper to create a room and get into the game
async function createRoom(page: any, gameType: string, playerName: string) {
  await page.goto('/');
  await expect(page.locator('#game-portal')).toBeVisible();
  await page.click(`[data-game="${gameType}"]`);
  await page.fill('#player-name-input', playerName);
  await page.click('#update-name-btn');
  await expect(page.locator('#room-code-display')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#game-room')).toBeVisible();
}

test.describe('Checkbox Game - Happy Path', () => {
  test('host can start game and click checkboxes', async ({ page }) => {
    await createRoom(page, 'checkbox-game', 'CheckboxPlayer');

    // Start the game (host only)
    const startButton = page.locator('#start-game-btn-header');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for game area to be visible
    await expect(page.locator('#game-area')).toBeVisible({ timeout: 5000 });

    // Verify checkbox grid appears
    const checkboxGrid = page.locator('#checkbox-grid');
    await expect(checkboxGrid).toBeVisible();

    // Click the first checkbox
    const firstCheckbox = page.locator('.checkbox-item').first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.click();

    // Verify the checkbox is now checked (has 'checked' class)
    await expect(firstCheckbox).toHaveClass(/checked/);

    // Verify scoreboard shows updated score
    const scoreboard = page.locator('#scoreboard');
    await expect(scoreboard).toBeVisible();
  });

  test('clicking all checkboxes ends the game', async ({ page }) => {
    await createRoom(page, 'checkbox-game', 'WinnerPlayer');

    // Start the game
    await page.click('#start-game-btn-header');
    await expect(page.locator('#game-area')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#checkbox-grid')).toBeVisible();

    // Click all 9 checkboxes one by one
    for (let i = 0; i < 9; i++) {
      const checkbox = page.locator(`.checkbox-item[data-index="${i}"]`);

      // Check if game ended (last checkbox triggers immediate end)
      const endScreen = page.locator('#end-game-screen');
      if (await endScreen.isVisible().catch(() => false)) {
        break;
      }

      await expect(checkbox).toBeVisible();

      // Only click if not already checked
      const hasChecked = await checkbox.evaluate((el: Element) => el.classList.contains('checked'));
      if (!hasChecked) {
        await checkbox.click();

        // For the last checkbox (8), the game ends immediately - don't wait for checked class
        if (i < 8) {
          await expect(checkbox).toHaveClass(/checked/, { timeout: 2000 });
        }
      }
    }

    // Game should end - end game screen should appear
    await expect(page.locator('#end-game-screen')).toBeVisible({ timeout: 10000 });

    // Should show win message
    await expect(page.locator('#game-result-message')).toBeVisible();
  });
});

test.describe('County Game - Happy Path', () => {
  test('host can complete full game flow', async ({ page }) => {
    await createRoom(page, 'county-game', 'CountyPlayer');

    // Start the game
    await page.click('#start-game-btn-header');

    // Wait for game area to be visible
    await expect(page.locator('#game-area')).toBeVisible({ timeout: 5000 });

    // Check if we're in submission phase (input visible) or already in announcement phase
    const countyInput = page.locator('#county-input');
    const beginButton = page.locator('button:has-text("BEGIN")');

    // Try to submit if input is visible
    if (await countyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await countyInput.fill('Los Angeles');
      await page.click('#submit-county-btn');

      // Wait for submission confirmation or phase transition
      await page.waitForTimeout(1000);
    }

    // Wait for BEGIN button (announcement phase)
    await expect(beginButton).toBeVisible({ timeout: 35000 });
    await beginButton.click();

    // Wait for announcement display - use a more specific locator to avoid strict mode
    // The announcement area should show either the player name or their county
    await expect(page.locator('#game-area').getByText('CountyPlayer').first()).toBeVisible({ timeout: 5000 });

    // Look for CONCLUDE or NEXT button
    const concludeButton = page.locator('button:has-text("CONCLUDE")');
    const nextButton = page.locator('button:has-text("NEXT")');

    // Wait for either button (use first() to handle multiple matches)
    await expect(concludeButton.or(nextButton).first()).toBeVisible({ timeout: 5000 });

    // Click through until CONCLUDE
    while (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }

    if (await concludeButton.isVisible()) {
      await concludeButton.click();
    }

    // Game should end
    await expect(page.locator('#end-game-screen')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Everybody Votes - Happy Path', () => {
  test('host can start game and cast a vote', async ({ page }) => {
    await createRoom(page, 'everybody-votes', 'VoterPlayer');

    // Start the game
    await page.click('#start-game-btn-header');

    // Wait for voting phase - look for vote buttons by their text pattern
    const pizzaButton = page.locator('button:has-text("Pizza")').first();
    await expect(pizzaButton).toBeVisible({ timeout: 10000 });

    // Verify we're in round 1
    await expect(page.getByText('Round 1 of 3')).toBeVisible();

    // Cast a vote
    await pizzaButton.click();

    // With single player, game auto-advances to prediction phase
    // Just verify we see the prediction heading (more specific than buttons which appear in both phases)
    await expect(page.getByRole('heading', { name: /Make Your Prediction/i })).toBeVisible({ timeout: 15000 });
  });

  test('host can complete a full voting round', async ({ page }) => {
    await createRoom(page, 'everybody-votes', 'FullRoundPlayer');

    // Start the game
    await page.click('#start-game-btn-header');

    // Voting phase - cast vote (use first() to avoid strict mode issues)
    const pizzaButton = page.locator('button:has-text("Pizza")').first();
    await expect(pizzaButton).toBeVisible({ timeout: 10000 });
    await pizzaButton.click();

    // Prediction phase - wait for it and make prediction
    await expect(page.getByRole('heading', { name: /Make Your Prediction/i })).toBeVisible({ timeout: 15000 });

    // Click prediction (same option) - use first() since button text appears in both phases
    const predictionPizza = page.locator('button:has-text("Pizza")').first();
    await predictionPizza.click();

    // Results phase - look for "Results" heading (includes emoji: "📊 Round 1 Results")
    await expect(page.getByRole('heading', { name: /Round \d+ Results/i })).toBeVisible({ timeout: 20000 });

    // Verify vote counts are displayed (e.g., "1 (100%)") - use first() since both options show percentages
    await expect(page.getByText(/\d+\s*\(\d+%\)/).first()).toBeVisible({ timeout: 5000 });
  });

  test('host can play through all 3 rounds', async ({ page }) => {
    // Increase timeout for this longer test
    test.setTimeout(180000);

    await createRoom(page, 'everybody-votes', 'ThreeRoundPlayer');

    // Start the game
    await page.click('#start-game-btn-header');

    const endScreen = page.locator('#end-game-screen');

    // Play through 3 rounds - with single player, phases advance rapidly
    for (let round = 1; round <= 3; round++) {
      // Check if game already ended (single player can go very fast)
      if (await endScreen.isVisible().catch(() => false)) {
        break;
      }

      // Voting phase - wait for vote buttons (use first() to handle multiple matching)
      const voteButton = page.locator('button:has-text("Pizza"), button:has-text("Coffee"), button:has-text("Beach")').first();
      await expect(voteButton).toBeVisible({ timeout: 20000 });
      await voteButton.click();

      // Check if game ended
      if (await endScreen.isVisible().catch(() => false)) {
        break;
      }

      // Prediction phase
      await expect(page.getByRole('heading', { name: /Make Your Prediction/i })).toBeVisible({ timeout: 20000 });
      const predictionButton = page.locator('button:has-text("Pizza"), button:has-text("Coffee"), button:has-text("Beach")').first();
      await predictionButton.click();

      // Check if game ended (after round 3, it may end immediately)
      if (await endScreen.isVisible().catch(() => false)) {
        break;
      }

      // Results phase - with single player this might be very brief or skip straight to end
      const nextQuestionBtn = page.locator('button:has-text("Next Question")');
      const endGameBtn = page.locator('button:has-text("End Game")');

      // Wait for results phase buttons OR game end (game may skip to end after round 3)
      // Use Promise.race to handle any of these states
      await page.waitForSelector(
        'button:has-text("Next Question"), button:has-text("End Game"), #end-game-screen',
        { timeout: 20000, state: 'visible' }
      );

      // If game ended, we're done
      if (await endScreen.isVisible().catch(() => false)) {
        break;
      }

      if (round < 3) {
        // Click Next Question if visible
        if (await nextQuestionBtn.isVisible().catch(() => false)) {
          await nextQuestionBtn.click();
        }
      } else {
        // After round 3, click End Game if visible (may auto-end)
        // Use force:true because the button can be re-rendered during state updates
        if (await endGameBtn.isVisible().catch(() => false)) {
          await endGameBtn.click({ force: true });
        }
      }
    }

    // Final screen should be visible
    await expect(endScreen).toBeVisible({ timeout: 10000 });
  });
});
