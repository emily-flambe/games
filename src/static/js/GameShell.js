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
        
        // Chat state
        this.chatMessages = [];
    }

    /**
     * Initialize the game shell
     */
    init() {
        this.setupEventListeners();
        this.checkURLForRoom();
        this.loadActiveRooms();
        this.startActiveRoomsRefresh();
        this.initializeGameArea();
    }

    /**
     * Check URL for room code and auto-join if present
     */
    checkURLForRoom() {
        const path = window.location.pathname;
        const roomMatch = path.match(/^\/([A-Z0-9]{6})$/);
        
        if (roomMatch) {
            const roomCode = roomMatch[1];
            // Auto-join the room after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.joinExistingRoom(roomCode);
            }, 100);
        }
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
        
        // Chat controls
        this.setupChatControls();

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            const path = window.location.pathname;
            const roomMatch = path.match(/^\/([A-Z0-9]{6})$/);
            
            if (roomMatch && !this.sessionId) {
                // User navigated to a room URL
                const roomCode = roomMatch[1];
                this.joinExistingRoom(roomCode);
            } else if (!roomMatch && this.sessionId) {
                // User navigated back to root from a room
                this.leaveGame();
            }
        });
    }

    /**
     * Setup chat control event listeners
     */
    setupChatControls() {
        const chatInput = document.getElementById('chat-input');
        const chatSendBtn = document.getElementById('chat-send-btn');
        
        if (chatInput && chatSendBtn) {
            // Enable chat when connected
            const enableChat = () => {
                if (this.isConnected && (this.gameState === 'playing' || this.gameState === 'finished')) {
                    chatInput.disabled = false;
                    chatSendBtn.disabled = false;
                }
            };
            
            // Send message handler
            const sendMessage = () => {
                const message = chatInput.value.trim();
                if (message && this.ws && this.isConnected) {
                    this.ws.send(JSON.stringify({
                        type: 'chat_message',
                        data: { message }
                    }));
                    chatInput.value = '';
                }
            };
            
            chatSendBtn.addEventListener('click', sendMessage);
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            // Store enableChat function for later use
            this.enableChat = enableChat;
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
            
            // Update URL to include room code
            window.history.pushState({roomCode: this.sessionId}, '', `/${this.sessionId}`);
            
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
            const gameTypeParam = this.gameType ? `?gameType=${encodeURIComponent(this.gameType)}` : '';
            const wsUrl = `${protocol}//${window.location.host}/api/game/${this.sessionId}/ws${gameTypeParam}`;
            
            console.log('Attempting to connect to WebSocket:', wsUrl, 'with gameType:', this.gameType);
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
                case 'chat_message':
                    this.handleChatMessage(message);
                    break;
                case 'chat_history':
                    this.handleChatHistory(message);
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
        // Check if this is a spectator message
        if (message.isSpectator || message.spectatorId) {
            this.isSpectator = true;
            this.spectatorId = message.spectatorId;
        } else {
            this.currentPlayerId = message.playerId;
        }
        
        this.roomState = message.gameState;
        this.players = message.gameState.players || {};
        
        // Set currentPlayer after updating players
        if (this.currentPlayerId && this.players[this.currentPlayerId]) {
            this.currentPlayer = this.players[this.currentPlayerId];
        }
        
        // Extract game type from server state
        if (message.gameState.type) {
            this.gameType = message.gameState.type;
            console.log('Game type from server:', this.gameType);
        }
        
        // Update spectators if present
        if (message.gameState.spectators) {
            this.spectators = message.gameState.spectators;
        }
        
        // Update game state based on server status
        if (message.gameState.gameStatus === 'finished') {
            this.gameState = 'finished';
        } else if (message.gameState.gameStatus === 'in-progress' || message.gameState.gameStarted) {
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
        
        // Load game module in waiting room to show rules
        if (this.gameState === 'waiting' && !this.gameModule && this.gameType) {
            this.loadGameModule(this.gameType).then(() => {
                if (this.gameModule) {
                    // Show rules box if game provides rules
                    this.updateRulesDisplay();
                }
            });
        }
        
        // If spectator and game is in progress, load the game module
        if (this.isSpectator && this.gameState === 'playing' && !this.gameModule) {
            this.loadGameModule(this.gameType || 'checkbox-game').then(() => {
                if (this.gameModule) {
                    this.gameModule.currentPlayerId = null; // No player ID for spectator
                    this.gameModule.isSpectator = true;
                    
                    // Get rules element
                    const rulesElement = document.getElementById('game-rules-content');
                    
                    this.gameModule.init(
                        this.gameAreaElement,
                        this.players,
                        message.gameState,
                        (action) => this.sendPlayerAction(action),
                        (state) => this.onGameStateChange(state),
                        rulesElement
                    );
                    
                    // Show rules box if game provides rules
                    this.updateRulesDisplay();
                }
            });
        }
        
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
                
                // Get rules element
                const rulesElement = document.getElementById('game-rules-content');
                
                this.gameModule.init(
                    this.gameAreaElement,
                    this.players,
                    message.data?.gameSpecificState,
                    (action) => this.sendPlayerAction(action),
                    (state) => this.onGameStateChange(state),
                    rulesElement
                );
                
                // Show rules box if game provides rules
                this.updateRulesDisplay();
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
            } else if (gameType === 'votes-game') {
                if (typeof EverybodyVotesGameModule !== 'undefined') {
                    this.gameModule = new EverybodyVotesGameModule();
                    console.log('✅ EverybodyVotesGameModule loaded successfully');
                } else {
                    console.error('EverybodyVotesGameModule class not found - check script loading');
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
        
        if (this.currentView === 'portal') {
            portalView?.classList.add('active');
            roomView?.classList.remove('active');
        } else {
            portalView?.classList.remove('active');
            roomView?.classList.add('active');
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
    async joinExistingRoom(roomCode, gameType = null) {
        try {
            // Don't set gameType yet - we'll get it from the server
            this.gameType = gameType; // May be null, will be set by server response
            this.sessionId = roomCode;
            this.showLoadingOverlay();
            this.stopActiveRoomsRefresh();
            
            // Update URL to include room code if not already there
            if (window.location.pathname !== `/${roomCode}`) {
                window.history.pushState({roomCode: roomCode}, '', `/${roomCode}`);
            }
            
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
        this.isConnected = false;
        this.ws = null;
        
        // Don't automatically return to portal on unexpected disconnections
        // Only do this if we're intentionally leaving (sessionId is cleared)
        if (!this.sessionId) {
            this.currentView = 'portal';
            this.updateView();
        } else {
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
            
            // Update currentPlayer if it's the current player who was updated
            if (this.currentPlayerId && this.players[this.currentPlayerId]) {
                this.currentPlayer = this.players[this.currentPlayerId];
            }
            
            // Update players in the game module too
            if (this.gameModule) {
                this.gameModule.updatePlayers(this.players);
            }
            
            this.updatePlayersList();
            this.updateCurrentPlayerInfo();
        }
    }

    /**
     * Handle incoming chat message
     */
    handleChatMessage(message) {
        if (message.data) {
            this.addChatMessage(message.data);
        }
    }
    
    /**
     * Handle chat history
     */
    handleChatHistory(message) {
        if (message.data && message.data.messages) {
            // Clear placeholder messages
            const chatMessagesEl = document.getElementById('chat-messages');
            if (chatMessagesEl) {
                chatMessagesEl.innerHTML = '';
            }
            
            // Add historical messages
            message.data.messages.forEach(msg => {
                this.addChatMessage(msg, false);
            });
        }
    }
    
    /**
     * Add a chat message to the UI
     */
    addChatMessage(messageData, scrollToBottom = true) {
        const chatMessagesEl = document.getElementById('chat-messages');
        if (!chatMessagesEl) return;
        
        // Create a wrapper for messages if it doesn't exist
        let messagesWrapper = chatMessagesEl.querySelector('.chat-messages-wrapper');
        if (!messagesWrapper) {
            messagesWrapper = document.createElement('div');
            messagesWrapper.className = 'chat-messages-wrapper';
            chatMessagesEl.appendChild(messagesWrapper);
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        
        const authorEl = document.createElement('span');
        authorEl.className = 'chat-author';
        authorEl.textContent = `${messageData.playerEmoji} ${messageData.playerName}${messageData.isSpectator ? ' (spectator)' : ''}:`;
        
        const textEl = document.createElement('span');
        textEl.className = 'chat-text';
        textEl.textContent = messageData.message;
        
        messageEl.appendChild(authorEl);
        messageEl.appendChild(textEl);
        
        messagesWrapper.appendChild(messageEl);
        
        // Store message
        this.chatMessages.push(messageData);
        
        // Scroll to bottom if requested
        if (scrollToBottom) {
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }
    }
    
    /**
     * Handle spectator update messages
     */
    handleSpectatorUpdate(message) {
        if (message.type === 'spectator_identity') {
            this.isSpectator = true;
            this.spectatorId = message.data.spectatorId;
            
            // CRITICAL: Ensure view stays on room for spectators
            this.currentView = 'room';
            
            // Update UI to show spectator mode
            this.showSpectatorUI();
            this.updateView();
            this.hideLoadingOverlay();
        }
        
        if (message.data && message.data.spectators) {
            this.spectators = message.data.spectators;
            this.updateSpectatorsDisplay();
            this.updateChatUsersList();
        }
        
        // Update game controls for spectator
        if (this.isSpectator) {
            this.updateGameControls();
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
        this.updateChatUsersList();
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
     * Update rules display based on game module
     */
    updateRulesDisplay() {
        const rulesBox = document.getElementById('rules-box');
        const rulesContent = document.getElementById('game-rules-content');
        
        if (this.gameModule && typeof this.gameModule.getRules === 'function') {
            const rules = this.gameModule.getRules();
            if (rules && rulesContent) {
                rulesContent.innerHTML = rules;
                if (rulesBox) {
                    rulesBox.style.display = 'block';
                }
            }
        } else if (rulesBox) {
            rulesBox.style.display = 'none';
        }
    }
    
    /**
     * Update game controls based on game state
     */
    updateGameControls() {
        const gameArea = document.getElementById('game-area');
        const chatArea = document.getElementById('chat-area');
        const chatInput = document.getElementById('chat-input');
        const chatSendBtn = document.getElementById('chat-send-btn');
        const playerControls = document.getElementById('player-controls');
        const playersList = document.querySelector('.players-list');

        // Special handling for spectators
        if (this.isSpectator) {
            // Always ensure spectator UI is visible
            this.showSpectatorUI();
            
            if (this.gameState === 'playing') {
                if (gameArea) gameArea.style.display = 'block';
                if (chatArea) {
                    chatArea.style.display = 'block'; // Show chat during game
                    // Enable chat for spectators too
                    if (chatInput) chatInput.disabled = false;
                    if (chatSendBtn) chatSendBtn.disabled = false;
                }
                if (playerControls) playerControls.style.display = 'none'; // Spectators can't control
                if (playersList) playersList.style.display = 'none'; // Hide during gameplay
            } else {
                if (gameArea) gameArea.style.display = 'none';
                if (chatArea) {
                    chatArea.style.display = 'none'; // Hide chat when not playing
                    if (chatInput) chatInput.disabled = true;
                    if (chatSendBtn) chatSendBtn.disabled = true;
                }
                if (playerControls) playerControls.style.display = 'none'; // Spectators can't control
                if (playersList) playersList.style.display = 'block'; // Show player list
            }
            return;
        }

        // Normal player controls
        if (this.gameState === 'playing') {
            if (gameArea) gameArea.style.display = 'block';
            if (chatArea) {
                chatArea.style.display = 'block'; // Show chat during game
                // Enable chat for players
                if (chatInput) chatInput.disabled = false;
                if (chatSendBtn) chatSendBtn.disabled = false;
            }
            if (playerControls) playerControls.style.display = 'none'; // Hide during gameplay
            if (playersList) playersList.style.display = 'none'; // Hide during gameplay
        } else if (this.gameState === 'finished') {
            if (gameArea) gameArea.style.display = 'block'; // Keep game visible for end screen
            if (chatArea) {
                chatArea.style.display = 'block'; // Keep chat visible at game end
                // Keep chat enabled at game end
                if (chatInput) chatInput.disabled = false;
                if (chatSendBtn) chatSendBtn.disabled = false;
            }
            if (playerControls) playerControls.style.display = 'none'; 
            if (playersList) playersList.style.display = 'none';
        } else if (this.gameState === 'waiting') {
            if (gameArea) gameArea.style.display = 'none';
            if (chatArea) {
                chatArea.style.display = 'block'; // Show chat in waiting room
                // Enable chat for waiting room
                if (chatInput) chatInput.disabled = false;
                if (chatSendBtn) chatSendBtn.disabled = false;
            }
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
            spectatorIndicator.innerHTML = '👁️👄👁️ you are a spectator. enjoy the show 👁️👄👁️';
            spectatorIndicator.style.cssText = `
                background: #17a2b8;
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: bold;
                margin: 10px 0;
                text-align: center;
                position: sticky;
                top: 0;
                z-index: 10000;
            `;
            
            // Insert after room-header instead of inside room-info
            const roomHeader = document.querySelector('.room-header');
            if (roomHeader && roomHeader.parentNode) {
                roomHeader.parentNode.insertBefore(spectatorIndicator, roomHeader.nextSibling);
            }
        }
        
        // Make sure it stays visible even when game area is shown
        const indicator = document.getElementById('spectator-indicator');
        if (indicator) {
            indicator.style.display = 'block';
        }
    }

    /**
     * Update the chat users list with players and spectators
     */
    updateChatUsersList() {
        const chatUsersList = document.getElementById('chat-users-list');
        if (!chatUsersList) return;
        
        chatUsersList.innerHTML = '';
        
        // Add players section if there are any players
        if (Object.keys(this.players).length > 0) {
            const playersSection = document.createElement('div');
            playersSection.className = 'chat-users-section';
            
            const playersHeader = document.createElement('div');
            playersHeader.className = 'chat-users-header';
            playersHeader.textContent = `Players (${Object.keys(this.players).length})`;
            playersSection.appendChild(playersHeader);
            
            Object.values(this.players).forEach(player => {
                const userItem = document.createElement('div');
                userItem.className = 'chat-user-item';
                
                const isHost = this.roomState.hostId === player.id;
                const isCurrentPlayer = player.id === this.currentPlayerId;
                
                userItem.innerHTML = `
                    <span class="chat-user-emoji">${player.emoji}</span>
                    <span class="chat-user-name">${player.name}${isCurrentPlayer ? ' (you!)' : ''}</span>
                    ${isHost ? '<span class="chat-user-badge">👑</span>' : ''}
                `;
                
                playersSection.appendChild(userItem);
            });
            
            chatUsersList.appendChild(playersSection);
        }
        
        // Add spectators section if there are any spectators
        if (Object.keys(this.spectators).length > 0) {
            const spectatorsSection = document.createElement('div');
            spectatorsSection.className = 'chat-users-section';
            
            const spectatorsHeader = document.createElement('div');
            spectatorsHeader.className = 'chat-users-header';
            spectatorsHeader.textContent = `Spectators (${Object.keys(this.spectators).length})`;
            spectatorsSection.appendChild(spectatorsHeader);
            
            Object.values(this.spectators).forEach(spectator => {
                const userItem = document.createElement('div');
                userItem.className = 'chat-user-item spectator';
                
                const isCurrentSpectator = spectator.id === this.spectatorId;
                
                userItem.innerHTML = `
                    <span class="chat-user-emoji">${spectator.emoji}</span>
                    <span class="chat-user-name">${spectator.name}${isCurrentSpectator ? ' (you!)' : ''}</span>
                `;
                
                spectatorsSection.appendChild(userItem);
            });
            
            chatUsersList.appendChild(spectatorsSection);
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
        // Update the chat users list to show spectators
        this.updateChatUsersList();
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
        
        // Restore root URL
        window.history.pushState({}, '', '/');
        
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
        
        // Hide rules box
        const rulesBox = document.getElementById('rules-box');
        if (rulesBox) {
            rulesBox.style.display = 'none';
        }
        const rulesContent = document.getElementById('game-rules-content');
        if (rulesContent) {
            rulesContent.innerHTML = '';
        }
        
        // Hide and reset chat area
        const chatArea = document.getElementById('chat-area');
        if (chatArea) {
            chatArea.style.display = 'none';
        }
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = '';
            chatInput.disabled = true;
        }
        const chatSendBtn = document.getElementById('chat-send-btn');
        if (chatSendBtn) {
            chatSendBtn.disabled = true;
        }
        this.chatMessages = [];
        
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
        // Special cases for specific games
        const gameNames = {
            'checkbox-game': 'Checkbox Game',
            'votes-game': 'Everybody Votes',
            'paddlin-game': "That's a Paddlin'",
            'bracketeering-game': 'Bracketeering',
            'price-game': 'The Price is Weird'
        };
        
        return gameNames[gameType] || gameType
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