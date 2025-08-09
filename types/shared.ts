// Basic game state types
export interface GameState {
  id: string;
  type: string;
  players: Player[];
  status: 'waiting' | 'active' | 'finished';
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  joinedAt: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: number;
}

// Session types
export interface SessionInfo {
  id: string;
  gameType: string;
  playerCount: number;
  maxPlayers: number;
  status: GameState['status'];
  createdAt: number;
}

// Environment bindings
export interface Env {
  GAME_SESSION: DurableObjectNamespace;
  ENVIRONMENT?: string;
}

// Router context
export interface Context {
  env: Env;
  request: Request;
  params?: Record<string, string>;
}

// Drawing Game specific types
export interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  timestamp: number;
}

export interface DrawingGameState {
  currentDrawer: string | null;
  word: string | null;
  strokes: DrawingStroke[];
  round: number;
  maxRounds: number;
  turnTimeLeft: number;
  phase: 'waiting' | 'drawing' | 'guessing' | 'results' | 'finished';
  scores: Record<string, number>;
  guesses: Array<{ playerId: string; guess: string; timestamp: number }>;
  correctGuessers: string[];
}

// Drawing game message types
export type DrawingGameMessage = 
  | { type: 'draw_stroke'; data: DrawingStroke }
  | { type: 'clear_canvas'; data: {} }
  | { type: 'submit_guess'; data: { guess: string } }
  | { type: 'start_turn'; data: { drawer: string; word: string } }
  | { type: 'end_turn'; data: { scores: Record<string, number> } }
  | { type: 'game_finished'; data: { finalScores: Record<string, number> } };