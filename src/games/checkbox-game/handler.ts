/**
 * Checkbox Game Handler
 *
 * A 3x3 grid of checkboxes where players collaborate to check all boxes.
 * Players earn points for checking boxes, and the player with the most
 * checked boxes wins when all 9 are checked.
 */

import { GameHandler, GameContext } from '../types';

/**
 * Checkbox-specific game state fields.
 */
interface CheckboxState {
  checkboxStates: boolean[];
  checkboxPlayers: (string | null)[];
  playerScores: Record<string, number>;
}

export const handler: GameHandler = {
  /**
   * Create the initial checkbox-specific state.
   * Returns only the checkbox-specific fields to be merged with base state.
   */
  createInitialState(): CheckboxState {
    return {
      checkboxStates: new Array(9).fill(false),
      checkboxPlayers: new Array(9).fill(null),
      playerScores: {},
    };
  },

  /**
   * Handle game start.
   * Uses the default behavior: set status and broadcast gameStarted.
   */
  async onStart(ctx: GameContext): Promise<void> {
    ctx.gameState.status = 'started';
    ctx.gameState.gameStarted = true;

    await ctx.saveState();
    ctx.updateRegistryStatus('in-progress');

    ctx.broadcast({
      type: 'game_started',
      data: {
        gameType: ctx.gameState.type,
        gameState: ctx.gameState,
      },
      timestamp: Date.now(),
    });
  },

  /**
   * Handle game-specific messages.
   */
  async onMessage(ctx: GameContext, message: any): Promise<void> {
    switch (message.type) {
      case 'toggle_checkbox':
      case 'TOGGLE_CHECKBOX':
        if (ctx.players.has(ctx.playerId) && !ctx.isSpectator) {
          await handleCheckboxToggle(ctx, message);
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
 * Handle a checkbox toggle action.
 */
async function handleCheckboxToggle(ctx: GameContext, data: any): Promise<void> {
  const checkboxIndex =
    data.checkboxIndex !== undefined ? data.checkboxIndex : data.data?.checkboxIndex;

  if (typeof checkboxIndex !== 'number' || checkboxIndex < 0 || checkboxIndex > 8) {
    console.error('Invalid checkbox index:', checkboxIndex);
    return;
  }

  const gameState = ctx.gameState;
  const playerId = ctx.playerId;

  const newState = !gameState.checkboxStates[checkboxIndex];
  gameState.checkboxStates[checkboxIndex] = newState;

  const previousPlayer = gameState.checkboxPlayers[checkboxIndex];

  if (newState) {
    // Player checked the box
    gameState.checkboxPlayers[checkboxIndex] = playerId;
    gameState.playerScores[playerId] = (gameState.playerScores[playerId] || 0) + 1;

    // If another player had this box checked, decrement their score
    if (previousPlayer && previousPlayer !== playerId) {
      gameState.playerScores[previousPlayer] = Math.max(
        0,
        (gameState.playerScores[previousPlayer] || 0) - 1
      );
    }
  } else {
    // Player unchecked the box
    gameState.checkboxPlayers[checkboxIndex] = null;
    gameState.playerScores[playerId] = Math.max(
      0,
      (gameState.playerScores[playerId] || 0) - 1
    );
  }

  // Check for win condition
  const allBoxesChecked = gameState.checkboxStates.every((state: boolean) => state === true);

  if (allBoxesChecked && gameState.gameStarted) {
    await handleGameEnd(ctx);
  } else {
    ctx.broadcast({
      type: 'checkbox_toggled',
      data: {
        checkboxIndex: checkboxIndex,
        newState: gameState.checkboxStates[checkboxIndex],
        playerId: playerId,
        playerScores: gameState.playerScores,
        gameState: gameState,
      },
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle game end when all checkboxes are checked.
 */
async function handleGameEnd(ctx: GameContext): Promise<void> {
  const gameState = ctx.gameState;

  gameState.gameStarted = false;
  gameState.gameFinished = true;
  gameState.status = 'finished';

  await ctx.saveState();

  const scores = gameState.playerScores;
  const maxScore = Math.max(...Object.values(scores) as number[]);
  const winners = Object.keys(scores).filter((playerId) => scores[playerId] === maxScore);

  let resultMessage: string;
  if (winners.length > 1) {
    resultMessage = 'EVERYONE LOSES';
  } else {
    const winnerId = winners[0];
    const winner = ctx.players.get(winnerId);
    const winnerName = winner ? winner.name : 'Unknown';
    resultMessage = `${winnerName.toUpperCase()} WINS!`;
  }

  ctx.updateRegistryStatus('finished');

  ctx.broadcast({
    type: 'game_ended',
    data: {
      message: resultMessage,
      winners: winners,
      scores: scores,
      gameState: gameState,
    },
    timestamp: Date.now(),
  });
}
