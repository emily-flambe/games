/**
 * County Game Handler
 *
 * A silly game where players submit county names and everyone celebrates together.
 * Extracted from CountyGameSession.ts to follow the unified handler pattern.
 */

import { GameHandler, GameContext } from '../types';

// Module-scoped timer for submission phase
let submissionTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * End the submission phase and transition to announcements.
 */
async function endSubmissionPhase(ctx: GameContext): Promise<void> {
  if (ctx.gameState.phase !== 'COUNTY_SUBMISSION') {
    return;
  }

  // Clear timer
  if (submissionTimer) {
    clearTimeout(submissionTimer);
    submissionTimer = null;
  }

  // Transition to announcement phase
  ctx.gameState.phase = 'COUNTY_ANNOUNCEMENT';
  ctx.gameState.announcementIndex = -1;
  ctx.gameState.playerOrder = Object.keys(ctx.gameState.counties);

  // Save state
  await ctx.saveState();

  // Notify all players of phase change
  ctx.broadcast({
    type: 'phase_changed',
    phase: 'COUNTY_ANNOUNCEMENT',
    data: {
      totalPlayers: ctx.gameState.playerOrder.length
    }
  });
}

/**
 * Announce the current player's county submission.
 */
function announceCurrentPlayer(ctx: GameContext): void {
  const playerId = ctx.gameState.playerOrder[ctx.gameState.announcementIndex];
  const player = ctx.gameState.players[playerId];
  const county = ctx.gameState.counties[playerId];

  ctx.broadcast({
    type: 'player_announcement',
    data: {
      playerNumber: ctx.gameState.announcementIndex + 1,
      playerName: player ? player.name : 'Unknown',
      playerEmoji: player ? player.emoji : '👤',
      county: county,
      isLast: ctx.gameState.announcementIndex === ctx.gameState.playerOrder.length - 1
    }
  });
}

/**
 * Handle a county submission from a player.
 */
async function handleCountySubmission(ctx: GameContext, county: string): Promise<void> {
  // Validate phase
  if (ctx.gameState.phase !== 'COUNTY_SUBMISSION') {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Not in submission phase'
    });
    return;
  }

  // Check if player already submitted
  if (ctx.gameState.counties[ctx.playerId]) {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'County already submitted'
    });
    return;
  }

  // Validate county input
  if (!county || county.trim().length === 0) {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'County name cannot be empty'
    });
    return;
  }

  // Store county submission
  ctx.gameState.counties[ctx.playerId] = county.trim();

  // Notify player of successful submission
  ctx.sendTo(ctx.ws, {
    type: 'county_submitted',
    county: county.trim()
  });

  // Notify all players of submission count
  const submittedCount = Object.keys(ctx.gameState.counties).length;
  const totalPlayers = Object.keys(ctx.gameState.players).length;

  ctx.broadcast({
    type: 'submission_update',
    submittedCount,
    totalPlayers
  });

  // Check if all players have submitted
  if (submittedCount === totalPlayers) {
    // End phase early
    await endSubmissionPhase(ctx);
  }
}

/**
 * Handle begin announcements (host only).
 */
async function handleBeginAnnouncements(ctx: GameContext): Promise<void> {
  // Only host can begin announcements
  if (ctx.hostId !== ctx.playerId) {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Only host can control announcements'
    });
    return;
  }

  // Validate phase
  if (ctx.gameState.phase !== 'COUNTY_ANNOUNCEMENT') {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Not in announcement phase'
    });
    return;
  }

  // Begin with first player
  ctx.gameState.announcementIndex = 0;
  announceCurrentPlayer(ctx);
}

/**
 * Handle next announcement (host only).
 */
async function handleNextAnnouncement(ctx: GameContext): Promise<void> {
  // Only host can control announcements
  if (ctx.hostId !== ctx.playerId) {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Only host can control announcements'
    });
    return;
  }

  // Validate phase
  if (ctx.gameState.phase !== 'COUNTY_ANNOUNCEMENT') {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Not in announcement phase'
    });
    return;
  }

  // Move to next player
  ctx.gameState.announcementIndex++;

  if (ctx.gameState.announcementIndex < ctx.gameState.playerOrder.length) {
    announceCurrentPlayer(ctx);
  } else {
    // All players announced, show conclude button
    ctx.broadcast({
      type: 'all_announced',
      data: {
        canConclude: true
      }
    });
  }
}

/**
 * Handle conclude announcements and end the game (host only).
 */
async function handleConcludeAnnouncements(ctx: GameContext): Promise<void> {
  // Only host can conclude announcements
  if (ctx.hostId !== ctx.playerId) {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Only host can conclude announcements'
    });
    return;
  }

  // Validate phase
  if (ctx.gameState.phase !== 'COUNTY_ANNOUNCEMENT') {
    ctx.sendTo(ctx.ws, {
      type: 'error',
      message: 'Not in announcement phase'
    });
    return;
  }

  // End the game
  ctx.gameState.phase = 'GAME_OVER';
  ctx.gameState.gameFinished = true;
  ctx.gameState.status = 'finished';

  // Update registry status
  await ctx.saveState();
  ctx.updateRegistryStatus('finished');

  // Send game_ended message using standard framework
  ctx.broadcast({
    type: 'game_ended',
    data: {
      message: 'Yaaaay',
      winners: Object.keys(ctx.gameState.players), // Everyone wins
      scores: {} // No scoring in County Game
    },
    timestamp: Date.now()
  });
}

export const handler: GameHandler = {
  createInitialState(): Record<string, any> {
    return {
      phase: 'WAITING',
      counties: {},
      submissionEndTime: null,
      timeLimit: 30,
      announcementIndex: -1,
      playerOrder: []
    };
  },

  async onStart(ctx: GameContext): Promise<void> {
    if (ctx.gameState.phase !== 'WAITING' || ctx.gameState.gameStarted) {
      return;
    }

    // Start the game
    ctx.gameState.gameStarted = true;
    ctx.gameState.status = 'started';
    ctx.gameState.phase = 'COUNTY_SUBMISSION';
    ctx.gameState.counties = {};
    ctx.gameState.submissionEndTime = Date.now() + (ctx.gameState.timeLimit * 1000);

    // Save state and update registry
    await ctx.saveState();
    ctx.updateRegistryStatus('in-progress');

    // Notify all players
    ctx.broadcast({
      type: 'game_started',
      data: {
        gameType: ctx.gameState.type,
        gameState: ctx.gameState,
        gameSpecificState: {
          phase: ctx.gameState.phase,
          counties: ctx.gameState.counties,
          submissionEndTime: ctx.gameState.submissionEndTime,
          timeLimit: ctx.gameState.timeLimit,
          announcementIndex: ctx.gameState.announcementIndex,
          playerOrder: ctx.gameState.playerOrder
        },
        phase: ctx.gameState.phase
      },
      timestamp: Date.now()
    });

    ctx.broadcast({
      type: 'phase_changed',
      phase: 'COUNTY_SUBMISSION'
    });

    ctx.broadcast({
      type: 'county_submission_started',
      timeLimit: ctx.gameState.timeLimit,
      endTime: ctx.gameState.submissionEndTime
    });

    // Set timer to end submission phase
    // Note: We capture the context values needed for the timer callback
    const timerCtx = ctx;
    submissionTimer = setTimeout(() => {
      endSubmissionPhase(timerCtx);
    }, ctx.gameState.timeLimit * 1000);
  },

  async onMessage(ctx: GameContext, message: any): Promise<void> {
    switch (message.type) {
      case 'submit_county':
        await handleCountySubmission(ctx, message.county);
        break;
      case 'begin_announcements':
        await handleBeginAnnouncements(ctx);
        break;
      case 'next_announcement':
        await handleNextAnnouncement(ctx);
        break;
      case 'conclude_announcements':
        await handleConcludeAnnouncements(ctx);
        break;
    }
  },

  async onPlayerDisconnect(ctx: GameContext, playerId: string): Promise<void> {
    // If in submission phase and all remaining players have submitted, end phase
    if (ctx.gameState.phase === 'COUNTY_SUBMISSION') {
      const remainingPlayers = Object.keys(ctx.gameState.players).length;
      const submittedCount = Object.keys(ctx.gameState.counties).length;

      if (remainingPlayers > 0 && submittedCount >= remainingPlayers) {
        await endSubmissionPhase(ctx);
      }
    }
  },

  cleanup(): void {
    if (submissionTimer) {
      clearTimeout(submissionTimer);
      submissionTimer = null;
    }
  }
};
