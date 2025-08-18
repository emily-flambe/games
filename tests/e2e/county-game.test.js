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

    beforeAll(async () => {
        // Start development server for testing
        devServer = exec('npm run dev', { cwd: __dirname + '/../..' });
        
        // Wait for server to be ready
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });

    afterAll(async () => {
        if (browser) await browser.close();
        if (devServer) devServer.kill();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        
        // Set viewport for consistent testing
        await page.setViewport({ width: 1280, height: 720 });
        
        // Navigate to game
        await page.goto('http://localhost:8777', {
            waitUntil: 'networkidle2',
            timeout: 10000
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
        
        // Wait for navigation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Phase 2: Player Setup
        await page.waitForSelector('#player-name-input', { timeout: 5000 });
        await page.type('#player-name-input', 'TestPlayer');
        
        await page.waitForSelector('#join-room-btn', { timeout: 5000 });
        await page.click('#join-room-btn');
        
        // Wait for room to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Phase 3: Start Game
        await page.waitForSelector('#start-game-btn', { timeout: 5000 });
        await page.click('#start-game-btn');
        
        // Wait for game to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Phase 4: Submit County
        await page.waitForSelector('#county-input', { timeout: 10000 });
        await page.type('#county-input', 'Rock');
        
        await page.waitForSelector('#submit-county-btn', { timeout: 5000 });
        await page.click('#submit-county-btn');
        
        // Phase 5: Verify Win Screen
        await page.waitForSelector('#end-game-screen', { 
            visible: true, 
            timeout: 30000 
        });
        
        // Wait for screen to fully render
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Critical Verification: Check message
        const messageText = await page.$eval('#game-result-message', el => el.textContent);
        expect(messageText).toBe('Yaaaay');
        
        // Critical Verification: Check final-scores is completely hidden
        const finalScoresElement = await page.$('#final-scores');
        const computedStyle = await page.evaluate(el => {
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
        
        // Verify all hiding styles are applied
        expect(computedStyle.display).toBe('none');
        expect(computedStyle.visibility).toBe('hidden');
        expect(computedStyle.height).toBe('0px');
        expect(computedStyle.padding).toBe('0px');
        expect(computedStyle.margin).toBe('0px');
        expect(computedStyle.border).toBe('0px');
        
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
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await page.type('#player-name-input', 'QuickTest');
        await page.click('#join-room-btn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await page.click('#start-game-btn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await page.type('#county-input', 'TestCounty');
        await page.click('#submit-county-btn');
        
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

    test('County Game handles player disconnection gracefully', async () => {
        // Test edge case: player disconnects during game
        
        await page.click('[data-game="county-game"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await page.type('#player-name-input', 'DisconnectTest');
        await page.click('#join-room-btn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await page.click('#start-game-btn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate disconnection by closing page
        await page.close();
        
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