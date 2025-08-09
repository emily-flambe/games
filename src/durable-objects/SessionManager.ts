import type { SessionInfo } from '../../types/shared';

export class SessionManager {
  private state: DurableObjectState;
  private sessions: Map<string, SessionInfo> = new Map();

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.initializeSessions();
  }

  private async initializeSessions() {
    const stored = await this.state.storage.get('sessions');
    if (stored) {
      this.sessions = new Map(stored as Array<[string, SessionInfo]>);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (request.method) {
      case 'GET':
        return this.listSessions();
      case 'POST':
        return this.createSession(request);
      case 'DELETE':
        return this.deleteSession(url.searchParams.get('id'));
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }

  private async listSessions(): Promise<Response> {
    // Clean up finished sessions older than 1 hour
    const cutoff = Date.now() - (60 * 60 * 1000);
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.status === 'finished' && session.createdAt < cutoff) {
        this.sessions.delete(id);
      }
    }

    await this.persistSessions();

    const sessionList = Array.from(this.sessions.values());
    
    return new Response(JSON.stringify({
      sessions: sessionList,
      count: sessionList.length,
      timestamp: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async createSession(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      
      const sessionInfo: SessionInfo = {
        id: crypto.randomUUID(),
        gameType: body.gameType || 'generic',
        playerCount: 0,
        maxPlayers: body.maxPlayers || 4,
        status: 'waiting',
        createdAt: Date.now()
      };

      this.sessions.set(sessionInfo.id, sessionInfo);
      await this.persistSessions();

      return new Response(JSON.stringify(sessionInfo), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response('Invalid request body', { status: 400 });
    }
  }

  private async deleteSession(sessionId: string | null): Promise<Response> {
    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    const deleted = this.sessions.delete(sessionId);
    
    if (!deleted) {
      return new Response('Session not found', { status: 404 });
    }

    await this.persistSessions();

    return new Response(JSON.stringify({ 
      success: true, 
      sessionId,
      timestamp: Date.now() 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async persistSessions() {
    await this.state.storage.put('sessions', Array.from(this.sessions.entries()));
  }

  // Method to update session info (called by GameSession objects)
  async updateSession(sessionId: string, updates: Partial<SessionInfo>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, { ...session, ...updates });
      await this.persistSessions();
    }
  }

  // Method to get session info
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    return this.sessions.get(sessionId) || null;
  }
}