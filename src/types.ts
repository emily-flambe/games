import { DurableObjectNamespace } from '@cloudflare/workers-types';

export interface Env {
  GAME_SESSIONS: DurableObjectNamespace;
  GAME_REGISTRY: DurableObjectNamespace;
}

/**
 * A connected player in a game session.
 */
export interface Player {
  id: string;
  name: string;
  emoji: string;
  connected: boolean;
  joinedAt: number;
  isHost: boolean;
  isSpectator: false;
}

/**
 * A spectator watching a game session.
 */
export interface Spectator {
  id: string;
  name: string;
  emoji: string;
  connected: boolean;
  joinedAt: number;
  isSpectator: true;
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