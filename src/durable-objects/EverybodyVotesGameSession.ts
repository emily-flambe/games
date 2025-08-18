/**
 * Everybody Votes Game Session - Multi-Round Extension
 * Support multiple rounds of voting with results displayed between each question
 */

import { GameSession } from './GameSession';

interface Question {
  text: string;
  options: string[];
}

interface RoundResult {
  roundNumber: number;
  question: string;
  votes: Record<string, string>;
  results: Record<string, number> & {
    totalVotes: number;
    winner: string;
  };
  predictions?: Record<string, string>; // playerId -> predicted winner
  correctPredictions?: string[]; // playerIds who predicted correctly
}

interface PlayerScore {
  playerId: string;
  playerName: string;
  correctPredictions: number;
  totalRounds: number;
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
  
  // Multi-Round Extension
  phase: 'WAITING' | 'VOTING' | 'PREDICTING' | 'RESULTS' | 'ROUND_TRANSITION' | 'ENDED';
  currentRound: number; // 1-based indexing
  totalRounds: number; // default: 3
  questions: Question[]; // array of all questions
  roundResults: RoundResult[]; // results from completed rounds
  finalScores: PlayerScore[]; // cumulative scores
  
  // Current round state
  question: string;
  options: string[];
  votes: Record<string, string>; // playerId -> option choice
  predictions: Record<string, string>; // playerId -> predicted winner
  votingEndTime: number | null;
  results?: Record<string, number> & {
    totalVotes: number;
    winner: string;
  };
}

export class EverybodyVotesGameSession extends GameSession {
  protected gameState: EverybodyVotesGameState;
  private votingTimer: any = null;

  protected createInitialGameState(gameType: string): EverybodyVotesGameState {
    // Define 3 default questions for multi-round gameplay
    const defaultQuestions: Question[] = [
      { text: "Pizza or Burgers?", options: ["Pizza", "Burgers"] },
      { text: "Coffee or Tea?", options: ["Coffee", "Tea"] },
      { text: "Beach or Mountains?", options: ["Beach", "Mountains"] }
    ];

    return {
      type: 'everybody-votes',
      status: 'waiting',
      players: {},
      hostId: null,
      gameStarted: false,
      gameFinished: false,
      spectatorCount: 0,
      spectators: {},
      
      // Multi-Round Extension
      phase: 'WAITING',
      currentRound: 1,
      totalRounds: 3,
      questions: defaultQuestions,
      roundResults: [],
      finalScores: [],
      
      // Current round state (initialize with first question)
      question: defaultQuestions[0].text,
      options: defaultQuestions[0].options,
      votes: {},
      predictions: {},
      votingEndTime: null
    };
  }

  protected async handleStartGame() {
    
    // Start the game immediately with first round
    this.gameState.status = 'started';
    this.gameState.gameStarted = true;
    this.gameState.phase = 'VOTING';
    this.gameState.currentRound = 1;
    this.gameState.votes = {};
    this.gameState.predictions = {};
    
    // Set current round question
    const currentQuestion = this.gameState.questions[this.gameState.currentRound - 1];
    this.gameState.question = currentQuestion.text;
    this.gameState.options = currentQuestion.options;
    
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
        options: this.gameState.options,
        currentRound: this.gameState.currentRound,
        totalRounds: this.gameState.totalRounds,
        hostId: this.gameState.hostId
      },
      timestamp: Date.now()
    });
    
    // Game starts in voting phase - wait for player votes
  }

  protected async handleGameSpecificMessage(ws: WebSocket, playerId: string, data: any, isSpectator: boolean) {
    switch (data.type) {
      case 'submit_vote':
        await this.handleVote(ws, playerId, data, isSpectator);
        break;
        
      case 'submit_prediction':
        await this.handlePrediction(ws, playerId, data, isSpectator);
        break;
        
      case 'advance_round':
        await this.handleAdvanceRound(playerId);
        break;
        
      case 'round_results':
        await this.handleRoundResults(playerId);
        break;
        
      case 'final_summary':
        await this.handleFinalSummary(playerId);
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
    if (!this.gameState.options.includes(vote)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid vote option',
        timestamp: Date.now()
      }));
      return;
    }

    // Record the vote
    this.gameState.votes[playerId] = vote;
    
    // Check if all players have voted
    const totalPlayers = Object.keys(this.gameState.players).length;
    const totalVotes = Object.keys(this.gameState.votes).length;
    
    
    // Transition to prediction phase when all players have voted
    if (totalVotes >= totalPlayers) {
      await this.startPredictionPhase();
    }
  }

  private async startPredictionPhase() {
    
    this.gameState.phase = 'PREDICTING';
    this.gameState.predictions = {};
    
    await this.saveGameState();
    
    // Send prediction phase message
    this.broadcast({
      type: 'prediction_phase',
      data: {
        phase: 'PREDICTING',
        question: this.gameState.question,
        options: this.gameState.options,
        currentRound: this.gameState.currentRound,
        totalRounds: this.gameState.totalRounds
      },
      timestamp: Date.now()
    });
    
  }

  private async handlePrediction(data: any, ws: WebSocket, playerId: string, isSpectator: boolean) {

    // Must be in predicting phase
    if (this.gameState.phase !== 'PREDICTING') {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not in prediction phase',
        timestamp: Date.now()
      }));
      return;
    }

    // Validate prediction
    const prediction = data.prediction || data.data?.prediction;
    if (!this.gameState.options.includes(prediction)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid prediction option',
        timestamp: Date.now()
      }));
      return;
    }

    // Record the prediction
    this.gameState.predictions[playerId] = prediction;
    
    // Check if all players have made predictions
    const totalPlayers = Object.keys(this.gameState.players).length;
    const totalPredictions = Object.keys(this.gameState.predictions).length;
    
    
    // Show round results when all players have predicted
    if (totalPredictions >= totalPlayers) {
      await this.showRoundResults();
    }
  }

  private async showRoundResults() {
    
    // Calculate voting results
    const votes = Object.values(this.gameState.votes);
    const results: Record<string, number> = {};
    
    // Initialize all options with 0 votes
    this.gameState.options.forEach(option => {
      results[option] = 0;
    });
    
    // Count votes for each option
    votes.forEach(vote => {
      results[vote]++;
    });
    
    const totalVotes = votes.length;
    
    // Determine winner
    let winner = '';
    let maxVotes = 0;
    let isTie = false;
    
    this.gameState.options.forEach(option => {
      if (results[option] > maxVotes) {
        maxVotes = results[option];
        winner = option;
        isTie = false;
      } else if (results[option] === maxVotes && maxVotes > 0) {
        isTie = true;
      }
    });
    
    if (isTie) {
      winner = 'TIE';
    }
    
    // Calculate correct predictions
    const correctPredictions: string[] = [];
    Object.entries(this.gameState.predictions).forEach(([playerId, prediction]) => {
      if (prediction === winner) {
        correctPredictions.push(playerId);
      }
    });
    
    // Store round result
    const roundResult: RoundResult = {
      roundNumber: this.gameState.currentRound,
      question: this.gameState.question,
      votes: { ...this.gameState.votes },
      results: Object.assign(results, {
        totalVotes: totalVotes,
        winner: winner
      }),
      predictions: { ...this.gameState.predictions },
      correctPredictions: correctPredictions
    };
    
    this.gameState.roundResults.push(roundResult);
    this.gameState.results = roundResult.results;
    this.gameState.phase = 'RESULTS';
    
    
    // Send round results
    this.broadcast({
      type: 'round_results',
      data: {
        roundNumber: this.gameState.currentRound,
        question: this.gameState.question,
        results: roundResult.results,
        predictions: this.gameState.predictions,
        correctPredictions: correctPredictions,
        currentRound: this.gameState.currentRound,
        totalRounds: this.gameState.totalRounds,
        gameState: this.gameState,
        hostId: this.gameState.hostId
      },
      timestamp: Date.now()
    });
    
    await this.saveGameState();
    
    // Check if this was the final round
    if (this.gameState.currentRound >= this.gameState.totalRounds) {
      await this.calculateFinalScores();
    } else {
      // Stay in RESULTS phase, host will click "Next Question" to advance
    }
  }

  private async handleAdvanceRound(playerId: string) {
    
    // Only host can advance rounds
    if (playerId !== this.gameState.hostId) {
      return;
    }
    
    // Can advance from RESULTS phase
    if (this.gameState.phase !== 'RESULTS') {
      return;
    }
    
    await this.advanceToNextRound();
  }

  private async advanceToNextRound() {
    
    // Increment round
    this.gameState.currentRound++;
    
    // Check if we've exceeded total rounds
    if (this.gameState.currentRound > this.gameState.totalRounds) {
      await this.calculateFinalScores();
      return;
    }
    
    // Set up next round
    const nextQuestion = this.gameState.questions[this.gameState.currentRound - 1];
    this.gameState.question = nextQuestion.text;
    this.gameState.options = nextQuestion.options;
    this.gameState.votes = {};
    this.gameState.predictions = {};
    this.gameState.phase = 'VOTING';
    this.gameState.results = undefined;
    
    await this.saveGameState();
    
    // Send new round message
    this.broadcast({
      type: 'new_round',
      data: {
        phase: 'VOTING',
        question: this.gameState.question,
        options: this.gameState.options,
        currentRound: this.gameState.currentRound,
        totalRounds: this.gameState.totalRounds,
        gameState: this.gameState,
        hostId: this.gameState.hostId
      },
      timestamp: Date.now()
    });
    
  }

  private async calculateFinalScores() {
    
    // Calculate scores for each player
    const playerScores: PlayerScore[] = [];
    
    Object.entries(this.gameState.players).forEach(([playerId, playerData]) => {
      let correctPredictions = 0;
      
      // Count correct predictions across all rounds
      this.gameState.roundResults.forEach(roundResult => {
        if (roundResult.correctPredictions?.includes(playerId)) {
          correctPredictions++;
        }
      });
      
      playerScores.push({
        playerId: playerId,
        playerName: playerData.name || `Player ${playerId}`,
        correctPredictions: correctPredictions,
        totalRounds: this.gameState.totalRounds
      });
    });
    
    // Sort by correct predictions (descending)
    playerScores.sort((a, b) => b.correctPredictions - a.correctPredictions);
    
    this.gameState.finalScores = playerScores;
    this.gameState.phase = 'ENDED';
    this.gameState.status = 'finished';
    this.gameState.gameFinished = true;
    
    await this.saveGameState();
    this.updateRegistryStatus('finished');
    
    // Determine the result message
    let resultMessage = 'Game Complete!';
    const topScore = playerScores[0]?.correctPredictions || 0;
    const winners = playerScores.filter(p => p.correctPredictions === topScore);
    
    if (winners.length === 1) {
      resultMessage = `${winners[0].playerName} Wins!`;
    } else if (winners.length > 1) {
      resultMessage = 'It\'s a Tie!';
    }
    
    // Convert playerScores to the format GameShell expects
    const scoresObject: Record<string, number> = {};
    playerScores.forEach(score => {
      scoresObject[score.playerId] = score.correctPredictions;
    });
    
    // Send game_ended message for GameShell to handle
    this.broadcast({
      type: 'game_ended',
      data: {
        message: resultMessage,
        scores: scoresObject,
        finalScores: playerScores,
        roundResults: this.gameState.roundResults,
        totalRounds: this.gameState.totalRounds,
        gameState: this.gameState
      },
      timestamp: Date.now()
    });
    
  }

  private async handleRoundResults(playerId: string) {
    // This method can be used for requesting current round results
    // Implementation depends on specific frontend needs
  }

  private async handleFinalSummary(playerId: string) {
    // This method can be used for requesting final summary
    // Implementation depends on specific frontend needs
  }

  private async handleEndGame(playerId: string) {
    
    // Only host can end the game early
    if (playerId !== this.gameState.hostId) {
      return;
    }
    
    // Calculate final scores based on current progress
    await this.calculateFinalScores();
    
  }

  
  // Clean up timer on disconnect
  protected async handleWebSocketClose(ws: WebSocket) {
    // If no players left and timer is running, clear it
    if (Object.keys(this.gameState.players).length === 0 && this.votingTimer) {
      clearTimeout(this.votingTimer);
      this.votingTimer = null;
    }
  }
}