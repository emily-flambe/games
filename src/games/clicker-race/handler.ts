/**
 * Clicker Race Handler
 *
 * A simple race game where players click to increment their counter.
 * First player to reach the target score wins.
 */

import { GameHandler, GameContext } from '../types';

const TARGET_SCORE = 10;

/**
 * Clicker-specific game state fields.
 */
interface ClickerState {
  playerClicks: Record<string, number>;
  targetScore: number;
}

export const handler: GameHandler = {
  /**
   * Create the initial clicker-specific state.
   */
  createInitialState(): ClickerState {
    return {
      playerClicks: {},
      targetScore: TARGET_SCORE,
    };
  },

  /**
   * Handle game start.
   */
  async onStart(ctx: GameContext): Promise<void> {
    ctx.gameState.status = 'started';
    ctx.gameState.gameStarted = true;

    // Initialize all players with 0 clicks
    for (const [playerId] of ctx.players) {
      ctx.gameState.playerClicks[playerId] = 0;
    }

    await ctx.saveState();
    ctx.updateRegistryStatus('in-progress');

    ctx.broadcast({
      type: 'game_started',
      data: {
        gameType: ctx.gameState.type,
        gameState: ctx.gameState,
        targetScore: TARGET_SCORE,
      },
      timestamp: Date.now(),
    });
  },

  /**
   * Handle game-specific messages.
   */
  async onMessage(ctx: GameContext, message: any): Promise<void> {
    switch (message.type) {
      case 'click':
      case 'CLICK':
        if (ctx.players.has(ctx.playerId) && !ctx.isSpectator) {
          await handleClick(ctx);
        } else if (ctx.isSpectator) {
          ctx.sendTo(ctx.ws, {
            type: 'error',
            message: 'Spectators cannot interact with the game',
            timestamp: Date.now(),
          });
        }
        break;
    }
  },
};

/**
 * Handle a click action.
 */
async function handleClick(ctx: GameContext): Promise<void> {
  const gameState = ctx.gameState;
  const playerId = ctx.playerId;

  // Don't allow clicks if game already finished
  if (gameState.gameFinished) {
    return;
  }

  // Increment click count
  gameState.playerClicks[playerId] = (gameState.playerClicks[playerId] || 0) + 1;
  const newCount = gameState.playerClicks[playerId];

  // Check for win condition
  if (newCount >= TARGET_SCORE) {
    await handleGameEnd(ctx, playerId);
  } else {
    await ctx.saveState();
    ctx.broadcast({
      type: 'click_registered',
      data: {
        playerId: playerId,
        clickCount: newCount,
        playerClicks: gameState.playerClicks,
      },
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle game end when a player reaches the target.
 */
async function handleGameEnd(ctx: GameContext, winnerId: string): Promise<void> {
  const gameState = ctx.gameState;

  gameState.gameStarted = false;
  gameState.gameFinished = true;
  gameState.status = 'finished';

  await ctx.saveState();

  const winner = ctx.players.get(winnerId);
  const winnerName = winner ? winner.name : 'Unknown';

  ctx.updateRegistryStatus('finished');

  ctx.broadcast({
    type: 'game_ended',
    data: {
      message: `${winnerName.toUpperCase()} WINS!`,
      winners: [winnerId],
      scores: gameState.playerClicks,
      gameState: gameState,
    },
    timestamp: Date.now(),
  });
}
