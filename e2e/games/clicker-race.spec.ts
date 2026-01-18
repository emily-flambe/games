import { test, expect } from '@playwright/test';
import { setupConsoleErrorTracking, assertNoConsoleErrors, createRoom } from '../shared/helpers';

test.beforeEach(async ({ page }) => {
  setupConsoleErrorTracking(page);
});

test.afterEach(async () => {
  assertNoConsoleErrors();
});

test.describe('Clicker Race - Happy Path', () => {
  test('host can start game and click the button', async ({ page }) => {
    await createRoom(page, 'clicker-race', 'ClickerPlayer');

    // Start the game (host only)
    const startButton = page.locator('#start-game-btn-header');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for game area to be visible
    await expect(page.locator('#game-area')).toBeVisible({ timeout: 5000 });

    // Verify the clicker button appears
    const clickerButton = page.locator('.clicker-button');
    await expect(clickerButton).toBeVisible({ timeout: 5000 });
    await expect(clickerButton).toHaveText('CLICK!');

    // Click the button a few times
    await clickerButton.click();
    await clickerButton.click();
    await clickerButton.click();

    // Verify progress updates (should show "3 / 10" somewhere)
    await expect(page.locator('.clicker-my-count')).toContainText('3 / 10');
  });

  test('clicking to target score ends the game', async ({ page }) => {
    await createRoom(page, 'clicker-race', 'RacerPlayer');

    // Start the game
    await page.click('#start-game-btn-header');
    await expect(page.locator('#game-area')).toBeVisible({ timeout: 5000 });

    // Click the button 10 times to win
    const clickerButton = page.locator('.clicker-button');
    await expect(clickerButton).toBeVisible({ timeout: 5000 });

    for (let i = 0; i < 10; i++) {
      // Check if game ended early (shouldn't happen with 10 clicks)
      const endScreen = page.locator('#end-game-screen');
      if (await endScreen.isVisible().catch(() => false)) {
        break;
      }
      await clickerButton.click();
    }

    // Game should end - end game screen should appear
    await expect(page.locator('#end-game-screen')).toBeVisible({ timeout: 10000 });

    // Should show win message
    await expect(page.locator('#game-result-message')).toBeVisible();
  });
});
