const puppeteer = require('puppeteer');

async function testRoomVisibility() {
  console.log('🔍 Starting room visibility test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for visual debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Test both localhost and production environments
    await testEnvironment(browser, 'http://localhost:8777', 'localhost');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait between tests
    await testEnvironment(browser, 'https://games.emilycogsdill.com', 'production');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

async function testEnvironment(browser, baseUrl, envName) {
  console.log(`\n🧪 Testing ${envName} environment: ${baseUrl}`);
  
  // Create two separate pages (simulating two different browsers)
  const page1 = await browser.newPage();
  const page2 = await browser.newPage();
  
  try {
    // Navigate both pages to the game portal
    console.log(`📖 Opening pages...`);
    await Promise.all([
      page1.goto(baseUrl),
      page2.goto(baseUrl)
    ]);
    
    // Check if the active rooms API endpoint exists
    console.log(`🔌 Checking /api/active-rooms endpoint...`);
    const apiResponse = await page1.evaluate(async (baseUrl) => {
      try {
        const response = await fetch(`${baseUrl}/api/active-rooms`);
        return {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          data: response.ok ? await response.json() : null
        };
      } catch (error) {
        return {
          error: error.message,
          status: 'network_error'
        };
      }
    }, baseUrl);
    
    console.log(`📡 API Response:`, apiResponse);
    
    // Page 1: Create a new room
    console.log(`🎮 Page 1: Creating a new game room...`);
    await page1.click('[data-game="checkbox-game"]');
    
    // Wait for the room to be created and get the room code
    await page1.waitForSelector('#room-code-display', { timeout: 10000 });
    const roomCode = await page1.$eval('#room-code-display', el => el.textContent);
    console.log(`🏠 Room created with code: ${roomCode}`);
    
    // Wait a moment for room to be registered
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Page 2: Check if the room appears in active rooms list
    console.log(`👀 Page 2: Checking for active rooms...`);
    await page2.reload(); // Refresh to load active rooms
    
    // Wait for page to load and check for active rooms
    await page2.waitForSelector('#active-rooms-list', { timeout: 5000 });
    
    const activeRoomsInfo = await page2.evaluate(() => {
      const container = document.getElementById('active-rooms-list');
      if (!container) return { error: 'active-rooms-list element not found' };
      
      const roomElements = container.querySelectorAll('.room-item');
      const rooms = Array.from(roomElements).map(room => {
        const title = room.querySelector('.room-title')?.textContent;
        const code = room.querySelector('.room-code')?.textContent;
        const players = room.querySelector('.room-players')?.textContent;
        return { title, code, players };
      });
      
      return {
        totalRooms: rooms.length,
        rooms: rooms,
        htmlContent: container.innerHTML.trim()
      };
    });
    
    console.log(`📊 Active rooms found on Page 2:`, activeRoomsInfo);
    
    // Check if our created room is visible
    const roomVisible = activeRoomsInfo.rooms?.some(room => room.code === roomCode);
    console.log(`🔍 Is room ${roomCode} visible in Page 2? ${roomVisible ? '✅ YES' : '❌ NO'}`);
    
    // Test the specific room visibility by trying to join
    if (!roomVisible) {
      console.log(`🔗 Page 2: Attempting to join room ${roomCode} manually...`);
      await page2.type('#room-code-input', roomCode);
      await page2.click('#join-room-btn');
      
      // Check if the join was successful
      await new Promise(resolve => setTimeout(resolve, 3000));
      const joinResult = await page2.evaluate(() => {
        const roomElement = document.getElementById('game-room');
        const errorElement = document.querySelector('.error-message');
        return {
          inRoom: roomElement ? roomElement.classList.contains('active') : false,
          hasError: errorElement ? errorElement.textContent : null
        };
      });
      
      console.log(`🎯 Manual join result:`, joinResult);
    }
    
    // Take screenshots for visual debugging
    await page1.screenshot({ path: `debug-${envName}-page1-room-created.png` });
    await page2.screenshot({ path: `debug-${envName}-page2-room-list.png` });
    
  } catch (error) {
    console.error(`❌ Error testing ${envName}:`, error);
    await page1.screenshot({ path: `debug-${envName}-error-page1.png` });
    await page2.screenshot({ path: `debug-${envName}-error-page2.png` });
  } finally {
    await page1.close();
    await page2.close();
  }
}

// Run the test
testRoomVisibility().catch(console.error);