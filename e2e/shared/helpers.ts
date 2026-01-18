import { expect, Page } from '@playwright/test';

/**
 * Shared test utilities for E2E tests
 */

// Track console errors across tests
export let consoleErrors: string[] = [];

/**
 * Setup console error tracking for a page
 */
export function setupConsoleErrorTracking(page: Page) {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
}

/**
 * Assert no console errors occurred (excluding WebSocket/network errors)
 */
export function assertNoConsoleErrors() {
  const realErrors = consoleErrors.filter(
    (err) => !err.includes('WebSocket') && !err.includes('net::ERR_')
  );
  expect(realErrors, 'Console errors detected').toHaveLength(0);
}

/**
 * Create a room and get into the game
 */
export async function createRoom(page: Page, gameType: string, playerName: string) {
  await page.goto('/');
  await expect(page.locator('#game-portal')).toBeVisible();
  await page.click(`[data-game="${gameType}"]`);
  await page.fill('#player-name-input', playerName);
  await page.click('#update-name-btn');
  await expect(page.locator('#room-code-display')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#game-room')).toBeVisible();
}
