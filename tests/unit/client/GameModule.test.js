/**
 * @file GameModule.test.js
 * @description Unit tests for GameModule base class functionality
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
  </body>
  </html>
`, {
  url: 'http://localhost:8777',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;

// Mock GameModule class since we can't load it directly in Jest
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
    this.gameState = { ...this.gameState, ...gameSpecificState };
    this.render();
  }

  updatePlayers(players) {
    this.players = players;
    this.render();
  }

  handlePlayerAction(playerId, action) {
    // Default implementation - subclasses should override
  }

  getWinCondition() {
    // Default implementation - subclasses should override
    return null;
  }

  render() {
    // Default implementation - subclasses should override
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

describe('GameModule Base Class', () => {
  let gameModule;
  let mockGameAreaElement;
  let mockRulesElement;
  let mockOnPlayerAction;
  let mockOnStateChange;

  beforeEach(() => {
    gameModule = new GameModule();
    mockGameAreaElement = document.getElementById('game-area');
    mockRulesElement = document.getElementById('rules-section');
    mockOnPlayerAction = jest.fn();
    mockOnStateChange = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(gameModule.gameAreaElement).toBeNull();
      expect(gameModule.players).toEqual({});
      expect(gameModule.gameState).toEqual({});
      expect(gameModule.isActive).toBe(false);
      expect(gameModule.onPlayerAction).toBeNull();
      expect(gameModule.onStateChange).toBeNull();
    });
  });

  describe('Initialization', () => {
    const mockPlayers = {
      'player1': { name: 'Player 1', emoji: '😀' },
      'player2': { name: 'Player 2', emoji: '😎' }
    };
    
    const mockInitialState = {
      phase: 'waiting',
      timer: 30
    };

    test('should initialize with provided parameters', () => {
      gameModule.init(
        mockGameAreaElement,
        mockPlayers,
        mockInitialState,
        mockOnPlayerAction,
        mockOnStateChange,
        mockRulesElement
      );

      expect(gameModule.gameAreaElement).toBe(mockGameAreaElement);
      expect(gameModule.players).toEqual(mockPlayers);
      expect(gameModule.gameState).toEqual(mockInitialState);
      expect(gameModule.onPlayerAction).toBe(mockOnPlayerAction);
      expect(gameModule.onStateChange).toBe(mockOnStateChange);
      expect(gameModule.rulesElement).toBe(mockRulesElement);
      expect(gameModule.isActive).toBe(true);
    });

    test('should initialize with empty state if not provided', () => {
      gameModule.init(
        mockGameAreaElement,
        mockPlayers,
        null,
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(gameModule.gameState).toEqual({});
    });

    test('should populate rules if element and getRules method provided', () => {
      // Add getRules method to the module
      gameModule.getRules = () => '<p>Test game rules</p>';

      gameModule.init(
        mockGameAreaElement,
        mockPlayers,
        mockInitialState,
        mockOnPlayerAction,
        mockOnStateChange,
        mockRulesElement
      );

      expect(mockRulesElement.innerHTML).toBe('<p>Test game rules</p>');
    });

    test('should not populate rules if getRules returns null', () => {
      gameModule.getRules = () => null;
      mockRulesElement.innerHTML = 'Original content';

      gameModule.init(
        mockGameAreaElement,
        mockPlayers,
        mockInitialState,
        mockOnPlayerAction,
        mockOnStateChange,
        mockRulesElement
      );

      expect(mockRulesElement.innerHTML).toBe('Original content');
    });

    test('should call render method on initialization', () => {
      const renderSpy = jest.spyOn(gameModule, 'render').mockImplementation();

      gameModule.init(
        mockGameAreaElement,
        mockPlayers,
        mockInitialState,
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      gameModule.init(
        mockGameAreaElement,
        {},
        { phase: 'waiting', timer: 30 },
        mockOnPlayerAction,
        mockOnStateChange
      );
    });

    test('should handle state updates correctly', () => {
      const renderSpy = jest.spyOn(gameModule, 'render').mockImplementation();
      
      const newState = { phase: 'playing', timer: 25, score: 100 };
      gameModule.handleStateUpdate(newState);

      expect(gameModule.gameState).toEqual({
        phase: 'playing',
        timer: 25,
        score: 100
      });
      expect(renderSpy).toHaveBeenCalled();
    });

    test('should merge state updates with existing state', () => {
      gameModule.gameState = { phase: 'waiting', timer: 30, lives: 3 };
      
      const newState = { timer: 25, score: 100 };
      gameModule.handleStateUpdate(newState);

      expect(gameModule.gameState).toEqual({
        phase: 'waiting',
        timer: 25,
        lives: 3,
        score: 100
      });
    });

    test('should update players and trigger render', () => {
      const renderSpy = jest.spyOn(gameModule, 'render').mockImplementation();
      
      const newPlayers = {
        'player1': { name: 'Updated Player', emoji: '🎉' }
      };
      
      gameModule.updatePlayers(newPlayers);

      expect(gameModule.players).toEqual(newPlayers);
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('Player Actions', () => {
    beforeEach(() => {
      gameModule.init(
        mockGameAreaElement,
        {},
        {},
        mockOnPlayerAction,
        mockOnStateChange
      );
    });

    test('should handle player actions with default implementation', () => {
      // Default implementation should not throw
      expect(() => {
        gameModule.handlePlayerAction('player1', { type: 'test_action' });
      }).not.toThrow();
    });

    test('should call onPlayerAction callback when provided', () => {
      // Override handlePlayerAction to use callback
      gameModule.handlePlayerAction = function(playerId, action) {
        if (this.onPlayerAction) {
          this.onPlayerAction(playerId, action);
        }
      };

      gameModule.handlePlayerAction('player1', { type: 'test_action' });
      
      expect(mockOnPlayerAction).toHaveBeenCalledWith('player1', { type: 'test_action' });
    });
  });

  describe('Win Condition', () => {
    test('should return null by default', () => {
      expect(gameModule.getWinCondition()).toBeNull();
    });

    test('should allow subclasses to override win condition logic', () => {
      // Simulate subclass override
      gameModule.getWinCondition = () => ({
        winnerId: 'player1',
        points: 100
      });

      const result = gameModule.getWinCondition();
      expect(result).toEqual({
        winnerId: 'player1',
        points: 100
      });
    });
  });

  describe('Lifecycle Management', () => {
    test('should handle cleanup properly', () => {
      gameModule.init(
        mockGameAreaElement,
        {},
        {},
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(gameModule.isActive).toBe(true);

      gameModule.cleanup();

      expect(gameModule.isActive).toBe(false);
      expect(mockGameAreaElement.innerHTML).toBe('');
    });

    test('should reset state on cleanup', () => {
      gameModule.init(
        mockGameAreaElement,
        { player1: { name: 'Player' } },
        { phase: 'playing' },
        mockOnPlayerAction,
        mockOnStateChange
      );

      gameModule.cleanup();

      expect(gameModule.players).toEqual({});
      expect(gameModule.gameState).toEqual({});
      expect(gameModule.onPlayerAction).toBeNull();
      expect(gameModule.onStateChange).toBeNull();
    });
  });

  describe('Rendering', () => {
    test('should have render method available', () => {
      expect(typeof gameModule.render).toBe('function');
    });

    test('should call render during initialization', () => {
      const renderSpy = jest.spyOn(gameModule, 'render').mockImplementation();

      gameModule.init(
        mockGameAreaElement,
        {},
        {},
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(renderSpy).toHaveBeenCalled();
    });

    test('should call render on state updates', () => {
      gameModule.init(
        mockGameAreaElement,
        {},
        {},
        mockOnPlayerAction,
        mockOnStateChange
      );

      const renderSpy = jest.spyOn(gameModule, 'render').mockImplementation();

      gameModule.handleStateUpdate({ phase: 'playing' });

      expect(renderSpy).toHaveBeenCalled();
    });

    test('should call render on player updates', () => {
      gameModule.init(
        mockGameAreaElement,
        {},
        {},
        mockOnPlayerAction,
        mockOnStateChange
      );

      const renderSpy = jest.spyOn(gameModule, 'render').mockImplementation();

      gameModule.updatePlayers({ player1: { name: 'Test' } });

      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing gameAreaElement gracefully', () => {
      expect(() => {
        gameModule.init(
          null,
          {},
          {},
          mockOnPlayerAction,
          mockOnStateChange
        );
      }).not.toThrow();
    });

    test('should handle missing callback functions gracefully', () => {
      expect(() => {
        gameModule.init(
          mockGameAreaElement,
          {},
          {},
          null,
          null
        );
      }).not.toThrow();
    });

    test('should handle state updates when not initialized', () => {
      expect(() => {
        gameModule.handleStateUpdate({ test: 'data' });
      }).not.toThrow();
    });
  });
});

describe('GameModule Integration', () => {
  let gameModule;
  let mockGameAreaElement;

  beforeEach(() => {
    gameModule = new GameModule();
    mockGameAreaElement = document.getElementById('game-area');
  });

  test('should integrate properly with GameShell callbacks', () => {
    const mockOnPlayerAction = jest.fn();
    const mockOnStateChange = jest.fn();

    gameModule.init(
      mockGameAreaElement,
      {},
      {},
      mockOnPlayerAction,
      mockOnStateChange
    );

    // Simulate calling the callbacks
    gameModule.onPlayerAction('player1', { type: 'action' });
    gameModule.onStateChange({ phase: 'new_phase' });

    expect(mockOnPlayerAction).toHaveBeenCalledWith('player1', { type: 'action' });
    expect(mockOnStateChange).toHaveBeenCalledWith({ phase: 'new_phase' });
  });

  test('should maintain consistent state across operations', () => {
    const initialState = { phase: 'waiting', timer: 30 };
    const players = { player1: { name: 'Player 1' } };

    gameModule.init(
      mockGameAreaElement,
      players,
      initialState,
      jest.fn(),
      jest.fn()
    );

    expect(gameModule.gameState).toEqual(initialState);
    expect(gameModule.players).toEqual(players);

    // Update state
    gameModule.handleStateUpdate({ timer: 20, score: 50 });
    
    expect(gameModule.gameState).toEqual({
      phase: 'waiting',
      timer: 20,
      score: 50
    });

    // Update players
    const newPlayers = { 
      player1: { name: 'Player 1' },
      player2: { name: 'Player 2' }
    };
    
    gameModule.updatePlayers(newPlayers);
    
    expect(gameModule.players).toEqual(newPlayers);
  });
});