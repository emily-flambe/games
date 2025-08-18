import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('Basic Worker Tests', () => {
  it('should respond to home page request', async () => {
    // Test basic HTTP request to worker
    const response = await env.ASSETS.fetch('http://localhost/');
    expect(response.status).toBe(200);
    
    const html = await response.text();
    expect(html).toContain('Premium Web Games');
  });
  
  it('should serve static assets', async () => {
    // Test static file serving
    const response = await env.ASSETS.fetch('http://localhost/static/styles.css');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/css');
  });
  
  it('should handle 404 for non-existent routes', async () => {
    const response = await env.ASSETS.fetch('http://localhost/non-existent');
    expect(response.status).toBe(404);
  });
});