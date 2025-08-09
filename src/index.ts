import { router } from './router';
import { GameSession } from './durable-objects/GameSession';
import { SessionManager } from './durable-objects/SessionManager';
import type { Env } from '../types/shared';

// Export Durable Object classes
export { GameSession, SessionManager };

// Main Worker handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await router.handle(request, env);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};