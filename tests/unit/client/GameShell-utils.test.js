/**
 * Unit tests for GameShell utility functions
 */

// Mock GameShell utility functions
class MockGameShell {
  formatGameName(gameType) {
    const gameNames = {
      'checkbox-game': 'Checkbox Game',
      'votes-game': 'Everybody Votes',
      'county-game': 'County Game',
      'paddlin-game': "That's a Paddlin'",
      'price-game': 'The Price is Weird'
    };
    
    return gameNames[gameType] || gameType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  generateSessionId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  formatRoomCodeInput(e) {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 6) {
      value = value.substring(0, 6);
    }
    e.target.value = value;
    return value; // Return for testing
  }
}

describe('GameShell Utility Functions', () => {
  let gameShell;

  beforeEach(() => {
    gameShell = new MockGameShell();
  });

  describe('formatGameName', () => {
    test('should format known game types correctly', () => {
      expect(gameShell.formatGameName('checkbox-game')).toBe('Checkbox Game');
      expect(gameShell.formatGameName('votes-game')).toBe('Everybody Votes');
      expect(gameShell.formatGameName('county-game')).toBe('County Game');
      expect(gameShell.formatGameName('paddlin-game')).toBe("That's a Paddlin'");
      expect(gameShell.formatGameName('price-game')).toBe('The Price is Weird');
    });

    test('should format unknown game types using title case', () => {
      expect(gameShell.formatGameName('custom-game')).toBe('Custom Game');
      expect(gameShell.formatGameName('my-awesome-game')).toBe('My Awesome Game');
      expect(gameShell.formatGameName('test')).toBe('Test');
    });

    test('should handle single word game types', () => {
      expect(gameShell.formatGameName('monopoly')).toBe('Monopoly');
      expect(gameShell.formatGameName('chess')).toBe('Chess');
    });

    test('should handle empty string', () => {
      expect(gameShell.formatGameName('')).toBe('');
    });

    test('should handle multiple hyphens', () => {
      expect(gameShell.formatGameName('super-mega-ultra-game')).toBe('Super Mega Ultra Game');
    });

    test('should preserve special characters in known game names', () => {
      expect(gameShell.formatGameName('paddlin-game')).toBe("That's a Paddlin'");
    });
  });

  describe('generateSessionId', () => {
    test('should generate a 6-character string', () => {
      const sessionId = gameShell.generateSessionId();
      expect(sessionId).toHaveLength(6);
    });

    test('should generate uppercase alphanumeric characters only', () => {
      for (let i = 0; i < 100; i++) {
        const sessionId = gameShell.generateSessionId();
        expect(sessionId).toMatch(/^[A-Z0-9]{6}$/);
      }
    });

    test('should generate unique IDs on multiple calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(gameShell.generateSessionId());
      }
      // Should generate mostly unique IDs
      expect(ids.size).toBeGreaterThan(95);
    });

    test('should always return uppercase', () => {
      const sessionId = gameShell.generateSessionId();
      expect(sessionId).toBe(sessionId.toUpperCase());
    });
  });

  describe('formatRoomCodeInput', () => {
    let mockEvent;

    beforeEach(() => {
      mockEvent = {
        target: {
          value: ''
        }
      };
    });

    test('should convert lowercase to uppercase', () => {
      mockEvent.target.value = 'abc123';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('ABC123');
      expect(mockEvent.target.value).toBe('ABC123');
    });

    test('should remove non-alphanumeric characters', () => {
      mockEvent.target.value = 'AB!@#C$%^12&*()3';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('ABC123');
    });

    test('should limit to 6 characters maximum', () => {
      mockEvent.target.value = 'ABCDEFGHIJ';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('ABCDEF');
      expect(result).toHaveLength(6);
    });

    test('should handle empty input', () => {
      mockEvent.target.value = '';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('');
    });

    test('should remove spaces', () => {
      mockEvent.target.value = 'A B C 1 2 3';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('ABC123');
    });

    test('should remove special characters and symbols', () => {
      mockEvent.target.value = 'A-B_C.1,2;3';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('ABC123');
    });

    test('should handle unicode and emoji', () => {
      mockEvent.target.value = 'ABC😀123';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('ABC123');
    });

    test('should process mixed case with special chars and truncate', () => {
      mockEvent.target.value = 'aBc!@#123XYZ789';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('ABC123');
    });

    test('should handle only special characters', () => {
      mockEvent.target.value = '!@#$%^&*()';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('');
    });

    test('should preserve valid characters within limit', () => {
      mockEvent.target.value = 'XYZ789';
      const result = gameShell.formatRoomCodeInput(mockEvent);
      expect(result).toBe('XYZ789');
    });
  });
});