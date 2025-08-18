import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('County Game Integration Tests', () => {
  it.skip('should create and connect to County Game session', async () => {
    // Skipping due to Durable Objects storage cleanup issues in test environment
    // This is a known limitation of @cloudflare/vitest-pool-workers
    // See: https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#isolated-storage
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