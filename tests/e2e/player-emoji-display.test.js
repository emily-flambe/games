/**
 * E2E Tests: Player Emoji Display Regression Prevention
 * 
 * These tests prevent regressions in player emoji display functionality
 * that occurred during the GameShell/GameModule architecture refactor.
 */

const puppeteer = require('puppeteer');

describe('Player Emoji Display E2E Tests', () => {
    let browser;
    let page1, page2;
    const TEST_TIMEOUT = 30000;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: process.env.CI === 'true', // Show browser in local development
            defaultViewport: { width: 1200, height: 800 },
            slowMo: process.env.CI === 'true' ? 0 : 50 // Slower in local for visibility
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        page1 = await browser.newPage();
        page2 = await browser.newPage();
        
        // Enable console logging for debugging
        if (process.env.DEBUG) {
            page1.on('console', msg => console.log('PAGE1:', msg.text()));
            page2.on('console', msg => console.log('PAGE2:', msg.text()));
        }
    });

    afterEach(async () => {
        if (page1) await page1.close();
        if (page2) await page2.close();
    });

    test('Player emoji displays in checkbox grid when player clicks checkbox', async () => {
        // STEP 1: Player 1 creates game and selects emoji
        await page1.goto('http://localhost:8777');
        await page1.click('[data-game="checkbox-game"]');
        
        // Wait for room creation
        await page1.waitForSelector('#room-code-display', { timeout: 5000 });
        
        // Select a specific emoji for Player 1
        await page1.click('#current-emoji-btn');
        await page1.waitForSelector('#emoji-grid');
        await page1.click('#emoji-grid button:nth-child(5)'); // Select 🐰 (rabbit)
        
        // Get session ID
        const sessionId = await page1.evaluate(() => {
            return document.getElementById('room-code-display')?.textContent?.trim();
        });
        expect(sessionId).toBeTruthy();
        expect(sessionId).toMatch(/^[A-Z0-9]{6}$/);
        
        // STEP 2: Player 2 joins and selects different emoji  
        await page2.goto('http://localhost:8777');
        await page2.type('#room-code-input', sessionId);
        await page2.click('#join-room-btn');
        
        // Wait for join and select different emoji for Player 2
        await page2.waitForSelector('#current-emoji-btn', { timeout: 5000 });
        await page2.click('#current-emoji-btn');
        await page2.waitForSelector('#emoji-grid');
        await page2.click('#emoji-grid button:nth-child(10)'); // Select 🐯 (tiger)
        
        // STEP 3: Start game (Player 1 is host)
        await page1.click('#start-game-btn-header');
        
        // Wait for game to start on both pages
        await page1.waitForSelector('.checkbox-grid', { timeout: 5000 });
        await page2.waitForSelector('.checkbox-grid', { timeout: 5000 });
        
        // STEP 4: Player 1 clicks a checkbox
        await page1.click('.checkbox-item[data-index="4"]'); // Middle checkbox
        
        // Wait for update propagation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // STEP 5: Verify Player 1's emoji appears on both clients
        const emoji1OnPage1 = await page1.evaluate(() => {
            const checkbox = document.querySelector('.checkbox-item[data-index="4"] .checkbox-icon');
            return checkbox?.textContent;
        });
        
        const emoji1OnPage2 = await page2.evaluate(() => {
            const checkbox = document.querySelector('.checkbox-item[data-index="4"] .checkbox-icon');
            return checkbox?.textContent;
        });
        
        // Verify Player 1's emoji is displayed (should be 🐰)
        expect(emoji1OnPage1).toBe('🐰');
        expect(emoji1OnPage2).toBe('🐰');
        
        // Verify it's NOT a generic checkmark
        expect(emoji1OnPage1).not.toBe('✓');
        expect(emoji1OnPage2).not.toBe('✓');
        
        // STEP 6: Player 2 clicks a different checkbox
        await page2.click('.checkbox-item[data-index="0"]'); // First checkbox
        
        // Wait for update propagation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // STEP 7: Verify Player 2's emoji appears on both clients
        const emoji2OnPage1 = await page1.evaluate(() => {
            const checkbox = document.querySelector('.checkbox-item[data-index="0"] .checkbox-icon');
            return checkbox?.textContent;
        });
        
        const emoji2OnPage2 = await page2.evaluate(() => {
            const checkbox = document.querySelector('.checkbox-item[data-index="0"] .checkbox-icon');
            return checkbox?.textContent;
        });
        
        // Verify Player 2's emoji is displayed (should be 🐯)
        expect(emoji2OnPage1).toBe('🐯');
        expect(emoji2OnPage2).toBe('🐯');
        
        // Verify it's NOT a generic checkmark
        expect(emoji2OnPage1).not.toBe('✓');
        expect(emoji2OnPage2).not.toBe('✓');
        
        // STEP 8: Verify both emojis persist simultaneously
        const finalState = await page1.evaluate(() => {
            const checkbox0 = document.querySelector('.checkbox-item[data-index="0"] .checkbox-icon')?.textContent;
            const checkbox4 = document.querySelector('.checkbox-item[data-index="4"] .checkbox-icon')?.textContent;
            return { checkbox0, checkbox4 };
        });
        
        expect(finalState.checkbox0).toBe('🐯'); // Player 2's emoji
        expect(finalState.checkbox4).toBe('🐰'); // Player 1's emoji
        
    }, TEST_TIMEOUT);

    test('Player emoji updates when player changes emoji during game', async () => {
        // Setup: Create game with two players
        await page1.goto('http://localhost:8777');
        await page1.click('[data-game="checkbox-game"]');
        await page1.waitForSelector('#room-code-display');
        
        // Initial emoji selection
        await page1.click('#current-emoji-btn');
        await page1.waitForSelector('#emoji-grid');
        await page1.click('#emoji-grid button:nth-child(3)'); // Select 🐭 (mouse)
        
        const sessionId = await page1.evaluate(() => {
            return document.getElementById('room-code-display')?.textContent?.trim();
        });
        
        await page2.goto('http://localhost:8777');
        await page2.type('#room-code-input', sessionId);
        await page2.click('#join-room-btn');
        await page2.waitForSelector('#current-emoji-btn');
        
        // Start game
        await page1.click('#start-game-btn-header');
        await page1.waitForSelector('.checkbox-grid');
        
        // Player 1 clicks checkbox with initial emoji
        await page1.click('.checkbox-item[data-index="5"]');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify initial emoji
        let emojiDisplayed = await page1.evaluate(() => {
            return document.querySelector('.checkbox-item[data-index="5"] .checkbox-icon')?.textContent;
        });
        expect(emojiDisplayed).toBe('🐭');
        
        // Change emoji during game (this should update existing checkboxes)
        await page1.click('#current-emoji-btn');
        await page1.click('#emoji-grid button:nth-child(8)'); // Select 🐼 (panda)
        
        // Click another checkbox with new emoji
        await page1.click('.checkbox-item[data-index="7"]');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify new checkbox shows new emoji
        const newEmojiDisplayed = await page1.evaluate(() => {
            return document.querySelector('.checkbox-item[data-index="7"] .checkbox-icon')?.textContent;
        });
        expect(newEmojiDisplayed).toBe('🐼');
        
        // Original checkbox should still show original emoji (player ownership doesn't change)
        const originalEmojiStill = await page1.evaluate(() => {
            return document.querySelector('.checkbox-item[data-index="5"] .checkbox-icon')?.textContent;
        });
        expect(originalEmojiStill).toBe('🐭');
        
    }, TEST_TIMEOUT);

    test('Multiple players with same emoji are distinguishable by timing', async () => {
        // Test edge case: what happens when multiple players have same emoji
        await page1.goto('http://localhost:8777');
        await page1.click('[data-game="checkbox-game"]');
        await page1.waitForSelector('#room-code-display');
        
        // Both players select the same emoji
        await page1.click('#current-emoji-btn');
        await page1.waitForSelector('#emoji-grid');
        await page1.click('#emoji-grid button:nth-child(1)'); // Select 🐶 (dog)
        
        const sessionId = await page1.evaluate(() => {
            return document.getElementById('room-code-display')?.textContent?.trim();
        });
        
        await page2.goto('http://localhost:8777');
        await page2.type('#room-code-input', sessionId);
        await page2.click('#join-room-btn');
        await page2.waitForSelector('#current-emoji-btn');
        
        await page2.click('#current-emoji-btn');
        await page2.waitForSelector('#emoji-grid');
        await page2.click('#emoji-grid button:nth-child(1)'); // Same emoji - 🐶
        
        // Start game
        await page1.click('#start-game-btn-header');
        await page1.waitForSelector('.checkbox-grid');
        await page2.waitForSelector('.checkbox-grid');
        
        // Both players click different checkboxes
        await page1.click('.checkbox-item[data-index="1"]');
        await page2.click('.checkbox-item[data-index="3"]');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Both should show the same emoji, but system should track ownership correctly
        const emoji1 = await page1.evaluate(() => {
            return document.querySelector('.checkbox-item[data-index="1"] .checkbox-icon')?.textContent;
        });
        const emoji2 = await page1.evaluate(() => {
            return document.querySelector('.checkbox-item[data-index="3"] .checkbox-icon')?.textContent;
        });
        
        expect(emoji1).toBe('🐶');
        expect(emoji2).toBe('🐶');
        
        // Verify both are not generic checkmarks
        expect(emoji1).not.toBe('✓');
        expect(emoji2).not.toBe('✓');
    }, TEST_TIMEOUT);

    test('Emoji persists after game state updates and reconnections', async () => {
        // Test robustness: emoji should persist through various game state changes
        await page1.goto('http://localhost:8777');
        await page1.click('[data-game="checkbox-game"]');
        await page1.waitForSelector('#room-code-display');
        
        // Select distinctive emoji
        await page1.click('#current-emoji-btn');
        await page1.waitForSelector('#emoji-grid');
        await page1.click('#emoji-grid button:nth-child(15)'); // Select 🐔 (chicken)
        
        const sessionId = await page1.evaluate(() => {
            return document.getElementById('room-code-display')?.textContent?.trim();
        });
        
        // Start game
        await page1.click('#start-game-btn-header');
        await page1.waitForSelector('.checkbox-grid');
        
        // Click several checkboxes to create game state
        await page1.click('.checkbox-item[data-index="0"]');
        await page1.click('.checkbox-item[data-index="4"]');
        await page1.click('.checkbox-item[data-index="8"]');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify all show correct emoji
        const allEmojis = await page1.evaluate(() => {
            const emojis = [];
            for (let i = 0; i < 9; i++) {
                const checkbox = document.querySelector(`.checkbox-item[data-index="${i}"] .checkbox-icon`);
                if (checkbox && checkbox.textContent && checkbox.textContent !== '') {
                    emojis.push({ index: i, emoji: checkbox.textContent });
                }
            }
            return emojis;
        });
        
        // Should have 3 checkboxes with chicken emoji
        expect(allEmojis).toHaveLength(3);
        allEmojis.forEach(item => {
            expect(item.emoji).toBe('🐔');
            expect(item.emoji).not.toBe('✓');
        });
        
        // Test reconnection scenario: close and rejoin
        await page1.close();
        page1 = await browser.newPage();
        
        // Rejoin the same session
        await page1.goto('http://localhost:8777');
        await page1.type('#room-code-input', sessionId);
        await page1.click('#join-room-btn');
        
        // Wait for reconnection and game state sync
        await page1.waitForSelector('.checkbox-grid', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify emojis are still displayed after reconnection
        const emojisAfterReconnect = await page1.evaluate(() => {
            const emojis = [];
            for (let i = 0; i < 9; i++) {
                const checkbox = document.querySelector(`.checkbox-item[data-index="${i}"] .checkbox-icon`);
                if (checkbox && checkbox.textContent && checkbox.textContent !== '') {
                    emojis.push({ index: i, emoji: checkbox.textContent });
                }
            }
            return emojis;
        });
        
        // Emojis should persist after reconnection
        expect(emojisAfterReconnect).toHaveLength(3);
        emojisAfterReconnect.forEach(item => {
            expect(item.emoji).toBe('🐔');
            expect(item.emoji).not.toBe('✓');
        });
        
    }, TEST_TIMEOUT);

    test('No generic checkmarks appear when players have emojis', async () => {
        // Specific regression test: ensure generic checkmarks never appear when player emojis should
        await page1.goto('http://localhost:8777');
        await page1.click('[data-game="checkbox-game"]');
        await page1.waitForSelector('#room-code-display');
        
        // Ensure emoji is selected (should be automatic, but verify)
        const initialEmoji = await page1.evaluate(() => {
            return document.getElementById('current-emoji-btn')?.textContent;
        });
        
        // If no emoji shown, select one explicitly
        if (!initialEmoji || initialEmoji.length === 0) {
            await page1.click('#current-emoji-btn');
            await page1.waitForSelector('#emoji-grid');
            await page1.click('#emoji-grid button:nth-child(2)');
        }
        
        const sessionId = await page1.evaluate(() => {
            return document.getElementById('room-code-display')?.textContent?.trim();
        });
        
        // Start game immediately (single player for this test)
        await page1.click('#start-game-btn-header');
        await page1.waitForSelector('.checkbox-grid');
        
        // Click all checkboxes rapidly
        for (let i = 0; i < 9; i++) {
            await page1.click(`.checkbox-item[data-index="${i}"]`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between clicks
        }
        
        // Wait for all updates to propagate
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify NO generic checkmarks appear anywhere
        const allCheckboxContent = await page1.evaluate(() => {
            const results = [];
            for (let i = 0; i < 9; i++) {
                const checkbox = document.querySelector(`.checkbox-item[data-index="${i}"] .checkbox-icon`);
                results.push({
                    index: i,
                    content: checkbox?.textContent || '',
                    isChecked: document.querySelector(`.checkbox-item[data-index="${i}"]`)?.classList.contains('checked')
                });
            }
            return results;
        });
        
        // All checked boxes should have emoji content, not generic checkmarks
        const checkedBoxes = allCheckboxContent.filter(item => item.isChecked);
        expect(checkedBoxes).toHaveLength(9); // All should be checked
        
        checkedBoxes.forEach((box, index) => {
            expect(box.content).not.toBe('✓'); // No generic checkmarks!
            expect(box.content).not.toBe(''); // Should have some emoji content
            expect(box.content).toMatch(/[\u{1F300}-\u{1F9FF}]/u); // Should be an emoji
        });
        
    }, TEST_TIMEOUT);
});

/**
 * Test Helper: Verify emoji display
 */
async function verifyEmojiInCheckbox(page, checkboxIndex, expectedEmoji) {
    const actualEmoji = await page.evaluate((index) => {
        const checkbox = document.querySelector(`.checkbox-item[data-index="${index}"] .checkbox-icon`);
        return checkbox?.textContent;
    }, checkboxIndex);
    
    expect(actualEmoji).toBe(expectedEmoji);
    expect(actualEmoji).not.toBe('✓');
    return actualEmoji;
}

module.exports = { verifyEmojiInCheckbox };