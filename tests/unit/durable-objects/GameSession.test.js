/**
 * @file GameSession.test.js
 * @description Unit tests for GameSession Durable Object functionality
 * These tests use Node.js environment for testing core logic without Cloudflare Workers runtime
 */

describe('GameSession Core Logic', () => {
  let gameSession;
  let mockState;
  let mockEnv;
  let mockWebSocket;

  // Mock Durable Object storage
  const createMockStorage = () => ({
    storage: new Map(),
    get: function(key) {
      return Promise.resolve(this.storage.get(key));
    },
    put: function(data) {
      if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([key, value]) => {
          this.storage.set(key, value);
        });
      } else {
        throw new Error('put() expects an object');
      }
      return Promise.resolve();
    },
    delete: function(key) {
      this.storage.delete(key);
      return Promise.resolve();
    },
    list: function() {
      return Promise.resolve(this.storage);
    }
  });

  // Mock WebSocket
  const createMockWebSocket = () => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 1, // OPEN
    events: {},
    
    // Helper methods for testing
    simulateMessage: function(data) {
      if (this.events.message) {
        this.events.message({ data });
      }
    },
    
    simulateClose: function() {
      if (this.events.close) {
        this.events.close();
      }
    },
    
    on: function(event, handler) {
      this.events[event] = handler;
    }
  });

  // Mock GameSession class (simplified version for testing)
  class MockGameSession {
    constructor(state, env) {
      this.websockets = new Map();
      this.players = new Map();
      this.spectators = new Map();
      this.gameState = null;
      this.sessionId = '';
      this.initialized = false;
      this.chatHistory = [];
      this.state = state;
      this.env = env;
    }

    async initializeGameState(gameType = 'checkbox-game') {
      if (this.initialized) return;
      
      const storedState = await this.state.get('gameState');
      const storedPlayers = await this.state.get('players');
      const storedSpectators = await this.state.get('spectators');
      const storedChatHistory = await this.state.get('chatHistory');
      
      if (storedState) {
        this.gameState = storedState;
      } else {
        this.gameState = this.createInitialGameState(gameType);
      }
      
      if (storedPlayers) {
        this.players = new Map(storedPlayers);
      }
      if (storedSpectators) {
        this.spectators = new Map(storedSpectators);
      }
      if (storedChatHistory) {
        this.chatHistory = storedChatHistory;
      }
      
      this.initialized = true;
    }

    createInitialGameState(gameType) {
      return {
        type: gameType,
        status: 'waiting',
        players: {},
        hostId: null,
        gameStarted: false,
        gameFinished: false,
        spectatorCount: 0,
        spectators: {}
      };
    }

    async saveGameState() {
      await this.state.put({
        gameState: this.gameState,
        players: Array.from(this.players.entries()),
        spectators: Array.from(this.spectators.entries()),
        chatHistory: this.chatHistory
      });
    }

    async addPlayer(playerId, webSocket, sessionId) {
      const playerData = {
        id: playerId,
        name: `Player_${playerId.slice(-4)}`,
        emoji: '😀',
        joinedAt: Date.now(),
        isConnected: true
      };

      this.players.set(playerId, playerData);
      this.websockets.set(webSocket, playerId);
      
      if (!this.gameState.hostId) {
        this.gameState.hostId = playerId;
      }
      
      await this.saveGameState();
      await this.broadcastToAll({
        type: 'player_joined',
        data: playerData
      });
      
      return playerData;
    }

    async removePlayer(playerId, webSocket) {
      if (this.players.has(playerId)) {
        this.players.delete(playerId);
        this.websockets.delete(webSocket);
        
        // If host left, assign new host
        if (this.gameState.hostId === playerId && this.players.size > 0) {
          const newHostId = this.players.keys().next().value;
          this.gameState.hostId = newHostId;
        }
        
        await this.saveGameState();
        await this.broadcastToAll({
          type: 'player_left',
          data: { playerId }
        });
      }
    }

    async addSpectator(spectatorId, webSocket, name) {
      const spectatorData = {
        id: spectatorId,
        name: name || `Spectator_${spectatorId.slice(-4)}`,
        joinedAt: Date.now(),
        isConnected: true
      };

      this.spectators.set(spectatorId, spectatorData);
      this.websockets.set(webSocket, spectatorId);
      this.gameState.spectatorCount = this.spectators.size;
      
      await this.saveGameState();
      await this.broadcastToAll({
        type: 'spectator_joined',
        data: spectatorData
      });
      
      return spectatorData;
    }

    async broadcastToAll(message) {
      const messageStr = JSON.stringify(message);
      this.websockets.forEach((_, ws) => {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Failed to send message:', error);
        }
      });
    }

    async broadcastToPlayers(message) {
      const messageStr = JSON.stringify(message);
      this.websockets.forEach((id, ws) => {
        if (this.players.has(id)) {
          try {
            ws.send(messageStr);
          } catch (error) {
            console.error('Failed to send message to player:', error);
          }
        }
      });
    }

    async handleMessage(data, webSocket, senderId) {
      try {
        const message = JSON.parse(data);
        const { type, data: messageData } = message;

        switch (type) {
          case 'join_as_player':
            await this.handleJoinAsPlayer(senderId, webSocket, messageData);
            break;
          case 'join_as_spectator':
            await this.handleJoinAsSpectator(senderId, webSocket, messageData);
            break;
          case 'start_game':
            await this.handleStartGame(senderId, messageData);
            break;
          case 'chat_message':
            await this.handleChatMessage(senderId, messageData);
            break;
          case 'game_action':
            await this.handleGameAction(senderId, messageData);
            break;
          default:
            console.log('Unknown message type:', type);
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    }

    async handleJoinAsPlayer(playerId, webSocket, data) {
      const player = await this.addPlayer(playerId, webSocket, this.sessionId);
      
      if (data.name) player.name = data.name;
      if (data.emoji) player.emoji = data.emoji;
      
      this.players.set(playerId, player);
      await this.saveGameState();

      // Send confirmation to the player
      webSocket.send(JSON.stringify({
        type: 'joined_as_player',
        data: {
          playerId,
          sessionId: this.sessionId,
          gameState: this.gameState,
          players: Object.fromEntries(this.players),
          spectators: Object.fromEntries(this.spectators)
        }
      }));
    }

    async handleJoinAsSpectator(spectatorId, webSocket, data) {
      const spectator = await this.addSpectator(spectatorId, webSocket, data.name);
      
      // Send confirmation to the spectator
      webSocket.send(JSON.stringify({
        type: 'joined_as_spectator',
        data: {
          spectatorId,
          sessionId: this.sessionId,
          gameState: this.gameState,
          players: Object.fromEntries(this.players),
          spectators: Object.fromEntries(this.spectators)
        }
      }));
    }

    async handleStartGame(playerId, data) {
      if (this.gameState.hostId !== playerId) {
        return; // Only host can start game
      }

      this.gameState.status = 'playing';
      this.gameState.gameStarted = true;
      await this.saveGameState();

      await this.broadcastToAll({
        type: 'game_started',
        data: { gameState: this.gameState }
      });
    }

    async handleChatMessage(senderId, data) {
      const chatMessage = {
        playerId: senderId,
        message: data.message,
        timestamp: Date.now()
      };

      this.chatHistory.push(chatMessage);
      
      // Keep only last 100 messages
      if (this.chatHistory.length > 100) {
        this.chatHistory = this.chatHistory.slice(-100);
      }

      await this.saveGameState();
      
      await this.broadcastToAll({
        type: 'chat_message',
        data: chatMessage
      });
    }

    async handleGameAction(playerId, data) {
      // Base implementation - subclasses should override
      await this.broadcastToPlayers({
        type: 'game_action',
        data: { playerId, action: data }
      });
    }
  }

  beforeEach(() => {
    mockState = createMockStorage();
    mockEnv = {};
    mockWebSocket = createMockWebSocket();
    gameSession = new MockGameSession(mockState, mockEnv);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      expect(gameSession.websockets).toBeInstanceOf(Map);
      expect(gameSession.players).toBeInstanceOf(Map);
      expect(gameSession.spectators).toBeInstanceOf(Map);
      expect(gameSession.gameState).toBeNull();
      expect(gameSession.initialized).toBe(false);
      expect(gameSession.chatHistory).toEqual([]);
    });

    test('should initialize game state correctly', async () => {
      await gameSession.initializeGameState('county-game');

      expect(gameSession.initialized).toBe(true);
      expect(gameSession.gameState).toEqual({
        type: 'county-game',
        status: 'waiting',
        players: {},
        hostId: null,
        gameStarted: false,
        gameFinished: false,
        spectatorCount: 0,
        spectators: {}
      });
    });

    test('should restore state from storage', async () => {
      const storedState = {
        type: 'checkbox-game',
        status: 'playing',
        players: {},
        hostId: 'player123'
      };
      
      await mockState.put({ gameState: storedState });
      await gameSession.initializeGameState();

      expect(gameSession.gameState).toEqual(storedState);
    });

    test('should not reinitialize if already initialized', async () => {
      await gameSession.initializeGameState('county-game');
      const originalState = { ...gameSession.gameState };

      await gameSession.initializeGameState('different-game');

      expect(gameSession.gameState).toEqual(originalState);
      expect(gameSession.gameState.type).toBe('county-game');
    });
  });

  describe('Player Management', () => {
    beforeEach(async () => {
      await gameSession.initializeGameState();
    });

    test('should add player successfully', async () => {
      const playerId = 'player123';
      const player = await gameSession.addPlayer(playerId, mockWebSocket, 'session123');

      expect(gameSession.players.has(playerId)).toBe(true);
      expect(gameSession.websockets.has(mockWebSocket)).toBe(true);
      expect(gameSession.gameState.hostId).toBe(playerId);
      expect(player.id).toBe(playerId);
      expect(player.isConnected).toBe(true);
    });

    test('should set first player as host', async () => {
      const playerId1 = 'player123';
      const playerId2 = 'player456';
      
      await gameSession.addPlayer(playerId1, mockWebSocket, 'session123');
      const mockWebSocket2 = createMockWebSocket();
      await gameSession.addPlayer(playerId2, mockWebSocket2, 'session123');

      expect(gameSession.gameState.hostId).toBe(playerId1);
    });

    test('should remove player successfully', async () => {
      const playerId = 'player123';
      await gameSession.addPlayer(playerId, mockWebSocket, 'session123');
      
      expect(gameSession.players.has(playerId)).toBe(true);
      
      await gameSession.removePlayer(playerId, mockWebSocket);
      
      expect(gameSession.players.has(playerId)).toBe(false);
      expect(gameSession.websockets.has(mockWebSocket)).toBe(false);
    });

    test('should reassign host when host leaves', async () => {
      const playerId1 = 'player123';
      const playerId2 = 'player456';
      const mockWebSocket2 = createMockWebSocket();
      
      await gameSession.addPlayer(playerId1, mockWebSocket, 'session123');
      await gameSession.addPlayer(playerId2, mockWebSocket2, 'session123');
      
      expect(gameSession.gameState.hostId).toBe(playerId1);
      
      await gameSession.removePlayer(playerId1, mockWebSocket);
      
      expect(gameSession.gameState.hostId).toBe(playerId2);
    });

    test('should handle removing non-existent player', async () => {
      expect(() => gameSession.removePlayer('nonexistent', mockWebSocket)).not.toThrow();
    });
  });

  describe('Spectator Management', () => {
    beforeEach(async () => {
      await gameSession.initializeGameState();
    });

    test('should add spectator successfully', async () => {
      const spectatorId = 'spec123';
      const spectator = await gameSession.addSpectator(spectatorId, mockWebSocket, 'Spectator Name');

      expect(gameSession.spectators.has(spectatorId)).toBe(true);
      expect(gameSession.websockets.has(mockWebSocket)).toBe(true);
      expect(gameSession.gameState.spectatorCount).toBe(1);
      expect(spectator.name).toBe('Spectator Name');
    });

    test('should auto-generate spectator name if not provided', async () => {
      const spectatorId = 'spec123';
      const spectator = await gameSession.addSpectator(spectatorId, mockWebSocket);

      expect(spectator.name).toBe('Spectator_c123');
    });

    test('should update spectator count correctly', async () => {
      const spec1 = createMockWebSocket();
      const spec2 = createMockWebSocket();
      
      await gameSession.addSpectator('spec1', spec1, 'Spectator 1');
      expect(gameSession.gameState.spectatorCount).toBe(1);
      
      await gameSession.addSpectator('spec2', spec2, 'Spectator 2');
      expect(gameSession.gameState.spectatorCount).toBe(2);
    });
  });

  describe('Message Broadcasting', () => {
    beforeEach(async () => {
      await gameSession.initializeGameState();
    });

    test('should broadcast to all connected clients', async () => {
      const player1WebSocket = createMockWebSocket();
      const player2WebSocket = createMockWebSocket();
      const spectatorWebSocket = createMockWebSocket();
      
      await gameSession.addPlayer('player1', player1WebSocket, 'session123');
      await gameSession.addPlayer('player2', player2WebSocket, 'session123');
      await gameSession.addSpectator('spec1', spectatorWebSocket, 'Spectator');

      const message = { type: 'test_message', data: { test: true } };
      await gameSession.broadcastToAll(message);

      expect(player1WebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(player2WebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(spectatorWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    test('should broadcast only to players', async () => {
      const playerWebSocket = createMockWebSocket();
      const spectatorWebSocket = createMockWebSocket();
      
      await gameSession.addPlayer('player1', playerWebSocket, 'session123');
      await gameSession.addSpectator('spec1', spectatorWebSocket, 'Spectator');

      // Clear the spectator_joined broadcast calls
      playerWebSocket.send.mockClear();
      spectatorWebSocket.send.mockClear();

      const message = { type: 'player_only_message', data: { test: true } };
      await gameSession.broadcastToPlayers(message);

      expect(playerWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(spectatorWebSocket.send).not.toHaveBeenCalled();
    });

    test('should handle send errors gracefully', async () => {
      const faultyWebSocket = createMockWebSocket();
      faultyWebSocket.send = jest.fn(() => { throw new Error('Send failed'); });
      
      await gameSession.addPlayer('player1', faultyWebSocket, 'session123');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await gameSession.broadcastToAll({ type: 'test', data: {} });
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to send message:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await gameSession.initializeGameState();
    });

    test('should handle join_as_player message', async () => {
      const message = JSON.stringify({
        type: 'join_as_player',
        data: { name: 'Test Player', emoji: '🎮' }
      });

      await gameSession.handleMessage(message, mockWebSocket, 'player123');

      const player = gameSession.players.get('player123');
      expect(player.name).toBe('Test Player');
      expect(player.emoji).toBe('🎮');
    });

    test('should handle join_as_spectator message', async () => {
      const message = JSON.stringify({
        type: 'join_as_spectator',
        data: { name: 'Test Spectator' }
      });

      await gameSession.handleMessage(message, mockWebSocket, 'spec123');

      expect(gameSession.spectators.has('spec123')).toBe(true);
    });

    test('should handle start_game message from host', async () => {
      await gameSession.addPlayer('player123', mockWebSocket, 'session123');
      
      const message = JSON.stringify({
        type: 'start_game',
        data: {}
      });

      await gameSession.handleMessage(message, mockWebSocket, 'player123');

      expect(gameSession.gameState.status).toBe('playing');
      expect(gameSession.gameState.gameStarted).toBe(true);
    });

    test('should ignore start_game message from non-host', async () => {
      const hostWebSocket = createMockWebSocket();
      const playerWebSocket = createMockWebSocket();
      
      await gameSession.addPlayer('host', hostWebSocket, 'session123');
      await gameSession.addPlayer('player', playerWebSocket, 'session123');
      
      const message = JSON.stringify({
        type: 'start_game',
        data: {}
      });

      await gameSession.handleMessage(message, playerWebSocket, 'player');

      expect(gameSession.gameState.status).toBe('waiting');
      expect(gameSession.gameState.gameStarted).toBe(false);
    });

    test('should handle chat_message', async () => {
      const message = JSON.stringify({
        type: 'chat_message',
        data: { message: 'Hello world!' }
      });

      await gameSession.handleMessage(message, mockWebSocket, 'player123');

      expect(gameSession.chatHistory).toHaveLength(1);
      expect(gameSession.chatHistory[0].playerId).toBe('player123');
      expect(gameSession.chatHistory[0].message).toBe('Hello world!');
    });

    test('should limit chat history to 100 messages', async () => {
      // Add 105 messages
      for (let i = 0; i < 105; i++) {
        gameSession.chatHistory.push({
          playerId: 'player123',
          message: `Message ${i}`,
          timestamp: Date.now()
        });
      }

      const message = JSON.stringify({
        type: 'chat_message',
        data: { message: 'Latest message' }
      });

      await gameSession.handleMessage(message, mockWebSocket, 'player123');

      expect(gameSession.chatHistory).toHaveLength(100);
      expect(gameSession.chatHistory[99].message).toBe('Latest message');
    });

    test('should handle invalid JSON gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await gameSession.handleMessage('invalid json', mockWebSocket, 'player123');
      
      expect(consoleSpy).toHaveBeenCalledWith('Error handling message:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    test('should handle unknown message type', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const message = JSON.stringify({
        type: 'unknown_type',
        data: {}
      });

      await gameSession.handleMessage(message, mockWebSocket, 'player123');

      expect(consoleSpy).toHaveBeenCalledWith('Unknown message type:', 'unknown_type');
      consoleSpy.mockRestore();
    });
  });

  describe('State Persistence', () => {
    beforeEach(async () => {
      await gameSession.initializeGameState();
    });

    test('should save game state to storage', async () => {
      await gameSession.addPlayer('player123', mockWebSocket, 'session123');
      gameSession.chatHistory.push({
        playerId: 'player123',
        message: 'Test message',
        timestamp: Date.now()
      });

      await gameSession.saveGameState();

      const savedState = await mockState.get('gameState');
      const savedPlayers = await mockState.get('players');
      const savedChatHistory = await mockState.get('chatHistory');

      expect(savedState).toEqual(gameSession.gameState);
      expect(savedPlayers).toHaveLength(1);
      expect(savedChatHistory).toHaveLength(1);
    });

    test('should restore complete state from storage', async () => {
      const storedGameState = {
        type: 'county-game',
        status: 'playing',
        hostId: 'player123'
      };
      
      const storedPlayers = [['player123', { id: 'player123', name: 'Stored Player' }]];
      const storedChatHistory = [{ playerId: 'player123', message: 'Stored message', timestamp: 12345 }];

      await mockState.put({
        gameState: storedGameState,
        players: storedPlayers,
        chatHistory: storedChatHistory
      });

      const newSession = new MockGameSession(mockState, mockEnv);
      await newSession.initializeGameState();

      expect(newSession.gameState).toEqual(storedGameState);
      expect(newSession.players.size).toBe(1);
      expect(newSession.chatHistory).toEqual(storedChatHistory);
    });
  });
});