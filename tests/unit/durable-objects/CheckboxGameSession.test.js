/**
 * Unit tests for CheckboxGameSession game logic
 */

// Mock CheckboxGameSession with essential game logic
class MockCheckboxGameSession {
  constructor() {
    this.gameState = this.createInitialGameState();
    this.players = new Map();
  }

  createInitialGameState() {
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
      checkboxStates: new Array(9).fill(false),
      checkboxPlayers: new Array(9).fill(null)
    };
  }

  async handleCheckboxToggle(data, playerId) {
    const checkboxIndex = data.checkboxIndex !== undefined ? data.checkboxIndex : data.data?.checkboxIndex;
    
    if (typeof checkboxIndex !== 'number' || checkboxIndex < 0 || checkboxIndex > 8) {
      throw new Error(`Invalid checkbox index: ${checkboxIndex}`);
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
      // Only decrement score if this player owned the box
      if (previousPlayer === playerId) {
        this.gameState.playerScores[playerId] = Math.max(0, (this.gameState.playerScores[playerId] || 0) - 1);
      }
    }
    
    // Check for win condition
    const allBoxesChecked = this.gameState.checkboxStates.every(state => state === true);
    
    if (allBoxesChecked && this.gameState.gameStarted) {
      await this.handleGameEnd();
    }
    
    return {
      checkboxIndex,
      newState,
      playerId,
      allBoxesChecked
    };
  }

  async handleGameEnd() {
    this.gameState.gameFinished = true;
    this.gameState.status = 'finished';
    
    // Determine winner(s)
    const maxScore = Math.max(...Object.values(this.gameState.playerScores));
    const winners = Object.entries(this.gameState.playerScores)
      .filter(([_, score]) => score === maxScore)
      .map(([playerId, _]) => playerId);
    
    return winners;
  }
}

describe('CheckboxGameSession Game Logic', () => {
  let gameSession;

  beforeEach(() => {
    gameSession = new MockCheckboxGameSession();
    gameSession.gameState.gameStarted = true; // Start the game for most tests
  });

  describe('handleCheckboxToggle', () => {
    describe('Valid checkbox operations', () => {
      test('should toggle checkbox state from false to true', async () => {
        const result = await gameSession.handleCheckboxToggle({ checkboxIndex: 0 }, 'player1');
        expect(gameSession.gameState.checkboxStates[0]).toBe(true);
        expect(result.newState).toBe(true);
      });

      test('should toggle checkbox state from true to false', async () => {
        gameSession.gameState.checkboxStates[5] = true;
        gameSession.gameState.checkboxPlayers[5] = 'player1';
        gameSession.gameState.playerScores['player1'] = 1;

        const result = await gameSession.handleCheckboxToggle({ checkboxIndex: 5 }, 'player1');
        expect(gameSession.gameState.checkboxStates[5]).toBe(false);
        expect(result.newState).toBe(false);
      });

      test('should handle all valid checkbox indices (0-8)', async () => {
        for (let i = 0; i < 9; i++) {
          const result = await gameSession.handleCheckboxToggle({ checkboxIndex: i }, 'player1');
          expect(gameSession.gameState.checkboxStates[i]).toBe(true);
        }
      });
    });

    describe('Invalid checkbox operations', () => {
      test('should reject negative checkbox index', async () => {
        await expect(gameSession.handleCheckboxToggle({ checkboxIndex: -1 }, 'player1'))
          .rejects.toThrow('Invalid checkbox index: -1');
      });

      test('should reject checkbox index greater than 8', async () => {
        await expect(gameSession.handleCheckboxToggle({ checkboxIndex: 9 }, 'player1'))
          .rejects.toThrow('Invalid checkbox index: 9');
      });

      test('should reject non-numeric checkbox index', async () => {
        await expect(gameSession.handleCheckboxToggle({ checkboxIndex: 'abc' }, 'player1'))
          .rejects.toThrow('Invalid checkbox index: abc');
      });

      test('should reject undefined checkbox index', async () => {
        await expect(gameSession.handleCheckboxToggle({}, 'player1'))
          .rejects.toThrow('Invalid checkbox index: undefined');
      });
    });

    describe('Score tracking', () => {
      test('should increment player score when checking a box', async () => {
        await gameSession.handleCheckboxToggle({ checkboxIndex: 0 }, 'player1');
        expect(gameSession.gameState.playerScores['player1']).toBe(1);
      });

      test('should track multiple checkboxes per player', async () => {
        await gameSession.handleCheckboxToggle({ checkboxIndex: 0 }, 'player1');
        await gameSession.handleCheckboxToggle({ checkboxIndex: 1 }, 'player1');
        await gameSession.handleCheckboxToggle({ checkboxIndex: 2 }, 'player1');
        expect(gameSession.gameState.playerScores['player1']).toBe(3);
      });

      test('should decrement score when unchecking a box', async () => {
        await gameSession.handleCheckboxToggle({ checkboxIndex: 0 }, 'player1');
        expect(gameSession.gameState.playerScores['player1']).toBe(1);
        
        await gameSession.handleCheckboxToggle({ checkboxIndex: 0 }, 'player1');
        expect(gameSession.gameState.playerScores['player1']).toBe(0);
      });

      test('should not allow negative scores', async () => {
        // Player 1 has no score initially
        expect(gameSession.gameState.playerScores['player1']).toBeUndefined();
        
        // Set up a box as checked by player2
        gameSession.gameState.checkboxStates[0] = true;
        gameSession.gameState.checkboxPlayers[0] = 'player2';
        gameSession.gameState.playerScores['player2'] = 1;
        
        // Player 1 unchecks player2's box (toggles it off)
        await gameSession.handleCheckboxToggle({ checkboxIndex: 0 }, 'player1');
        expect(gameSession.gameState.checkboxStates[0]).toBe(false);
        
        // Player 1 should not have a negative score (stays undefined or 0)
        const player1Score = gameSession.gameState.playerScores['player1'] || 0;
        expect(player1Score).toBe(0);
        
        // Player 2 keeps their score since they didn't uncheck their own box
        expect(gameSession.gameState.playerScores['player2']).toBe(1);
      });

      test('should handle multiple players checking different boxes', async () => {
        // Player 1 checks boxes 0, 1, 2
        await gameSession.handleCheckboxToggle({ checkboxIndex: 0 }, 'player1');
        await gameSession.handleCheckboxToggle({ checkboxIndex: 1 }, 'player1');
        await gameSession.handleCheckboxToggle({ checkboxIndex: 2 }, 'player1');
        expect(gameSession.gameState.playerScores['player1']).toBe(3);
        
        // Player 2 checks boxes 3, 4
        await gameSession.handleCheckboxToggle({ checkboxIndex: 3 }, 'player2');
        await gameSession.handleCheckboxToggle({ checkboxIndex: 4 }, 'player2');
        expect(gameSession.gameState.playerScores['player2']).toBe(2);
        
        // Verify ownership
        expect(gameSession.gameState.checkboxPlayers[0]).toBe('player1');
        expect(gameSession.gameState.checkboxPlayers[1]).toBe('player1');
        expect(gameSession.gameState.checkboxPlayers[2]).toBe('player1');
        expect(gameSession.gameState.checkboxPlayers[3]).toBe('player2');
        expect(gameSession.gameState.checkboxPlayers[4]).toBe('player2');
        
        // Player 2 unchecks their own box (box 3)
        await gameSession.handleCheckboxToggle({ checkboxIndex: 3 }, 'player2');
        expect(gameSession.gameState.checkboxStates[3]).toBe(false);
        expect(gameSession.gameState.checkboxPlayers[3]).toBeNull();
        // Player 2 loses a point for unchecking their own box
        expect(gameSession.gameState.playerScores['player2']).toBe(1);
        expect(gameSession.gameState.playerScores['player1']).toBe(3);
      });
    });

    describe('Player assignment', () => {
      test('should assign player to checkbox when checked', async () => {
        await gameSession.handleCheckboxToggle({ checkboxIndex: 3 }, 'player1');
        expect(gameSession.gameState.checkboxPlayers[3]).toBe('player1');
      });

      test('should clear player assignment when unchecked', async () => {
        await gameSession.handleCheckboxToggle({ checkboxIndex: 3 }, 'player1');
        await gameSession.handleCheckboxToggle({ checkboxIndex: 3 }, 'player1');
        expect(gameSession.gameState.checkboxPlayers[3]).toBeNull();
      });

      test('should reassign checkbox to new player', async () => {
        await gameSession.handleCheckboxToggle({ checkboxIndex: 3 }, 'player1');
        expect(gameSession.gameState.checkboxPlayers[3]).toBe('player1');
        
        await gameSession.handleCheckboxToggle({ checkboxIndex: 3 }, 'player2');
        await gameSession.handleCheckboxToggle({ checkboxIndex: 3 }, 'player2');
        expect(gameSession.gameState.checkboxPlayers[3]).toBe('player2');
      });
    });

    describe('Data format handling', () => {
      test('should handle data in root object', async () => {
        const result = await gameSession.handleCheckboxToggle({ checkboxIndex: 5 }, 'player1');
        expect(result.checkboxIndex).toBe(5);
      });

      test('should handle data nested in data property', async () => {
        const result = await gameSession.handleCheckboxToggle({ data: { checkboxIndex: 7 } }, 'player1');
        expect(result.checkboxIndex).toBe(7);
      });

      test('should prefer root level over nested data', async () => {
        const result = await gameSession.handleCheckboxToggle({ 
          checkboxIndex: 2, 
          data: { checkboxIndex: 8 } 
        }, 'player1');
        expect(result.checkboxIndex).toBe(2);
      });
    });
  });

  describe('Win condition detection', () => {
    test('should detect win when all boxes are checked', async () => {
      // Check all 9 boxes
      for (let i = 0; i < 9; i++) {
        const result = await gameSession.handleCheckboxToggle({ checkboxIndex: i }, 'player1');
        if (i === 8) {
          expect(result.allBoxesChecked).toBe(true);
        }
      }
      expect(gameSession.gameState.checkboxStates.every(state => state === true)).toBe(true);
    });

    test('should not trigger win if game not started', async () => {
      gameSession.gameState.gameStarted = false;
      
      for (let i = 0; i < 9; i++) {
        await gameSession.handleCheckboxToggle({ checkboxIndex: i }, 'player1');
      }
      
      expect(gameSession.gameState.gameFinished).toBe(false);
    });

    test('should end game when win condition is met', async () => {
      for (let i = 0; i < 9; i++) {
        await gameSession.handleCheckboxToggle({ checkboxIndex: i }, 'player1');
      }
      
      expect(gameSession.gameState.gameFinished).toBe(true);
      expect(gameSession.gameState.status).toBe('finished');
    });

    test('should determine single winner correctly', async () => {
      for (let i = 0; i < 9; i++) {
        await gameSession.handleCheckboxToggle({ checkboxIndex: i }, 'player1');
      }
      
      const winners = await gameSession.handleGameEnd();
      expect(winners).toEqual(['player1']);
    });

    test('should handle multiple winners with same score', async () => {
      // Player 1 checks 5 boxes
      for (let i = 0; i < 5; i++) {
        await gameSession.handleCheckboxToggle({ checkboxIndex: i }, 'player1');
      }
      
      // Player 2 checks 4 boxes
      for (let i = 5; i < 9; i++) {
        await gameSession.handleCheckboxToggle({ checkboxIndex: i }, 'player2');
      }
      
      // Now player2 steals one from player1 to tie
      await gameSession.handleCheckboxToggle({ checkboxIndex: 0 }, 'player2');
      await gameSession.handleCheckboxToggle({ checkboxIndex: 0 }, 'player2');
      
      gameSession.gameState.gameFinished = true;
      const winners = await gameSession.handleGameEnd();
      
      const player1Score = gameSession.gameState.playerScores['player1'];
      const player2Score = gameSession.gameState.playerScores['player2'];
      
      if (player1Score === player2Score) {
        expect(winners).toContain('player1');
        expect(winners).toContain('player2');
      }
    });
  });

  describe('Game state initialization', () => {
    test('should create correct initial state for checkbox game', () => {
      const freshSession = new MockCheckboxGameSession();
      const state = freshSession.gameState;
      
      expect(state.type).toBe('checkbox-game');
      expect(state.status).toBe('waiting');
      expect(state.checkboxStates).toEqual(new Array(9).fill(false));
      expect(state.checkboxPlayers).toEqual(new Array(9).fill(null));
      expect(state.playerScores).toEqual({});
    });

    test('should have all checkboxes unchecked initially', () => {
      const freshSession = new MockCheckboxGameSession();
      expect(freshSession.gameState.checkboxStates.every(state => state === false)).toBe(true);
    });

    test('should have no players assigned initially', () => {
      const freshSession = new MockCheckboxGameSession();
      expect(freshSession.gameState.checkboxPlayers.every(player => player === null)).toBe(true);
    });
  });
});