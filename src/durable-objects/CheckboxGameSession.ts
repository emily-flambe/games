/**
 * Checkbox Game Session
 * A 3x3 grid of checkboxes where players collaborate to check all boxes
 */

import { GameSession } from './GameSession';

interface CheckboxGameState {
  type: 'checkbox-game';
  status: 'waiting' | 'started' | 'finished';
  players: Record<string, any>;
  hostId: string | null;
  gameStarted: boolean;
  gameFinished: boolean;
  spectatorCount: number;
  spectators: Record<string, any>;
  playerScores: Record<string, number>;
  
  // Checkbox specific
  checkboxStates: boolean[];
  checkboxPlayers: (string | null)[];
}

export class CheckboxGameSession extends GameSession {
  protected gameState: CheckboxGameState;

  protected createInitialGameState(gameType: string): CheckboxGameState {
    return {
      type: 'checkbox-game',
      status: 'waiting',
      players: {},
      hostId: null,
      gameStarted: false,
      gameFinished: false,
      spectatorCount: 0,
      spectators: {},
      playerScores: {},
      
      // Checkbox specific
      checkboxStates: new Array(9).fill(false),
      checkboxPlayers: new Array(9).fill(null)
    };
  }

  protected async handleGameSpecificMessage(data: any, ws: WebSocket, playerId: string, isSpectator: boolean) {
    switch (data.type) {
      case 'toggle_checkbox':
      case 'TOGGLE_CHECKBOX':
        if (this.players.has(playerId) && !isSpectator) {
          await this.handleCheckboxToggle(data, playerId);
        } else if (isSpectator) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Spectators cannot interact with the game',
            timestamp: Date.now()
          }));
        }
        break;
    }
  }

  private async handleCheckboxToggle(data: any, playerId: string) {
    const checkboxIndex = data.checkboxIndex !== undefined ? data.checkboxIndex : data.data?.checkboxIndex;
    
    if (typeof checkboxIndex !== 'number' || checkboxIndex < 0 || checkboxIndex > 8) {
      console.error('Invalid checkbox index:', checkboxIndex);
      return;
    }
    
    const newState = !this.gameState.checkboxStates[checkboxIndex];
    this.gameState.checkboxStates[checkboxIndex] = newState;
    
    const previousPlayer = this.gameState.checkboxPlayers[checkboxIndex];
    
    if (newState) {
      // Player checked the box
      this.gameState.checkboxPlayers[checkboxIndex] = playerId;
      this.gameState.playerScores[playerId] = (this.gameState.playerScores[playerId] || 0) + 1;
      
      // If another player had this box checked, decrement their score
      if (previousPlayer && previousPlayer !== playerId) {
        this.gameState.playerScores[previousPlayer] = Math.max(0, (this.gameState.playerScores[previousPlayer] || 0) - 1);
      }
    } else {
      // Player unchecked the box
      this.gameState.checkboxPlayers[checkboxIndex] = null;
      this.gameState.playerScores[playerId] = Math.max(0, (this.gameState.playerScores[playerId] || 0) - 1);
    }
    
    const player = this.players.get(playerId);
    console.log(`Player ${player ? player.name : playerId} toggled checkbox ${checkboxIndex} to ${newState}`);
    
    // Check for win condition
    const allBoxesChecked = this.gameState.checkboxStates.every(state => state === true);
    
    if (allBoxesChecked && this.gameState.gameStarted) {
      await this.handleGameEnd();
    } else {
      this.broadcast({
        type: 'checkbox_toggled',
        data: {
          checkboxIndex: checkboxIndex,
          newState: this.gameState.checkboxStates[checkboxIndex],
          playerId: playerId,
          playerScores: this.gameState.playerScores,
          gameState: this.gameState
        },
        timestamp: Date.now()
      });
    }
  }

  private async handleGameEnd() {
    console.log('🏆 Game ended - all checkboxes checked');
    
    this.gameState.gameStarted = false;
    this.gameState.gameFinished = true;
    this.gameState.status = 'finished';
    
    await this.saveGameState();
    
    const scores = this.gameState.playerScores;
    const maxScore = Math.max(...Object.values(scores));
    const winners = Object.keys(scores).filter(playerId => scores[playerId] === maxScore);
    
    let resultMessage;
    if (winners.length > 1) {
      resultMessage = "EVERYONE LOSES";
    } else {
      const winnerId = winners[0];
      const winner = this.players.get(winnerId);
      const winnerName = winner ? winner.name : 'Unknown';
      resultMessage = `${winnerName.toUpperCase()} WINS!`;
    }
    
    console.log('Game result:', resultMessage);
    console.log('Final scores:', scores);
    
    this.updateRegistryStatus('finished');
    
    this.broadcast({
      type: 'game_ended',
      data: {
        message: resultMessage,
        winners: winners,
        scores: scores,
        gameState: this.gameState
      },
      timestamp: Date.now()
    });
  }
}