#!/usr/bin/env node
/**
 * Integration test for WebSocket functionality
 * Tests WebSocket connections against running development server
 */

const WebSocket = require('ws');
const http = require('http');

console.log('🔌 Starting WebSocket integration tests...\n');

// Configuration
const DEV_SERVER_URL = 'http://localhost:8777';
const WS_SERVER_URL = 'ws://localhost:8777/ws';
const TIMEOUT = 10000; // 10 seconds

// Utility to wait for a condition
function waitFor(conditionFn, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkCondition = () => {
      if (conditionFn()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(checkCondition, 100);
      }
    };
    checkCondition();
  });
}

// Test 1: Check if development server is running
async function testServerRunning() {
  console.log('🌐 Testing if development server is running...');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server check timeout'));
    }, 5000);
    
    const req = http.get(DEV_SERVER_URL, (res) => {
      clearTimeout(timeout);
      if (res.statusCode === 200 || res.statusCode === 404) { // 404 is fine, means server is running
        console.log(`  ✅ Development server is running on ${DEV_SERVER_URL}`);
        resolve();
      } else {
        reject(new Error(`Server returned status: ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      clearTimeout(timeout);
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('Development server is not running. Please start it with "npm run dev"'));
      } else {
        reject(err);
      }
    });
  });
}

// Test 2: Create a test game session first
async function createTestGameSession() {
  console.log('🎮 Creating test game session...');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Game session creation timeout'));
    }, 5000);
    
    const postData = JSON.stringify({
      type: 'drawing',
      data: { testSession: true }
    });
    
    const options = {
      hostname: 'localhost',
      port: 8787,
      path: '/api/game/test-session',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    
    const req = http.request(options, (res) => {
      clearTimeout(timeout);
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('  ✅ Test game session created');
        resolve();
      } else {
        console.log(`  ⚠️  Game session created with status: ${res.statusCode}`);
        resolve(); // Continue anyway for testing
      }
    });
    
    req.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`  ⚠️  Game session creation failed: ${err.message}`);
      resolve(); // Continue anyway for testing
    });
    
    req.write(postData);
    req.end();
  });
}

// Test 3: Test WebSocket connection
async function testWebSocketConnection() {
  console.log('🔌 Testing WebSocket connection...');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('WebSocket connection timeout'));
    }, TIMEOUT);
    
    const ws = new WebSocket(WS_SERVER_URL);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('  ✅ WebSocket connection established');
      ws.close();
      resolve();
    });
    
    ws.on('error', (err) => {
      clearTimeout(timeout);
      if (err.message.includes('ECONNREFUSED')) {
        reject(new Error('WebSocket connection refused. Check if server supports WebSocket upgrades.'));
      } else {
        reject(new Error(`WebSocket error: ${err.message}`));
      }
    });
    
    ws.on('close', (code, reason) => {
      if (code !== 1000) {
        console.log(`  ⚠️  WebSocket closed with code ${code}: ${reason}`);
      }
    });
  });
}

// Test 3: Test WebSocket message exchange
async function testWebSocketMessaging() {
  console.log('💬 Testing WebSocket messaging...');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('WebSocket messaging timeout'));
    }, TIMEOUT);
    
    const ws = new WebSocket(WS_SERVER_URL);
    let messageReceived = false;
    
    ws.on('open', () => {
      console.log('  📤 Sending test message...');
      ws.send(JSON.stringify({
        type: 'test',
        data: { message: 'Hello from integration test' }
      }));
    });
    
    ws.on('message', (data) => {
      clearTimeout(timeout);
      messageReceived = true;
      
      try {
        const parsed = JSON.parse(data.toString());
        console.log(`  📨 Received message:`, parsed);
        console.log('  ✅ WebSocket messaging works');
        ws.close();
        resolve();
      } catch (err) {
        console.log(`  📨 Received raw message: ${data.toString()}`);
        console.log('  ✅ WebSocket messaging works (non-JSON response)');
        ws.close();
        resolve();
      }
    });
    
    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`WebSocket messaging error: ${err.message}`));
    });
    
    ws.on('close', (code) => {
      if (!messageReceived && code !== 1000) {
        clearTimeout(timeout);
        reject(new Error(`WebSocket closed before receiving message: ${code}`));
      }
    });
  });
}

// Test 4: Test multiple concurrent connections
async function testConcurrentConnections() {
  console.log('🔀 Testing concurrent WebSocket connections...');
  
  const connectionPromises = [];
  const numConnections = 3;
  
  for (let i = 0; i < numConnections; i++) {
    const promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error(`Concurrent connection ${i} timeout`));
      }, TIMEOUT);
      
      const ws = new WebSocket(WS_SERVER_URL);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        console.log(`  ✅ Concurrent connection ${i + 1} established`);
        ws.send(JSON.stringify({ type: 'ping', id: i }));
        
        // Close after a short delay
        setTimeout(() => {
          ws.close();
          resolve();
        }, 1000);
      });
      
      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Concurrent connection ${i} error: ${err.message}`));
      });
    });
    
    connectionPromises.push(promise);
  }
  
  await Promise.all(connectionPromises);
  console.log(`  ✅ All ${numConnections} concurrent connections successful`);
}

// Main test runner
async function runIntegrationTests() {
  console.log('Starting integration tests...\n');
  
  const tests = [
    { name: 'Server Running', fn: testServerRunning },
    { name: 'Create Test Game Session', fn: createTestGameSession },
    { name: 'WebSocket Connection', fn: testWebSocketConnection },
    { name: 'WebSocket Messaging', fn: testWebSocketMessaging },
    { name: 'Concurrent Connections', fn: testConcurrentConnections }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} failed: ${error.message}\n`);
    }
  }
  
  console.log('\n📊 Integration Test Results:');
  console.log('=============================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 All integration tests passed!');
    console.log('Your WebSocket infrastructure is working correctly.');
  } else {
    console.log('🔧 Some integration tests failed.');
    console.log('Please check your development server and WebSocket implementation.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runIntegrationTests().catch((err) => {
    console.error('Integration tests failed:', err.message);
    process.exit(1);
  });
}

module.exports = { runIntegrationTests };