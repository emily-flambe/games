/**
 * Tests for County Game input preservation during state updates
 * Ensures that input fields don't get cleared when other players submit
 */

const puppeteer = require('puppeteer');

describe('County Game Input Preservation', () => {
    let browser;
    let player1, player2, player3;
    
    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }, 30000);
    
    afterAll(async () => {
        if (browser) await browser.close();
    });
    
    beforeEach(async () => {
        // Create three player pages
        player1 = await browser.newPage();
        player2 = await browser.newPage();
        player3 = await browser.newPage();
        
        // Set viewport for consistent testing
        await player1.setViewport({ width: 1280, height: 720 });
        await player2.setViewport({ width: 1280, height: 720 });
        await player3.setViewport({ width: 1280, height: 720 });
        
        // Navigate all players to the game
        const baseUrl = 'http://localhost:8777';
        await player1.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 10000 });
        await player2.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 10000 });
        await player3.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 10000 });
        
        // Wait for scripts to load
        await new Promise(resolve => setTimeout(resolve, 2000));
    }, 30000);
    
    afterEach(async () => {
        if (player1) await player1.close();
        if (player2) await player2.close();
        if (player3) await player3.close();
    });
    
    test('should preserve input field values when other players submit', async () => {
        // Player 1 creates a room
        await player1.type('#player-name', 'Player1');
        await player1.click('#create-room-btn');
        await player1.waitForSelector('#room-code', { timeout: 5000 });
        const roomCode = await player1.$eval('#room-code', el => el.value);
        
        // Players 2 and 3 join the room
        await player2.type('#player-name', 'Player2');
        await player2.type('#room-code-input', roomCode);
        await player2.click('#join-room-btn');
        await player2.waitForSelector('.game-lobby', { timeout: 5000 });
        
        await player3.type('#player-name', 'Player3');
        await player3.type('#room-code-input', roomCode);
        await player3.click('#join-room-btn');
        await player3.waitForSelector('.game-lobby', { timeout: 5000 });
        
        // Wait for all players to be in lobby
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Start the game
        await player1.click('#start-game-btn');
        
        // Wait for submission phase
        await player1.waitForSelector('#county-input', { timeout: 5000 });
        await player2.waitForSelector('#county-input', { timeout: 5000 });
        await player3.waitForSelector('#county-input', { timeout: 5000 });
        
        // Player 2 starts typing but doesn't submit
        await player2.type('#county-input', 'Partial County Name');
        
        // Player 3 starts typing but doesn't submit
        await player3.type('#county-input', 'Another County');
        
        // Player 1 submits their county
        await player1.type('#county-input', 'First County');
        await player1.click('#submit-county-btn');
        
        // Wait a moment for the submission to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify Player 2's input is still preserved
        const player2Input = await player2.$eval('#county-input', el => el.value);
        expect(player2Input).toBe('Partial County Name');
        
        // Verify Player 3's input is still preserved
        const player3Input = await player3.$eval('#county-input', el => el.value);
        expect(player3Input).toBe('Another County');
    }, 30000);
    
    test('should update submission status without clearing inputs', async () => {
        // Player 1 creates a room
        await player1.type('#player-name', 'Player1');
        await player1.click('#create-room-btn');
        await player1.waitForSelector('#room-code', { timeout: 5000 });
        const roomCode = await player1.$eval('#room-code', el => el.value);
        
        // Player 2 joins the room
        await player2.type('#player-name', 'Player2');
        await player2.type('#room-code-input', roomCode);
        await player2.click('#join-room-btn');
        await player2.waitForSelector('.game-lobby', { timeout: 5000 });
        
        // Wait for both players to be in lobby
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Start the game
        await player1.click('#start-game-btn');
        
        // Wait for submission phase
        await player1.waitForSelector('#county-input', { timeout: 5000 });
        await player2.waitForSelector('#county-input', { timeout: 5000 });
        
        // Player 2 starts typing
        await player2.type('#county-input', 'My County');
        
        // Check initial submission status
        const initialStatus = await player2.$eval('.submission-status', el => el.textContent);
        expect(initialStatus).toContain('0 of 2 players submitted');
        
        // Player 1 submits
        await player1.type('#county-input', 'County One');
        await player1.click('#submit-county-btn');
        
        // Wait for status update
        await player2.waitForFunction(
            () => {
                const status = document.querySelector('.submission-status');
                return status && status.textContent.includes('1 of 2');
            },
            { timeout: 5000 }
        );
        
        // Verify Player 2's input is still there
        const player2Input = await player2.$eval('#county-input', el => el.value);
        expect(player2Input).toBe('My County');
        
        // Verify status was updated
        const updatedStatus = await player2.$eval('.submission-status', el => el.textContent);
        expect(updatedStatus).toContain('1 of 2 players submitted');
    }, 30000);
});