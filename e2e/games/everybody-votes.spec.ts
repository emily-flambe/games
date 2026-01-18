import { test, expect } from '@playwright/test';
import { setupConsoleErrorTracking, assertNoConsoleErrors, createRoom } from '../shared/helpers';

test.beforeEach(async ({ page }) => {
  setupConsoleErrorTracking(page);
});

test.afterEach(async () => {
  assertNoConsoleErrors();
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

    // Results phase - look for "Results" heading (includes emoji)
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
