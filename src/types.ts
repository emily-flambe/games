import { DurableObjectNamespace } from '@cloudflare/workers-types';

export interface Env {
  GAME_SESSIONS: DurableObjectNamespace;
  CHECKBOX_SESSIONS: DurableObjectNamespace;
  EVERYBODY_VOTES_SESSIONS: DurableObjectNamespace;
  COUNTY_GAME_SESSIONS: DurableObjectNamespace;
  GAME_REGISTRY: DurableObjectNamespace;
}

/**
 * Standardized Player interface.
 * Players are active participants who can interact with the game.
 */
export interface Player {
  id: string;           // Format: "player_<random9>"
  name: string;         // Generated silly name
  emoji: string;        // Random animal emoji
  connected: boolean;   // WebSocket connection status
  joinedAt: number;     // Unix timestamp ms
  isHost: boolean;      // true for room creator only
  isSpectator: false;   // Always false for players
}

/**
 * Standardized Spectator interface.
 * Spectators can observe but cannot interact with the game.
 */
export interface Spectator {
  id: string;           // Format: "spectator_<random9>"
  name: string;         // Generated silly name
  emoji: string;        // Random animal emoji
  connected: boolean;   // WebSocket connection status
  joinedAt: number;     // Unix timestamp ms
  isHost: false;        // Always false for spectators
  isSpectator: true;    // Always true for spectators
}

/**
 * Union type for any participant (player or spectator).
 */
export type Participant = Player | Spectator;

/**
 * Minimal player info for registry/lobby display.
 */
export interface PlayerSummary {
  name: string;
  emoji: string;
}

export interface SessionMetadata {
  sessionId: string;
  gameType: string;
  playerCount: number;
  players: PlayerSummary[];
  createdAt: number;
  lastHeartbeat: number;
  roomStatus: 'active' | 'inactive';
  gameStatus: 'waiting' | 'in-progress' | 'finished';
}