import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('County Game Integration Tests', () => {
  it.skip('should create and connect to County Game session', async () => {
    // Skipping due to Durable Objects storage cleanup issues in test environment
    // This is a known limitation of @cloudflare/vitest-pool-workers
    // See: https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#isolated-storage
  });
  
  it.skip('should handle game state correctly', async () => {
    // Skipping due to Durable Objects storage cleanup issues in test environment
    // This is a known limitation of @cloudflare/vitest-pool-workers
    // See: https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#isolated-storage
  });
});