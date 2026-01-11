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
  phase: 'WAITING' | 'COUNTY_SUBMISSION' | 'COUNTY_ANNOUNCEMENT' | 'GAME_OVER';
  counties: Record<string, string>; // playerId -> county name
  submissionEndTime: number | null;
  timeLimit: number; // 30 seconds
  announcementIndex: number; // Current player being announced
  playerOrder: string[]; // Order of players to announce
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
      timeLimit: 30,
      announcementIndex: -1,
      playerOrder: []
    };
  }

  protected async handleStartGame(ws: WebSocket, playerId: string) {
    if (this.gameState.phase !== 'WAITING' || this.gameState.gameStarted) {
      return;
    }

    // Start the game
    this.gameState.gameStarted = true;
    this.gameState.status = 'started';
    this.gameState.phase = 'COUNTY_SUBMISSION';
    this.gameState.counties = {};
    this.gameState.submissionEndTime = Date.now() + (this.gameState.timeLimit * 1000);

    // Save state and update registry
    await this.saveGameState();
    this.updateRegistryStatus('in-progress');

    // Notify all players (flattened message format)
    this.broadcast({
      type: 'gameStarted',
      gameType: this.gameState.type,
      gameState: this.gameState,
      gameSpecificState: this.getGameSpecificState(),
      phase: this.gameState.phase,
      timestamp: Date.now()
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

    // Transition to announcement phase
    this.gameState.phase = 'COUNTY_ANNOUNCEMENT';
    this.gameState.announcementIndex = -1;
    this.gameState.playerOrder = Object.keys(this.gameState.counties);

    // Save state
    await this.saveGameState();

    // Notify all players of phase change
    this.broadcast({
      type: 'phase_changed',
      phase: 'COUNTY_ANNOUNCEMENT',
      data: {
        totalPlayers: this.gameState.playerOrder.length
      }
    });
  }

  protected async handleGameSpecificMessage(ws: WebSocket, playerId: string, data: any, isSpectator: boolean) {
    switch (data.type) {
      case 'submit_county':
        await this.handleCountySubmission(ws, playerId, data.county);
        break;
      case 'begin_announcements':
        await this.handleBeginAnnouncements(ws, playerId);
        break;
      case 'next_announcement':
        await this.handleNextAnnouncement(ws, playerId);
        break;
      case 'conclude_announcements':
        await this.handleConcludeAnnouncements(ws, playerId);
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

  private async handleBeginAnnouncements(ws: WebSocket, playerId: string) {
    // Only host can begin announcements
    if (this.gameState.hostId !== playerId) {
      this.sendTo(ws, {
        type: 'error',
        message: 'Only host can control announcements'
      });
      return;
    }

    // Validate phase
    if (this.gameState.phase !== 'COUNTY_ANNOUNCEMENT') {
      this.sendTo(ws, {
        type: 'error',
        message: 'Not in announcement phase'
      });
      return;
    }

    // Begin with first player
    this.gameState.announcementIndex = 0;
    await this.announceCurrentPlayer();
  }

  private async handleNextAnnouncement(ws: WebSocket, playerId: string) {
    // Only host can control announcements
    if (this.gameState.hostId !== playerId) {
      this.sendTo(ws, {
        type: 'error',
        message: 'Only host can control announcements'
      });
      return;
    }

    // Validate phase
    if (this.gameState.phase !== 'COUNTY_ANNOUNCEMENT') {
      this.sendTo(ws, {
        type: 'error',
        message: 'Not in announcement phase'
      });
      return;
    }

    // Move to next player
    this.gameState.announcementIndex++;
    
    if (this.gameState.announcementIndex < this.gameState.playerOrder.length) {
      await this.announceCurrentPlayer();
    } else {
      // All players announced, show conclude button
      this.broadcast({
        type: 'all_announced',
        data: {
          canConclude: true
        }
      });
    }
  }

  private async handleConcludeAnnouncements(ws: WebSocket, playerId: string) {
    // Only host can conclude announcements
    if (this.gameState.hostId !== playerId) {
      this.sendTo(ws, {
        type: 'error',
        message: 'Only host can conclude announcements'
      });
      return;
    }

    // Validate phase
    if (this.gameState.phase !== 'COUNTY_ANNOUNCEMENT') {
      this.sendTo(ws, {
        type: 'error',
        message: 'Not in announcement phase'
      });
      return;
    }

    // End the game
    await this.endGame();
  }

  private async announceCurrentPlayer() {
    const playerId = this.gameState.playerOrder[this.gameState.announcementIndex];
    const player = this.gameState.players[playerId];
    const county = this.gameState.counties[playerId];

    this.broadcast({
      type: 'player_announcement',
      data: {
        playerNumber: this.gameState.announcementIndex + 1,
        playerName: player ? player.name : 'Unknown',
        playerEmoji: player ? player.emoji : '👤',
        county: county,
        isLast: this.gameState.announcementIndex === this.gameState.playerOrder.length - 1
      }
    });
  }

  private async endGame() {
    // Change to game over phase
    this.gameState.phase = 'GAME_OVER';
    this.gameState.gameFinished = true;
    this.gameState.status = 'finished';

    // Update registry status
    await this.saveGameState();
    this.updateRegistryStatus('finished');

    // Send game_ended message using standard framework
    this.broadcast({
      type: 'game_ended',
      data: {
        message: 'Yaaaay',
        winners: Object.keys(this.gameState.players), // Everyone wins
        scores: {} // No scoring in County Game
      },
      timestamp: Date.now()
    });
  }

  async handlePlayerDisconnect(playerId: string) {
    // Player removal is already handled by base class
    // Handle game-specific logic for County Game
    
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
      timeLimit: this.gameState.timeLimit,
      announcementIndex: this.gameState.announcementIndex,
      playerOrder: this.gameState.playerOrder
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
  }
}

// Export for Durable Object binding
export default CountyGameSession;