/**
 * Everybody Votes Game Handler
 *
 * Multi-round voting game where players vote on questions,
 * predict the majority vote, and score points for correct predictions.
 */

import { GameHandler, GameContext } from '../types';

// ============================================================================
// Types
// ============================================================================

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
  predictions?: Record<string, string>;
  correctPredictions?: string[];
}

interface PlayerScore {
  playerId: string;
  playerName: string;
  correctPredictions: number;
  totalRounds: number;
}

export interface EverybodyVotesGameState {
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
  currentRound: number;
  totalRounds: number;
  questions: Question[];
  roundResults: RoundResult[];
  finalScores: PlayerScore[];

  // Current round state
  question: string;
  options: string[];
  votes: Record<string, string>;
  predictions: Record<string, string>;
  votingEndTime: number | null;
  results?: Record<string, number> & {
    totalVotes: number;
    winner: string;
  };
}

// ============================================================================
// Module-scoped timer (for cleanup)
// ============================================================================

let votingTimer: ReturnType<typeof setTimeout> | null = null;

// ============================================================================
// Helper Functions
// ============================================================================

function getGameState(ctx: GameContext): EverybodyVotesGameState {
  return ctx.gameState as EverybodyVotesGameState;
}

async function startPredictionPhase(ctx: GameContext): Promise<void> {
  const gameState = getGameState(ctx);

  gameState.phase = 'PREDICTING';
  gameState.predictions = {};

  await ctx.saveState();

  ctx.broadcast({
    type: 'prediction_phase',
    data: {
      phase: 'PREDICTING',
      question: gameState.question,
      options: gameState.options,
      currentRound: gameState.currentRound,
      totalRounds: gameState.totalRounds,
    },
    timestamp: Date.now(),
  });
}

async function showRoundResults(ctx: GameContext): Promise<void> {
  const gameState = getGameState(ctx);

  // Calculate voting results
  const votes = Object.values(gameState.votes);
  const results: Record<string, number> = {};

  // Initialize all options with 0 votes
  gameState.options.forEach((option) => {
    results[option] = 0;
  });

  // Count votes for each option
  votes.forEach((vote) => {
    results[vote]++;
  });

  const totalVotes = votes.length;

  // Determine winner
  let winner = '';
  let maxVotes = 0;
  let isTie = false;

  gameState.options.forEach((option) => {
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
  Object.entries(gameState.predictions).forEach(([playerId, prediction]) => {
    if (prediction === winner) {
      correctPredictions.push(playerId);
    }
  });

  // Store round result
  const roundResult: RoundResult = {
    roundNumber: gameState.currentRound,
    question: gameState.question,
    votes: { ...gameState.votes },
    results: Object.assign(results, {
      totalVotes: totalVotes,
      winner: winner,
    }),
    predictions: { ...gameState.predictions },
    correctPredictions: correctPredictions,
  };

  gameState.roundResults.push(roundResult);
  gameState.results = roundResult.results;
  gameState.phase = 'RESULTS';

  // Send round results
  ctx.broadcast({
    type: 'round_results',
    data: {
      roundNumber: gameState.currentRound,
      question: gameState.question,
      results: roundResult.results,
      predictions: gameState.predictions,
      correctPredictions: correctPredictions,
      currentRound: gameState.currentRound,
      totalRounds: gameState.totalRounds,
      gameState: gameState,
      hostId: gameState.hostId,
    },
    timestamp: Date.now(),
  });

  await ctx.saveState();

  // Check if this was the final round
  if (gameState.currentRound >= gameState.totalRounds) {
    await calculateFinalScores(ctx);
  }
  // Otherwise stay in RESULTS phase, host will click "Next Question" to advance
}

async function advanceToNextRound(ctx: GameContext): Promise<void> {
  const gameState = getGameState(ctx);

  // Increment round
  gameState.currentRound++;

  // Check if we've exceeded total rounds
  if (gameState.currentRound > gameState.totalRounds) {
    await calculateFinalScores(ctx);
    return;
  }

  // Set up next round
  const nextQuestion = gameState.questions[gameState.currentRound - 1];
  gameState.question = nextQuestion.text;
  gameState.options = nextQuestion.options;
  gameState.votes = {};
  gameState.predictions = {};
  gameState.phase = 'VOTING';
  gameState.results = undefined;

  await ctx.saveState();

  // Send new round message
  ctx.broadcast({
    type: 'new_round',
    data: {
      phase: 'VOTING',
      question: gameState.question,
      options: gameState.options,
      currentRound: gameState.currentRound,
      totalRounds: gameState.totalRounds,
      gameState: gameState,
      hostId: gameState.hostId,
    },
    timestamp: Date.now(),
  });
}

async function calculateFinalScores(ctx: GameContext): Promise<void> {
  const gameState = getGameState(ctx);

  // Calculate scores for each player
  const playerScores: PlayerScore[] = [];

  Object.entries(gameState.players).forEach(([playerId, playerData]) => {
    let correctPredictions = 0;

    // Count correct predictions across all rounds
    gameState.roundResults.forEach((roundResult) => {
      if (roundResult.correctPredictions?.includes(playerId)) {
        correctPredictions++;
      }
    });

    playerScores.push({
      playerId: playerId,
      playerName: playerData.name || `Player ${playerId}`,
      correctPredictions: correctPredictions,
      totalRounds: gameState.totalRounds,
    });
  });

  // Sort by correct predictions (descending)
  playerScores.sort((a, b) => b.correctPredictions - a.correctPredictions);

  gameState.finalScores = playerScores;
  gameState.phase = 'ENDED';
  gameState.status = 'finished';
  gameState.gameFinished = true;

  await ctx.saveState();
  ctx.updateRegistryStatus('finished');

  // Determine the result message
  let resultMessage = 'Game Complete!';
  const topScore = playerScores[0]?.correctPredictions || 0;
  const winners = playerScores.filter((p) => p.correctPredictions === topScore);

  if (winners.length === 1) {
    resultMessage = `${winners[0].playerName} Wins!`;
  } else if (winners.length > 1) {
    resultMessage = "It's a Tie!";
  }

  // Convert playerScores to the format GameShell expects
  const scoresObject: Record<string, number> = {};
  playerScores.forEach((score) => {
    scoresObject[score.playerId] = score.correctPredictions;
  });

  // Send game_ended message for GameShell to handle
  ctx.broadcast({
    type: 'game_ended',
    data: {
      message: resultMessage,
      scores: scoresObject,
      finalScores: playerScores,
      roundResults: gameState.roundResults,
      totalRounds: gameState.totalRounds,
      gameState: gameState,
    },
    timestamp: Date.now(),
  });
}

// ============================================================================
// Message Handlers
// ============================================================================

async function handleVote(ctx: GameContext, data: any): Promise<void> {
  const gameState = getGameState(ctx);

  // Must be in voting phase
  if (gameState.phase !== 'VOTING') {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Not in voting phase',
      timestamp: Date.now(),
    });
    return;
  }

  // Validate vote - check both data.vote and data.data.vote
  const vote = data.vote || data.data?.vote;
  if (!gameState.options.includes(vote)) {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Invalid vote option',
      timestamp: Date.now(),
    });
    return;
  }

  // Record the vote
  gameState.votes[ctx.playerId] = vote;

  // Check if all players have voted
  const totalPlayers = Object.keys(gameState.players).length;
  const totalVotes = Object.keys(gameState.votes).length;

  // Transition to prediction phase when all players have voted
  if (totalVotes >= totalPlayers) {
    await startPredictionPhase(ctx);
  }
}

async function handlePrediction(ctx: GameContext, data: any): Promise<void> {
  const gameState = getGameState(ctx);

  // Must be in predicting phase
  if (gameState.phase !== 'PREDICTING') {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Not in prediction phase',
      timestamp: Date.now(),
    });
    return;
  }

  // Validate prediction
  const prediction = data.prediction || data.data?.prediction;
  if (!gameState.options.includes(prediction)) {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Invalid prediction option',
      timestamp: Date.now(),
    });
    return;
  }

  // Record the prediction
  gameState.predictions[ctx.playerId] = prediction;

  // Check if all players have made predictions
  const totalPlayers = Object.keys(gameState.players).length;
  const totalPredictions = Object.keys(gameState.predictions).length;

  // Show round results when all players have predicted
  if (totalPredictions >= totalPlayers) {
    await showRoundResults(ctx);
  }
}

async function handleAdvanceRound(ctx: GameContext): Promise<void> {
  const gameState = getGameState(ctx);

  // Only host can advance rounds
  if (ctx.playerId !== gameState.hostId) {
    return;
  }

  // Can advance from RESULTS phase
  if (gameState.phase !== 'RESULTS') {
    return;
  }

  await advanceToNextRound(ctx);
}

async function handleEndGame(ctx: GameContext): Promise<void> {
  const gameState = getGameState(ctx);

  // Only host can end the game early
  if (ctx.playerId !== gameState.hostId) {
    return;
  }

  // Calculate final scores based on current progress
  await calculateFinalScores(ctx);
}

// ============================================================================
// Handler Export
// ============================================================================

export const handler: GameHandler = {
  createInitialState(): Record<string, any> {
    // Define 3 default questions for multi-round gameplay
    const defaultQuestions: Question[] = [
      { text: 'Pizza or Burgers?', options: ['Pizza', 'Burgers'] },
      { text: 'Coffee or Tea?', options: ['Coffee', 'Tea'] },
      { text: 'Beach or Mountains?', options: ['Beach', 'Mountains'] },
    ];

    return {
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
      votingEndTime: null,
    };
  },

  async onStart(ctx: GameContext): Promise<void> {
    const gameState = getGameState(ctx);

    // Start the game immediately with first round
    gameState.status = 'started';
    gameState.gameStarted = true;
    gameState.phase = 'VOTING';
    gameState.currentRound = 1;
    gameState.votes = {};
    gameState.predictions = {};

    // Set current round question
    const currentQuestion = gameState.questions[gameState.currentRound - 1];
    gameState.question = currentQuestion.text;
    gameState.options = currentQuestion.options;

    await ctx.saveState();
    ctx.updateRegistryStatus('in-progress');

    // Send game started with voting phase immediately
    ctx.broadcast({
      type: 'game_started',
      data: {
        gameType: 'everybody-votes',
        gameState: gameState,
        phase: 'VOTING',
        question: gameState.question,
        options: gameState.options,
        currentRound: gameState.currentRound,
        totalRounds: gameState.totalRounds,
        hostId: gameState.hostId,
      },
      timestamp: Date.now(),
    });
  },

  async onMessage(ctx: GameContext, message: any): Promise<void> {
    switch (message.type) {
      case 'submit_vote':
        await handleVote(ctx, message);
        break;

      case 'submit_prediction':
        await handlePrediction(ctx, message);
        break;

      case 'advance_round':
        await handleAdvanceRound(ctx);
        break;

      case 'round_results':
        // This method can be used for requesting current round results
        // Implementation depends on specific frontend needs
        break;

      case 'final_summary':
        // This method can be used for requesting final summary
        // Implementation depends on specific frontend needs
        break;

      case 'end_game':
        await handleEndGame(ctx);
        break;
    }
  },

  onPlayerDisconnect(ctx: GameContext, playerId: string): Promise<void> {
    const gameState = getGameState(ctx);

    // If no players left and timer is running, clear it
    if (Object.keys(gameState.players).length === 0 && votingTimer) {
      clearTimeout(votingTimer);
      votingTimer = null;
    }

    return Promise.resolve();
  },

  cleanup(): void {
    if (votingTimer) {
      clearTimeout(votingTimer);
      votingTimer = null;
    }
  },
};
