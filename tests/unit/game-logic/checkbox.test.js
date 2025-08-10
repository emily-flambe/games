/**
 * @file checkbox.test.js
 * @description Unit tests for checkbox game logic
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');

// Set up DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
  <body>
    <div id="checkbox-grid"></div>
    <div class="checkbox-item" data-index="0">
      <div class="checkbox-icon">☐</div>
    </div>
  </body>
  </html>
`, {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.WebSocket = jest.fn();

describe('Checkbox Game Logic', () => {
  let gameClient;
  
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="checkbox-grid"></div>
      <div class="checkbox-item" data-index="0">
        <div class="checkbox-icon">☐</div>
      </div>
    `;
    
    // Mock GameClient class with minimal required functionality
    class MockGameClient {
      constructor() {
        this.checkboxStates = new Array(9).fill(false);
        this.ws = { 
          send: jest.fn(),
          readyState: 1 // WebSocket.OPEN
        };
        this.isSpectator = false;
      }
      
      toggleCheckbox(checkboxIndex) {
        if (this.isSpectator) {
          throw new Error('Spectators cannot interact with the game');
        }
        
        if (this.ws && this.ws.readyState === 1) {
          // Add temporary visual feedback
          const checkboxItem = document.querySelector(`.checkbox-item[data-index="${checkboxIndex}"]`);
          if (checkboxItem) {
            checkboxItem.style.transform = 'scale(0.9)';
            setTimeout(() => {
              checkboxItem.style.transform = '';
            }, 150);
          }
          
          this.ws.send(JSON.stringify({
            type: 'TOGGLE_CHECKBOX',
            data: { checkboxIndex: checkboxIndex }
          }));
        }
      }
      
      updateCheckboxState(index, state) {
        if (index >= 0 && index < 9) {
          this.checkboxStates[index] = state;
        }
      }
      
      checkWinCondition() {
        return this.checkboxStates.every(state => state === true);
      }
      
      getCheckedCount() {
        return this.checkboxStates.filter(state => state === true).length;
      }
    }
    
    gameClient = new MockGameClient();
  });

  describe('Checkbox State Management', () => {
    test('should initialize with 9 unchecked checkboxes', () => {
      expect(gameClient.checkboxStates).toHaveLength(9);
      expect(gameClient.checkboxStates.every(state => state === false)).toBe(true);
    });

    test('should update checkbox state correctly', () => {
      gameClient.updateCheckboxState(0, true);
      expect(gameClient.checkboxStates[0]).toBe(true);
      expect(gameClient.checkboxStates[1]).toBe(false);
    });

    test('should handle invalid checkbox indices', () => {
      gameClient.updateCheckboxState(-1, true);
      gameClient.updateCheckboxState(9, true);
      expect(gameClient.checkboxStates.every(state => state === false)).toBe(true);
    });

    test('should toggle checkbox state correctly', () => {
      gameClient.updateCheckboxState(0, false);
      gameClient.updateCheckboxState(1, true);
      
      expect(gameClient.checkboxStates[0]).toBe(false);
      expect(gameClient.checkboxStates[1]).toBe(true);
    });
  });

  describe('Win Condition Detection', () => {
    test('should return false when no checkboxes are checked', () => {
      expect(gameClient.checkWinCondition()).toBe(false);
    });

    test('should return false when some checkboxes are checked', () => {
      gameClient.updateCheckboxState(0, true);
      gameClient.updateCheckboxState(4, true);
      gameClient.updateCheckboxState(8, true);
      
      expect(gameClient.checkWinCondition()).toBe(false);
    });

    test('should return true when all 9 checkboxes are checked', () => {
      // Check all 9 checkboxes
      for (let i = 0; i < 9; i++) {
        gameClient.updateCheckboxState(i, true);
      }
      
      expect(gameClient.checkWinCondition()).toBe(true);
    });

    test('should return false when 8 out of 9 checkboxes are checked', () => {
      // Check first 8 checkboxes
      for (let i = 0; i < 8; i++) {
        gameClient.updateCheckboxState(i, true);
      }
      
      expect(gameClient.checkWinCondition()).toBe(false);
    });
  });

  describe('Score Calculation', () => {
    test('should count checked checkboxes correctly', () => {
      expect(gameClient.getCheckedCount()).toBe(0);
      
      gameClient.updateCheckboxState(0, true);
      expect(gameClient.getCheckedCount()).toBe(1);
      
      gameClient.updateCheckboxState(4, true);
      gameClient.updateCheckboxState(8, true);
      expect(gameClient.getCheckedCount()).toBe(3);
    });

    test('should handle all checkboxes checked', () => {
      for (let i = 0; i < 9; i++) {
        gameClient.updateCheckboxState(i, true);
      }
      
      expect(gameClient.getCheckedCount()).toBe(9);
    });

    test('should handle mixed checkbox states', () => {
      gameClient.updateCheckboxState(0, true);
      gameClient.updateCheckboxState(1, false);
      gameClient.updateCheckboxState(2, true);
      gameClient.updateCheckboxState(3, true);
      gameClient.updateCheckboxState(4, false);
      
      expect(gameClient.getCheckedCount()).toBe(3);
    });
  });

  describe('Player Interactions', () => {
    test('should allow non-spectators to toggle checkboxes', () => {
      gameClient.isSpectator = false;
      
      expect(() => {
        gameClient.toggleCheckbox(0);
      }).not.toThrow();
      
      expect(gameClient.ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'TOGGLE_CHECKBOX',
          data: { checkboxIndex: 0 }
        })
      );
    });

    test('should prevent spectators from toggling checkboxes', () => {
      gameClient.isSpectator = true;
      
      expect(() => {
        gameClient.toggleCheckbox(0);
      }).toThrow('Spectators cannot interact with the game');
    });

    test('should handle WebSocket disconnection', () => {
      gameClient.ws.readyState = 3; // WebSocket.CLOSED
      
      // Should not throw but also should not send message
      gameClient.toggleCheckbox(0);
      expect(gameClient.ws.send).not.toHaveBeenCalled();
    });
  });

  describe('UI Interactions', () => {
    test('should send WebSocket message when toggling checkbox', () => {
      const checkboxItem = document.createElement('div');
      checkboxItem.className = 'checkbox-item';
      checkboxItem.setAttribute('data-index', '0');
      document.body.appendChild(checkboxItem);
      
      gameClient.toggleCheckbox(0);
      
      // Verify WebSocket message was sent
      expect(gameClient.ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'TOGGLE_CHECKBOX',
          data: { checkboxIndex: 0 }
        })
      );
    });

    test('should handle missing checkbox elements gracefully', () => {
      // Remove all checkbox elements
      document.querySelectorAll('.checkbox-item').forEach(el => el.remove());
      
      expect(() => {
        gameClient.toggleCheckbox(0);
      }).not.toThrow();
    });
  });
});