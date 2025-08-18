/**
 * Unit tests for County Game input preservation
 * @jest-environment jsdom
 */

describe('CountyGameModule Input Preservation', () => {
    let gameModule;
    let gameAreaElement;
    let mockOnPlayerAction;
    let mockOnStateChange;
    
    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = `
            <div id="game-area"></div>
        `;
        gameAreaElement = document.getElementById('game-area');
        
        // Mock functions
        mockOnPlayerAction = jest.fn();
        mockOnStateChange = jest.fn();
        
        // Create module instance
        const CountyGameModule = require('../../src/static/js/games/CountyGameModule.js');
        gameModule = new CountyGameModule();
        
        // Initialize with test data
        const players = {
            'player1': { id: 'player1', name: 'Player 1', emoji: '😀' },
            'player2': { id: 'player2', name: 'Player 2', emoji: '😎' }
        };
        
        const initialState = {
            phase: 'COUNTY_SUBMISSION',
            counties: {},
            hostId: 'player1',
            submissionEndTime: Date.now() + 30000
        };
        
        gameModule.currentPlayerId = 'player1';
        gameModule.init(gameAreaElement, players, initialState, mockOnPlayerAction, mockOnStateChange);
    });
    
    afterEach(() => {
        // Clean up
        if (gameModule) {
            gameModule.cleanup();
        }
        document.body.innerHTML = '';
    });
    
    test('preserves input value when render is called', () => {
        // Type something in the input
        const input = gameAreaElement.querySelector('#county-input');
        expect(input).toBeTruthy();
        input.value = 'Test County';
        
        // Call render
        gameModule.render();
        
        // Check input value is preserved
        const newInput = gameAreaElement.querySelector('#county-input');
        expect(newInput).toBeTruthy();
        expect(newInput.value).toBe('Test County');
    });
    
    test('does not preserve input after submission', () => {
        // Submit a county
        gameModule.myCounty = 'Submitted County';
        
        // Type something in the input (this shouldn't happen in real scenario but testing edge case)
        const input = gameAreaElement.querySelector('#county-input');
        if (input) {
            input.value = 'Should Not Preserve';
        }
        
        // Call render
        gameModule.render();
        
        // After submission, the input field shouldn't exist
        const newInput = gameAreaElement.querySelector('#county-input');
        expect(newInput).toBeFalsy();
    });
    
    test('updates submission status without re-rendering', () => {
        // Get initial input and status
        const input = gameAreaElement.querySelector('#county-input');
        input.value = 'My County';
        
        const initialStatus = gameAreaElement.querySelector('.submission-status');
        expect(initialStatus.textContent).toContain('0 of 2 players submitted');
        
        // Update submission count
        gameModule.submittedCount = 1;
        gameModule.updateSubmissionStatus();
        
        // Check that input is still there with same value
        const sameInput = gameAreaElement.querySelector('#county-input');
        expect(sameInput).toBe(input); // Should be the same element
        expect(sameInput.value).toBe('My County');
        
        // Check that status was updated
        const updatedStatus = gameAreaElement.querySelector('.submission-status');
        expect(updatedStatus.textContent).toContain('1 of 2 players submitted');
    });
    
    test('handleStateUpdate does not render during submission phase', () => {
        // Spy on render method
        const renderSpy = jest.spyOn(gameModule, 'render');
        
        // Type something in input
        const input = gameAreaElement.querySelector('#county-input');
        input.value = 'Test Input';
        
        // Handle state update while in submission phase
        gameModule.handleStateUpdate({
            phase: 'COUNTY_SUBMISSION',
            counties: { 'player2': 'Other County' }
        });
        
        // Render should not have been called
        expect(renderSpy).not.toHaveBeenCalled();
        
        // Input value should still be there
        const sameInput = gameAreaElement.querySelector('#county-input');
        expect(sameInput.value).toBe('Test Input');
    });
    
    test('handleStateUpdate renders when phase changes', () => {
        // Spy on render method
        const renderSpy = jest.spyOn(gameModule, 'render');
        
        // Handle state update with phase change
        gameModule.handleStateUpdate({
            phase: 'COUNTY_ANNOUNCEMENT'
        });
        
        // Render should have been called
        expect(renderSpy).toHaveBeenCalled();
    });
    
    test('submission_update message updates status without rendering', () => {
        // Spy on methods
        const renderSpy = jest.spyOn(gameModule, 'render');
        const updateStatusSpy = jest.spyOn(gameModule, 'updateSubmissionStatus');
        
        // Type something in input
        const input = gameAreaElement.querySelector('#county-input');
        input.value = 'Test Input';
        
        // Handle submission_update message
        gameModule.handleMessage({
            type: 'submission_update',
            submittedCount: 1,
            totalPlayers: 2
        });
        
        // updateSubmissionStatus should have been called, not render
        expect(updateStatusSpy).toHaveBeenCalled();
        expect(renderSpy).not.toHaveBeenCalled();
        
        // Input value should still be there
        const sameInput = gameAreaElement.querySelector('#county-input');
        expect(sameInput.value).toBe('Test Input');
    });
});