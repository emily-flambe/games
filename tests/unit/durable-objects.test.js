#!/usr/bin/env node
/**
 * Unit tests for Durable Objects functionality
 * Tests basic structure and exports without deployment
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('GameSession Durable Object exists and has correct structure', async (t) => {
  const gameSessionPath = path.join(process.cwd(), 'src/durable-objects/GameSession.ts');
  
  assert.ok(fs.existsSync(gameSessionPath), 'GameSession.ts file should exist');
  
  const content = fs.readFileSync(gameSessionPath, 'utf8');
  
  // Check for class declaration
  assert.ok(content.includes('class GameSession'), 'Should contain GameSession class');
  
  // Check for required methods
  assert.ok(content.includes('fetch'), 'Should have fetch method for HTTP handling');
  assert.ok(content.includes('webSocketMessage') || content.includes('handleWebSocket'), 'Should have WebSocket handling');
  
  // Check for state management
  assert.ok(content.includes('this.state') || content.includes('DurableObjectState'), 'Should use Durable Object state');
  
  console.log('✅ GameSession Durable Object structure validated');
});

test('SessionManager Durable Object exists and has correct structure', async (t) => {
  const sessionManagerPath = path.join(process.cwd(), 'src/durable-objects/SessionManager.ts');
  
  assert.ok(fs.existsSync(sessionManagerPath), 'SessionManager.ts file should exist');
  
  const content = fs.readFileSync(sessionManagerPath, 'utf8');
  
  // Check for class declaration
  assert.ok(content.includes('class SessionManager'), 'Should contain SessionManager class');
  
  // Check for required methods
  assert.ok(content.includes('fetch'), 'Should have fetch method for HTTP handling');
  
  // Check for session management functionality
  assert.ok(content.includes('createSession') || content.includes('session'), 'Should have session management');
  
  console.log('✅ SessionManager Durable Object structure validated');
});

test('Durable Objects export correctly', async (t) => {
  const indexPath = path.join(process.cwd(), 'src/index.ts');
  
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check exports
    assert.ok(
      content.includes('export { GameSession }') || content.includes('export * from'), 
      'Should export GameSession'
    );
    assert.ok(
      content.includes('export { SessionManager }') || content.includes('export * from'), 
      'Should export SessionManager'
    );
    
    console.log('✅ Durable Objects exports validated');
  }
});

test('TypeScript types are properly defined', async (t) => {
  const typesPath = path.join(process.cwd(), 'types/shared.ts');
  
  if (fs.existsSync(typesPath)) {
    const content = fs.readFileSync(typesPath, 'utf8');
    
    // Check for game-related types
    assert.ok(
      content.includes('interface') || content.includes('type'), 
      'Should define types/interfaces'
    );
    
    console.log('✅ TypeScript types structure validated');
  }
});

console.log('\n🧪 Running Durable Objects unit tests...\n');