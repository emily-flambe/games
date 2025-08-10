/**
 * GameShell - Manages common game functionality across all games
 * Handles WebSocket connections, player management, room lifecycle, and UI shell
 */
class GameShell {
    constructor() {
        // WebSocket and connection management
        this.ws = null;
        this.sessionId = '';
        this.isConnected = false;
        
        // Player and room state
        this.currentPlayerId = null;
        this.currentPlayer = null;
        this.players = {};
        this.isSpectator = false;
        this.spectatorId = null;
        this.spectators = {};
        
        // Game state and module management
        this.gameType = '';
        this.gameModule = null;
        this.gameState = 'waiting'; // waiting, playing, finished
        this.roomState = {};
        
        // UI state
        this.currentView = 'portal';
        this.gameAreaElement = null;
        
        // Auto-refresh for active rooms
        this.refreshInterval = null;
        this.isRefreshing = false;
    }

    /**
     * Initialize the game shell
     */
    init() {
        this.setupEventListeners();
        this.loadActiveRooms();
        this.startActiveRoomsRefresh();
        this.initializeGameArea();
    }

    /**
     * Initialize the game area container where game modules will render
     */
    initializeGameArea() {
        this.gameAreaElement = document.getElementById('game-area');
        if (!this.gameAreaElement) {
            console.error('Game area element not found - games will not render properly');
        }
    }

    /**
     * Setup event listeners for shell functionality
     */
    setupEventListeners() {
        // Game selection
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const gameType = e.currentTarget.dataset.game;
                const isComingSoon = e.currentTarget.classList.contains('coming-soon');
                
                if (!isComingSoon && gameType) {
                    this.startGame(gameType);
                }
            });
        });

        // Room joining
        const joinRoomBtn = document.getElementById('join-room-btn');
        const roomCodeInput = document.getElementById('room-code-input');
        
        if (joinRoomBtn && roomCodeInput) {
            joinRoomBtn.addEventListener('click', () => this.joinRoomByCode());
            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.joinRoomByCode();
            });
            roomCodeInput.addEventListener('input', this.formatRoomCodeInput.bind(this));
        }

        // Leave room
        const leaveBtn = document.getElementById('leave-room-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => this.leaveGame());
        }

        // Player controls
        this.setupPlayerControls();

        // Start game button
        const startGameBtn = document.getElementById('start-game-btn-header');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => this.startGameSession());
        }
    }

    /**
     * Setup player control event listeners
     */
    setupPlayerControls() {
        const updateNameBtn = document.getElementById('update-name-btn');
        const nameInput = document.getElementById('player-name-input');
        const currentEmojiBtn = document.getElementById('current-emoji-btn');

        if (updateNameBtn && nameInput) {
            updateNameBtn.addEventListener('click', () => {
                const name = nameInput.value.trim();
                if (name) this.updatePlayerName(name);
            });
            
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const name = nameInput.value.trim();
                    if (name) this.updatePlayerName(name);
                }
            });
        }

        if (currentEmojiBtn) {
            currentEmojiBtn.addEventListener('click', () => this.showEmojiPicker());
        }

        // Close emoji picker when clicking outside
        document.addEventListener('click', (e) => {
            const picker = document.getElementById('emoji-picker');
            const emojiBtn = document.getElementById('current-emoji-btn');
            if (picker && !picker.contains(e.target) && e.target !== emojiBtn) {
                picker.style.display = 'none';
            }
        });
    }

    /**
     * Start a new game of the specified type
     */
    async startGame(gameType) {
        try {
            this.gameType = gameType;
            this.showLoadingOverlay();
            
            // Generate session ID and connect
            this.sessionId = this.generateSessionId();
            await this.connectToGame();
            
        } catch (error) {
            console.error('Failed to start game:', error);
            this.showError('Failed to start game: ' + error.message);
            this.hideLoadingOverlay();
        }
    }

    /**
     * Connect to game WebSocket
     */
    connectToGame() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/game/${this.sessionId}/ws`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to game session:', this.sessionId);
                this.isConnected = true;
                resolve();
            };
            
            this.ws.onmessage = (event) => this.handleWebSocketMessage(event);
            this.ws.onclose = () => this.handleWebSocketClose();
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('Received message:', message.type, message);

            switch (message.type) {
                case 'gameState':
                    this.handleGameStateUpdate(message);
                    break;
                case 'game_started':
                    this.handleGameStarted(message);
                    break;
                case 'game_ended':
                    this.handleGameEnded(message);
                    break;
                case 'playerJoined':
                case 'playerLeft':
                case 'playerUpdated':
                    this.handlePlayerUpdate(message);
                    break;
                case 'spectator_identity':
                case 'spectator_joined':
                case 'spectator_left':
                    this.handleSpectatorUpdate(message);
                    break;
                default:
                    // Pass unknown messages to game module
                    if (this.gameModule) {
                        this.gameModule.handlePlayerAction(message.playerId, message);
                    }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    /**
     * Handle game state updates from server
     */
    handleGameStateUpdate(message) {
        this.currentPlayerId = message.playerId;
        this.roomState = message.gameState;
        this.players = message.gameState.players || {};
        
        // Update current player reference
        this.currentPlayer = this.players[this.currentPlayerId];
        
        this.updateUI();
        this.hideLoadingOverlay();
        
        // Pass game-specific state to module
        if (this.gameModule && message.gameState.gameSpecificState) {
            this.gameModule.handleStateUpdate(message.gameState.gameSpecificState);
        }
    }

    /**
     * Handle game started message
     */
    handleGameStarted(message) {
        this.gameState = 'playing';
        
        // Load and initialize the appropriate game module
        this.loadGameModule(this.gameType).then(() => {
            if (this.gameModule) {
                this.gameModule.init(
                    this.gameAreaElement,
                    this.players,
                    message.data?.gameSpecificState,
                    (playerId, action) => this.sendPlayerAction(action),
                    (state) => this.onGameStateChange(state)
                );
            }
        });

        this.updateUI();
    }

    /**
     * Handle game ended message
     */
    handleGameEnded(message) {
        this.gameState = 'finished';
        
        if (this.gameModule) {
            this.gameModule.cleanup();
            this.gameModule = null;
        }
        
        this.showGameEndScreen(message.data);
        this.updateUI();
    }

    /**
     * Load the appropriate game module
     */
    async loadGameModule(gameType) {
        try {
            // For now, we'll implement checkbox game
            // Later this will be a dynamic module loading system
            if (gameType === 'checkbox-game') {
                // We'll create this in the next step
                this.gameModule = new CheckboxGameModule();
            } else {
                console.warn(`Game module not implemented: ${gameType}`);
                this.gameModule = null;
            }
        } catch (error) {
            console.error(`Failed to load game module ${gameType}:`, error);
            this.gameModule = null;
        }
    }

    /**
     * Send player action to server
     */
    sendPlayerAction(action) {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(action));
        }
    }

    /**
     * Handle game state changes from modules
     */
    onGameStateChange(state) {
        // Module is notifying us of state changes
        // We can use this to update shell UI or send to server
        console.log('Game module state change:', state);
    }

    /**
     * Update the main UI elements
     */
    updateUI() {
        this.updateView();
        this.updateRoomInfo();
        this.updatePlayersList();
        this.updateGameControls();
    }

    /**
     * Switch between portal and game room views
     */
    updateView() {
        const portalView = document.getElementById('game-portal');
        const roomView = document.getElementById('game-room');
        
        if (this.currentView === 'portal') {
            portalView?.classList.add('active');
            roomView?.classList.remove('active');
        } else {
            portalView?.classList.remove('active');
            roomView?.classList.add('active');
        }
    }

    // ... Additional shell methods will be implemented in next commits
    
    /**
     * Utility: Generate session ID
     */
    generateSessionId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    /**
     * Utility: Show error message
     */
    showError(message) {
        console.error(message);
        // TODO: Implement proper error UI
    }

    /**
     * Utility: Show/hide loading overlay
     */
    showLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameShell;
} else {
    window.GameShell = GameShell;
}