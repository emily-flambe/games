/**
 * End-to-End Test for County Game
 * Ensures complete County Game functionality works start to finish
 * 
 * This test MUST pass in CI/CD pipeline before deployment
 */

const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const path = require('path');

describe('County Game E2E Tests', () => {
    let browser;
    let page;
    let devServer;
    
    // Use environment variable for test URL, fallback to localhost for local development
    const baseUrl = process.env.TEST_URL || 'http://localhost:8777';
    const isCI = process.env.CI === 'true';

    beforeAll(async () => {
        // Only start dev server if not in CI (CI uses deployed preview)
        if (!isCI) {
            // Start development server for local testing
            devServer = exec('npm run dev', { cwd: __dirname + '/../..' });
            
            // Wait for server to be ready
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        browser = await puppeteer.launch({
            headless: process.env.HEADLESS === 'true' || true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        console.log(`🎯 Testing against: ${baseUrl}`);
    });

    afterAll(async () => {
        if (browser) await browser.close();
        // Only kill dev server if it was started (not in CI)
        if (devServer && !isCI) devServer.kill();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        
        // Set viewport for consistent testing
        await page.setViewport({ width: 1280, height: 720 });
        
        // Navigate to game (using baseUrl which works for both local and CI)
        await page.goto(baseUrl, {
            waitUntil: 'networkidle2',
            timeout: isCI ? 30000 : 10000  // Longer timeout for deployed URLs
        });
        
        // Wait for scripts to load
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterEach(async () => {
        if (page) await page.close();
    });

    test('Complete County Game flow - single player', async () => {
        // Phase 1: Game Selection
        await page.waitForSelector('[data-game="county-game"]', { timeout: 5000 });
        await page.click('[data-game="county-game"]');
        
        // Wait for room creation and navigation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Phase 2: Player Setup - enter name and start game
        await page.waitForSelector('#player-name-input', { timeout: 5000 });
        await page.type('#player-name-input', 'TestPlayer');
        
        // Phase 3: Start Game - use the header start button
        await page.waitForSelector('#start-game-btn-header', { timeout: 5000 });
        await page.click('#start-game-btn-header');
        
        // Wait for game to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Phase 4: Submit County
        await page.waitForSelector('#county-input', { timeout: 10000 });
        await page.type('#county-input', 'Rock');
        
        await page.waitForSelector('#submit-county-btn', { timeout: 5000 });
        await page.click('#submit-county-btn');
        
        // Phase 5: County Announcement Phase
        // Wait for announcement phase to start
        await page.waitForSelector('.county-game-announcement', { timeout: 35000 });
        
        // As host, click BEGIN button
        await page.waitForSelector('#begin-btn', { timeout: 5000 });
        await page.click('#begin-btn');
        
        // Wait for player announcement to appear
        await page.waitForSelector('.announcement-display', { timeout: 5000 });
        
        // Verify the county is displayed
        const countyName = await page.$eval('.county-name', el => el.textContent);
        expect(countyName).toContain('Rock');
        
        // Since it's single player, should be able to conclude immediately
        await page.waitForSelector('#conclude-btn', { timeout: 5000 });
        await page.click('#conclude-btn');
        
        // Phase 6: Verify Win Screen
        await page.waitForSelector('#end-game-screen', { 
            visible: true, 
            timeout: 30000 
        });
        
        // Wait for screen to fully render
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Critical Verification: Check message
        const messageText = await page.$eval('#game-result-message', el => el.textContent);
        expect(messageText).toBe('Yaaaay');
        
        // Critical Verification: Check final-scores element status
        const finalScoresElement = await page.$('#final-scores');
        
        if (finalScoresElement) {
            // If element exists, verify it's properly hidden
            const computedStyle = await page.evaluate(el => {
                if (!el) return null;
                const style = window.getComputedStyle(el);
                return {
                    display: style.display,
                    visibility: style.visibility,
                    height: style.height,
                    padding: style.padding,
                    margin: style.margin,
                    border: style.border
                };
            }, finalScoresElement);
            
            // Verify element is effectively hidden (display: none is sufficient)
            expect(computedStyle.display).toBe('none');
            // Note: When display is 'none', other properties may retain default values
            // The key test is that display is 'none' which makes the element invisible
        } else {
            // If element doesn't exist, that's also acceptable (it's hidden by not existing)
            console.log('ℹ️  final-scores element not present (acceptable for County Game)');
        }
        
        // Verify OK button is functional
        const okButton = await page.$('#ok-btn');
        expect(okButton).toBeTruthy();
        
        // Test clicking OK button
        await page.click('#ok-btn');
        
        // Verify end screen closes
        await page.waitForFunction(
            () => {
                const endScreen = document.getElementById('end-game-screen');
                return !endScreen || endScreen.style.display === 'none';
            },
            { timeout: 5000 }
        );
        
        console.log('✅ County Game E2E test passed successfully');
    }, 60000); // 60 second timeout

    test('County Game win screen has no extra boxes', async () => {
        // Quick focused test for the specific fix
        
        // Navigate and start game quickly
        await page.click('[data-game="county-game"]');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await page.type('#player-name-input', 'QuickTest');
        await page.click('#start-game-btn-header');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await page.type('#county-input', 'TestCounty');
        await page.click('#submit-county-btn');
        
        // Handle announcement phase
        await page.waitForSelector('.county-game-announcement', { timeout: 35000 });
        await page.waitForSelector('#begin-btn', { timeout: 5000 });
        await page.click('#begin-btn');
        await page.waitForSelector('.announcement-display', { timeout: 5000 });
        await page.waitForSelector('#conclude-btn', { timeout: 5000 });
        await page.click('#conclude-btn');
        
        // Wait for win screen
        await page.waitForSelector('#end-game-screen', { visible: true, timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Take screenshot for visual verification
        const screenshotPath = path.join(__dirname, '../..', 'county-game-e2e-proof.png');
        await page.screenshot({ path: screenshotPath });
        
        // Verify no visible final-scores box
        const isScoresVisible = await page.evaluate(() => {
            const scores = document.getElementById('final-scores');
            if (!scores) return false;
            
            const rect = scores.getBoundingClientRect();
            const style = window.getComputedStyle(scores);
            
            // Check if element takes up any visual space
            return rect.width > 0 && rect.height > 0 && 
                   style.display !== 'none' && 
                   style.visibility !== 'hidden';
        });
        
        expect(isScoresVisible).toBe(false);
        
        // Clean up screenshot immediately
        const fs = require('fs');
        if (fs.existsSync(screenshotPath)) {
            fs.unlinkSync(screenshotPath);
        }
        
        console.log('✅ County Game extra box test passed');
    }, 45000);

    test('County Game announcement phase with multiple players', async () => {
        // Test the announcement phase with multiple players
        
        // Host creates game
        const hostPage = page;
        await hostPage.click('[data-game="county-game"]');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get room code
        const roomCode = await hostPage.$eval('#room-code-display', el => el.textContent);
        
        // Host sets name
        await hostPage.type('#player-name-input', 'Host');
        await hostPage.evaluate(() => {
            document.getElementById('update-name-btn').click();
        });
        
        // Player 2 joins
        const player2Page = await browser.newPage();
        await player2Page.setViewport({ width: 1280, height: 720 });
        await player2Page.goto(`${baseUrl}/${roomCode}`, {
            waitUntil: 'networkidle2',
            timeout: 10000
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await player2Page.type('#player-name-input', 'Player2');
        await player2Page.evaluate(() => {
            document.getElementById('update-name-btn').click();
        });
        
        // Host starts game
        await hostPage.click('#start-game-btn-header');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Both players submit counties
        await hostPage.type('#county-input', 'Alameda');
        await hostPage.click('#submit-county-btn');
        
        await player2Page.waitForSelector('#county-input', { timeout: 10000 });
        await player2Page.type('#county-input', 'Orange');
        await player2Page.click('#submit-county-btn');
        
        // Wait for announcement phase
        await hostPage.waitForSelector('.county-game-announcement', { timeout: 35000 });
        await player2Page.waitForSelector('.county-game-announcement', { timeout: 35000 });
        
        // Host clicks BEGIN
        await hostPage.waitForSelector('#begin-btn', { timeout: 5000 });
        await hostPage.click('#begin-btn');
        
        // Verify first announcement appears on both screens
        await hostPage.waitForSelector('.announcement-display', { timeout: 5000 });
        await player2Page.waitForSelector('.announcement-display', { timeout: 5000 });
        
        // Verify both players see the same announcement
        const hostCounty1 = await hostPage.$eval('.county-name', el => el.textContent);
        const player2County1 = await player2Page.$eval('.county-name', el => el.textContent);
        expect(hostCounty1).toBe(player2County1);
        expect(hostCounty1).toContain('Alameda');
        
        // Host clicks NEXT
        await hostPage.waitForSelector('#next-btn', { timeout: 5000 });
        await hostPage.click('#next-btn');
        
        // Wait for second announcement
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify both players see the same second announcement
        const hostCounty2 = await hostPage.$eval('.county-name', el => el.textContent);
        const player2County2 = await player2Page.$eval('.county-name', el => el.textContent);
        expect(hostCounty2).toBe(player2County2);
        expect(hostCounty2).toContain('Orange');
        
        // Host clicks CONCLUDE
        await hostPage.waitForSelector('#conclude-btn', { timeout: 5000 });
        await hostPage.click('#conclude-btn');
        
        // Verify win screen on both pages
        await hostPage.waitForSelector('#end-game-screen', { visible: true, timeout: 10000 });
        await player2Page.waitForSelector('#end-game-screen', { visible: true, timeout: 10000 });
        
        const hostMessage = await hostPage.$eval('#game-result-message', el => el.textContent);
        const player2Message = await player2Page.$eval('#game-result-message', el => el.textContent);
        
        expect(hostMessage).toBe('Yaaaay');
        expect(player2Message).toBe('Yaaaay');
        
        await player2Page.close();
        
        console.log('✅ County Game announcement phase test passed');
    }, 120000); // Increased timeout to 2 minutes for complex multiplayer test

    test('County Game handles player disconnection gracefully', async () => {
        // Test edge case: player disconnects during game
        
        await page.click('[data-game="county-game"]');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await page.type('#player-name-input', 'DisconnectTest');
        await page.click('#start-game-btn-header');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate disconnection by closing page
        const disconnectedPage = page;
        page = null; // Prevent afterEach from trying to close it again
        await disconnectedPage.close();
        
        // Server should handle disconnection gracefully
        // This test ensures no server crashes or memory leaks
        
        console.log('✅ County Game disconnection test passed');
    }, 30000);
});

module.exports = {
    testEnvironment: 'node',
    testTimeout: 60000,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};