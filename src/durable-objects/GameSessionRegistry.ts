/**
 * GameSessionRegistry Durable Object
 * Tracks active game sessions for room discovery
 */

import { DurableObject, DurableObjectState } from '@cloudflare/workers-types';
import { Env, SessionMetadata } from '../types';

export class GameSessionRegistry implements DurableObject {
  private sessions: Map<string, SessionMetadata> = new Map();

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      if (request.method === 'POST' && url.pathname === '/register') {
        const data: SessionMetadata = await request.json();
        this.sessions.set(data.sessionId, {
          ...data,
          roomStatus: 'active',
          gameStatus: 'waiting',
          lastHeartbeat: Date.now()
        });
        return new Response('OK');
      }
      
      if (request.method === 'PUT' && url.pathname.startsWith('/update/')) {
        const sessionId = url.pathname.split('/')[2];
        const updateData = await request.json();
        
        const existingSession = this.sessions.get(sessionId);
        if (existingSession) {
          this.sessions.set(sessionId, {
            ...existingSession,
            ...updateData,
            lastHeartbeat: Date.now()
          });
        }
        return new Response('OK');
      }
      
      if (request.method === 'POST' && url.pathname === '/update-game-status') {
        const { sessionId, gameStatus } = await request.json();
        const existingSession = this.sessions.get(sessionId);
        
        if (existingSession) {
          this.sessions.set(sessionId, {
            ...existingSession,
            gameStatus: gameStatus,
            lastHeartbeat: Date.now()
          });
        }
        return new Response('OK');
      }
      
      if (request.method === 'DELETE' && url.pathname.startsWith('/unregister/')) {
        const sessionId = url.pathname.split('/')[2];
        this.sessions.delete(sessionId);
        return new Response('OK');
      }
      
      if (request.method === 'GET' && url.pathname === '/list') {
        this.cleanupStale();
        const activeGames = Array.from(this.sessions.values())
          .filter(session => session.gameStatus !== 'finished');
        return Response.json({ rooms: activeGames });
      }
      
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('GameSessionRegistry error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  private cleanupStale() {
    const now = Date.now();
    const TTL = 30 * 60 * 1000; // 30 minutes
    
    for (const [id, session] of this.sessions) {
      if (now - session.lastHeartbeat > TTL) {
        this.sessions.delete(id);
      }
    }
  }
}