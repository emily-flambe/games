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
            
            console.log('Attempting to connect to WebSocket:', wsUrl);
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ Connected to game session:', this.sessionId);
                this.isConnected = true;
                resolve();
            };
            
            this.ws.onmessage = (event) => this.handleWebSocketMessage(event);
            this.ws.onclose = (event) => {
                console.log('❌ WebSocket closed with code:', event.code, 'reason:', event.reason);
                this.handleWebSocketClose();
            };
            this.ws.onerror = (error) => {
                console.error('💥 WebSocket error:', error);
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
                case 'checkbox_toggled':
                    // Handle checkbox specific messages
                    if (this.gameModule && message.data) {
                        const playerId = message.data.toggledBy || message.playerId;
                        this.gameModule.handlePlayerAction(playerId, message);
                    }
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
        
        // Update game state based on server status
        if (message.gameState.gameStatus === 'finished') {
            this.gameState = 'finished';
        } else if (message.gameState.gameStatus === 'in-progress') {
            this.gameState = 'playing';
        } else {
            this.gameState = 'waiting';
        }
        
        // Ensure view switches to room when we have a session
        if (this.sessionId && this.currentView === 'portal') {
            this.currentView = 'room';
        }
        
        this.updateUI();
        this.hideLoadingOverlay();
        
        // Pass both updated players and game-specific state to module
        if (this.gameModule) {
            // Update players in the module
            this.gameModule.updatePlayers(this.players);
            
            // Pass game-specific state to module
            if (message.gameState.gameSpecificState) {
                this.gameModule.handleStateUpdate(message.gameState.gameSpecificState);
            }
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
                // Pass current player context to module
                this.gameModule.currentPlayerId = this.currentPlayerId;
                this.gameModule.isSpectator = this.isSpectator;
                
                this.gameModule.init(
                    this.gameAreaElement,
                    this.players,
                    message.data?.gameSpecificState,
                    (action) => this.sendPlayerAction(action),
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
        
        // Clean up game module but keep it for potential restart
        if (this.gameModule) {
            this.gameModule.cleanup();
            // Don't set to null yet - keep reference until user leaves
        }
        
        this.showGameEndScreen(message.data);
        this.updateUI();
    }

    /**
     * Load the appropriate game module
     */
    async loadGameModule(gameType) {
        try {
            console.log(`Loading game module: ${gameType}`);
            
            if (gameType === 'checkbox-game') {
                if (typeof CheckboxGameModule !== 'undefined') {
                    this.gameModule = new CheckboxGameModule();
                    console.log('✅ CheckboxGameModule loaded successfully');
                } else {
                    console.error('CheckboxGameModule class not found - check script loading');
                    this.gameModule = null;
                }
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
            console.log('Sending player action:', action);
            this.ws.send(JSON.stringify(action));
        } else {
            console.error('Cannot send action - WebSocket not connected');
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
        
        console.log('🔄 updateView called - currentView:', this.currentView, 'sessionId:', this.sessionId);
        console.log('🔍 DOM elements found - portal:', !!portalView, 'room:', !!roomView);
        
        if (this.currentView === 'portal') {
            portalView?.classList.add('active');
            roomView?.classList.remove('active');
            console.log('📱 Switched to PORTAL view');
        } else {
            portalView?.classList.remove('active');
            roomView?.classList.add('active');
            console.log('🏠 Switched to ROOM view');
        }
    }

    /**
     * Join room by entering room code
     */
    joinRoomByCode() {
        const roomCodeInput = document.getElementById('room-code-input');
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        
        if (roomCode) {
            this.joinExistingRoom(roomCode);
        } else {
            this.showError('Please enter a room code');
        }
    }

    /**
     * Join an existing room
     */
    async joinExistingRoom(roomCode) {
        try {
            this.gameType = 'checkbox-game'; // Default for now
            this.sessionId = roomCode;
            this.showLoadingOverlay();
            this.stopActiveRoomsRefresh();
            await this.connectToGame();
        } catch (error) {
            console.error('Failed to join room:', error);
            this.showError('Failed to join room: ' + error.message);
            this.hideLoadingOverlay();
        }
    }

    /**
     * Format room code input
     */
    formatRoomCodeInput(e) {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length > 6) {
            value = value.substring(0, 6);
        }
        e.target.value = value;
    }

    /**
     * Handle WebSocket close
     */
    handleWebSocketClose() {
        console.log('❌ WebSocket connection closed - currentView:', this.currentView, 'sessionId:', this.sessionId);
        this.isConnected = false;
        this.ws = null;
        
        // Don't automatically return to portal on unexpected disconnections
        // Only do this if we're intentionally leaving (sessionId is cleared)
        if (!this.sessionId) {
            console.log('🏠 Intentional disconnect - returning to portal');
            this.currentView = 'portal';
            this.updateView();
        } else {
            console.log('⚠️ Unexpected disconnect - maintaining room view');
            // Keep the room view active even without connection
            // This allows users to see the room state even if connection drops
        }
    }

    /**
     * Handle player update messages
     */
    handlePlayerUpdate(message) {
        if (message.gameState) {
            this.players = message.gameState.players || {};
            
            // Update players in the game module too
            if (this.gameModule) {
                this.gameModule.updatePlayers(this.players);
            }
            
            this.updatePlayersList();
        }
    }

    /**
     * Handle spectator update messages
     */
    handleSpectatorUpdate(message) {
        console.log('Spectator update:', message.type, message);
        
        if (message.type === 'spectator_identity') {
            this.isSpectator = true;
            this.spectatorId = message.data.spectator.id;
            this.showSpectatorUI();
        }
        
        if (message.data && message.data.spectators) {
            this.spectators = message.data.spectators;
            this.updateSpectatorsDisplay();
        }
    }

    /**
     * Start game session (host only)
     */
    startGameSession() {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
                type: 'START_GAME',
                data: { gameType: this.gameType }
            }));
        }
    }

    /**
     * Update player name
     */
    updatePlayerName(name) {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
                type: 'change_name',
                data: { newName: name }
            }));
        }
    }

    /**
     * Show emoji picker
     */
    showEmojiPicker() {
        const picker = document.getElementById('emoji-picker');
        if (picker) {
            picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
            
            // Initialize emoji grid if not already done
            const emojiGrid = document.getElementById('emoji-grid');
            if (emojiGrid && emojiGrid.children.length === 0) {
                this.initializeEmojiGrid();
            }
        }
    }

    /**
     * Initialize emoji picker grid
     */
    initializeEmojiGrid() {
        const emojiGrid = document.getElementById('emoji-grid');
        if (!emojiGrid) return;

        const animalEmojis = [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
            '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
            '🐧', '🐦', '🐤', '🐣', '🐺', '🐗', '🐴', '🦄',
            '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗',
            '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦀', '🐡'
        ];

        animalEmojis.forEach(emoji => {
            const emojiBtn = document.createElement('button');
            emojiBtn.textContent = emoji;
            emojiBtn.style.cssText = 'border: none; background: none; font-size: 24px; cursor: pointer; padding: 5px; border-radius: 4px;';
            emojiBtn.addEventListener('click', () => {
                this.selectEmoji(emoji);
            });
            emojiBtn.addEventListener('mouseover', () => {
                emojiBtn.style.background = '#f0f0f0';
            });
            emojiBtn.addEventListener('mouseout', () => {
                emojiBtn.style.background = 'none';
            });
            emojiGrid.appendChild(emojiBtn);
        });
    }

    /**
     * Select emoji
     */
    selectEmoji(emoji) {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
                type: 'change_emoji',
                data: { newEmoji: emoji }
            }));
        }
        
        // Update button immediately for feedback
        const emojiBtn = document.getElementById('current-emoji-btn');
        if (emojiBtn) {
            emojiBtn.textContent = emoji;
        }
        
        // Hide picker
        const picker = document.getElementById('emoji-picker');
        if (picker) {
            picker.style.display = 'none';
        }
    }

    /**
     * Update room info display
     */
    updateRoomInfo() {
        if (this.sessionId) {
            this.currentView = 'room';
            
            const gameTitle = document.getElementById('game-title');
            if (gameTitle) {
                gameTitle.textContent = this.formatGameName(this.gameType);
            }
            
            const roomCode = document.getElementById('room-code-display');
            if (roomCode) {
                roomCode.textContent = this.sessionId;
            }
        }
    }

    /**
     * Update players list display
     */
    updatePlayersList() {
        const container = document.getElementById('players-container');
        if (!container) return;

        container.innerHTML = '';

        Object.values(this.players).forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            playerDiv.dataset.playerId = player.id;

            const isHost = this.roomState.hostId === player.id;
            const isCurrentPlayer = player.id === this.currentPlayerId;

            playerDiv.innerHTML = `
                <span class="player-emoji">${player.emoji}</span>
                <span class="player-name">${player.name}</span>
                <span class="player-status">
                    ${isHost ? '👑 Host' : ''}
                    ${isCurrentPlayer ? '(You)' : ''}
                </span>
            `;

            container.appendChild(playerDiv);
        });

        this.updateStartGameButton();
        this.updateCurrentPlayerInfo();
    }

    /**
     * Update start game button state
     */
    updateStartGameButton() {
        const startButton = document.getElementById('start-game-btn-header');
        if (!startButton) return;

        const isHost = this.roomState.hostId === this.currentPlayerId;
        const gameNotStarted = this.gameState === 'waiting';

        if (isHost && gameNotStarted) {
            startButton.style.display = 'block';
            startButton.disabled = false;
        } else {
            startButton.style.display = 'none';
        }
    }

    /**
     * Update current player info displays
     */
    updateCurrentPlayerInfo() {
        if (!this.currentPlayer) return;

        const nameInput = document.getElementById('player-name-input');
        if (nameInput) {
            nameInput.value = this.currentPlayer.name;
        }

        const emojiBtn = document.getElementById('current-emoji-btn');
        if (emojiBtn) {
            emojiBtn.textContent = this.currentPlayer.emoji;
        }
    }

    /**
     * Update game controls based on game state
     */
    updateGameControls() {
        const gameArea = document.getElementById('game-area');
        const playerControls = document.getElementById('player-controls');
        const playersList = document.querySelector('.players-list');

        if (this.gameState === 'playing') {
            if (gameArea) gameArea.style.display = 'block';
            if (playerControls) playerControls.style.display = 'none'; // Hide during gameplay
            if (playersList) playersList.style.display = 'none'; // Hide during gameplay
        } else if (this.gameState === 'finished') {
            if (gameArea) gameArea.style.display = 'block'; // Keep game visible for end screen
            if (playerControls) playerControls.style.display = 'none'; 
            if (playersList) playersList.style.display = 'none';
        } else if (this.gameState === 'waiting') {
            if (gameArea) gameArea.style.display = 'none';
            if (playerControls) playerControls.style.display = 'block';
            if (playersList) playersList.style.display = 'block';
        }
    }

    /**
     * Show spectator UI
     */
    showSpectatorUI() {
        // Add spectator indicator if not already present
        let spectatorIndicator = document.getElementById('spectator-indicator');
        if (!spectatorIndicator) {
            spectatorIndicator = document.createElement('div');
            spectatorIndicator.id = 'spectator-indicator';
            spectatorIndicator.className = 'spectator-indicator';
            spectatorIndicator.innerHTML = '👀 Spectator Mode';
            
            const roomInfo = document.querySelector('.room-info');
            if (roomInfo) {
                roomInfo.appendChild(spectatorIndicator);
            }
        }
    }

    /**
     * Update spectators display
     */
    updateSpectatorsDisplay() {
        const spectatorCount = Object.keys(this.spectators).length;
        if (spectatorCount > 0) {
            // Show spectator count somewhere in UI
            console.log(`${spectatorCount} spectators watching`);
        }
    }

    /**
     * Show game end screen
     */
    showGameEndScreen(gameEndData) {
        const endScreen = document.getElementById('end-game-screen');
        const resultMessage = document.getElementById('game-result-message');
        const finalScores = document.getElementById('final-scores');
        
        if (endScreen && resultMessage && finalScores) {
            // Update message with server's result message
            resultMessage.textContent = gameEndData.message || 'Game Complete!';
            
            // Show final scores - server sends 'scores', not 'finalScores'
            const scores = gameEndData.scores || gameEndData.finalScores;
            if (scores) {
                finalScores.innerHTML = '';
                Object.entries(scores).forEach(([playerId, score]) => {
                    const player = this.players[playerId];
                    if (player) {
                        const scoreItem = document.createElement('div');
                        scoreItem.className = 'final-score-item';
                        scoreItem.innerHTML = `${player.emoji} ${player.name}: ${score}`;
                        finalScores.appendChild(scoreItem);
                    }
                });
            }
            
            endScreen.style.display = 'block';
            
            // Handle OK button - return to lobby
            const okBtn = document.getElementById('ok-btn');
            if (okBtn) {
                okBtn.onclick = () => {
                    endScreen.style.display = 'none';
                    // Return to lobby/portal
                    this.leaveGame();
                };
            }
        }
    }

    /**
     * Leave game and return to portal
     */
    leaveGame() {
        if (this.ws) {
            this.ws.close();
        }
        
        // Clean up game module
        if (this.gameModule) {
            this.gameModule.cleanup();
            this.gameModule = null;
        }
        
        // Reset all state
        this.currentPlayerId = null;
        this.currentPlayer = null;
        this.players = {};
        this.sessionId = '';
        this.gameType = '';
        this.gameState = 'waiting';
        this.roomState = {};
        this.isSpectator = false;
        this.spectatorId = null;
        this.spectators = {};
        
        // Clean up UI
        this.cleanupGameUI();
        
        // Return to portal
        this.currentView = 'portal';
        this.updateView();
        this.loadActiveRooms();
        this.startActiveRoomsRefresh();
    }

    /**
     * Clean up game-specific UI elements
     */
    cleanupGameUI() {
        // Hide game area
        const gameArea = document.getElementById('game-area');
        if (gameArea) {
            gameArea.style.display = 'none';
            gameArea.innerHTML = '';
        }
        
        // Hide end game screen
        const endScreen = document.getElementById('end-game-screen');
        if (endScreen) endScreen.style.display = 'none';
        
        // Remove spectator indicator
        const spectatorIndicator = document.getElementById('spectator-indicator');
        if (spectatorIndicator) spectatorIndicator.remove();
        
        // Clear players
        const playersContainer = document.getElementById('players-container');
        if (playersContainer) playersContainer.innerHTML = '';
        
        // Clear name input
        const nameInput = document.getElementById('player-name-input');
        if (nameInput) nameInput.value = '';
        
        // Remove floating emojis
        document.querySelectorAll('.floating-emoji').forEach(el => el.remove());
    }

    /**
     * Load active rooms (placeholder - integrate with existing logic)
     */
    loadActiveRooms() {
        // This will integrate with the existing active rooms logic
        console.log('Loading active rooms...');
    }

    /**
     * Start/stop active rooms refresh
     */
    startActiveRoomsRefresh() {
        // Integrate with existing refresh logic
        console.log('Starting active rooms refresh...');
    }

    stopActiveRoomsRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Format game name for display
     */
    formatGameName(gameType) {
        return gameType
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

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