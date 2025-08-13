const puppeteer = require('puppeteer');

async function testGame(browser, url, environment) {
    console.log(`\n🧪 Testing ${environment} at ${url}`);
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`❌ [${environment}] Console error:`, msg.text());
        }
    });
    
    page.on('pageerror', error => {
        console.log(`❌ [${environment}] Page error:`, error.message);
    });
    
    try {
        // Navigate to game
        console.log(`📍 Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Create new game room
        console.log('🎮 Creating new game room...');
        await page.click('#create-room-btn');
        await page.waitForSelector('#room-code', { timeout: 5000 });
        
        const roomCode = await page.$eval('#room-code', el => el.textContent);
        console.log(`✅ Room created: ${roomCode}`);
        
        // Enter name
        await page.type('#player-name', 'TestHost');
        await page.click('#join-btn');
        
        // Wait for game to load
        await page.waitForSelector('#game-container', { timeout: 5000 });
        console.log('✅ Joined game as host');
        
        // Start game
        await page.waitForSelector('#start-game-btn', { timeout: 5000 });
        await page.click('#start-game-btn');
        console.log('✅ Game started');
        
        // Test multiple rounds
        for (let round = 1; round <= 3; round++) {
            console.log(`\n📊 Round ${round}:`);
            
            // Wait for voting phase
            await page.waitForSelector('.vote-btn', { timeout: 10000 });
            
            // Get current question and options
            const question = await page.$eval('.everybody-votes-container h1', el => el.textContent);
            console.log(`   Question: ${question}`);
            
            // Get vote button values
            const voteButtons = await page.$$eval('.vote-btn', buttons => 
                buttons.map(btn => ({
                    text: btn.textContent.trim(),
                    value: btn.dataset.vote
                }))
            );
            console.log(`   Options:`, voteButtons);
            
            // Verify options are not hardcoded
            if (round === 2 && (voteButtons[0].value === 'Pizza' || voteButtons[0].value === 'Burgers')) {
                throw new Error('Round 2 still has Pizza/Burgers - options not updating!');
            }
            if (round === 3 && (voteButtons[0].value === 'Coffee' || voteButtons[0].value === 'Tea')) {
                // This is expected for round 3
            }
            
            // Click first option
            const firstOption = voteButtons[0];
            console.log(`   Voting for: ${firstOption.value}`);
            await page.click('.vote-btn');
            
            // Wait for prediction phase
            await page.waitForSelector('.prediction-btn', { timeout: 10000 });
            console.log('   ✅ Vote submitted successfully');
            
            // Get prediction button values
            const predictionButtons = await page.$$eval('.prediction-btn', buttons => 
                buttons.map(btn => ({
                    text: btn.textContent.trim(),
                    value: btn.dataset.prediction
                }))
            );
            console.log(`   Prediction options:`, predictionButtons);
            
            // Make prediction
            await page.click('.prediction-btn');
            console.log('   ✅ Prediction submitted successfully');
            
            // Wait for results
            await page.waitForSelector('.everybody-votes-container', { timeout: 10000 });
            await page.waitForFunction(
                () => document.querySelector('.everybody-votes-container')?.textContent?.includes('Results') || 
                     document.querySelector('.everybody-votes-container')?.textContent?.includes('Winner'),
                { timeout: 10000 }
            );
            console.log('   ✅ Results displayed');
            
            // Check for next round or end game buttons
            if (round < 3) {
                try {
                    await page.waitForSelector('#next-question-btn, #continue-round-btn', { timeout: 5000 });
                    const nextBtn = await page.$('#next-question-btn') || await page.$('#continue-round-btn');
                    if (nextBtn) {
                        await nextBtn.click();
                        console.log('   ✅ Advanced to next round');
                    }
                } catch (e) {
                    console.log('   ⚠️ Could not find next round button');
                }
            }
        }
        
        console.log(`\n✅ ${environment} test completed successfully!`);
        return true;
        
    } catch (error) {
        console.error(`\n❌ ${environment} test failed:`, error.message);
        
        // Take screenshot on error
        const screenshotPath = `error-${environment}-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
        
        return false;
    } finally {
        await page.close();
    }
}

async function runTests() {
    console.log('🚀 Starting Everybody Votes game tests...\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        // Test production first
        const prodSuccess = await testGame(browser, 'https://games.emilycogsdill.com/everybody-votes', 'PRODUCTION');
        
        // Test development
        const devSuccess = await testGame(browser, 'http://localhost:8777/everybody-votes', 'DEVELOPMENT');
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST SUMMARY:');
        console.log(`  Production: ${prodSuccess ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`  Development: ${devSuccess ? '✅ PASSED' : '❌ FAILED'}`);
        console.log('='.repeat(50));
        
        if (!prodSuccess || !devSuccess) {
            process.exit(1);
        }
        
    } finally {
        await browser.close();
    }
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});