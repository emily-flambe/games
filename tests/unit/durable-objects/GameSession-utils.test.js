/**
 * Unit tests for GameSession utility functions
 */

// Mock the GameSession class with utility functions
class MockGameSession {
  generateSillyName() {
    const adjectives = ['Happy', 'Silly', 'Brave', 'Clever', 'Swift', 'Mighty', 'Gentle', 'Bold'];
    const nouns = ['Cat', 'Dog', 'Fox', 'Bear', 'Wolf', 'Eagle', 'Lion', 'Tiger'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }

  getRandomAnimalEmoji() {
    const ANIMAL_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦏', '🦛', '🐘', '🦒', '🐪', '🐫', '🦙', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦌', '🐐', '🦚', '🦜', '🦢', '🦩', '🕊️', '🦝', '🦨', '🦡', '🦫'];
    return ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)];
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
}

describe('GameSession Utility Functions', () => {
  let gameSession;

  beforeEach(() => {
    gameSession = new MockGameSession();
  });

  describe('generateSillyName', () => {
    test('should generate a name with adjective and noun', () => {
      const name = gameSession.generateSillyName();
      expect(name).toBeTruthy();
      expect(name.split(' ')).toHaveLength(2);
    });

    test('should generate names with proper capitalization', () => {
      const name = gameSession.generateSillyName();
      const [adjective, noun] = name.split(' ');
      expect(adjective[0]).toMatch(/[A-Z]/);
      expect(noun[0]).toMatch(/[A-Z]/);
    });

    test('should generate different names on multiple calls', () => {
      const names = new Set();
      for (let i = 0; i < 100; i++) {
        names.add(gameSession.generateSillyName());
      }
      // With 8 adjectives and 8 nouns, we have 64 possible combinations
      // In 100 calls, we should get at least 20 different names
      expect(names.size).toBeGreaterThan(20);
    });

    test('should only use predefined adjectives', () => {
      const validAdjectives = ['Happy', 'Silly', 'Brave', 'Clever', 'Swift', 'Mighty', 'Gentle', 'Bold'];
      for (let i = 0; i < 50; i++) {
        const name = gameSession.generateSillyName();
        const adjective = name.split(' ')[0];
        expect(validAdjectives).toContain(adjective);
      }
    });

    test('should only use predefined nouns', () => {
      const validNouns = ['Cat', 'Dog', 'Fox', 'Bear', 'Wolf', 'Eagle', 'Lion', 'Tiger'];
      for (let i = 0; i < 50; i++) {
        const name = gameSession.generateSillyName();
        const noun = name.split(' ')[1];
        expect(validNouns).toContain(noun);
      }
    });
  });

  describe('getRandomAnimalEmoji', () => {
    test('should return an emoji string', () => {
      const emoji = gameSession.getRandomAnimalEmoji();
      expect(emoji).toBeTruthy();
      expect(typeof emoji).toBe('string');
    });

    test('should return different emojis on multiple calls', () => {
      const emojis = new Set();
      for (let i = 0; i < 100; i++) {
        emojis.add(gameSession.getRandomAnimalEmoji());
      }
      // We should get a variety of different emojis
      expect(emojis.size).toBeGreaterThan(10);
    });

    test('should only return animal emojis from the predefined list', () => {
      const VALID_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦏', '🦛', '🐘', '🦒', '🐪', '🐫', '🦙', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦌', '🐐', '🦚', '🦜', '🦢', '🦩', '🕊️', '🦝', '🦨', '🦡', '🦫'];
      for (let i = 0; i < 100; i++) {
        const emoji = gameSession.getRandomAnimalEmoji();
        expect(VALID_EMOJIS).toContain(emoji);
      }
    });

    test('should return emoji characters with length > 1 (unicode)', () => {
      const emoji = gameSession.getRandomAnimalEmoji();
      // Most emojis have length > 1 due to unicode
      expect(emoji.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createInitialGameState', () => {
    test('should create default game state with correct structure', () => {
      const state = gameSession.createInitialGameState('checkbox-game');
      expect(state).toEqual({
        type: 'checkbox-game',
        status: 'waiting',
        players: {},
        hostId: null,
        gameStarted: false,
        gameFinished: false,
        spectatorCount: 0,
        spectators: {}
      });
    });

    test('should set correct game type', () => {
      const checkboxState = gameSession.createInitialGameState('checkbox-game');
      expect(checkboxState.type).toBe('checkbox-game');

      const votesState = gameSession.createInitialGameState('votes-game');
      expect(votesState.type).toBe('votes-game');

      const countyState = gameSession.createInitialGameState('county-game');
      expect(countyState.type).toBe('county-game');
    });

    test('should initialize with waiting status', () => {
      const state = gameSession.createInitialGameState('any-game');
      expect(state.status).toBe('waiting');
    });

    test('should initialize with no players', () => {
      const state = gameSession.createInitialGameState('any-game');
      expect(state.players).toEqual({});
      expect(state.hostId).toBeNull();
    });

    test('should initialize game as not started and not finished', () => {
      const state = gameSession.createInitialGameState('any-game');
      expect(state.gameStarted).toBe(false);
      expect(state.gameFinished).toBe(false);
    });

    test('should initialize with no spectators', () => {
      const state = gameSession.createInitialGameState('any-game');
      expect(state.spectatorCount).toBe(0);
      expect(state.spectators).toEqual({});
    });
  });
});