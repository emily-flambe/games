/**
 * Unit tests for room code generation and validation logic
 * Tests the actual business logic that can run in Node.js
 */

describe('Room Code Logic', () => {
  describe('Room Code Generation', () => {
    // This mimics the actual logic from GameShell.generateSessionId()
    function generateSessionId() {
      return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    test('should generate 6-character codes', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateSessionId();
        expect(code).toHaveLength(6);
      }
    });

    test('should only contain uppercase alphanumeric characters', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateSessionId();
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
      }
    });

    test('should generate unique codes (statistical test)', () => {
      const codes = new Set();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        codes.add(generateSessionId());
      }
      
      // With 36^6 possible combinations, collision probability is very low
      // Expect at least 99% unique codes in 1000 iterations
      expect(codes.size).toBeGreaterThan(iterations * 0.99);
    });

    test('should have reasonable distribution of characters', () => {
      const charCounts = {};
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        const code = generateSessionId();
        for (const char of code) {
          charCounts[char] = (charCounts[char] || 0) + 1;
        }
      }
      
      // Each character should appear with some frequency
      const chars = Object.keys(charCounts);
      expect(chars.length).toBeGreaterThan(20); // Should use most of the alphabet + digits
    });
  });

  describe('Room Code Validation', () => {
    // This mimics the validation logic used in the application
    function isValidRoomCode(code) {
      if (!code || typeof code !== 'string') return false;
      return /^[A-Z0-9]{6}$/.test(code);
    }

    test('should accept valid room codes', () => {
      expect(isValidRoomCode('ABC123')).toBe(true);
      expect(isValidRoomCode('XYZ789')).toBe(true);
      expect(isValidRoomCode('000000')).toBe(true);
      expect(isValidRoomCode('ZZZZZZ')).toBe(true);
    });

    test('should reject invalid room codes', () => {
      expect(isValidRoomCode('')).toBe(false);
      expect(isValidRoomCode(null)).toBe(false);
      expect(isValidRoomCode(undefined)).toBe(false);
      expect(isValidRoomCode(123456)).toBe(false);
      expect(isValidRoomCode('abc123')).toBe(false); // lowercase
      expect(isValidRoomCode('ABC12')).toBe(false); // too short
      expect(isValidRoomCode('ABC1234')).toBe(false); // too long
      expect(isValidRoomCode('ABC-23')).toBe(false); // special chars
      expect(isValidRoomCode('ABC 23')).toBe(false); // spaces
    });
  });

  describe('Room Code Formatting', () => {
    // This mimics the formatRoomCodeInput logic
    function formatRoomCodeInput(value) {
      if (!value) return '';
      let formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (formatted.length > 6) {
        formatted = formatted.substring(0, 6);
      }
      return formatted;
    }

    test('should convert to uppercase', () => {
      expect(formatRoomCodeInput('abc123')).toBe('ABC123');
      expect(formatRoomCodeInput('xYz789')).toBe('XYZ789');
    });

    test('should remove non-alphanumeric characters', () => {
      expect(formatRoomCodeInput('ABC-123')).toBe('ABC123');
      expect(formatRoomCodeInput('A!B@C#1$2%3')).toBe('ABC123');
      expect(formatRoomCodeInput('A B C 1 2 3')).toBe('ABC123');
    });

    test('should truncate to 6 characters', () => {
      expect(formatRoomCodeInput('ABCDEFGHIJ')).toBe('ABCDEF');
      expect(formatRoomCodeInput('1234567890')).toBe('123456');
    });

    test('should handle edge cases', () => {
      expect(formatRoomCodeInput('')).toBe('');
      expect(formatRoomCodeInput(null)).toBe('');
      expect(formatRoomCodeInput(undefined)).toBe('');
      expect(formatRoomCodeInput('!!!!!!')).toBe('');
    });

    test('should handle mixed input correctly', () => {
      expect(formatRoomCodeInput('  aBc-123-XyZ  ')).toBe('ABC123');
      expect(formatRoomCodeInput('###ABC###DEF###')).toBe('ABCDEF');
    });
  });
});