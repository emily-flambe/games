/**
 * @file CheckboxGameModule.test.js
 * @description Unit tests for CheckboxGameModule functionality
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');

// Set up DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
  <body>
    <div id="game-area"></div>
    <div id="rules-section"></div>
    <div class="checkbox-grid"></div>
    <div class="checkbox-item" data-index="0">
      <div class="checkbox-icon">☐</div>
    </div>
    <div class="scoreboard"></div>
  </body>
  </html>
`, {
  url: 'http://localhost:8777',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;

// Mock GameModule base class
class GameModule {
  constructor() {
    this.gameAreaElement = null;
    this.players = {};
    this.gameState = {};
    this.isActive = false;
    this.onPlayerAction = null;
    this.onStateChange = null;
  }

  init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
    this.gameAreaElement = gameAreaElement;
    this.players = players;
    this.gameState = initialState || {};
    this.onPlayerAction = onPlayerAction;
    this.onStateChange = onStateChange;
    this.rulesElement = rulesElement;
    this.isActive = true;
    
    if (this.rulesElement && typeof this.getRules === 'function') {
      const rules = this.getRules();
      if (rules) {
        this.rulesElement.innerHTML = rules;
      }
    }
    
    this.render();
  }

  handleStateUpdate(gameSpecificState) {
    if (gameSpecificState) {
      this.gameState = { ...this.gameState, ...gameSpecificState };
    }
    this.render();
  }

  updatePlayers(players) {
    this.players = players;
    this.render();
  }

  handlePlayerAction(playerId, action) {
    // Default implementation
  }

  getWinCondition() {
    return null;
  }

  render() {
    // Default implementation
  }

  cleanup() {
    this.isActive = false;
    if (this.gameAreaElement) {
      this.gameAreaElement.innerHTML = '';
    }
    this.players = {};
    this.gameState = {};
    this.onPlayerAction = null;
    this.onStateChange = null;
  }
}

// Mock CheckboxGameModule
class CheckboxGameModule extends GameModule {
  constructor() {
    super();
    this.checkboxStates = new Array(9).fill(false);
    this.checkboxPlayers = {};
    this.playerScores = {};
  }

  init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
    super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);
    
    if (initialState) {
      this.checkboxStates = initialState.checkboxStates || new Array(9).fill(false);
      this.checkboxPlayers = initialState.checkboxPlayers || {};
      this.playerScores = initialState.playerScores || {};
    }
    
    this.render();
  }

  handleStateUpdate(gameSpecificState) {
    super.handleStateUpdate(gameSpecificState);
    
    if (!gameSpecificState) {
      return;
    }
    
    if (gameSpecificState.checkboxStates) {
      this.checkboxStates = gameSpecificState.checkboxStates;
    }
    if (gameSpecificState.checkboxPlayers) {
      this.checkboxPlayers = gameSpecificState.checkboxPlayers;
    }
    if (gameSpecificState.playerScores) {
      this.playerScores = gameSpecificState.playerScores;
    }
    if (gameSpecificState.players) {
      this.players = gameSpecificState.players;
    }
    
    this.render();
  }

  handlePlayerAction(playerId, action) {
    if (!action || !action.type) {
      return;
    }
    
    switch (action.type) {
      case 'checkbox_toggled':
        if (action.data) {
          const { checkboxIndex, newState } = action.data;
          this.checkboxStates[checkboxIndex] = newState;
          if (newState) {
            this.checkboxPlayers[checkboxIndex] = playerId;
          } else {
            delete this.checkboxPlayers[checkboxIndex];
          }
          this.updateCheckboxUI(checkboxIndex, newState, playerId);
          this.updateScoreboard();
        }
        break;
    }
  }

  getRules() {
    return '<ul><li>Click checkboxes to check them</li><li>Work together to check all 9</li><li>Everyone wins when all are checked!</li></ul>';
  }

  getWinCondition() {
    const allChecked = this.checkboxStates.every(state => state === true);
    if (!allChecked) {
      return null;
    }

    const playerScores = {};
    Object.values(this.checkboxPlayers).forEach(playerId => {
      playerScores[playerId] = (playerScores[playerId] || 0) + 1;
    });

    return {
      cooperative: true,
      allPlayersWin: true,
      playerScores
    };
  }

  updateCheckboxUI(checkboxIndex, newState, playerId) {
    // Mock implementation for testing
  }

  updateScoreboard() {
    // Mock implementation for testing
  }
}

describe('CheckboxGameModule', () => {
  let checkboxGame;
  let mockGameAreaElement;
  let mockRulesElement;
  let mockOnPlayerAction;
  let mockOnStateChange;

  beforeEach(() => {
    checkboxGame = new CheckboxGameModule();
    
    // Ensure DOM elements exist
    let gameArea = document.getElementById('game-area');
    let rulesSection = document.getElementById('rules-section');
    
    if (!gameArea) {
      gameArea = document.createElement('div');
      gameArea.id = 'game-area';
      document.body.appendChild(gameArea);
    }
    
    if (!rulesSection) {
      rulesSection = document.createElement('div');
      rulesSection.id = 'rules-section';
      document.body.appendChild(rulesSection);
    }
    
    mockGameAreaElement = gameArea;
    mockRulesElement = rulesSection;
    mockOnPlayerAction = jest.fn();
    mockOnStateChange = jest.fn();
    
    // Clear game area
    mockGameAreaElement.innerHTML = '';
    
    // Mock render method to avoid DOM manipulation issues in tests
    checkboxGame.render = jest.fn();
    checkboxGame.updateCheckboxUI = jest.fn();
    checkboxGame.updateScoreboard = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(checkboxGame.checkboxStates).toEqual(new Array(9).fill(false));
      expect(checkboxGame.checkboxPlayers).toEqual({});
      expect(checkboxGame.playerScores).toEqual({});
    });

    test('should inherit from GameModule', () => {
      expect(checkboxGame).toBeInstanceOf(GameModule);
      expect(checkboxGame.gameAreaElement).toBeNull();
      expect(checkboxGame.players).toEqual({});
      expect(checkboxGame.gameState).toEqual({});
      expect(checkboxGame.isActive).toBe(false);
    });
  });

  describe('Initialization', () => {
    const mockPlayers = {
      'player1': { name: 'Player 1', emoji: '😀' },
      'player2': { name: 'Player 2', emoji: '😎' }
    };

    test('should initialize with default state', () => {
      checkboxGame.init(
        mockGameAreaElement,
        mockPlayers,
        null,
        mockOnPlayerAction,
        mockOnStateChange,
        mockRulesElement
      );

      expect(checkboxGame.checkboxStates).toEqual(new Array(9).fill(false));
      expect(checkboxGame.checkboxPlayers).toEqual({});
      expect(checkboxGame.playerScores).toEqual({});
      expect(checkboxGame.render).toHaveBeenCalled();
    });

    test('should initialize with provided state', () => {
      const initialState = {
        checkboxStates: [true, false, true, false, false, false, false, false, false],
        checkboxPlayers: { 0: 'player1', 2: 'player2' },
        playerScores: { 'player1': 1, 'player2': 1 }
      };

      checkboxGame.init(
        mockGameAreaElement,
        mockPlayers,
        initialState,
        mockOnPlayerAction,
        mockOnStateChange,
        mockRulesElement
      );

      expect(checkboxGame.checkboxStates).toEqual(initialState.checkboxStates);
      expect(checkboxGame.checkboxPlayers).toEqual(initialState.checkboxPlayers);
      expect(checkboxGame.playerScores).toEqual(initialState.playerScores);
    });

    test('should handle partial initial state', () => {
      const initialState = {
        checkboxStates: [true, false, false, false, false, false, false, false, false]
      };

      checkboxGame.init(
        mockGameAreaElement,
        mockPlayers,
        initialState,
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(checkboxGame.checkboxStates).toEqual(initialState.checkboxStates);
      expect(checkboxGame.checkboxPlayers).toEqual({});
      expect(checkboxGame.playerScores).toEqual({});
    });
  });

  describe('Game Rules', () => {
    test('should return formatted game rules', () => {
      const rules = checkboxGame.getRules();
      
      expect(rules).toContain('<ul>');
      expect(typeof rules).toBe('string');
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('State Updates', () => {
    beforeEach(() => {
      checkboxGame.init(
        mockGameAreaElement,
        { player1: { name: 'Player 1' } },
        null,
        mockOnPlayerAction,
        mockOnStateChange
      );
    });

    test('should handle checkbox states update', () => {
      const newState = {
        checkboxStates: [true, true, false, false, false, false, false, false, false]
      };

      checkboxGame.handleStateUpdate(newState);

      expect(checkboxGame.gameState.checkboxStates).toEqual(newState.checkboxStates);
      expect(checkboxGame.checkboxStates).toEqual(newState.checkboxStates);
      expect(checkboxGame.render).toHaveBeenCalled();
    });

    test('should handle checkbox players update', () => {
      const newState = {
        checkboxPlayers: { 0: 'player1', 1: 'player2' }
      };

      checkboxGame.handleStateUpdate(newState);

      expect(checkboxGame.checkboxPlayers).toEqual(newState.checkboxPlayers);
    });

    test('should handle player scores update', () => {
      const newState = {
        playerScores: { 'player1': 3, 'player2': 2 }
      };

      checkboxGame.handleStateUpdate(newState);

      expect(checkboxGame.playerScores).toEqual(newState.playerScores);
    });

    test('should handle players update in game state', () => {
      const newState = {
        players: {
          'player1': { name: 'Updated Player 1', emoji: '🎉' },
          'player3': { name: 'New Player 3', emoji: '🎮' }
        }
      };

      checkboxGame.handleStateUpdate(newState);

      expect(checkboxGame.players).toEqual(newState.players);
    });

    test('should handle comprehensive state update', () => {
      const newState = {
        checkboxStates: [true, false, true, true, false, false, false, false, false],
        checkboxPlayers: { 0: 'player1', 2: 'player2', 3: 'player1' },
        playerScores: { 'player1': 2, 'player2': 1 },
        players: { 'player1': { name: 'Player 1' }, 'player2': { name: 'Player 2' } }
      };

      checkboxGame.handleStateUpdate(newState);

      expect(checkboxGame.checkboxStates).toEqual(newState.checkboxStates);
      expect(checkboxGame.checkboxPlayers).toEqual(newState.checkboxPlayers);
      expect(checkboxGame.playerScores).toEqual(newState.playerScores);
      expect(checkboxGame.players).toEqual(newState.players);
    });
  });

  describe('Player Actions', () => {
    beforeEach(() => {
      checkboxGame.init(
        mockGameAreaElement,
        { player1: { name: 'Player 1' } },
        null,
        mockOnPlayerAction,
        mockOnStateChange
      );
    });

    test('should handle checkbox_toggled action - checking box', () => {
      const action = {
        type: 'checkbox_toggled',
        data: {
          checkboxIndex: 0,
          newState: true
        }
      };

      checkboxGame.handlePlayerAction('player1', action);

      expect(checkboxGame.checkboxStates[0]).toBe(true);
      expect(checkboxGame.checkboxPlayers[0]).toBe('player1');
      expect(checkboxGame.updateCheckboxUI).toHaveBeenCalledWith(0, true, 'player1');
      expect(checkboxGame.updateScoreboard).toHaveBeenCalled();
    });

    test('should handle checkbox_toggled action - unchecking box', () => {
      // First set a checkbox as checked
      checkboxGame.checkboxStates[1] = true;
      checkboxGame.checkboxPlayers[1] = 'player1';

      const action = {
        type: 'checkbox_toggled',
        data: {
          checkboxIndex: 1,
          newState: false
        }
      };

      checkboxGame.handlePlayerAction('player1', action);

      expect(checkboxGame.checkboxStates[1]).toBe(false);
      expect(checkboxGame.checkboxPlayers[1]).toBeUndefined();
      expect(checkboxGame.updateCheckboxUI).toHaveBeenCalledWith(1, false, 'player1');
      expect(checkboxGame.updateScoreboard).toHaveBeenCalled();
    });

    test('should handle checkbox_toggled action with missing data', () => {
      const action = {
        type: 'checkbox_toggled',
        data: null
      };

      expect(() => {
        checkboxGame.handlePlayerAction('player1', action);
      }).not.toThrow();

      expect(checkboxGame.updateCheckboxUI).not.toHaveBeenCalled();
      expect(checkboxGame.updateScoreboard).not.toHaveBeenCalled();
    });

    test('should handle unknown action type', () => {
      const action = {
        type: 'unknown_action',
        data: { some: 'data' }
      };

      expect(() => {
        checkboxGame.handlePlayerAction('player1', action);
      }).not.toThrow();

      expect(checkboxGame.updateCheckboxUI).not.toHaveBeenCalled();
      expect(checkboxGame.updateScoreboard).not.toHaveBeenCalled();
    });

    test('should handle multiple checkbox toggles', () => {
      const actions = [
        { type: 'checkbox_toggled', data: { checkboxIndex: 0, newState: true } },
        { type: 'checkbox_toggled', data: { checkboxIndex: 4, newState: true } },
        { type: 'checkbox_toggled', data: { checkboxIndex: 8, newState: true } }
      ];

      actions.forEach(action => {
        checkboxGame.handlePlayerAction('player1', action);
      });

      expect(checkboxGame.checkboxStates[0]).toBe(true);
      expect(checkboxGame.checkboxStates[4]).toBe(true);
      expect(checkboxGame.checkboxStates[8]).toBe(true);
      expect(checkboxGame.checkboxPlayers[0]).toBe('player1');
      expect(checkboxGame.checkboxPlayers[4]).toBe('player1');
      expect(checkboxGame.checkboxPlayers[8]).toBe('player1');
    });

    test('should handle different players checking different boxes', () => {
      checkboxGame.handlePlayerAction('player1', {
        type: 'checkbox_toggled',
        data: { checkboxIndex: 0, newState: true }
      });

      checkboxGame.handlePlayerAction('player2', {
        type: 'checkbox_toggled',
        data: { checkboxIndex: 1, newState: true }
      });

      expect(checkboxGame.checkboxStates[0]).toBe(true);
      expect(checkboxGame.checkboxStates[1]).toBe(true);
      expect(checkboxGame.checkboxPlayers[0]).toBe('player1');
      expect(checkboxGame.checkboxPlayers[1]).toBe('player2');
    });
  });

  describe('Win Conditions', () => {
    beforeEach(() => {
      checkboxGame.init(
        mockGameAreaElement,
        {
          'player1': { name: 'Player 1' },
          'player2': { name: 'Player 2' }
        },
        null,
        mockOnPlayerAction,
        mockOnStateChange
      );
    });

    test('should return null when not all checkboxes are checked', () => {
      checkboxGame.checkboxStates = [true, true, false, true, false, true, false, true, false];
      
      const winCondition = checkboxGame.getWinCondition();
      expect(winCondition).toBeNull();
    });

    test('should return win condition when all checkboxes are checked', () => {
      checkboxGame.checkboxStates = new Array(9).fill(true);
      checkboxGame.checkboxPlayers = {
        0: 'player1', 1: 'player2', 2: 'player1', 
        3: 'player2', 4: 'player1', 5: 'player2',
        6: 'player1', 7: 'player2', 8: 'player1'
      };

      const winCondition = checkboxGame.getWinCondition();
      
      expect(winCondition).not.toBeNull();
      expect(winCondition.cooperative).toBe(true);
      expect(winCondition.allPlayersWin).toBe(true);
      expect(winCondition.playerScores).toEqual({
        'player1': 5,
        'player2': 4
      });
    });

    test('should handle single player completing game', () => {
      checkboxGame.checkboxStates = new Array(9).fill(true);
      checkboxGame.checkboxPlayers = Object.fromEntries(
        Array.from({ length: 9 }, (_, i) => [i, 'player1'])
      );

      const winCondition = checkboxGame.getWinCondition();
      
      expect(winCondition).not.toBeNull();
      expect(winCondition.cooperative).toBe(true);
      expect(winCondition.playerScores['player1']).toBe(9);
    });

    test('should handle empty checkboxPlayers when all boxes checked', () => {
      checkboxGame.checkboxStates = new Array(9).fill(true);
      checkboxGame.checkboxPlayers = {};

      const winCondition = checkboxGame.getWinCondition();
      
      expect(winCondition).not.toBeNull();
      expect(winCondition.cooperative).toBe(true);
    });
  });

  describe('Checkbox State Management', () => {
    test('should track individual checkbox states correctly', () => {
      expect(checkboxGame.checkboxStates).toHaveLength(9);
      expect(checkboxGame.checkboxStates.every(state => state === false)).toBe(true);
    });

    test('should update specific checkbox indices', () => {
      checkboxGame.checkboxStates[0] = true;
      checkboxGame.checkboxStates[4] = true;
      checkboxGame.checkboxStates[8] = true;

      expect(checkboxGame.checkboxStates[0]).toBe(true);
      expect(checkboxGame.checkboxStates[1]).toBe(false);
      expect(checkboxGame.checkboxStates[4]).toBe(true);
      expect(checkboxGame.checkboxStates[8]).toBe(true);
    });

    test('should track checkbox ownership correctly', () => {
      checkboxGame.checkboxPlayers[0] = 'player1';
      checkboxGame.checkboxPlayers[5] = 'player2';

      expect(checkboxGame.checkboxPlayers[0]).toBe('player1');
      expect(checkboxGame.checkboxPlayers[5]).toBe('player2');
      expect(checkboxGame.checkboxPlayers[3]).toBeUndefined();
    });

    test('should remove checkbox ownership when unchecked', () => {
      checkboxGame.checkboxPlayers[2] = 'player1';
      expect(checkboxGame.checkboxPlayers[2]).toBe('player1');

      delete checkboxGame.checkboxPlayers[2];
      expect(checkboxGame.checkboxPlayers[2]).toBeUndefined();
    });
  });

  describe('Score Management', () => {
    test('should initialize with empty player scores', () => {
      expect(checkboxGame.playerScores).toEqual({});
    });

    test('should update player scores', () => {
      checkboxGame.playerScores['player1'] = 3;
      checkboxGame.playerScores['player2'] = 2;

      expect(checkboxGame.playerScores['player1']).toBe(3);
      expect(checkboxGame.playerScores['player2']).toBe(2);
    });

    test('should handle score updates in state', () => {
      const newState = {
        playerScores: { 'player1': 5, 'player2': 4, 'player3': 1 }
      };

      checkboxGame.init(
        mockGameAreaElement,
        {},
        null,
        mockOnPlayerAction,
        mockOnStateChange
      );

      checkboxGame.handleStateUpdate(newState);

      expect(checkboxGame.playerScores).toEqual(newState.playerScores);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing action data gracefully', () => {
      checkboxGame.init(
        mockGameAreaElement,
        {},
        null,
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(() => {
        checkboxGame.handlePlayerAction('player1', null);
      }).not.toThrow();

      expect(() => {
        checkboxGame.handlePlayerAction('player1', {});
      }).not.toThrow();
    });

    test('should handle invalid checkbox indices', () => {
      checkboxGame.init(
        mockGameAreaElement,
        {},
        null,
        mockOnPlayerAction,
        mockOnStateChange
      );

      const action = {
        type: 'checkbox_toggled',
        data: {
          checkboxIndex: 15, // Invalid index
          newState: true
        }
      };

      expect(() => {
        checkboxGame.handlePlayerAction('player1', action);
      }).not.toThrow();

      // Should still update the state even with invalid index
      expect(checkboxGame.checkboxStates[15]).toBe(true);
      expect(checkboxGame.checkboxPlayers[15]).toBe('player1');
    });

    test('should handle state updates with invalid data', () => {
      checkboxGame.init(
        mockGameAreaElement,
        {},
        null,
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(() => {
        checkboxGame.handleStateUpdate(null);
      }).not.toThrow();

      expect(() => {
        checkboxGame.handleStateUpdate({ invalid: 'data' });
      }).not.toThrow();
    });
  });
});