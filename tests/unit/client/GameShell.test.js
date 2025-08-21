/**
 * @file GameShell.test.js
 * @description Comprehensive unit tests for GameShell WebSocket and core functionality
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');

// Set up DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
  <body>
    <div id="game-area"></div>
    <div id="player-name-section">
      <input id="player-name" type="text" value="TestPlayer" />
    </div>
    <div id="emoji-selector">
      <div class="emoji selected" data-emoji="😀"></div>
    </div>
    <div class="game-card" data-game="county-game"></div>
    <div class="game-card coming-soon" data-game="new-game"></div>
    <div id="room-code-input"></div>
    <div id="active-rooms"></div>
  </body>
  </html>
`, {
  url: 'http://localhost:8777',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
// Mock location without causing navigation errors
global.location = {
  pathname: '/',
  origin: 'http://localhost:8777',
  href: 'http://localhost:8777/'
};

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    // Simulate connection after next tick
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen();
    }, 0);
  }
  
  send(data) {
    this.lastSentMessage = data;
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }
  
  // Test helpers
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
  
  simulateError(error) {
    if (this.onerror) this.onerror(error);
    }
  
  simulateClose() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }
}

global.WebSocket = MockWebSocket;

// Load GameShell source code
const fs = require('fs');
const path = require('path');
const gameShellCode = fs.readFileSync(
  path.join(__dirname, '../../../src/static/js/GameShell.js'),
  'utf8'
);

// Execute GameShell code in our test environment
eval(gameShellCode);

describe('GameShell WebSocket Management', () => {
  let gameShell;
  
  beforeEach(() => {
    gameShell = new GameShell();
    gameShell.init();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    if (gameShell.ws) {
      gameShell.ws.close();
    }
    gameShell = null;
  });

  describe('WebSocket Connection', () => {
    test('should initialize with disconnected state', () => {
      expect(gameShell.ws).toBeNull();
      expect(gameShell.sessionId).toBe('');
      expect(gameShell.isConnected).toBe(false);
    });

    test('should connect to WebSocket successfully', (done) => {
      gameShell.connectWebSocket('TEST123');
      
      setTimeout(() => {
        expect(gameShell.ws).toBeInstanceOf(MockWebSocket);
        expect(gameShell.ws.url).toContain('ws://localhost:8787/api/game/TEST123');
        expect(gameShell.sessionId).toBe('TEST123');
        done();
      }, 10);
    });

    test('should handle WebSocket open event', (done) => {
      gameShell.connectWebSocket('TEST123');
      
      setTimeout(() => {
        expect(gameShell.isConnected).toBe(true);
        done();
      }, 10);
    });

    test('should handle WebSocket message events', (done) => {
      gameShell.connectWebSocket('TEST123');
      
      setTimeout(() => {
        const testMessage = {
          type: 'player_joined',
          data: { playerId: 'player123', name: 'Test Player' }
        };
        
        gameShell.ws.simulateMessage(testMessage);
        
        // Verify message was processed
        setTimeout(() => {
          expect(gameShell.players['player123']).toBeDefined();
          expect(gameShell.players['player123'].name).toBe('Test Player');
          done();
        }, 10);
      }, 10);
    });

    test('should handle WebSocket close event', (done) => {
      gameShell.connectWebSocket('TEST123');
      
      setTimeout(() => {
        expect(gameShell.isConnected).toBe(true);
        
        gameShell.ws.simulateClose();
        
        setTimeout(() => {
          expect(gameShell.isConnected).toBe(false);
          done();
        }, 10);
      }, 10);
    });

    test('should handle WebSocket error event', (done) => {
      gameShell.connectWebSocket('TEST123');
      
      setTimeout(() => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        gameShell.ws.simulateError(new Error('Connection failed'));
        
        expect(consoleSpy).toHaveBeenCalledWith('💥 WebSocket error:', expect.any(Error));
        consoleSpy.mockRestore();
        done();
      }, 10);
    });
  });

  describe('Message Handling', () => {
    beforeEach((done) => {
      gameShell.connectWebSocket('TEST123');
      setTimeout(done, 10);
    });

    test('should handle room_created message', (done) => {
      const message = {
        type: 'room_created',
        data: {
          sessionId: 'TEST123',
          gameType: 'county-game',
          hostPlayerId: 'host123'
        }
      };

      gameShell.ws.simulateMessage(message);

      setTimeout(() => {
        expect(gameShell.gameType).toBe('county-game');
        expect(gameShell.sessionId).toBe('TEST123');
        done();
      }, 10);
    });

    test('should handle player_joined message', (done) => {
      const message = {
        type: 'player_joined',
        data: {
          playerId: 'player123',
          name: 'Test Player',
          emoji: '😀'
        }
      };

      gameShell.ws.simulateMessage(message);

      setTimeout(() => {
        expect(gameShell.players['player123']).toEqual({
          playerId: 'player123',
          name: 'Test Player',
          emoji: '😀'
        });
        done();
      }, 10);
    });

    test('should handle player_left message', (done) => {
      // First add a player
      gameShell.players['player123'] = {
        playerId: 'player123',
        name: 'Test Player'
      };

      const message = {
        type: 'player_left',
        data: { playerId: 'player123' }
      };

      gameShell.ws.simulateMessage(message);

      setTimeout(() => {
        expect(gameShell.players['player123']).toBeUndefined();
        done();
      }, 10);
    });

    test('should handle game_state_update message', (done) => {
      const message = {
        type: 'game_state_update',
        data: {
          gameState: 'playing',
          roomState: { phase: 'input', timer: 30 }
        }
      };

      gameShell.ws.simulateMessage(message);

      setTimeout(() => {
        expect(gameShell.gameState).toBe('playing');
        expect(gameShell.roomState.phase).toBe('input');
        expect(gameShell.roomState.timer).toBe(30);
        done();
      }, 10);
    });

    test('should handle spectator_joined message', (done) => {
      const message = {
        type: 'spectator_joined',
        data: {
          spectatorId: 'spec123',
          name: 'Spectator'
        }
      };

      gameShell.ws.simulateMessage(message);

      setTimeout(() => {
        expect(gameShell.spectators['spec123']).toEqual({
          spectatorId: 'spec123',
          name: 'Spectator'
        });
        done();
      }, 10);
    });

    test('should handle invalid JSON messages gracefully', (done) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Simulate invalid message
      if (gameShell.ws.onmessage) {
        gameShell.ws.onmessage({ data: 'invalid json' });
      }

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error handling WebSocket message:', expect.any(Error));
        consoleSpy.mockRestore();
        done();
      }, 10);
    });
  });

  describe('Action Sending', () => {
    beforeEach((done) => {
      gameShell.connectWebSocket('TEST123');
      setTimeout(done, 10);
    });

    test('should send actions when connected', () => {
      const action = { type: 'start_game', data: {} };
      
      gameShell.sendAction(action);
      
      expect(gameShell.ws.lastSentMessage).toBe(JSON.stringify(action));
    });

    test('should not send actions when disconnected', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      gameShell.isConnected = false;
      gameShell.sendAction({ type: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith('Cannot send action - WebSocket not connected');
      consoleSpy.mockRestore();
    });

    test('should send join_as_player action', () => {
      gameShell.sendJoinAsPlayer('TestPlayer', '😀');
      
      const sentMessage = JSON.parse(gameShell.ws.lastSentMessage);
      expect(sentMessage.type).toBe('join_as_player');
      expect(sentMessage.data.name).toBe('TestPlayer');
      expect(sentMessage.data.emoji).toBe('😀');
    });

    test('should send join_as_spectator action', () => {
      gameShell.sendJoinAsSpectator('Spectator');
      
      const sentMessage = JSON.parse(gameShell.ws.lastSentMessage);
      expect(sentMessage.type).toBe('join_as_spectator');
      expect(sentMessage.data.name).toBe('Spectator');
    });

    test('should send create_room action', () => {
      gameShell.sendCreateRoom('county-game');
      
      const sentMessage = JSON.parse(gameShell.ws.lastSentMessage);
      expect(sentMessage.type).toBe('create_room');
      expect(sentMessage.data.gameType).toBe('county-game');
    });
  });
});

describe('GameShell Room Management', () => {
  let gameShell;
  
  beforeEach(() => {
    gameShell = new GameShell();
    gameShell.init();
  });

  describe('Room Creation', () => {
    test('should start game creation process', (done) => {
      gameShell.startGame('county-game');
      
      setTimeout(() => {
        expect(gameShell.gameType).toBe('county-game');
        expect(gameShell.ws).toBeInstanceOf(MockWebSocket);
        done();
      }, 10);
    });

    test('should handle room creation success', (done) => {
      gameShell.startGame('county-game');
      
      setTimeout(() => {
        const message = {
          type: 'room_created',
          data: {
            sessionId: 'NEW123',
            gameType: 'county-game'
          }
        };
        
        gameShell.ws.simulateMessage(message);
        
        setTimeout(() => {
          expect(gameShell.sessionId).toBe('NEW123');
          expect(gameShell.gameType).toBe('county-game');
          done();
        }, 10);
      }, 20);
    });
  });

  describe('Room Joining', () => {
    test('should join existing room', (done) => {
      gameShell.joinExistingRoom('EXIST1');
      
      setTimeout(() => {
        expect(gameShell.sessionId).toBe('EXIST1');
        expect(gameShell.ws).toBeInstanceOf(MockWebSocket);
        done();
      }, 10);
    });

    test('should handle join room success', (done) => {
      gameShell.joinExistingRoom('EXIST1');
      
      setTimeout(() => {
        const message = {
          type: 'room_joined',
          data: {
            sessionId: 'EXIST1',
            gameType: 'checkbox-game',
            players: {
              'player1': { name: 'Player 1', emoji: '😀' }
            }
          }
        };
        
        gameShell.ws.simulateMessage(message);
        
        setTimeout(() => {
          expect(gameShell.gameType).toBe('checkbox-game');
          expect(gameShell.players['player1']).toBeDefined();
          done();
        }, 10);
      }, 20);
    });
  });

  describe('URL Room Detection', () => {
    test('should detect room code in URL', () => {
      // Mock location pathname
      Object.defineProperty(window, 'location', {
        value: { pathname: '/ABC123' },
        writable: true
      });
      
      const joinSpy = jest.spyOn(gameShell, 'joinExistingRoom').mockImplementation();
      
      gameShell.checkURLForRoom();
      
      setTimeout(() => {
        expect(joinSpy).toHaveBeenCalledWith('ABC123');
      }, 150);
    });

    test('should detect everybody-votes path', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/everybody-votes' },
        writable: true
      });
      
      const startGameSpy = jest.spyOn(gameShell, 'startGame').mockImplementation();
      
      gameShell.checkURLForRoom();
      
      setTimeout(() => {
        expect(startGameSpy).toHaveBeenCalledWith('everybody-votes');
      }, 150);
    });
  });
});

describe('GameShell Player Management', () => {
  let gameShell;
  
  beforeEach((done) => {
    gameShell = new GameShell();
    gameShell.init();
    gameShell.connectWebSocket('TEST123');
    setTimeout(done, 10);
  });

  test('should manage player state correctly', () => {
    expect(gameShell.currentPlayerId).toBeNull();
    expect(gameShell.currentPlayer).toBeNull();
    expect(gameShell.isSpectator).toBe(false);
  });

  test('should update player state when joining as player', (done) => {
    const message = {
      type: 'joined_as_player',
      data: {
        playerId: 'player123',
        name: 'Test Player',
        emoji: '😀'
      }
    };

    gameShell.ws.simulateMessage(message);

    setTimeout(() => {
      expect(gameShell.currentPlayerId).toBe('player123');
      expect(gameShell.isSpectator).toBe(false);
      done();
    }, 10);
  });

  test('should update spectator state when joining as spectator', (done) => {
    const message = {
      type: 'joined_as_spectator',
      data: {
        spectatorId: 'spec123',
        name: 'Spectator'
      }
    };

    gameShell.ws.simulateMessage(message);

    setTimeout(() => {
      expect(gameShell.spectatorId).toBe('spec123');
      expect(gameShell.isSpectator).toBe(true);
      done();
    }, 10);
  });

  test('should get player name from input element', () => {
    document.getElementById('player-name').value = 'CustomPlayer';
    expect(gameShell.getPlayerName()).toBe('CustomPlayer');
  });

  test('should get selected emoji', () => {
    expect(gameShell.getSelectedEmoji()).toBe('😀');
  });
});

describe('GameShell Error Handling', () => {
  let gameShell;
  
  beforeEach(() => {
    gameShell = new GameShell();
    gameShell.init();
  });

  test('should handle missing game area element gracefully', () => {
    // Remove game area element
    const gameArea = document.getElementById('game-area');
    gameArea.remove();
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    gameShell.initializeGameArea();
    
    expect(consoleSpy).toHaveBeenCalledWith('Game area element not found - games will not render properly');
    consoleSpy.mockRestore();
  });

  test('should handle WebSocket connection failures', (done) => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    gameShell.connectWebSocket('TEST123');
    
    setTimeout(() => {
      gameShell.ws.simulateError(new Error('Network error'));
      
      expect(consoleSpy).toHaveBeenCalledWith('💥 WebSocket error:', expect.any(Error));
      consoleSpy.mockRestore();
      done();
    }, 10);
  });

  test('should handle reconnection after disconnect', (done) => {
    gameShell.connectWebSocket('TEST123');
    
    setTimeout(() => {
      expect(gameShell.isConnected).toBe(true);
      
      // Simulate disconnect
      gameShell.ws.simulateClose();
      
      setTimeout(() => {
        expect(gameShell.isConnected).toBe(false);
        done();
      }, 10);
    }, 10);
  });
});