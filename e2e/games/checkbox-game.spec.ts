import { test, expect } from '@playwright/test';
import { setupConsoleErrorTracking, assertNoConsoleErrors, createRoom } from '../shared/helpers';

test.beforeEach(async ({ page }) => {
  setupConsoleErrorTracking(page);
});

test.afterEach(async () => {
  assertNoConsoleErrors();
});

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
