import { DurableObjectNamespace } from '@cloudflare/workers-types';

export interface Env {
  GAME_SESSIONS: DurableObjectNamespace;
  CHECKBOX_SESSIONS: DurableObjectNamespace;
  EVERYBODY_VOTES_SESSIONS: DurableObjectNamespace;
  COUNTY_GAME_SESSIONS: DurableObjectNamespace;
  GAME_REGISTRY: DurableObjectNamespace;
}

export interface SessionMetadata {
  sessionId: string;
  gameType: string;
  playerCount: number;
  players: Array<{name: string; emoji: string}>;
  createdAt: number;
  lastHeartbeat: number;
  roomStatus: 'active' | 'inactive';
  gameStatus: 'waiting' | 'in-progress' | 'finished';
}