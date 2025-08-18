/**
 * Visual Regression Tests for Other Game Modules
 * 
 * Tests for EverybodyVotes, CheckboxGame, PriceIsWeird, and ThatsAPaddlin games.
 * Focuses on end screens, critical UI states, and layout consistency.
 */

const tests = [
    // Everybody Votes Game Tests
    {
        name: 'everybody-votes-portal-card',
        description: 'Everybody Votes game card in portal',
        setup: async (page, framework) => {
            await framework.navigateToPortal(page);
            await page.waitForSelector('[data-game="everybody-votes"]', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            const gameCard = await page.$('[data-game="everybody-votes"]');
            return await framework.captureAndCompare(page, 'everybody-votes-portal-card', {
                element: gameCard,
                delay: 1000,
                ...options
            });
        }
    },

    {
        name: 'everybody-votes-setup',
        description: 'Everybody Votes player setup screen',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'everybody-votes');
            await page.waitForSelector('#player-name-input', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'everybody-votes-setup', {
                delay: 1500,
                ...options
            });
        }
    },

    {
        name: 'everybody-votes-waiting-room',
        description: 'Everybody Votes waiting room',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'everybody-votes');
            await framework.setupPlayer(page, 'VotesTestPlayer');
            await page.waitForSelector('#start-game-btn-header', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'everybody-votes-waiting-room', {
                delay: 2000,
                ...options
            });
        }
    },

    // Checkbox Game Tests
    {
        name: 'checkbox-game-portal-card',
        description: 'Checkbox game card in portal',
        setup: async (page, framework) => {
            await framework.navigateToPortal(page);
            await page.waitForSelector('[data-game="checkbox-game"]', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            const gameCard = await page.$('[data-game="checkbox-game"]');
            return await framework.captureAndCompare(page, 'checkbox-game-portal-card', {
                element: gameCard,
                delay: 1000,
                ...options
            });
        }
    },

    {
        name: 'checkbox-game-setup',
        description: 'Checkbox game player setup screen',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'checkbox-game');
            await page.waitForSelector('#player-name-input', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'checkbox-game-setup', {
                delay: 1500,
                ...options
            });
        }
    },

    {
        name: 'checkbox-game-waiting-room',
        description: 'Checkbox game waiting room',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'checkbox-game');
            await framework.setupPlayer(page, 'CheckboxTestPlayer');
            await page.waitForSelector('#start-game-btn-header', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'checkbox-game-waiting-room', {
                delay: 2000,
                ...options
            });
        }
    },

    // Price Is Weird Game Tests
    {
        name: 'price-is-weird-portal-card',
        description: 'Price Is Weird game card in portal',
        setup: async (page, framework) => {
            await framework.navigateToPortal(page);
            await page.waitForSelector('[data-game="price-is-weird"]', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            const gameCard = await page.$('[data-game="price-is-weird"]');
            return await framework.captureAndCompare(page, 'price-is-weird-portal-card', {
                element: gameCard,
                delay: 1000,
                ...options
            });
        }
    },

    {
        name: 'price-is-weird-setup',
        description: 'Price Is Weird player setup screen',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'price-is-weird');
            await page.waitForSelector('#player-name-input', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'price-is-weird-setup', {
                delay: 1500,
                ...options
            });
        }
    },

    {
        name: 'price-is-weird-waiting-room',
        description: 'Price Is Weird waiting room',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'price-is-weird');
            await framework.setupPlayer(page, 'PriceTestPlayer');
            await page.waitForSelector('#start-game-btn-header', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'price-is-weird-waiting-room', {
                delay: 2000,
                ...options
            });
        }
    },

    // That's A Paddlin' Game Tests
    {
        name: 'thats-a-paddlin-portal-card',
        description: 'That\'s A Paddlin game card in portal',
        setup: async (page, framework) => {
            await framework.navigateToPortal(page);
            await page.waitForSelector('[data-game="thats-a-paddlin"]', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            const gameCard = await page.$('[data-game="thats-a-paddlin"]');
            return await framework.captureAndCompare(page, 'thats-a-paddlin-portal-card', {
                element: gameCard,
                delay: 1000,
                ...options
            });
        }
    },

    {
        name: 'thats-a-paddlin-setup',
        description: 'That\'s A Paddlin player setup screen',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'thats-a-paddlin');
            await page.waitForSelector('#player-name-input', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'thats-a-paddlin-setup', {
                delay: 1500,
                ...options
            });
        }
    },

    {
        name: 'thats-a-paddlin-waiting-room',
        description: 'That\'s A Paddlin waiting room',
        setup: async (page, framework) => {
            await framework.navigateToGame(page, 'thats-a-paddlin');
            await framework.setupPlayer(page, 'PaddlinTestPlayer');
            await page.waitForSelector('#start-game-btn-header', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'thats-a-paddlin-waiting-room', {
                delay: 2000,
                ...options
            });
        }
    },

    // Cross-Game Layout Consistency Tests
    {
        name: 'game-cards-layout-consistency',
        description: 'All game cards displayed consistently in portal',
        setup: async (page, framework) => {
            await framework.navigateToPortal(page);
            await page.waitForSelector('.game-grid', { timeout: 5000 });
            
            // Wait for all game cards to load
            const gameCards = [
                '[data-game="county-game"]',
                '[data-game="everybody-votes"]',
                '[data-game="checkbox-game"]',
                '[data-game="price-is-weird"]',
                '[data-game="thats-a-paddlin"]'
            ];
            
            for (const cardSelector of gameCards) {
                await page.waitForSelector(cardSelector, { timeout: 5000 });
            }
            
            await page.waitForTimeout(2000); // Let everything settle
        },
        capture: async (page, framework, options) => {
            // Focus on the game grid area
            const gameGrid = await page.$('.game-grid');
            
            return await framework.captureAndCompare(page, 'game-cards-layout-consistency', {
                element: gameGrid,
                delay: 1500,
                testType: 'portal',
                ...options
            });
        }
    },

    {
        name: 'header-consistency-across-games',
        description: 'Header layout consistency across different game states',
        setup: async (page, framework) => {
            // Test header in County Game waiting room
            await framework.navigateToGame(page, 'county-game');
            await framework.setupPlayer(page, 'HeaderTestPlayer');
            await page.waitForSelector('#start-game-btn-header', { timeout: 5000 });
        },
        capture: async (page, framework, options) => {
            // Focus on header area
            const header = await page.$('header');
            
            return await framework.captureAndCompare(page, 'header-consistency-across-games', {
                element: header,
                delay: 1000,
                testType: 'portal',
                ...options
            });
        }
    },

    {
        name: 'mobile-portal-responsive',
        description: 'Game portal responsive layout on mobile',
        setup: async (page, framework) => {
            // Change to mobile viewport
            await page.setViewport({ width: 375, height: 667 });
            
            await framework.navigateToPortal(page);
            await page.waitForSelector('.game-grid', { timeout: 5000 });
            await page.waitForTimeout(2000);
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'mobile-portal-responsive', {
                fullPage: true,
                delay: 1500,
                testType: 'portal',
                ...options
            });
        }
    },

    {
        name: 'tablet-portal-responsive',
        description: 'Game portal responsive layout on tablet',
        setup: async (page, framework) => {
            // Change to tablet viewport
            await page.setViewport({ width: 768, height: 1024 });
            
            await framework.navigateToPortal(page);
            await page.waitForSelector('.game-grid', { timeout: 5000 });
            await page.waitForTimeout(2000);
        },
        capture: async (page, framework, options) => {
            return await framework.captureAndCompare(page, 'tablet-portal-responsive', {
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
    
    setup: async (runner) => {
        console.log('🎮 Setting up visual tests for all games...');
    },
    
    teardown: async (runner) => {
        console.log('🎮 All games visual tests completed');
    }
};