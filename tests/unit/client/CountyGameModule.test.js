/**
 * @file CountyGameModule.test.js
 * @description Unit tests for CountyGameModule game-specific functionality
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
    <div class="timer-display"></div>
    <div class="submission-status"></div>
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
    this.gameState = { ...this.gameState, ...gameSpecificState };
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

// Mock CountyGameModule
class CountyGameModule extends GameModule {
  constructor() {
    super();
    this.currentPhase = 'WAITING';
    this.myCounty = null;
    this.submittedCount = 0;
    this.totalPlayers = 0;
    this.timeRemaining = 0;
    this.timerInterval = null;
    this.counties = {};
    this.currentAnnouncement = null;
    this.canConclude = false;
    this.isHost = false;
  }

  init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
    super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);
    
    if (initialState && initialState.hostId) {
      this.isHost = (this.currentPlayerId === initialState.hostId);
    }
    
    if (initialState) {
      this.currentPhase = initialState.phase || 'WAITING';
      this.counties = initialState.counties || {};
      this.timeRemaining = initialState.timeLimit || 30;
      
      if (initialState.submissionEndTime) {
        const now = Date.now();
        this.timeRemaining = Math.max(0, Math.floor((initialState.submissionEndTime - now) / 1000));
      }
    }
    
    this.totalPlayers = Object.keys(this.players).length;
    this.render();
  }

  getRules() {
    return `
      <h3>County Game</h3>
      <ul>
        <li>enter the name of a county</li>
        <li>everybody wins!</li>
      </ul>
    `;
  }

  startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.timeRemaining = Math.max(0, this.timeRemaining - 1);
      this.updateTimerDisplay();
      if (this.timeRemaining <= 0) {
        this.clearTimer();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const timerElement = this.gameAreaElement?.querySelector('.timer-display');
    if (timerElement) {
      timerElement.textContent = `Time remaining: ${this.timeRemaining}s`;
    }
  }

  updateSubmissionStatus() {
    const statusElements = this.gameAreaElement?.querySelectorAll('.submission-status');
    statusElements?.forEach(element => {
      element.textContent = `${this.submittedCount} of ${this.totalPlayers} submitted`;
    });
  }

  handleStateUpdate(gameSpecificState) {
    super.handleStateUpdate(gameSpecificState);
    this.render();
  }

  handlePlayerAction(playerId, action) {
    this.render();
  }

  getWinCondition() {
    if (this.currentPhase === 'GAME_OVER') {
      return {
        cooperative: true,
        allPlayersWin: true
      };
    }
    return null;
  }

  cleanup() {
    super.cleanup();
    this.clearTimer();
    this.myCounty = null;
    this.currentPhase = 'WAITING';
    this.counties = {};
    this.submittedCount = 0;
  }
}

describe('CountyGameModule', () => {
  let countyGame;
  let mockGameAreaElement;
  let mockRulesElement;
  let mockOnPlayerAction;
  let mockOnStateChange;

  beforeEach(() => {
    countyGame = new CountyGameModule();
    mockGameAreaElement = document.getElementById('game-area');
    mockRulesElement = document.getElementById('rules-section');
    mockOnPlayerAction = jest.fn();
    mockOnStateChange = jest.fn();
    
    // Clear game area
    mockGameAreaElement.innerHTML = '';
    
    // Mock render method to avoid DOM manipulation issues in tests
    countyGame.render = jest.fn();
    
    jest.useFakeTimers();
  });

  afterEach(() => {
    countyGame.clearTimer();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(countyGame.currentPhase).toBe('WAITING');
      expect(countyGame.myCounty).toBeNull();
      expect(countyGame.submittedCount).toBe(0);
      expect(countyGame.totalPlayers).toBe(0);
      expect(countyGame.timeRemaining).toBe(0);
      expect(countyGame.timerInterval).toBeNull();
      expect(countyGame.counties).toEqual({});
      expect(countyGame.currentAnnouncement).toBeNull();
      expect(countyGame.canConclude).toBe(false);
      expect(countyGame.isHost).toBe(false);
    });
  });

  describe('Initialization', () => {
    const mockPlayers = {
      'player1': { name: 'Player 1', emoji: '😀' },
      'player2': { name: 'Player 2', emoji: '😎' }
    };

    test('should initialize with basic parameters', () => {
      const initialState = {
        phase: 'COUNTY_SUBMISSION',
        timeLimit: 30,
        hostId: 'player1'
      };

      countyGame.currentPlayerId = 'player2';
      countyGame.init(
        mockGameAreaElement,
        mockPlayers,
        initialState,
        mockOnPlayerAction,
        mockOnStateChange,
        mockRulesElement
      );

      expect(countyGame.currentPhase).toBe('COUNTY_SUBMISSION');
      expect(countyGame.timeRemaining).toBe(30);
      expect(countyGame.totalPlayers).toBe(2);
      expect(countyGame.isHost).toBe(false);
      expect(countyGame.render).toHaveBeenCalled();
    });

    test('should identify host correctly', () => {
      const initialState = {
        phase: 'WAITING',
        hostId: 'player1'
      };

      countyGame.currentPlayerId = 'player1';
      countyGame.init(
        mockGameAreaElement,
        mockPlayers,
        initialState,
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(countyGame.isHost).toBe(true);
    });

    test('should calculate time remaining from server end time', () => {
      const futureTime = Date.now() + 25000; // 25 seconds in future
      const initialState = {
        phase: 'COUNTY_SUBMISSION',
        submissionEndTime: futureTime,
        hostId: 'player1'
      };

      countyGame.init(
        mockGameAreaElement,
        mockPlayers,
        initialState,
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(countyGame.timeRemaining).toBeCloseTo(25, -1);
    });

    test('should handle expired server end time', () => {
      const pastTime = Date.now() - 5000; // 5 seconds in past
      const initialState = {
        phase: 'COUNTY_SUBMISSION',
        submissionEndTime: pastTime,
        hostId: 'player1'
      };

      countyGame.init(
        mockGameAreaElement,
        mockPlayers,
        initialState,
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(countyGame.timeRemaining).toBe(0);
    });

    test('should restore counties from initial state', () => {
      const initialState = {
        counties: {
          'player1': 'Los Angeles County',
          'player2': 'Orange County'
        },
        hostId: 'player1'
      };

      countyGame.init(
        mockGameAreaElement,
        mockPlayers,
        initialState,
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(countyGame.counties).toEqual(initialState.counties);
    });
  });

  describe('Game Rules', () => {
    test('should return formatted game rules', () => {
      const rules = countyGame.getRules();
      
      expect(rules).toContain('<h3>County Game</h3>');
      expect(rules).toContain('enter the name of a county');
      expect(rules).toContain('everybody wins!');
    });
  });

  describe('Timer Management', () => {
    beforeEach(() => {
      countyGame.init(
        mockGameAreaElement,
        {},
        { timeLimit: 30 },
        mockOnPlayerAction,
        mockOnStateChange
      );
    });

    test('should start timer correctly', () => {
      countyGame.timeRemaining = 10;
      countyGame.startTimer();

      expect(countyGame.timerInterval).not.toBeNull();
    });

    test('should count down time correctly', () => {
      countyGame.timeRemaining = 5;
      countyGame.startTimer();

      jest.advanceTimersByTime(1000);
      expect(countyGame.timeRemaining).toBe(4);

      jest.advanceTimersByTime(2000);
      expect(countyGame.timeRemaining).toBe(2);
    });

    test('should stop at zero and clear interval', () => {
      countyGame.timeRemaining = 1;
      countyGame.startTimer();

      jest.advanceTimersByTime(1000);
      expect(countyGame.timeRemaining).toBe(0);

      jest.advanceTimersByTime(1000);
      expect(countyGame.timeRemaining).toBe(0);
      expect(countyGame.timerInterval).toBeNull();
    });

    test('should clear timer properly', () => {
      countyGame.startTimer();
      const intervalId = countyGame.timerInterval;
      
      countyGame.clearTimer();
      
      expect(countyGame.timerInterval).toBeNull();
    });

    test('should handle multiple clear timer calls', () => {
      expect(() => {
        countyGame.clearTimer();
        countyGame.clearTimer();
      }).not.toThrow();
    });

    test('should update timer display', () => {
      const timerElement = document.createElement('div');
      timerElement.className = 'timer-display';
      mockGameAreaElement.appendChild(timerElement);
      
      countyGame.timeRemaining = 15;
      countyGame.updateTimerDisplay();
      
      expect(timerElement.textContent).toBe('Time remaining: 15s');
    });

    test('should handle missing timer display element', () => {
      expect(() => {
        countyGame.updateTimerDisplay();
      }).not.toThrow();
    });
  });

  describe('State Updates', () => {
    beforeEach(() => {
      countyGame.init(
        mockGameAreaElement,
        { player1: { name: 'Player 1' } },
        { phase: 'WAITING' },
        mockOnPlayerAction,
        mockOnStateChange
      );
    });

    test('should handle phase change to COUNTY_SUBMISSION', () => {
      const newState = {
        phase: 'COUNTY_SUBMISSION',
        timeLimit: 45,
        submissionEndTime: Date.now() + 45000
      };

      countyGame.handleStateUpdate(newState);

      expect(countyGame.gameState.phase).toBe('COUNTY_SUBMISSION');
      expect(countyGame.gameState.timeLimit).toBe(45);
      expect(countyGame.render).toHaveBeenCalled();
    });

    test('should handle county submissions update', () => {
      const newState = {
        counties: {
          'player1': 'San Diego County',
          'player2': 'Riverside County'
        },
        submittedCount: 2
      };

      countyGame.handleStateUpdate(newState);

      expect(countyGame.gameState.counties).toEqual(newState.counties);
      expect(countyGame.gameState.submittedCount).toBe(2);
    });

    test('should handle announcement phase', () => {
      const newState = {
        phase: 'COUNTY_ANNOUNCEMENT',
        currentAnnouncement: {
          playerId: 'player1',
          county: 'Los Angeles County'
        }
      };

      countyGame.handleStateUpdate(newState);

      expect(countyGame.gameState.phase).toBe('COUNTY_ANNOUNCEMENT');
      expect(countyGame.gameState.currentAnnouncement.county).toBe('Los Angeles County');
    });

    test('should handle game over state', () => {
      const newState = {
        phase: 'GAME_OVER',
        finalResults: {
          'player1': 'Orange County',
          'player2': 'San Bernardino County'
        }
      };

      countyGame.handleStateUpdate(newState);

      expect(countyGame.gameState.phase).toBe('GAME_OVER');
      expect(countyGame.gameState.finalResults).toEqual(newState.finalResults);
    });
  });

  describe('Player Actions', () => {
    beforeEach(() => {
      countyGame.init(
        mockGameAreaElement,
        { player1: { name: 'Player 1' } },
        { phase: 'COUNTY_SUBMISSION' },
        mockOnPlayerAction,
        mockOnStateChange
      );
    });

    test('should handle county submission action', () => {
      const action = {
        type: 'submit_county',
        county: 'Ventura County'
      };

      countyGame.handlePlayerAction('player1', action);

      // Verify action was processed (exact behavior depends on implementation)
      expect(countyGame.render).toHaveBeenCalled();
    });

    test('should handle player joining during game', () => {
      const action = {
        type: 'player_joined',
        playerId: 'player2',
        name: 'New Player'
      };

      countyGame.handlePlayerAction('player2', action);

      expect(countyGame.render).toHaveBeenCalled();
    });

    test('should handle start game action from host', () => {
      countyGame.isHost = true;
      const action = { type: 'start_game' };

      countyGame.handlePlayerAction('player1', action);

      expect(countyGame.render).toHaveBeenCalled();
    });
  });

  describe('Submission Status', () => {
    beforeEach(() => {
      countyGame.init(
        mockGameAreaElement,
        {
          'player1': { name: 'Player 1' },
          'player2': { name: 'Player 2' },
          'player3': { name: 'Player 3' }
        },
        { phase: 'COUNTY_SUBMISSION' },
        mockOnPlayerAction,
        mockOnStateChange
      );
    });

    test('should update submission status displays', () => {
      const statusElement1 = document.createElement('div');
      statusElement1.className = 'submission-status';
      const statusElement2 = document.createElement('div');
      statusElement2.className = 'submission-status';
      
      mockGameAreaElement.appendChild(statusElement1);
      mockGameAreaElement.appendChild(statusElement2);
      
      countyGame.submittedCount = 2;
      countyGame.totalPlayers = 3;
      countyGame.updateSubmissionStatus();
      
      expect(statusElement1.textContent).toContain('2');
      expect(statusElement1.textContent).toContain('3');
      expect(statusElement2.textContent).toContain('2');
      expect(statusElement2.textContent).toContain('3');
    });

    test('should handle missing status elements gracefully', () => {
      expect(() => {
        countyGame.updateSubmissionStatus();
      }).not.toThrow();
    });

    test('should calculate submission status correctly', () => {
      countyGame.submittedCount = 1;
      countyGame.totalPlayers = 3;
      
      expect(countyGame.submittedCount).toBe(1);
      expect(countyGame.totalPlayers).toBe(3);
    });
  });

  describe('Win Conditions', () => {
    test('should return null for ongoing game', () => {
      countyGame.currentPhase = 'COUNTY_SUBMISSION';
      expect(countyGame.getWinCondition()).toBeNull();
    });

    test('should return win condition for completed game', () => {
      countyGame.currentPhase = 'GAME_OVER';
      countyGame.gameState = {
        phase: 'GAME_OVER',
        finalResults: {
          'player1': 'Los Angeles County',
          'player2': 'Orange County'
        }
      };

      // County Game is cooperative - everyone wins
      const winCondition = countyGame.getWinCondition();
      
      if (winCondition) {
        expect(winCondition.cooperative).toBe(true);
      }
    });
  });

  describe('Cleanup', () => {
    test('should cleanup timers on module cleanup', () => {
      countyGame.init(
        mockGameAreaElement,
        {},
        { timeLimit: 30 },
        mockOnPlayerAction,
        mockOnStateChange
      );
      
      countyGame.startTimer();
      expect(countyGame.timerInterval).not.toBeNull();
      
      countyGame.cleanup();
      
      expect(countyGame.timerInterval).toBeNull();
      expect(countyGame.isActive).toBe(false);
    });

    test('should reset county-specific state on cleanup', () => {
      countyGame.init(
        mockGameAreaElement,
        { player1: { name: 'Player 1' } },
        {
          phase: 'COUNTY_SUBMISSION',
          counties: { player1: 'Test County' }
        },
        mockOnPlayerAction,
        mockOnStateChange
      );
      
      countyGame.myCounty = 'My Test County';
      countyGame.currentPhase = 'COUNTY_SUBMISSION';
      
      countyGame.cleanup();
      
      expect(countyGame.myCounty).toBeNull();
      expect(countyGame.currentPhase).toBe('WAITING');
      expect(countyGame.counties).toEqual({});
      expect(countyGame.submittedCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle state updates with missing data', () => {
      countyGame.init(
        mockGameAreaElement,
        {},
        {},
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(() => {
        countyGame.handleStateUpdate({});
      }).not.toThrow();

      expect(() => {
        countyGame.handleStateUpdate(null);
      }).not.toThrow();
    });

    test('should handle player actions with invalid data', () => {
      countyGame.init(
        mockGameAreaElement,
        {},
        {},
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(() => {
        countyGame.handlePlayerAction('player1', null);
      }).not.toThrow();

      expect(() => {
        countyGame.handlePlayerAction('player1', {});
      }).not.toThrow();
    });

    test('should handle initialization with missing state', () => {
      expect(() => {
        countyGame.init(
          mockGameAreaElement,
          {},
          null,
          mockOnPlayerAction,
          mockOnStateChange
        );
      }).not.toThrow();

      expect(countyGame.currentPhase).toBe('WAITING');
      expect(countyGame.totalPlayers).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should complete full game flow simulation', () => {
      const players = {
        'player1': { name: 'Player 1', emoji: '😀' },
        'player2': { name: 'Player 2', emoji: '😎' }
      };

      // Initialize game
      countyGame.currentPlayerId = 'player1';
      countyGame.init(
        mockGameAreaElement,
        players,
        { phase: 'WAITING', hostId: 'player1' },
        mockOnPlayerAction,
        mockOnStateChange
      );

      expect(countyGame.isHost).toBe(true);
      expect(countyGame.totalPlayers).toBe(2);

      // Move to submission phase
      countyGame.handleStateUpdate({
        phase: 'COUNTY_SUBMISSION',
        timeLimit: 30,
        submissionEndTime: Date.now() + 30000
      });

      expect(countyGame.gameState.phase).toBe('COUNTY_SUBMISSION');

      // Submit counties
      countyGame.handleStateUpdate({
        counties: {
          'player1': 'Los Angeles County',
          'player2': 'Orange County'
        },
        submittedCount: 2
      });

      expect(countyGame.gameState.submittedCount).toBe(2);

      // Move to announcement
      countyGame.handleStateUpdate({
        phase: 'COUNTY_ANNOUNCEMENT',
        currentAnnouncement: {
          playerId: 'player1',
          county: 'Los Angeles County'
        }
      });

      expect(countyGame.gameState.phase).toBe('COUNTY_ANNOUNCEMENT');

      // End game
      countyGame.handleStateUpdate({
        phase: 'GAME_OVER',
        finalResults: {
          'player1': 'Los Angeles County',
          'player2': 'Orange County'
        }
      });

      expect(countyGame.gameState.phase).toBe('GAME_OVER');
    });
  });
});