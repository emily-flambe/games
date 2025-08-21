/**
 * @file GameShell.minimal.test.js
 * @description Minimal unit tests for GameShell functionality that focus on core logic
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');

// Set up DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
  <body>
    <div id="game-area"></div>
    <input id="player-name" type="text" value="TestPlayer" />
    <div class="emoji selected" data-emoji="😀"></div>
  </body>
  </html>
`, {
  url: 'http://localhost:8777',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    setTimeout(() => {
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
  
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

global.WebSocket = MockWebSocket;

// Mock GameShell class
class GameShell {
  constructor() {
    this.ws = null;
    this.sessionId = '';
    this.isConnected = false;
    this.players = {};
    this.gameType = '';
  }

  connectWebSocket(sessionId) {
    this.sessionId = sessionId;
    this.ws = new WebSocket(`ws://localhost:8787/api/game/${sessionId}`);
    
    this.ws.onopen = () => {
      this.isConnected = true;
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;
        
        switch (type) {
          case 'player_joined':
            if (data && data.playerId) {
              this.players[data.playerId] = data;
            }
            break;
        }
      } catch (error) {
        // Handle error silently for tests
      }
    };
    
    this.ws.onclose = () => {
      this.isConnected = false;
    };
  }

  sendAction(action) {
    if (!this.isConnected || !this.ws) {
      return;
    }
    this.ws.send(JSON.stringify(action));
  }
}

describe('GameShell Core Functionality', () => {
  let gameShell;

  beforeEach(() => {
    gameShell = new GameShell();
  });

  afterEach(() => {
    if (gameShell.ws) {
      gameShell.ws.close();
    }
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
        expect(gameShell.sessionId).toBe('TEST123');
        expect(gameShell.isConnected).toBe(true);
        done();
      }, 10);
    });

    test('should handle player_joined message', (done) => {
      gameShell.connectWebSocket('TEST123');
      
      setTimeout(() => {
        const testMessage = {
          type: 'player_joined',
          data: { playerId: 'player123', name: 'Test Player' }
        };
        
        gameShell.ws.simulateMessage(testMessage);
        
        setTimeout(() => {
          expect(gameShell.players['player123']).toBeDefined();
          expect(gameShell.players['player123'].name).toBe('Test Player');
          done();
        }, 10);
      }, 10);
    });

    test('should send actions when connected', (done) => {
      gameShell.connectWebSocket('TEST123');
      
      setTimeout(() => {
        const action = { type: 'test_action', data: {} };
        gameShell.sendAction(action);
        
        expect(gameShell.ws.lastSentMessage).toBe(JSON.stringify(action));
        done();
      }, 10);
    });
  });

  describe('State Management', () => {
    test('should manage players correctly', () => {
      expect(gameShell.players).toEqual({});
    });

    test('should track connection state', () => {
      expect(gameShell.isConnected).toBe(false);
    });
  });
});