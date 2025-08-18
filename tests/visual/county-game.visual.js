/**
 * Visual Regression Tests for County Game
 * 
 * Tests critical visual states that functional tests might miss:
 * - Game portal display
 * - Player setup screens
 * - Game end screens (win/celebration)
 * - UI component layouts
 * - Button states and interactions
 */

const path = require('path');

const tests = [
    {
        name: 'county-game-portal-card',
        description: 'County Game card display in game portal',
        setup: async (page, framework) => {
            await framework.navigateToPortal(page);
            
            // Wait for game cards to load
            await page.waitForSelector('[data-game="county-game"]', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            // Focus on the County Game card specifically
            const gameCard = await page.$('[data-game="county-game"]');
            
            return await framework.captureAndCompare(page, 'county-game-portal-card', {
                element: gameCard,
                delay: 1000,
                ...options
            });
        }
    },

    {
        name: 'county-game-player-setup',
        description: 'County Game player setup screen',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'county-game');
            
            // Wait for player setup screen
            await page.waitForSelector('#player-name-input', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'county-game-player-setup', {
                delay: 1500,
                ...options
            });
        }
    },

    {
        name: 'county-game-player-setup-with-name',
        description: 'County Game player setup with name entered',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'county-game');
            await page.waitForSelector('#player-name-input', { timeout: 5000 });
            
            // Enter player name
            await page.type('#player-name-input', 'VisualTestPlayer');
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'county-game-player-setup-with-name', {
                delay: 1000,
                ...options
            });
        }
    },

    {
        name: 'county-game-waiting-room',
        description: 'County Game waiting room after joining',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'county-game');
            await framework.setupPlayer(page, 'VisualTestPlayer');
            
            // Wait for waiting room to load
            await page.waitForSelector('#start-game-btn-header', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'county-game-waiting-room', {
                delay: 2000,
                ...options
            });
        }
    },

    {
        name: 'county-game-active-gameplay',
        description: 'County Game during active gameplay (county input)',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'county-game');
            await framework.setupPlayer(page, 'VisualTestPlayer');
            await framework.startGame(page);
            
            // Wait for game input to appear
            await page.waitForSelector('#county-input', { timeout: 10000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'county-game-active-gameplay', {
                delay: 1500,
                ...options
            });
        }
    },

    {
        name: 'county-game-input-with-text',
        description: 'County Game input field with user text',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'county-game');
            await framework.setupPlayer(page, 'VisualTestPlayer');
            await framework.startGame(page);
            
            await page.waitForSelector('#county-input', { timeout: 10000 });
            
            // Enter county name but don't submit yet
            await page.type('#county-input', 'Rock County');
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'county-game-input-with-text', {
                delay: 1000,
                ...options
            });
        }
    },

    {
        name: 'county-game-win-screen',
        description: 'County Game win screen - critical end state',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'county-game');
            await framework.setupPlayer(page, 'VisualTestPlayer');
            await framework.startGame(page);
            
            // Complete the game
            await page.waitForSelector('#county-input', { timeout: 10000 });
            await page.type('#county-input', 'Rock');
            await page.click('#submit-county-btn');
            
            // Wait for win screen
            await framework.waitForEndScreen(page);
        },
        capture: async (page, framework, options) => {
            // This is the most critical visual test - the win screen
            return await framework.captureAndCompare(page, 'county-game-win-screen', {
                delay: 2500, // Extra time for animations to settle
                testType: 'end_screen', // Use end_screen thresholds
                ...options
            });
        }
    },

    {
        name: 'county-game-win-screen-no-scores-box',
        description: 'Verify final-scores element is completely hidden in win screen',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'county-game');
            await framework.setupPlayer(page, 'VisualTestPlayer');
            await framework.startGame(page);
            
            await page.waitForSelector('#county-input', { timeout: 10000 });
            await page.type('#county-input', 'TestCounty');
            await page.click('#submit-county-btn');
            
            await framework.waitForEndScreen(page);
            
            // Verify the scores box is properly hidden
            const finalScoresElement = await page.$('#final-scores');
            if (finalScoresElement) {
                const isVisible = await page.evaluate(el => {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return rect.width > 0 && rect.height > 0 && 
                           style.display !== 'none' && 
                           style.visibility !== 'hidden';
                }, finalScoresElement);
                
                if (isVisible) {
                    throw new Error('final-scores element is visible when it should be hidden');
                }
            }
        },
        capture: async (page, framework, options) => {
            // Focus specifically on the end game screen area
            const endGameScreen = await page.$('#end-game-screen');
            
            return await framework.captureAndCompare(page, 'county-game-win-screen-no-scores-box', {
                element: endGameScreen,
                delay: 2000,
                testType: 'end_screen',
                ...options
            });
        }
    },

    {
        name: 'county-game-ok-button-state',
        description: 'OK button in win screen - ready to click',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'county-game');
            await framework.setupPlayer(page, 'VisualTestPlayer');
            await framework.startGame(page);
            
            await page.waitForSelector('#county-input', { timeout: 10000 });
            await page.type('#county-input', 'ButtonTest');
            await page.click('#submit-county-btn');
            
            await framework.waitForEndScreen(page);
            
            // Wait for OK button to be ready
            await page.waitForSelector('#ok-btn', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            // Focus on the OK button area
            const okButton = await page.$('#ok-btn');
            
            return await framework.captureAndCompare(page, 'county-game-ok-button-state', {
                element: okButton,
                delay: 1000,
                testType: 'button',
                ...options
            });
        }
    },

    {
        name: 'county-game-responsive-mobile',
        description: 'County Game win screen on mobile viewport',
        setup: async (page, framework) => {
            // Change to mobile viewport
            await page.setViewport({ width: 375, height: 667 });
            
            await framework.navigateToGame(page, 'county-game');
            await framework.setupPlayer(page, 'MobileTest');
            await framework.startGame(page);
            
            await page.waitForSelector('#county-input', { timeout: 10000 });
            await page.type('#county-input', 'Mobile');
            await page.click('#submit-county-btn');
            
            await framework.waitForEndScreen(page);
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'county-game-responsive-mobile', {
                delay: 2000,
                fullPage: true,
                testType: 'end_screen',
                ...options
            });
        }
    },

    {
        name: 'county-game-portal-full',
        description: 'Full game portal showing all games including County Game',
        setup: async (page, framework) => {
            await framework.navigateToPortal(page);
            
            // Wait for all game cards to load
            await page.waitForSelector('.game-grid', { timeout: 5000 });
            await page.waitForFunction(() => document.readyState === 'complete', { timeout: 2000 }); // Let all games load
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'county-game-portal-full', {
                fullPage: true,
                delay: 1500,
                testType: 'portal',
                ...options
            });
        }
    }
];

module.exports = {
    tests,
    
    // Optional setup/teardown hooks
    setup: async (runner) => {
        console.log('🏁 Setting up County Game visual tests...');
        
        // Ensure visual test dependencies are available
        const validation = await runner.validateEnvironment();
        if (!validation.framework) {
            throw new Error('Visual test framework validation failed');
        }
    },
    
    teardown: async (runner) => {
        console.log('🧹 County Game visual tests completed');
        
        // Optional: Clean up test-specific artifacts
        // await runner.cleanupArtifacts({ screenshots: true, diffs: false });
    }
};