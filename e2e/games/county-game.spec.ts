import { test, expect } from '@playwright/test';
import { setupConsoleErrorTracking, assertNoConsoleErrors, createRoom } from '../shared/helpers';

test.beforeEach(async ({ page }) => {
  setupConsoleErrorTracking(page);
});

test.afterEach(async () => {
  assertNoConsoleErrors();
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
