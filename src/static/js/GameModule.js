/**
 * Base GameModule interface that all games must implement
 * This defines the contract between the GameShell and individual games
 */
class GameModule {
    constructor() {
        this.gameAreaElement = null;
        this.players = {};
        this.gameState = {};
        this.isActive = false;
        this.onPlayerAction = null; // Callback to shell
        this.onStateChange = null;  // Callback to shell
    }

    /**
     * Initialize the game module
     * @param {HTMLElement} gameAreaElement - The container where game UI should be rendered
     * @param {Object} players - Current players in the room
     * @param {Object} initialState - Initial game state from server
     * @param {Function} onPlayerAction - Callback for player actions (playerId, action)
     * @param {Function} onStateChange - Callback for state changes
     * @param {HTMLElement} rulesElement - Optional DOM element for game rules
     */
    init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
        this.gameAreaElement = gameAreaElement;
        this.players = players;
        this.gameState = initialState || {};
        this.onPlayerAction = onPlayerAction;
        this.onStateChange = onStateChange;
        this.rulesElement = rulesElement;
        this.isActive = true;
        
        // Populate rules if element provided and game has rules
        if (this.rulesElement && typeof this.getRules === 'function') {
            const rules = this.getRules();
            if (rules) {
                this.rulesElement.innerHTML = rules;
            }
        }
        
        this.render();
    }

    /**
     * Handle game state updates from server
     * @param {Object} gameSpecificState - New game state
     */
    handleStateUpdate(gameSpecificState) {
        this.gameState = { ...this.gameState, ...gameSpecificState };
        this.render();
    }

    /**
     * Update players data from shell
     * @param {Object} players - Updated players object
     */
    updatePlayers(players) {
        this.players = players;
        // Re-render if needed to reflect player changes (like emojis)
        this.render();
    }

    /**
     * Handle player actions (from other players via WebSocket)
     * @param {string} playerId - ID of player who performed action
     * @param {Object} action - The action data
     */
    handlePlayerAction(playerId, action) {
        // Default implementation - subclasses should override
        console.log(`Player ${playerId} performed action:`, action);
    }

    /**
     * Check if game has ended and return win condition
     * @returns {Object|null} - {winnerId, points} or null if game continues
     */
    getWinCondition() {
        // Default implementation - subclasses should override
        return null;
    }

    /**
     * Render the game UI
     * Should update the gameAreaElement with current game state
     */
    render() {
        // Default implementation - subclasses must override
        if (this.gameAreaElement) {
            this.gameAreaElement.innerHTML = '<p>Game module not implemented</p>';
        }
    }

    /**
     * Get game rules HTML (optional - override in subclasses)
     * @returns {string|null} HTML string for game rules or null if no rules
     */
    getRules() {
        return null;
    }
    
    /**
     * Clean up resources when game module is destroyed
     */
    cleanup() {
        this.isActive = false;
        if (this.gameAreaElement) {
            this.gameAreaElement.innerHTML = '';
        }
        if (this.rulesElement) {
            this.rulesElement.innerHTML = '';
        }
        this.gameAreaElement = null;
        this.rulesElement = null;
        this.players = {};
        this.gameState = {};
        this.onPlayerAction = null;
        this.onStateChange = null;
    }

    /**
     * Get the game's display name
     * @returns {string}
     */
    getDisplayName() {
        return 'Base Game';
    }

    /**
     * Get the game's unique identifier
     * @returns {string}
     */
    getGameType() {
        return 'base';
    }

    /**
     * Check if player is allowed to perform actions (not a spectator)
     * @param {string} playerId
     * @returns {boolean}
     */
    canPlayerAct(playerId) {
        const player = this.players[playerId];
        return player && !player.isSpectator;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameModule;
} else {
    window.GameModule = GameModule;
}