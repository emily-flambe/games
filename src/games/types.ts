/**
 * Game Handler Types
 *
 * These interfaces define the contract for game-specific logic handlers.
 * Each game implements GameHandler to define its unique behavior.
 */

import { Player, Spectator } from '../types';

/**
 * Context provided to game handlers for accessing session state and utilities.
 */
export interface GameContext {
  /** The current game state object */
  gameState: GameState;
  /** Map of connected players */
  players: Map<string, Player>;
  /** Map of connected spectators */
  spectators: Map<string, Spectator>;
  /** ID of the current host player */
  hostId: string | null;
  /** The player ID who triggered the current action */
  playerId: string;
  /** WebSocket of the player who triggered the action */
  ws: WebSocket;
  /** Whether the triggering connection is a spectator */
  isSpectator: boolean;
  /** Broadcast a message to all connected clients */
  broadcast: (message: any, excludeWs?: WebSocket) => void;
  /** Send a message to a specific WebSocket */
  sendTo: (ws: WebSocket, message: any) => void;
  /** Persist the current game state to storage */
  saveState: () => Promise<void>;
  /** Update the game's status in the registry */
  updateRegistryStatus: (status: 'waiting' | 'in-progress' | 'finished') => void;
}

/**
 * Base game state that all games must include.
 */
export interface GameState {
  type: string;
  status: 'waiting' | 'started' | 'finished';
  players: Record<string, any>;
  hostId: string | null;
  gameStarted: boolean;
  gameFinished: boolean;
  spectatorCount: number;
  spectators: Record<string, any>;
  [key: string]: any; // Allow game-specific fields
}

/**
 * Interface that all game handlers must implement.
 */
export interface GameHandler {
  /**
   * Create the initial game-specific state.
   * This is merged with the base GameState when a room is created.
   */
  createInitialState(): Record<string, any>;

  /**
   * Handle the game start event (when host clicks Start Game).
   * Should update state, broadcast gameStarted message, etc.
   */
  onStart(ctx: GameContext): Promise<void>;

  /**
   * Handle game-specific messages from clients.
   * Called for any message type not handled by the base GameSession.
   */
  onMessage(ctx: GameContext, message: any): Promise<void>;

  /**
   * Handle player disconnect events (optional).
   * Called when a player leaves the game.
   */
  onPlayerDisconnect?(ctx: GameContext, playerId: string): Promise<void>;

  /**
   * Clean up any resources like timers (optional).
   * Called when the session is being destroyed.
   */
  cleanup?(): void;
}

/**
 * Game definition for the manifest.
 */
export interface GameDefinition {
  /** Unique identifier, e.g., 'checkbox-game' */
  id: string;
  /** Display name, e.g., 'Checkbox Game' */
  name: string;
  /** Short description for the portal */
  description: string;
  /** Whether to show in the portal */
  enabled: boolean;
  /** Whether to show as "coming soon" (grayed out) */
  comingSoon?: boolean;
}
