/**
 * County Game Session
 * A silly game where players submit county names and everyone celebrates together
 */

import { GameSession } from './GameSession';

interface CountySubmission {
  playerId: string;
  playerName: string;
  county: string;
}

interface CountyGameState {
  type: 'county-game';
  status: 'waiting' | 'started' | 'finished';
  players: Record<string, any>;
  hostId: string | null;
  gameStarted: boolean;
  gameFinished: boolean;
  spectatorCount: number;
  spectators: Record<string, any>;
  
  // County Game specific
  phase: 'WAITING' | 'COUNTY_SUBMISSION' | 'GAME_OVER';
  counties: Record<string, string>; // playerId -> county name
  submissionEndTime: number | null;
  timeLimit: number; // 30 seconds
}

export class CountyGameSession extends GameSession {
  protected gameState: CountyGameState;
  private submissionTimer: any = null;

  protected createInitialGameState(gameType: string): CountyGameState {
    return {
      type: 'county-game',
      status: 'waiting',
      players: {},
      hostId: null,
      gameStarted: false,
      gameFinished: false,
      spectatorCount: 0,
      spectators: {},
      
      // County Game specific
      phase: 'WAITING',
      counties: {},
      submissionEndTime: null,
      timeLimit: 30
    };
  }

  async handleStartGame(ws: WebSocket, playerId: string) {
    if (this.gameState.phase !== 'WAITING' || this.gameState.gameStarted) {
      return;
    }

    const playerCount = Object.keys(this.gameState.players).length;
    if (playerCount < 2) {
      this.sendTo(ws, {
        type: 'error',
        message: 'Need at least 2 players to start'
      });
      return;
    }

    // Start the game
    this.gameState.gameStarted = true;
    this.gameState.status = 'started';
    this.gameState.phase = 'COUNTY_SUBMISSION';
    this.gameState.counties = {};
    this.gameState.submissionEndTime = Date.now() + (this.gameState.timeLimit * 1000);

    // Notify all players
    this.broadcast({
      type: 'game_started',
      phase: 'COUNTY_SUBMISSION'
    });

    this.broadcast({
      type: 'phase_changed',
      phase: 'COUNTY_SUBMISSION'
    });

    this.broadcast({
      type: 'county_submission_started',
      timeLimit: this.gameState.timeLimit,
      endTime: this.gameState.submissionEndTime
    });

    // Set timer to end submission phase
    this.submissionTimer = setTimeout(() => {
      this.endSubmissionPhase();
    }, this.gameState.timeLimit * 1000);
  }

  private async endSubmissionPhase() {
    if (this.gameState.phase !== 'COUNTY_SUBMISSION') {
      return;
    }

    // Clear timer
    if (this.submissionTimer) {
      clearTimeout(this.submissionTimer);
      this.submissionTimer = null;
    }

    // Change to game over phase
    this.gameState.phase = 'GAME_OVER';
    this.gameState.gameFinished = true;
    this.gameState.status = 'finished';

    // Prepare counties list for display
    const countiesList = Object.entries(this.gameState.counties).map(([playerId, county]) => {
      const player = this.gameState.players[playerId];
      return {
        playerName: player ? player.name : 'Unknown',
        county: county
      };
    });

    // Send game over with everyone as winner
    this.broadcast({
      type: 'phase_changed',
      phase: 'GAME_OVER'
    });

    this.broadcast({
      type: 'game_over',
      winner: 'Everyone!',
      additionalInfo: {
        counties: countiesList
      }
    });
  }

  protected async handleGameSpecificMessage(ws: WebSocket, playerId: string, data: any) {
    switch (data.type) {
      case 'submit_county':
        await this.handleCountySubmission(ws, playerId, data.county);
        break;
    }
  }

  private async handleCountySubmission(ws: WebSocket, playerId: string, county: string) {
    // Validate phase
    if (this.gameState.phase !== 'COUNTY_SUBMISSION') {
      this.sendTo(ws, {
        type: 'error',
        message: 'Not in submission phase'
      });
      return;
    }

    // Check if player already submitted
    if (this.gameState.counties[playerId]) {
      this.sendTo(ws, {
        type: 'error',
        message: 'County already submitted'
      });
      return;
    }

    // Validate county input
    if (!county || county.trim().length === 0) {
      this.sendTo(ws, {
        type: 'error',
        message: 'County name cannot be empty'
      });
      return;
    }

    // Store county submission
    this.gameState.counties[playerId] = county.trim();

    // Notify player of successful submission
    this.sendTo(ws, {
      type: 'county_submitted',
      county: county.trim()
    });

    // Notify all players of submission count
    const submittedCount = Object.keys(this.gameState.counties).length;
    const totalPlayers = Object.keys(this.gameState.players).length;

    this.broadcast({
      type: 'submission_update',
      submittedCount,
      totalPlayers
    });

    // Check if all players have submitted
    if (submittedCount === totalPlayers) {
      // End phase early
      await this.endSubmissionPhase();
    }
  }

  async handlePlayerDisconnect(playerId: string) {
    await super.handlePlayerDisconnect(playerId);

    // If in submission phase and all remaining players have submitted, end phase
    if (this.gameState.phase === 'COUNTY_SUBMISSION') {
      const remainingPlayers = Object.keys(this.gameState.players).length;
      const submittedCount = Object.keys(this.gameState.counties).length;
      
      if (remainingPlayers > 0 && submittedCount >= remainingPlayers) {
        await this.endSubmissionPhase();
      }
    }
  }

  protected getGameSpecificState() {
    return {
      phase: this.gameState.phase,
      counties: this.gameState.counties,
      submissionEndTime: this.gameState.submissionEndTime,
      timeLimit: this.gameState.timeLimit
    };
  }

  handleRestartGame() {
    // County Game doesn't support restart - need to create new room
    this.broadcast({
      type: 'error',
      message: 'Please create a new room to play again'
    });
  }

  async cleanup() {
    if (this.submissionTimer) {
      clearTimeout(this.submissionTimer);
      this.submissionTimer = null;
    }
    await super.cleanup();
  }
}

// Export for Durable Object binding
export default CountyGameSession;