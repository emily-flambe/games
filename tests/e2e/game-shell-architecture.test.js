/**
 * E2E Tests: GameShell Architecture Integration
 * 
 * Tests the integration between GameShell and GameModules to prevent
 * architecture refactor regressions like data flow breaks and state sync issues.
 */

const puppeteer = require('puppeteer');

describe('GameShell Architecture E2E Tests', () => {
    let browser;
    let page;
    const TEST_TIMEOUT = 20000;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: process.env.CI === 'true',
            defaultViewport: { width: 1200, height: 800 },
            slowMo: process.env.CI === 'true' ? 0 : 30
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        page = await browser.newPage();
        
        // Capture console errors that might indicate architecture issues
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('BROWSER ERROR:', msg.text());
            }
        });
    });

    afterEach(async () => {
        if (page) await page.close();
    });

    test('GameShell properly initializes GameModule with player data', async () => {
        await page.goto('http://localhost:8777');
        
        // Create game and select emoji
        await page.click('[data-game="checkbox-game"]');
        await page.waitForSelector('#room-code-display');
        
        await page.click('#current-emoji-btn');
        await page.waitForSelector('#emoji-grid');
        await page.click('#emoji-grid button:nth-child(7)');
        
        // Start game to trigger GameModule initialization
        await page.click('#start-game-btn-header');
        await page.waitForSelector('.checkbox-grid');
        
        // Verify GameModule has access to player data from GameShell
        const gameModuleHasPlayers = await page.evaluate(() => {
            // Access the GameShell instance and check if GameModule has player data
            if (window.gameShell && window.gameShell.gameModule) {
                const hasPlayers = Object.keys(window.gameShell.gameModule.players || {}).length > 0;
                const hasCurrentPlayer = window.gameShell.currentPlayerId !== null;
                const playersMatchShell = JSON.stringify(window.gameShell.players) === 
                                         JSON.stringify(window.gameShell.gameModule.players);
                return { hasPlayers, hasCurrentPlayer, playersMatchShell };
            }
            return { error: 'GameShell or GameModule not accessible' };
        });
        
        expect(gameModuleHasPlayers.hasPlayers).toBe(true);
        expect(gameModuleHasPlayers.hasCurrentPlayer).toBe(true);
        expect(gameModuleHasPlayers.playersMatchShell).toBe(true);
    }, TEST_TIMEOUT);

    test('Player state updates propagate from GameShell to GameModule', async () => {
        await page.goto('http://localhost:8777');
        await page.click('[data-game="checkbox-game"]');
        await page.waitForSelector('#room-code-display');
        
        // Start game
        await page.click('#start-game-btn-header');
        await page.waitForSelector('.checkbox-grid');
        
        // Change player name during game
        const nameInput = await page.$('#player-name-input');
        if (nameInput) {
            await page.click('#player-name-input');
            await page.keyboard.selectAll();
            await page.type('#player-name-input', 'TestPlayer123');
            await page.click('#update-name-btn');
        }
        
        // Wait for update propagation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify GameModule received the updated player data
        const playerDataSync = await page.evaluate(() => {
            if (window.gameShell && window.gameShell.gameModule && window.gameShell.currentPlayerId) {
                const shellPlayer = window.gameShell.players[window.gameShell.currentPlayerId];
                const modulePlayer = window.gameShell.gameModule.players[window.gameShell.currentPlayerId];
                
                return {
                    shellName: shellPlayer?.name,
                    moduleName: modulePlayer?.name,
                    namesSynced: shellPlayer?.name === modulePlayer?.name
                };
            }
            return { error: 'Cannot access player data' };
        });
        
        expect(playerDataSync.namesSynced).toBe(true);
        expect(playerDataSync.shellName).toBe('TestPlayer123');
        expect(playerDataSync.moduleName).toBe('TestPlayer123');
    }, TEST_TIMEOUT);

    test('WebSocket message handling routes correctly to GameModule', async () => {
        await page.goto('http://localhost:8777');
        await page.click('[data-game="checkbox-game"]');
        await page.waitForSelector('#room-code-display');
        
        // Start game
        await page.click('#start-game-btn-header');
        await page.waitForSelector('.checkbox-grid');
        
        // Set up message monitoring
        await page.evaluate(() => {
            window.messageLog = [];
            
            // Intercept WebSocket messages
            if (window.gameShell && window.gameShell.ws) {
                const originalOnMessage = window.gameShell.ws.onmessage;
                window.gameShell.ws.onmessage = function(event) {
                    const message = JSON.parse(event.data);
                    window.messageLog.push({
                        type: message.type,
                        timestamp: Date.now(),
                        hasPlayerId: message.playerId !== undefined,
                        hasData: message.data !== undefined
                    });
                    return originalOnMessage.call(this, event);
                };
            }
        });
        
        // Trigger checkbox action that should generate WebSocket message
        await page.click('.checkbox-item[data-index="2"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check that checkbox_toggled message was received and handled
        const messageLog = await page.evaluate(() => window.messageLog || []);
        const checkboxMessage = messageLog.find(msg => msg.type === 'checkbox_toggled');
        
        expect(checkboxMessage).toBeDefined();
        expect(checkboxMessage.hasData).toBe(true);
        
        // Verify the message resulted in UI update (not generic checkmark)
        const checkboxContent = await page.evaluate(() => {
            const checkbox = document.querySelector('.checkbox-item[data-index="2"] .checkbox-icon');
            return checkbox?.textContent;
        });
        
        expect(checkboxContent).not.toBe('✓');
        expect(checkboxContent).toMatch(/[\u{1F300}-\u{1F9FF}]/u); // Should be emoji
    }, TEST_TIMEOUT);

    test('GameModule cleanup prevents memory leaks on game end', async () => {
        await page.goto('http://localhost:8777');
        await page.click('[data-game="checkbox-game"]');
        await page.waitForSelector('#room-code-display');
        
        // Start and end game cycle
        await page.click('#start-game-btn-header');
        await page.waitForSelector('.checkbox-grid');
        
        // Complete the game by checking all boxes
        for (let i = 0; i < 9; i++) {
            await page.click(`.checkbox-item[data-index="${i}"]`);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Wait for game end
        await page.waitForSelector('#end-game-screen', { timeout: 10000 });
        
        // Click OK to return to portal
        await page.click('#ok-btn');
        await page.waitForSelector('[data-game="checkbox-game"]', { timeout: 5000 });
        
        // Verify GameModule was properly cleaned up
        const cleanupState = await page.evaluate(() => {
            if (window.gameShell) {
                return {
                    gameModuleNull: window.gameShell.gameModule === null,
                    playersEmpty: Object.keys(window.gameShell.players || {}).length === 0,
                    sessionCleared: window.gameShell.sessionId === '',
                    gameAreaEmpty: document.getElementById('game-area')?.innerHTML === ''
                };
            }
            return { error: 'GameShell not accessible' };
        });
        
        expect(cleanupState.gameModuleNull).toBe(true);
        expect(cleanupState.playersEmpty).toBe(true);
        expect(cleanupState.sessionCleared).toBe(true);
        expect(cleanupState.gameAreaEmpty).toBe(true);
    }, TEST_TIMEOUT);

    test('Error handling prevents crashes in GameModule communication', async () => {
        await page.goto('http://localhost:8777');
        await page.click('[data-game="checkbox-game"]');
        await page.waitForSelector('#room-code-display');
        
        // Start game
        await page.click('#start-game-btn-header');
        await page.waitForSelector('.checkbox-grid');
        
        // Simulate error conditions by corrupting game state
        const errorTests = await page.evaluate(() => {
            const results = [];
            
            if (window.gameShell && window.gameShell.gameModule) {
                try {
                    // Test 1: null player data
                    window.gameShell.gameModule.updatePlayers(null);
                    results.push({ test: 'null_players', error: null });
                } catch (e) {
                    results.push({ test: 'null_players', error: e.message });
                }
                
                try {
                    // Test 2: malformed state update
                    window.gameShell.gameModule.handleStateUpdate(null);
                    results.push({ test: 'null_state', error: null });
                } catch (e) {
                    results.push({ test: 'null_state', error: e.message });
                }
                
                try {
                    // Test 3: invalid player action
                    window.gameShell.gameModule.handlePlayerAction(null, { type: 'invalid', data: null });
                    results.push({ test: 'invalid_action', error: null });
                } catch (e) {
                    results.push({ test: 'invalid_action', error: e.message });
                }
            }
            
            return results;
        });
        
        // Verify game didn't crash from error conditions
        const gameStillFunctional = await page.evaluate(() => {
            return {
                gameShellExists: typeof window.gameShell !== 'undefined',
                gameModuleExists: window.gameShell?.gameModule !== null,
                canClickCheckbox: document.querySelector('.checkbox-item[data-index="0"]') !== null
            };
        });
        
        expect(gameStillFunctional.gameShellExists).toBe(true);
        expect(gameStillFunctional.gameModuleExists).toBe(true);
        expect(gameStillFunctional.canClickCheckbox).toBe(true);
        
        // Verify game still responds to interactions after error conditions
        await page.click('.checkbox-item[data-index="1"]');
        const interactionWorks = await page.evaluate(() => {
            const checkbox = document.querySelector('.checkbox-item[data-index="1"]');
            return checkbox?.classList.contains('checked');
        });
        
        expect(interactionWorks).toBe(true);
    }, TEST_TIMEOUT);

    test('Multiple game modules can coexist without interference', async () => {
        // This test would verify that if we had multiple game types,
        // they wouldn't interfere with each other's state
        await page.goto('http://localhost:8777');
        
        // For now, test that checkbox game initializes cleanly multiple times
        await page.click('[data-game="checkbox-game"]');
        await page.waitForSelector('#room-code-display');
        
        const sessionId = await page.evaluate(() => {
            return document.getElementById('room-code-display')?.textContent?.trim();
        });
        
        // Leave game
        await page.click('#leave-room-btn');
        await page.waitForSelector('[data-game="checkbox-game"]');
        
        // Rejoin same game to test reinitialization
        await page.type('#room-code-input', sessionId);
        await page.click('#join-room-btn');
        await page.waitForSelector('#start-game-btn-header');
        
        // Start game again - this should reinitialize GameModule
        await page.click('#start-game-btn-header');
        await page.waitForSelector('.checkbox-grid');
        
        // Verify clean initialization
        const reinitState = await page.evaluate(() => {
            if (window.gameShell?.gameModule) {
                return {
                    hasPlayers: Object.keys(window.gameShell.gameModule.players || {}).length > 0,
                    checkboxesClean: Array.from(document.querySelectorAll('.checkbox-item.checked')).length === 0,
                    gameAreaRendered: document.querySelector('.checkbox-game-container') !== null
                };
            }
            return { error: 'GameModule not accessible' };
        });
        
        expect(reinitState.hasPlayers).toBe(true);
        expect(reinitState.checkboxesClean).toBe(true);
        expect(reinitState.gameAreaRendered).toBe(true);
    }, TEST_TIMEOUT);
});

/**
 * WebSocket Message Flow Tests
 * 
 * Tests the specific message flow that caused the emoji regression
 */
describe('WebSocket Message Flow Tests', () => {
    let browser;
    let page;
    const TEST_TIMEOUT = 15000;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: process.env.CI === 'true',
            defaultViewport: { width: 1200, height: 800 }
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        page = await browser.newPage();
    });

    afterEach(async () => {
        if (page) await page.close();
    });

    test('toggle_checkbox message generates correct checkbox_toggled response', async () => {
        await page.goto('http://localhost:8777');
        await page.click('[data-game="checkbox-game"]');
        await page.waitForSelector('#room-code-display');
        
        // Monitor WebSocket messages
        const messageCapture = await page.evaluate(() => {
            return new Promise((resolve) => {
                window.capturedMessages = [];
                
                // Wait for game to start and WebSocket to be ready
                const checkConnection = () => {
                    if (window.gameShell?.ws?.readyState === 1) {
                        // Intercept WebSocket messages
                        const originalSend = window.gameShell.ws.send;
                        const originalOnMessage = window.gameShell.ws.onmessage;
                        
                        window.gameShell.ws.send = function(data) {
                            const message = JSON.parse(data);
                            window.capturedMessages.push({
                                direction: 'outgoing',
                                type: message.type,
                                data: message.data
                            });
                            return originalSend.call(this, data);
                        };
                        
                        window.gameShell.ws.onmessage = function(event) {
                            const message = JSON.parse(event.data);
                            window.capturedMessages.push({
                                direction: 'incoming',
                                type: message.type,
                                data: message.data,
                                playerId: message.playerId
                            });
                            return originalOnMessage.call(this, event);
                        };
                        
                        resolve(true);
                    } else {
                        setTimeout(checkConnection, 100);
                    }
                };
                checkConnection();
            });
        });
        
        // Start game and wait for WebSocket setup
        await page.click('#start-game-btn-header');
        await page.waitForSelector('.checkbox-grid');
        await messageCapture; // Wait for WebSocket interception setup
        
        // Clear any existing messages and click checkbox
        await page.evaluate(() => { window.capturedMessages = []; });
        await page.click('.checkbox-item[data-index="3"]');
        
        // Wait for message exchange
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Analyze message flow
        const messages = await page.evaluate(() => window.capturedMessages || []);
        
        // Should have: outgoing toggle_checkbox -> incoming checkbox_toggled
        const outgoingToggle = messages.find(m => m.direction === 'outgoing' && m.type === 'toggle_checkbox');
        const incomingToggled = messages.find(m => m.direction === 'incoming' && m.type === 'checkbox_toggled');
        
        expect(outgoingToggle).toBeDefined();
        expect(outgoingToggle.data).toHaveProperty('checkboxIndex', 3);
        
        expect(incomingToggled).toBeDefined();
        expect(incomingToggled.data).toHaveProperty('checkboxIndex', 3);
        expect(incomingToggled.data).toHaveProperty('newState', true);
        expect(incomingToggled.data).toHaveProperty('toggledBy');
        expect(incomingToggled.data.toggledBy).toBeTruthy();
        
        // Most importantly: verify the UI updated with player emoji, not generic checkmark
        const checkboxContent = await page.evaluate(() => {
            return document.querySelector('.checkbox-item[data-index="3"] .checkbox-icon')?.textContent;
        });
        
        expect(checkboxContent).not.toBe('✓');
        expect(checkboxContent).toMatch(/[\u{1F300}-\u{1F9FF}]/u);
        
    }, TEST_TIMEOUT);

    test('message structure matches expected GameModule interface', async () => {
        await page.goto('http://localhost:8777');
        await page.click('[data-game="checkbox-game"]');
        await page.waitForSelector('#room-code-display');
        
        await page.click('#start-game-btn-header');
        await page.waitForSelector('.checkbox-grid');
        
        // Test message structure validation
        const messageValidation = await page.evaluate(() => {
            return new Promise((resolve) => {
                if (window.gameShell?.ws?.readyState === 1) {
                    const originalOnMessage = window.gameShell.ws.onmessage;
                    
                    window.gameShell.ws.onmessage = function(event) {
                        const message = JSON.parse(event.data);
                        
                        if (message.type === 'checkbox_toggled') {
                            // Validate message structure for GameModule compatibility
                            const validation = {
                                hasType: typeof message.type === 'string',
                                hasData: message.data !== undefined,
                                hasCheckboxIndex: typeof message.data?.checkboxIndex === 'number',
                                hasNewState: typeof message.data?.newState === 'boolean',
                                hasToggledBy: message.data?.toggledBy !== undefined,
                                toggledByIsString: typeof message.data?.toggledBy === 'string'
                            };
                            
                            resolve(validation);
                        }
                        
                        return originalOnMessage.call(this, event);
                    };
                    
                    // Trigger the message by clicking a checkbox
                    setTimeout(() => {
                        const checkbox = document.querySelector('.checkbox-item[data-index="5"]');
                        if (checkbox) checkbox.click();
                    }, 100);
                } else {
                    resolve({ error: 'WebSocket not ready' });
                }
            });
        });
        
        const validation = await messageValidation;
        
        expect(validation.hasType).toBe(true);
        expect(validation.hasData).toBe(true);
        expect(validation.hasCheckboxIndex).toBe(true);
        expect(validation.hasNewState).toBe(true);
        expect(validation.hasToggledBy).toBe(true);
        expect(validation.toggledByIsString).toBe(true);
        
    }, TEST_TIMEOUT);
});