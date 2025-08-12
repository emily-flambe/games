/**
 * Everybody Votes Game Session
 * Simple MVP: One question, vote, predict, see results
 */

import { GameSession } from './GameSession';

interface Question {
  id: string;
  text: string;
  choiceA: string;
  choiceB: string;
}

interface EverybodyVotesGameState {
  type: 'everybody-votes';
  status: 'waiting' | 'started' | 'finished';
  players: Record<string, any>;
  hostId: string | null;
  gameStarted: boolean;
  gameFinished: boolean;
  spectatorCount: number;
  spectators: Record<string, any>;
  
  // Everybody Votes specific
  phase: 'waiting' | 'voting' | 'prediction' | 'results';
  currentQuestion: Question | null;
  votes: Record<string, 'A' | 'B'>;
  predictions: Record<string, 'A' | 'B'>;
  results?: {
    aVotes: number;
    bVotes: number;
    totalVotes: number;
    aPercentage: number;
    bPercentage: number;
    winner: 'A' | 'B' | 'tie';
  };
}

export class EverybodyVotesGameSession extends GameSession {
  protected gameState: EverybodyVotesGameState;

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
      
      // Everybody Votes specific
      phase: 'waiting',
      currentQuestion: null,
      votes: {},
      predictions: {}
    };
  }

  protected async handleStartGame() {
    console.log(`🗳️ Starting Everybody Votes game`);
    this.gameState.status = 'started';
    this.gameState.gameStarted = true;
    this.gameState.phase = 'voting';
    
    // Simple fixed question for MVP
    this.gameState.currentQuestion = {
      id: 'q1',
      text: 'Which would you rather have for breakfast?',
      choiceA: '🥞 Pancakes',
      choiceB: '🧇 Waffles'
    };
    
    // Clear any previous votes/predictions
    this.gameState.votes = {};
    this.gameState.predictions = {};
    
    await this.saveGameState();
    this.updateRegistryStatus('in-progress');
    
    this.broadcast({
      type: 'game_started',
      data: {
        gameType: 'everybody-votes',
        phase: 'voting',
        question: this.gameState.currentQuestion,
        gameState: this.gameState
      },
      timestamp: Date.now()
    });

    if (this.sessionId) {
      await this.updateRegistry();
    }
  }

  protected async handleGameSpecificMessage(data: any, ws: WebSocket, playerId: string, isSpectator: boolean) {
    switch (data.type) {
      case 'submit_vote':
        await this.handleVote(data, ws, playerId, isSpectator);
        break;
        
      case 'submit_prediction':
        await this.handlePrediction(data, ws, playerId, isSpectator);
        break;
        
      default:
        // Let parent class handle other messages
        break;
    }
  }

  private async handleVote(data: any, ws: WebSocket, playerId: string, isSpectator: boolean) {
    if (isSpectator) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Spectators cannot vote',
        timestamp: Date.now()
      }));
      return;
    }

    if (this.gameState.phase !== 'voting') {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not in voting phase',
        timestamp: Date.now()
      }));
      return;
    }

    const choice = data.data?.choice || data.choice;
    if (choice !== 'A' && choice !== 'B') {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid choice',
        timestamp: Date.now()
      }));
      return;
    }

    // Record the vote
    this.gameState.votes[playerId] = choice;
    console.log(`Player ${playerId} voted for ${choice}`);
    
    // Check if all players have voted
    const totalPlayers = Object.keys(this.gameState.players).length;
    const totalVotes = Object.keys(this.gameState.votes).length;
    
    this.broadcast({
      type: 'vote_submitted',
      data: {
        votesCount: totalVotes,
        totalPlayers: totalPlayers,
        playerId: playerId // Let clients know who voted (not what they voted)
      },
      timestamp: Date.now()
    });
    
    if (totalVotes === totalPlayers) {
      // All players have voted, move to prediction phase
      this.gameState.phase = 'prediction';
      
      this.broadcast({
        type: 'phase_changed',
        data: {
          phase: 'prediction',
          question: this.gameState.currentQuestion,
          gameState: this.gameState
        },
        timestamp: Date.now()
      });
    }
    
    await this.saveGameState();
  }

  private async handlePrediction(data: any, ws: WebSocket, playerId: string, isSpectator: boolean) {
    if (isSpectator) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Spectators cannot predict',
        timestamp: Date.now()
      }));
      return;
    }

    if (this.gameState.phase !== 'prediction') {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not in prediction phase',
        timestamp: Date.now()
      }));
      return;
    }

    const prediction = data.data?.prediction || data.prediction;
    if (prediction !== 'A' && prediction !== 'B') {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid prediction',
        timestamp: Date.now()
      }));
      return;
    }

    // Record the prediction
    this.gameState.predictions[playerId] = prediction;
    console.log(`Player ${playerId} predicted ${prediction} will win`);
    
    // Check if all players have predicted
    const totalPlayers = Object.keys(this.gameState.players).length;
    const totalPredictions = Object.keys(this.gameState.predictions).length;
    
    this.broadcast({
      type: 'prediction_submitted',
      data: {
        predictionsCount: totalPredictions,
        totalPlayers: totalPlayers,
        playerId: playerId
      },
      timestamp: Date.now()
    });
    
    if (totalPredictions === totalPlayers) {
      // All players have predicted, calculate and show results
      await this.calculateAndShowResults();
    }
    
    await this.saveGameState();
  }

  private async calculateAndShowResults() {
    const votes = Object.values(this.gameState.votes);
    const aVotes = votes.filter(v => v === 'A').length;
    const bVotes = votes.filter(v => v === 'B').length;
    const totalVotes = votes.length;
    
    this.gameState.results = {
      aVotes,
      bVotes,
      totalVotes,
      aPercentage: totalVotes > 0 ? Math.round((aVotes / totalVotes) * 100) : 0,
      bPercentage: totalVotes > 0 ? Math.round((bVotes / totalVotes) * 100) : 0,
      winner: aVotes > bVotes ? 'A' : (bVotes > aVotes ? 'B' : 'tie')
    };
    
    this.gameState.phase = 'results';
    this.gameState.gameFinished = true;
    this.gameState.status = 'finished';
    
    console.log(`Results: A=${aVotes} (${this.gameState.results.aPercentage}%), B=${bVotes} (${this.gameState.results.bPercentage}%)`);
    
    // Calculate who got their predictions right
    const correctPredictions: string[] = [];
    for (const [playerId, prediction] of Object.entries(this.gameState.predictions)) {
      if (prediction === this.gameState.results.winner || this.gameState.results.winner === 'tie') {
        correctPredictions.push(playerId);
      }
    }
    
    this.broadcast({
      type: 'game_results',
      data: {
        question: this.gameState.currentQuestion,
        results: this.gameState.results,
        votes: this.gameState.votes,
        predictions: this.gameState.predictions,
        correctPredictions,
        gameState: this.gameState
      },
      timestamp: Date.now()
    });
    
    this.updateRegistryStatus('finished');
    await this.saveGameState();
  }
}