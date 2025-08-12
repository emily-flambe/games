/**
 * Everybody Votes Game Session - MVP
 * Simple: One question (Pizza or Burgers), vote, see results
 */

import { GameSession } from './GameSession';

interface EverybodyVotesGameState {
  type: 'everybody-votes';
  status: 'waiting' | 'started' | 'finished';
  players: Record<string, any>;
  hostId: string | null;
  gameStarted: boolean;
  gameFinished: boolean;
  spectatorCount: number;
  spectators: Record<string, any>;
  
  // Everybody Votes MVP
  phase: 'WAITING' | 'VOTING' | 'RESULTS';
  question: string;
  options: string[];
  votes: Record<string, string>; // playerId -> 'Pizza' or 'Burgers'
  votingEndTime: number | null;
  results?: {
    'Pizza': number;
    'Burgers': number;
    totalVotes: number;
    winner: string; // 'Pizza', 'Burgers', or 'TIE'
  };
}

export class EverybodyVotesGameSession extends GameSession {
  protected gameState: EverybodyVotesGameState;
  private votingTimer: any = null;

  protected createInitialGameState(gameType: string): EverybodyVotesGameState {
    return {
      type: 'everybody-votes',
      status: 'waiting',
      players: {},
      hostId: null,
      gameStarted: false,
      gameFinished: false,
      spectatorCount: 0,
      spectators: {},
      
      // Everybody Votes MVP
      phase: 'WAITING',
      question: 'Pizza or Burgers?',
      options: ['Pizza', 'Burgers'],
      votes: {},
      votingEndTime: null
    };
  }

  protected async handleStartGame() {
    console.log(`🗳️🗳️🗳️ EVERYBODY VOTES GAME STARTING!!! 🗳️🗳️🗳️`);
    
    // Start the game immediately
    this.gameState.status = 'started';
    this.gameState.gameStarted = true;
    this.gameState.phase = 'VOTING';
    this.gameState.votes = {};
    
    await this.saveGameState();
    this.updateRegistryStatus('in-progress');
    
    // Send game started with voting phase immediately
    this.broadcast({
      type: 'game_started',
      data: {
        gameType: 'everybody-votes',
        gameState: this.gameState,
        phase: 'VOTING',
        question: this.gameState.question,
        options: this.gameState.options
      },
      timestamp: Date.now()
    });
    
    // Game starts in voting phase - wait for player votes
    console.log('✅ Everybody Votes game started - waiting for player votes');
    
    if (this.sessionId) {
      await this.updateRegistry();
    }
  }

  protected async handleGameSpecificMessage(data: any, ws: WebSocket, playerId: string, isSpectator: boolean) {
    switch (data.type) {
      case 'submit_vote':
        await this.handleVote(data, ws, playerId, isSpectator);
        break;
        
      case 'end_game':
        await this.handleEndGame(playerId);
        break;
        
      default:
        // Let parent class handle other messages
        break;
    }
  }

  private async handleVote(data: any, ws: WebSocket, playerId: string, isSpectator: boolean) {
    console.log(`📝 Vote received from ${playerId}:`, data);

    // Must be in voting phase
    if (this.gameState.phase !== 'VOTING') {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not in voting phase',
        timestamp: Date.now()
      }));
      return;
    }

    // Validate vote - check both data.vote and data.data.vote
    const vote = data.vote || data.data?.vote;
    if (vote !== 'Pizza' && vote !== 'Burgers') {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid vote option',
        timestamp: Date.now()
      }));
      return;
    }

    // Record the vote
    this.gameState.votes[playerId] = vote;
    console.log(`✅ Player ${playerId} voted for ${vote}`);
    
    // Check if all players have voted
    const totalPlayers = Object.keys(this.gameState.players).length;
    const totalVotes = Object.keys(this.gameState.votes).length;
    
    console.log(`📊 Vote progress: ${totalVotes}/${totalPlayers} players voted`);
    
    // Only show results when all players have voted
    if (totalVotes >= totalPlayers) {
      console.log('🎉 All players have voted - showing results');
      await this.showResults();
    }
  }

  private async handleEndGame(playerId: string) {
    console.log(`🏁 End game requested by ${playerId}`);
    
    // Create scores for all players (everyone gets 1 point)
    const scores: Record<string, number> = {};
    Object.keys(this.gameState.players).forEach(id => {
      scores[id] = 1;
    });
    
    // Send game ended message
    this.broadcast({
      type: 'game_ended',
      data: {
        message: 'Game Complete!',
        scores: scores
      }
    });
    
    // Update game state
    this.gameState.status = 'finished';
    this.gameState.gameFinished = true;
    this.gameState.gameStarted = false;
    
    await this.saveGameState();
    this.updateRegistryStatus('finished');
    
    console.log('✅ Game ended successfully');
  }

  private async showResults() {
    console.log('📊 Showing results immediately...');
    
    // Calculate results
    const votes = Object.values(this.gameState.votes);
    const pizzaVotes = votes.filter(v => v === 'Pizza').length;
    const burgersVotes = votes.filter(v => v === 'Burgers').length;
    const totalVotes = votes.length;
    
    let winner: string;
    if (pizzaVotes > burgersVotes) {
      winner = 'Pizza';
    } else if (burgersVotes > pizzaVotes) {
      winner = 'Burgers';
    } else {
      winner = 'TIE';
    }
    
    this.gameState.results = {
      'Pizza': pizzaVotes,
      'Burgers': burgersVotes,
      totalVotes: totalVotes,
      winner: winner
    };
    
    // Update phase and status
    this.gameState.phase = 'RESULTS';
    this.gameState.gameFinished = true;
    this.gameState.status = 'finished';
    
    console.log(`✅ Results: Pizza=${pizzaVotes}, Burgers=${burgersVotes}, Winner=${winner}`);
    
    // Send results with updated game state
    this.broadcast({
      type: 'game_results',
      question: this.gameState.question,
      results: this.gameState.results,
      totalVotes: totalVotes,
      winner: winner,
      gameState: this.gameState,
      timestamp: Date.now()
    });
    
    // Also send a state update to ensure client receives phase change
    this.broadcast({
      type: 'gameState',
      gameState: this.gameState,
      gameSpecificState: {
        phase: this.gameState.phase,
        results: this.gameState.results
      }
    });
    
    this.updateRegistryStatus('finished');
    await this.saveGameState();
  }
  
  // Clean up timer on disconnect
  async webSocketClose(ws: WebSocket) {
    await super.webSocketClose(ws);
    
    // If no players left and timer is running, clear it
    if (Object.keys(this.gameState.players).length === 0 && this.votingTimer) {
      clearTimeout(this.votingTimer);
      this.votingTimer = null;
    }
  }
}