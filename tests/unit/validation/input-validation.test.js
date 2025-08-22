/**
 * Unit tests for input validation and error handling
 */

// Validation utility functions
class ValidationUtils {
  validateRoomCode(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Room code is required' };
    }
    
    if (code.length === 0) {
      return { valid: false, error: 'Room code cannot be empty' };
    }
    
    if (code.length > 6) {
      return { valid: false, error: 'Room code must be 6 characters or less' };
    }
    
    if (!/^[A-Z0-9]+$/.test(code)) {
      return { valid: false, error: 'Room code must contain only letters and numbers' };
    }
    
    return { valid: true };
  }

  validatePlayerName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Player name is required' };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return { valid: false, error: 'Player name cannot be empty' };
    }
    
    if (trimmedName.length > 50) {
      return { valid: false, error: 'Player name must be 50 characters or less' };
    }
    
    // Check for HTML/script injection attempts
    if (/<[^>]*>/.test(trimmedName) || /<script/i.test(trimmedName)) {
      return { valid: false, error: 'Player name contains invalid characters' };
    }
    
    return { valid: true, sanitized: trimmedName };
  }

  validateChatMessage(message) {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'Message is required' };
    }
    
    const trimmedMessage = message.trim();
    
    if (trimmedMessage.length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }
    
    if (trimmedMessage.length > 500) {
      return { valid: false, error: 'Message must be 500 characters or less' };
    }
    
    // Sanitize HTML/script tags
    const sanitized = trimmedMessage
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    return { valid: true, sanitized };
  }

  validateWebSocketMessage(data) {
    try {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        
        if (!parsed.type) {
          return { valid: false, error: 'Message must have a type' };
        }
        
        if (typeof parsed.type !== 'string') {
          return { valid: false, error: 'Message type must be a string' };
        }
        
        // Check message size (1MB limit)
        if (data.length > 1024 * 1024) {
          return { valid: false, error: 'Message exceeds 1MB size limit' };
        }
        
        return { valid: true, parsed };
      }
      
      return { valid: false, error: 'Message must be a JSON string' };
    } catch (e) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }

  validateCheckboxIndex(index) {
    if (index === undefined || index === null) {
      return { valid: false, error: 'Checkbox index is required' };
    }
    
    if (typeof index !== 'number') {
      return { valid: false, error: 'Checkbox index must be a number' };
    }
    
    if (!Number.isInteger(index)) {
      return { valid: false, error: 'Checkbox index must be an integer' };
    }
    
    if (index < 0 || index > 8) {
      return { valid: false, error: 'Checkbox index must be between 0 and 8' };
    }
    
    return { valid: true };
  }
}

describe('Input Validation and Error Handling', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationUtils();
  });

  describe('Room Code Validation', () => {
    test('should accept valid room codes', () => {
      expect(validator.validateRoomCode('ABC123')).toEqual({ valid: true });
      expect(validator.validateRoomCode('XYZ789')).toEqual({ valid: true });
      expect(validator.validateRoomCode('A1B2C3')).toEqual({ valid: true });
      expect(validator.validateRoomCode('ROOM42')).toEqual({ valid: true });
    });

    test('should reject empty room codes', () => {
      expect(validator.validateRoomCode('')).toEqual({ 
        valid: false, 
        error: 'Room code cannot be empty' 
      });
    });

    test('should reject null/undefined room codes', () => {
      expect(validator.validateRoomCode(null)).toEqual({ 
        valid: false, 
        error: 'Room code is required' 
      });
      expect(validator.validateRoomCode(undefined)).toEqual({ 
        valid: false, 
        error: 'Room code is required' 
      });
    });

    test('should reject room codes longer than 6 characters', () => {
      expect(validator.validateRoomCode('ABCDEFG')).toEqual({ 
        valid: false, 
        error: 'Room code must be 6 characters or less' 
      });
    });

    test('should reject room codes with invalid characters', () => {
      expect(validator.validateRoomCode('ABC-123')).toEqual({ 
        valid: false, 
        error: 'Room code must contain only letters and numbers' 
      });
      expect(validator.validateRoomCode('ABC!23')).toEqual({ 
        valid: false, 
        error: 'Room code must contain only letters and numbers' 
      });
      expect(validator.validateRoomCode('abc123')).toEqual({ 
        valid: false, 
        error: 'Room code must contain only letters and numbers' 
      });
    });

    test('should reject non-string types', () => {
      expect(validator.validateRoomCode(123456)).toEqual({ 
        valid: false, 
        error: 'Room code is required' 
      });
      expect(validator.validateRoomCode({})).toEqual({ 
        valid: false, 
        error: 'Room code is required' 
      });
    });
  });

  describe('Player Name Validation', () => {
    test('should accept valid player names', () => {
      expect(validator.validatePlayerName('John')).toEqual({ 
        valid: true, 
        sanitized: 'John' 
      });
      expect(validator.validatePlayerName('Player 123')).toEqual({ 
        valid: true, 
        sanitized: 'Player 123' 
      });
      expect(validator.validatePlayerName('  Alice  ')).toEqual({ 
        valid: true, 
        sanitized: 'Alice' 
      });
    });

    test('should reject empty names', () => {
      expect(validator.validatePlayerName('')).toEqual({ 
        valid: false, 
        error: 'Player name cannot be empty' 
      });
      expect(validator.validatePlayerName('   ')).toEqual({ 
        valid: false, 
        error: 'Player name cannot be empty' 
      });
    });

    test('should reject names longer than 50 characters', () => {
      const longName = 'A'.repeat(51);
      expect(validator.validatePlayerName(longName)).toEqual({ 
        valid: false, 
        error: 'Player name must be 50 characters or less' 
      });
    });

    test('should reject HTML injection attempts', () => {
      expect(validator.validatePlayerName('<div>Test</div>')).toEqual({ 
        valid: false, 
        error: 'Player name contains invalid characters' 
      });
      expect(validator.validatePlayerName('Test<script>alert(1)</script>')).toEqual({ 
        valid: false, 
        error: 'Player name contains invalid characters' 
      });
    });

    test('should trim whitespace', () => {
      expect(validator.validatePlayerName('  Bob  ')).toEqual({ 
        valid: true, 
        sanitized: 'Bob' 
      });
    });

    test('should allow emojis in names', () => {
      expect(validator.validatePlayerName('Player 😀')).toEqual({ 
        valid: true, 
        sanitized: 'Player 😀' 
      });
    });
  });

  describe('Chat Message Validation', () => {
    test('should accept valid messages', () => {
      expect(validator.validateChatMessage('Hello world')).toEqual({ 
        valid: true, 
        sanitized: 'Hello world' 
      });
    });

    test('should sanitize HTML tags', () => {
      const result = validator.validateChatMessage('Hello <b>world</b>');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello &lt;b&gt;world&lt;/b&gt;');
    });

    test('should sanitize script tags', () => {
      const result = validator.validateChatMessage('<script>alert(1)</script>');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    test('should reject empty messages', () => {
      expect(validator.validateChatMessage('')).toEqual({ 
        valid: false, 
        error: 'Message cannot be empty' 
      });
      expect(validator.validateChatMessage('   ')).toEqual({ 
        valid: false, 
        error: 'Message cannot be empty' 
      });
    });

    test('should reject messages over 500 characters', () => {
      const longMessage = 'A'.repeat(501);
      expect(validator.validateChatMessage(longMessage)).toEqual({ 
        valid: false, 
        error: 'Message must be 500 characters or less' 
      });
    });

    test('should escape quotes', () => {
      const result = validator.validateChatMessage('He said "Hello" and \'Hi\'');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('He said &quot;Hello&quot; and &#x27;Hi&#x27;');
    });
  });

  describe('WebSocket Message Validation', () => {
    test('should accept valid JSON messages', () => {
      const message = JSON.stringify({ type: 'test', data: 'value' });
      const result = validator.validateWebSocketMessage(message);
      expect(result.valid).toBe(true);
      expect(result.parsed).toEqual({ type: 'test', data: 'value' });
    });

    test('should reject invalid JSON', () => {
      expect(validator.validateWebSocketMessage('not json')).toEqual({ 
        valid: false, 
        error: 'Invalid JSON format' 
      });
    });

    test('should reject messages without type', () => {
      const message = JSON.stringify({ data: 'value' });
      expect(validator.validateWebSocketMessage(message)).toEqual({ 
        valid: false, 
        error: 'Message must have a type' 
      });
    });

    test('should reject non-string message types', () => {
      const message = JSON.stringify({ type: 123, data: 'value' });
      expect(validator.validateWebSocketMessage(message)).toEqual({ 
        valid: false, 
        error: 'Message type must be a string' 
      });
    });

    test('should reject messages over 1MB', () => {
      const largeData = 'A'.repeat(1024 * 1024 + 1);
      expect(validator.validateWebSocketMessage(largeData)).toEqual({ 
        valid: false, 
        error: 'Invalid JSON format' 
      });
    });

    test('should handle nested JSON structures', () => {
      const message = JSON.stringify({ 
        type: 'complex', 
        data: { 
          nested: { 
            value: 'test' 
          } 
        } 
      });
      const result = validator.validateWebSocketMessage(message);
      expect(result.valid).toBe(true);
      expect(result.parsed.data.nested.value).toBe('test');
    });
  });

  describe('Checkbox Index Validation', () => {
    test('should accept valid indices (0-8)', () => {
      for (let i = 0; i <= 8; i++) {
        expect(validator.validateCheckboxIndex(i)).toEqual({ valid: true });
      }
    });

    test('should reject negative indices', () => {
      expect(validator.validateCheckboxIndex(-1)).toEqual({ 
        valid: false, 
        error: 'Checkbox index must be between 0 and 8' 
      });
    });

    test('should reject indices greater than 8', () => {
      expect(validator.validateCheckboxIndex(9)).toEqual({ 
        valid: false, 
        error: 'Checkbox index must be between 0 and 8' 
      });
      expect(validator.validateCheckboxIndex(100)).toEqual({ 
        valid: false, 
        error: 'Checkbox index must be between 0 and 8' 
      });
    });

    test('should reject non-numeric types', () => {
      expect(validator.validateCheckboxIndex('5')).toEqual({ 
        valid: false, 
        error: 'Checkbox index must be a number' 
      });
      expect(validator.validateCheckboxIndex(true)).toEqual({ 
        valid: false, 
        error: 'Checkbox index must be a number' 
      });
    });

    test('should reject non-integer numbers', () => {
      expect(validator.validateCheckboxIndex(3.5)).toEqual({ 
        valid: false, 
        error: 'Checkbox index must be an integer' 
      });
      expect(validator.validateCheckboxIndex(2.1)).toEqual({ 
        valid: false, 
        error: 'Checkbox index must be an integer' 
      });
    });

    test('should reject null/undefined', () => {
      expect(validator.validateCheckboxIndex(null)).toEqual({ 
        valid: false, 
        error: 'Checkbox index is required' 
      });
      expect(validator.validateCheckboxIndex(undefined)).toEqual({ 
        valid: false, 
        error: 'Checkbox index is required' 
      });
    });
  });
});