/**
 * @file session.test.js
 * @description Unit tests for session management utilities
 */

describe('Session ID Generation', () => {
  describe('generateSessionId', () => {
    // Mock the session ID generation function from app.js
    const generateSessionId = () => {
      return Math.random().toString(36).substr(2, 6).toUpperCase();
    };

    test('should generate a 6-character session ID', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toHaveLength(6);
    });

    test('should generate uppercase alphanumeric IDs', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('should generate unique IDs on multiple calls', () => {
      const ids = new Set();
      
      // Generate 100 IDs and check for uniqueness
      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId());
      }
      
      // Should have close to 100 unique IDs (allowing for rare collisions)
      expect(ids.size).toBeGreaterThan(95);
    });

    test('should only contain valid characters', () => {
      const validChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      for (let i = 0; i < 50; i++) {
        const sessionId = generateSessionId();
        
        for (const char of sessionId) {
          expect(validChars).toContain(char);
        }
      }
    });
  });
});

describe('URL Parsing and Validation', () => {
  describe('WebSocket URL Construction', () => {
    const constructWebSocketUrl = (sessionId, protocol = 'ws:', host = 'localhost:8777') => {
      return `${protocol}//${host}/api/game/${sessionId}/ws`;
    };

    test('should construct correct WebSocket URL for development', () => {
      const sessionId = 'ABC123';
      const wsUrl = constructWebSocketUrl(sessionId);
      
      expect(wsUrl).toBe('ws://localhost:8777/api/game/ABC123/ws');
    });

    test('should construct correct WebSocket URL for production', () => {
      const sessionId = 'XYZ789';
      const wsUrl = constructWebSocketUrl(sessionId, 'wss:', 'games.example.com');
      
      expect(wsUrl).toBe('wss://games.example.com/api/game/XYZ789/ws');
    });

    test('should handle special characters in session ID', () => {
      const sessionId = 'A1B2C3';
      const wsUrl = constructWebSocketUrl(sessionId);
      
      expect(wsUrl).toBe('ws://localhost:8777/api/game/A1B2C3/ws');
    });
  });

  describe('Room Code Validation', () => {
    const validateRoomCode = (roomCode) => {
      if (!roomCode || typeof roomCode !== 'string') {
        return { valid: false, error: 'Room code is required' };
      }
      
      const cleaned = roomCode.trim().toUpperCase();
      
      if (cleaned.length === 0) {
        return { valid: false, error: 'Room code cannot be empty' };
      }
      
      if (cleaned.length > 6) {
        return { valid: false, error: 'Room code cannot exceed 6 characters' };
      }
      
      if (!/^[A-Z0-9]+$/.test(cleaned)) {
        return { valid: false, error: 'Room code can only contain letters and numbers' };
      }
      
      return { valid: true, roomCode: cleaned };
    };

    test('should validate correct room codes', () => {
      expect(validateRoomCode('ABC123')).toEqual({ valid: true, roomCode: 'ABC123' });
      expect(validateRoomCode('xyz789')).toEqual({ valid: true, roomCode: 'XYZ789' });
      expect(validateRoomCode('  test  ')).toEqual({ valid: true, roomCode: 'TEST' });
    });

    test('should reject empty room codes', () => {
      expect(validateRoomCode('').valid).toBe(false);
      expect(validateRoomCode('   ').valid).toBe(false);
      expect(validateRoomCode(null).valid).toBe(false);
      expect(validateRoomCode(undefined).valid).toBe(false);
    });

    test('should reject room codes that are too long', () => {
      expect(validateRoomCode('ABCDEFG').valid).toBe(false);
      expect(validateRoomCode('VERYLONGCODE').valid).toBe(false);
    });

    test('should reject room codes with invalid characters', () => {
      expect(validateRoomCode('ABC-123').valid).toBe(false);
      expect(validateRoomCode('ABC 123').valid).toBe(false);
      expect(validateRoomCode('ABC@123').valid).toBe(false);
      expect(validateRoomCode('ABC#123').valid).toBe(false);
    });
  });
});

describe('WebSocket Message Formatting', () => {
  describe('Message Creation', () => {
    const createWebSocketMessage = (type, data = {}) => {
      return JSON.stringify({ type, data });
    };

    test('should create toggle checkbox message', () => {
      const message = createWebSocketMessage('TOGGLE_CHECKBOX', { checkboxIndex: 5 });
      const parsed = JSON.parse(message);
      
      expect(parsed.type).toBe('TOGGLE_CHECKBOX');
      expect(parsed.data.checkboxIndex).toBe(5);
    });

    test('should create start game message', () => {
      const message = createWebSocketMessage('START_GAME', { gameType: 'checkbox-game' });
      const parsed = JSON.parse(message);
      
      expect(parsed.type).toBe('START_GAME');
      expect(parsed.data.gameType).toBe('checkbox-game');
    });

    test('should create join player message', () => {
      const message = createWebSocketMessage('JOIN_PLAYER', { name: 'TestPlayer' });
      const parsed = JSON.parse(message);
      
      expect(parsed.type).toBe('JOIN_PLAYER');
      expect(parsed.data.name).toBe('TestPlayer');
    });

    test('should handle empty data object', () => {
      const message = createWebSocketMessage('PING');
      const parsed = JSON.parse(message);
      
      expect(parsed.type).toBe('PING');
      expect(parsed.data).toEqual({});
    });
  });

  describe('Message Parsing', () => {
    const parseWebSocketMessage = (messageString) => {
      try {
        const parsed = JSON.parse(messageString);
        
        if (!parsed.type) {
          throw new Error('Message type is required');
        }
        
        return {
          valid: true,
          type: parsed.type,
          data: parsed.data || {}
        };
      } catch (error) {
        return {
          valid: false,
          error: error.message
        };
      }
    };

    test('should parse valid WebSocket messages', () => {
      const message = '{"type":"gameState","data":{"players":[]}}';
      const result = parseWebSocketMessage(message);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('gameState');
      expect(result.data).toEqual({ players: [] });
    });

    test('should handle messages without data field', () => {
      const message = '{"type":"PING"}';
      const result = parseWebSocketMessage(message);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('PING');
      expect(result.data).toEqual({});
    });

    test('should reject invalid JSON', () => {
      const message = 'invalid json{';
      const result = parseWebSocketMessage(message);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should reject messages without type', () => {
      const message = '{"data":{"test":"value"}}';
      const result = parseWebSocketMessage(message);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Message type is required');
    });
  });
});

describe('Error Handling Utilities', () => {
  describe('Error Classification', () => {
    const classifyError = (error) => {
      if (!error) return 'unknown';
      
      const message = error.message || error.toString();
      
      if (message.includes('WebSocket') || message.includes('connection')) {
        return 'connection';
      }
      
      if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('validation')) {
        return 'validation';
      }
      
      if (message.toLowerCase().includes('timeout')) {
        return 'timeout';
      }
      
      if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('spectator')) {
        return 'permission';
      }
      
      return 'general';
    };

    test('should classify connection errors', () => {
      const error = new Error('WebSocket connection failed');
      expect(classifyError(error)).toBe('connection');
    });

    test('should classify validation errors', () => {
      const error = new Error('Invalid room code provided');
      expect(classifyError(error)).toBe('validation');
    });

    test('should classify permission errors', () => {
      const error = new Error('Spectators cannot interact with the game');
      expect(classifyError(error)).toBe('permission');
    });

    test('should classify timeout errors', () => {
      const error = new Error('Request timeout exceeded');
      expect(classifyError(error)).toBe('timeout');
    });

    test('should handle general errors', () => {
      const error = new Error('Something went wrong');
      expect(classifyError(error)).toBe('general');
    });

    test('should handle null/undefined errors', () => {
      expect(classifyError(null)).toBe('unknown');
      expect(classifyError(undefined)).toBe('unknown');
    });
  });

  describe('Error Message Formatting', () => {
    const formatErrorMessage = (error, context = '') => {
      if (!error) return 'An unknown error occurred';
      
      const message = error.message || error.toString();
      const prefix = context ? `${context}: ` : '';
      
      return `${prefix}${message}`;
    };

    test('should format error messages with context', () => {
      const error = new Error('Connection failed');
      const formatted = formatErrorMessage(error, 'WebSocket');
      
      expect(formatted).toBe('WebSocket: Connection failed');
    });

    test('should format error messages without context', () => {
      const error = new Error('Validation failed');
      const formatted = formatErrorMessage(error);
      
      expect(formatted).toBe('Validation failed');
    });

    test('should handle string errors', () => {
      const formatted = formatErrorMessage('Simple error string');
      expect(formatted).toBe('Simple error string');
    });

    test('should handle null errors', () => {
      const formatted = formatErrorMessage(null);
      expect(formatted).toBe('An unknown error occurred');
    });
  });
});