import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('County Game Integration Tests', () => {
  it('should create and connect to County Game session', async () => {
    // Create a new game session
    const sessionId = 'TEST123';
    const namespace = env.COUNTY_GAME_SESSIONS;
    const id = namespace.idFromName(sessionId);
    const stub = namespace.get(id);
    
    // Initialize game with WebSocket
    const response = await stub.fetch('http://game/ws', {
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
      },
    });
    
    // Verify WebSocket connection established
    expect(response.status).toBe(101);
    expect(response.webSocket).toBeDefined();
    
    // Clean up
    response.webSocket?.close(1000, 'Test complete');
  });
  
  it('should handle game state correctly', async () => {
    const sessionId = 'TEST456';
    const namespace = env.GAME_SESSIONS;
    const id = namespace.idFromName(sessionId);
    const stub = namespace.get(id);
    
    // Test regular HTTP request to check state
    const response = await stub.fetch('http://game/state');
    expect(response.status).toBe(200);
    
    const state = await response.json();
    expect(state).toHaveProperty('players');
    expect(state).toHaveProperty('gameStatus');
  });
});