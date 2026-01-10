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
  // Filter out known acceptable errors (e.g., WebSocket disconnect on navigation)
  const realErrors = consoleErrors.filter(
    (err) => !err.includes('WebSocket') && !err.includes('net::ERR_')
  );
  expect(realErrors, 'Console errors detected').toHaveLength(0);
});

test.describe('Checkbox Game', () => {
  test('loads and connects via WebSocket', async ({ page }) => {
    // Navigate to portal
    await page.goto('/');
    await expect(page.locator('#game-portal')).toBeVisible();

    // Select Checkbox Game
    await page.click('[data-game="checkbox-game"]');

    // Enter player name
    await page.fill('#player-name-input', 'SmokeTestPlayer');
    await page.click('#update-name-btn');

    // Wait for room to be created and WebSocket to connect
    // Room code display indicates successful connection
    await expect(page.locator('#room-code-display')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#room-code-display')).not.toBeEmpty();

    // Verify game room is active
    await expect(page.locator('#game-room')).toBeVisible();

    // Verify player appears in players list
    await expect(page.locator('#players-container')).toContainText('SmokeTestPlayer');
  });
});

test.describe('County Game', () => {
  test('loads and connects via WebSocket', async ({ page }) => {
    // Navigate to portal
    await page.goto('/');
    await expect(page.locator('#game-portal')).toBeVisible();

    // Select County Game
    await page.click('[data-game="county-game"]');

    // Enter player name
    await page.fill('#player-name-input', 'SmokeTestPlayer');
    await page.click('#update-name-btn');

    // Wait for room to be created and WebSocket to connect
    await expect(page.locator('#room-code-display')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#room-code-display')).not.toBeEmpty();

    // Verify game room is active
    await expect(page.locator('#game-room')).toBeVisible();

    // Verify player appears in players list
    await expect(page.locator('#players-container')).toContainText('SmokeTestPlayer');
  });
});

test.describe('Everybody Votes', () => {
  test('loads and connects via WebSocket', async ({ page }) => {
    // Navigate to portal
    await page.goto('/');
    await expect(page.locator('#game-portal')).toBeVisible();

    // Select Everybody Votes
    await page.click('[data-game="everybody-votes"]');

    // Enter player name
    await page.fill('#player-name-input', 'SmokeTestPlayer');
    await page.click('#update-name-btn');

    // Wait for room to be created and WebSocket to connect
    await expect(page.locator('#room-code-display')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#room-code-display')).not.toBeEmpty();

    // Verify game room is active
    await expect(page.locator('#game-room')).toBeVisible();

    // Verify player appears in players list
    await expect(page.locator('#players-container')).toContainText('SmokeTestPlayer');
  });
});
