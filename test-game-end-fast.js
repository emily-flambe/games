const puppeteer = require('puppeteer');

async function testGameEndFast() {
    console.log('🔍 Testing game end behavior quickly...');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log('📱 Loading game...');
        await page.goto('http://localhost:8777', { waitUntil: 'networkidle0' });
        
        console.log('🎮 Creating a new game...');
        await page.click('.game-card[data-game="checkbox-game"]');
        
        // Wait for room to be created
        await page.waitForSelector('#room-code-display', { timeout: 5000 });
        const roomCode = await page.$eval('#room-code-display', el => el.textContent);
        console.log(`🏠 Created room: ${roomCode}`);

        // Check API shows the room initially
        let apiResponse = await page.evaluate(async () => {
            const response = await fetch('/api/active-rooms');
            return await response.json();
        });
        
        const initialRoom = apiResponse.rooms.find(room => room.sessionId === roomCode);
        console.log(`📊 Initial room status: gameStatus="${initialRoom?.gameStatus}", roomStatus="${initialRoom?.roomStatus}"`);

        console.log('🚀 Starting the game...');
        await page.click('#start-game-btn-header');
        
        // Wait for game to start
        await page.waitForSelector('#checkbox-grid .checkbox-item', { timeout: 5000 });

        // Check API shows game as in-progress
        apiResponse = await page.evaluate(async () => {
            const response = await fetch('/api/active-rooms');
            return await response.json();
        });
        
        const gameStartedRoom = apiResponse.rooms.find(room => room.sessionId === roomCode);
        console.log(`🎯 Game started status: gameStatus="${gameStartedRoom?.gameStatus}", roomStatus="${gameStartedRoom?.roomStatus}"`);

        console.log('🎲 Clicking all checkboxes to end the game...');
        
        // Click all 9 checkboxes rapidly to trigger game end
        for (let i = 0; i < 9; i++) {
            await page.click(`#checkbox-grid .checkbox-item:nth-child(${i + 1})`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between clicks
        }

        // Wait for game end screen
        console.log('⏳ Waiting for game to end...');
        await page.waitForSelector('#end-game-screen', { visible: true, timeout: 10000 });
        
        console.log('🏆 Game ended! Checking API response...');

        // Wait a moment for backend processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check final API response
        apiResponse = await page.evaluate(async () => {
            const response = await fetch('/api/active-rooms');
            return await response.json();
        });
        
        const endedRoom = apiResponse.rooms.find(room => room.sessionId === roomCode);
        console.log(`🔍 Final API check: Room found in API = ${!!endedRoom}`);
        
        if (endedRoom) {
            console.log(`❌ FAILURE: Room still in API with gameStatus="${endedRoom.gameStatus}", roomStatus="${endedRoom.roomStatus}"`);
            console.log('Full API response:', JSON.stringify(apiResponse, null, 2));
            return false;
        } else {
            console.log('✅ SUCCESS: Ended game properly disappeared from Active Rooms API!');
            return true;
        }

    } catch (error) {
        console.error('💥 Test failed with error:', error);
        return false;
    } finally {
        await browser.close();
    }
}

testGameEndFast().then(success => {
    if (success) {
        console.log('🎉 Test PASSED: Game end removes room from Active Rooms');
        process.exit(0);
    } else {
        console.log('💀 Test FAILED: Game end does not remove room from Active Rooms');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
});