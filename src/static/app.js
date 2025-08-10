// Premium Web Games Online Incorporated LLC Esq. GPT CBD - Vanilla JavaScript
console.log('Premium Web Games Online Incorporated LLC Esq. GPT CBD Loading...');

class GameClient {
    constructor() {
        this.ws = null;
        this.currentView = 'portal';
        this.gameType = '';
        this.sessionId = '';
        this.currentPlayerId = null;
        this.currentPlayer = null;
        this.checkboxStates = new Array(9).fill(false); // 3x3 grid of checkboxes
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadActiveRooms();
        console.log('Game client initialized');
    }

    setupEventListeners() {
        // Game card clicks
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const gameType = e.currentTarget.dataset.game;
                if (gameType) {
                    this.startGame(gameType);
                }
            });
        });

        // Join room functionality
        const joinRoomBtn = document.getElementById('join-room-btn');
        const roomCodeInput = document.getElementById('room-code-input');
        
        if (joinRoomBtn && roomCodeInput) {
            joinRoomBtn.addEventListener('click', () => {
                const roomCode = roomCodeInput.value.trim().toUpperCase();
                if (roomCode) {
                    this.joinExistingRoom(roomCode);
                } else {
                    this.showError('Please enter a room code');
                }
            });
            
            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const roomCode = roomCodeInput.value.trim().toUpperCase();
                    if (roomCode) {
                        this.joinExistingRoom(roomCode);
                    } else {
                        this.showError('Please enter a room code');
                    }
                }
            });

            // Format room code input as user types (uppercase, 6 chars max)
            roomCodeInput.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 6) {
                    value = value.substring(0, 6);
                }
                e.target.value = value;
            });
        }

        // Leave room button
        const leaveBtn = document.getElementById('leave-room-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => this.leaveGame());
        }

        // Hello World specific controls
        const updateNameBtn = document.getElementById('update-name-btn');
        const nameInput = document.getElementById('player-name-input');
        const currentEmojiBtn = document.getElementById('current-emoji-btn');

        if (updateNameBtn && nameInput) {
            updateNameBtn.addEventListener('click', () => {
                const name = nameInput.value.trim();
                if (name) {
                    this.updateName(name);
                }
            });
            
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const name = nameInput.value.trim();
                    if (name) {
                        this.updateName(name);
                    }
                }
            });
        }

        if (currentEmojiBtn) {
            currentEmojiBtn.addEventListener('click', () => {
                this.toggleEmojiPicker();
            });
            this.setupEmojiPicker();
        }

        // Close emoji picker when clicking outside
        document.addEventListener('click', (e) => {
            const emojiPicker = document.getElementById('emoji-picker');
            const emojiBtn = document.getElementById('current-emoji-btn');
            if (emojiPicker && !emojiPicker.contains(e.target) && e.target !== emojiBtn) {
                emojiPicker.style.display = 'none';
            }
        });

        // Start Game button functionality
        const startGameBtnHeader = document.getElementById('start-game-btn-header');
        if (startGameBtnHeader) {
            startGameBtnHeader.addEventListener('click', () => {
                // Only allow host to start the game
                if (this.isCurrentPlayerHost()) {
                    this.startGameSession();
                } else {
                    this.showError('Only the host can start the game');
                }
            });
        }
    }

    startGame(gameType) {
        console.log('Starting game:', gameType);
        this.gameType = gameType;
        this.sessionId = Math.random().toString(36).substr(2, 6).toUpperCase();
        
        this.connectWebSocket();
        this.showGameRoom();
        
        // Show universal player controls for ALL games
        const controls = document.getElementById('player-controls');
        if (controls) controls.style.display = 'block';
        
        // Initialize game-specific functionality
        if (gameType === 'checkbox-game') {
            this.initializeCheckboxGrid();
        }
        
        // Clear the room code input
        const roomCodeInput = document.getElementById('room-code-input');
        if (roomCodeInput) roomCodeInput.value = '';
    }

    joinExistingRoom(roomCode) {
        console.log('Joining existing room:', roomCode);
        this.gameType = 'checkbox-game'; // Default to checkbox game
        this.sessionId = roomCode;
        
        this.connectWebSocket();
        this.showGameRoom();
        
        // Show universal player controls for ALL games
        const controls = document.getElementById('player-controls');
        if (controls) controls.style.display = 'block';
        
        // Initialize game-specific functionality
        if (this.gameType === 'checkbox-game') {
            this.initializeCheckboxGrid();
        }
        
        // Clear the room code input
        const roomCodeInput = document.getElementById('room-code-input');
        if (roomCodeInput) roomCodeInput.value = '';
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/game/${this.sessionId}/ws`;
        
        console.log('Connecting to WebSocket:', wsUrl);
        console.log('Session ID:', this.sessionId);
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus(true);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus(false);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.showError('Failed to connect to server');
        }
    }

    handleMessage(message) {
        console.log('Received message:', message);
        
        switch (message.type) {
            case 'player_identity':
                this.currentPlayerId = message.data.playerId;
                this.currentPlayer = message.data.player;
                this.updateCurrentPlayerInfo();
                this.updateStartGameButton();
                break;
            case 'host_assigned':
                // Handle host assignment - this is just informational
                console.log('Player assigned as host:', message.data.hostId);
                this.updateStartGameButton();
                break;
            case 'name_changed':
                this.gameState = message.data.gameState;
                this.updatePlayers(message.data.gameState.players);
                this.updateBouncingEmojis(message.data.gameState.players);
                this.refreshEmojiPicker();
                // Update current player info if it's our player that changed name
                if (message.data.playerId === this.currentPlayerId) {
                    const updatedPlayer = message.data.gameState.players[this.currentPlayerId];
                    if (updatedPlayer) {
                        this.currentPlayer = updatedPlayer;
                        this.updateCurrentPlayerInfo();
                        this.showSuccessMessage(`Name updated to: ${updatedPlayer.name}`);
                    }
                }
                break;
            case 'emoji_changed':
                this.gameState = message.data.gameState;
                this.updatePlayers(message.data.gameState.players);
                this.updateBouncingEmojis(message.data.gameState.players);
                this.refreshEmojiPicker();
                // Update current player info if it's our player that changed emoji
                if (message.data.playerId === this.currentPlayerId) {
                    const updatedPlayer = message.data.gameState.players[this.currentPlayerId];
                    if (updatedPlayer) {
                        this.currentPlayer = updatedPlayer;
                        this.updateCurrentPlayerInfo();
                    }
                }
                break;
            case 'player_joined':
            case 'playerJoined':
                this.gameState = message.gameState ? message.gameState : message.data.gameState;
                this.updatePlayers(message.gameState ? message.gameState.players : message.data.gameState.players);
                this.updateBouncingEmojis(message.gameState ? message.gameState.players : message.data.gameState.players);
                this.refreshEmojiPicker();
                break;
            case 'playerLeft':
                this.gameState = message.gameState;
                this.updatePlayers(message.gameState.players);
                this.updateBouncingEmojis(message.gameState.players);
                this.refreshEmojiPicker();
                break;
            case 'game_state':
            case 'gameState':
                this.gameState = message.data ? message.data : message.gameState;
                // Set current player ID if provided in the message
                if (message.playerId && !this.currentPlayerId) {
                    this.currentPlayerId = message.playerId;
                }
                this.updatePlayers(message.data ? message.data.players : message.gameState.players);
                this.updateBouncingEmojis(message.data ? message.data.players : message.gameState.players);
                this.refreshEmojiPicker();
                // Update current player info if we have playerId and players data
                if (this.currentPlayerId && this.gameState && this.gameState.players) {
                    const currentPlayer = this.gameState.players[this.currentPlayerId];
                    if (currentPlayer) {
                        this.currentPlayer = currentPlayer;
                        this.updateCurrentPlayerInfo();
                    }
                }
                // 🐰 Game Logic Specialist: Sync checkbox states when game state is received
                if (this.gameType === 'checkbox-game' && this.gameState && this.gameState.checkboxStates) {
                    console.log('🐰 Game Logic Specialist: Syncing checkbox states from game state');
                    this.checkboxStates = this.gameState.checkboxStates;
                    this.updateAllCheckboxes();
                }
                break;
            case 'playerUpdated':
                this.gameState = message.gameState;
                this.updatePlayers(message.gameState.players);
                this.updateBouncingEmojis(message.gameState.players);
                this.refreshEmojiPicker();
                // Update current player info if it's our player that was updated
                if (this.currentPlayerId) {
                    const updatedPlayer = message.gameState.players[this.currentPlayerId];
                    if (updatedPlayer) {
                        this.currentPlayer = updatedPlayer;
                        this.updateCurrentPlayerInfo();
                    }
                }
                break;
            case 'checkbox_toggled':
                // Handle checkbox toggle from server
                if (message.data && message.data.checkboxIndex !== undefined && message.data.newState !== undefined) {
                    this.checkboxStates[message.data.checkboxIndex] = message.data.newState;
                    this.updateCheckboxUI(message.data.checkboxIndex, message.data.newState);
                }
                // Update game state if provided in data
                if (message.data && message.data.gameState) {
                    this.gameState = message.data.gameState;
                    if (message.data.gameState.checkboxStates) {
                        this.checkboxStates = message.data.gameState.checkboxStates;
                        this.updateAllCheckboxes();
                    }
                    this.updatePlayers(message.data.gameState.players);
                    this.updatePlayerCount();
                }
                break;
            case 'game_started':
                // Handle game start notification from server
                console.log('🐰 Game Logic Specialist: Received game_started message');
                if (message.data && message.data.gameType) {
                    this.handleGameStart(message.data.gameType);
                }
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    updatePlayers(players) {
        const container = document.getElementById('players-container');
        if (!container) return;

        container.innerHTML = '';

        if (!players) {
            console.log('No players data received');
            return;
        }

        Object.values(players).forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player';
            playerDiv.style.display = 'flex';
            playerDiv.style.alignItems = 'center';
            playerDiv.style.gap = '10px';
            playerDiv.style.padding = '8px';
            playerDiv.style.backgroundColor = '#f5f5f5';
            playerDiv.style.borderRadius = '4px';
            playerDiv.style.marginBottom = '5px';
            
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'player-emoji';
            emojiSpan.textContent = player.emoji || '😀';
            emojiSpan.style.fontSize = '20px';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name || 'Unknown Player';
            nameSpan.style.fontWeight = 'bold';
            nameSpan.style.flex = '1';
            
            const statusSpan = document.createElement('span');
            statusSpan.className = 'player-status';
            statusSpan.style.display = 'flex';
            statusSpan.style.alignItems = 'center';
            statusSpan.style.gap = '5px';
            
            // Connection status
            const connectionSpan = document.createElement('span');
            connectionSpan.textContent = player.connected ? '✓' : '○';
            connectionSpan.style.color = player.connected ? 'green' : 'gray';
            connectionSpan.style.fontWeight = 'bold';
            statusSpan.appendChild(connectionSpan);
            
            // Host indicator
            if (player.isHost) {
                const hostSpan = document.createElement('span');
                hostSpan.textContent = '👑 HOST';
                hostSpan.style.color = '#ff6b35';
                hostSpan.style.fontWeight = 'bold';
                hostSpan.style.fontSize = '12px';
                hostSpan.style.backgroundColor = '#fff4e6';
                hostSpan.style.padding = '2px 6px';
                hostSpan.style.borderRadius = '3px';
                hostSpan.style.border = '1px solid #ff6b35';
                statusSpan.appendChild(hostSpan);
            }

            playerDiv.appendChild(emojiSpan);
            playerDiv.appendChild(nameSpan);
            playerDiv.appendChild(statusSpan);

            container.appendChild(playerDiv);
        });
        
        // Update start game button state based on host status
        this.updateStartGameButton();
    }

    updateName(name) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'change_name',
                data: { newName: name }
            }));
        }
    }

    updateEmoji(emoji) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'change_emoji',
                data: { newEmoji: emoji }
            }));
        }
    }

    updateCurrentPlayerInfo() {
        if (!this.currentPlayer) return;

        // Update name display - show current name in the input field
        const nameInput = document.getElementById('player-name-input');
        if (nameInput) {
            nameInput.value = this.currentPlayer.name;
            nameInput.placeholder = "Enter your name";
        }

        // Update emoji button to show current emoji
        const emojiBtn = document.getElementById('current-emoji-btn');
        if (emojiBtn) {
            emojiBtn.textContent = this.currentPlayer.emoji;
        }
    }

    showGameRoom() {
        document.getElementById('game-portal').classList.remove('active');
        document.getElementById('game-room').classList.add('active');
        
        const gameTitle = document.getElementById('game-title');
        if (gameTitle) {
            gameTitle.textContent = this.formatGameName(this.gameType);
        }
        
        const roomCode = document.getElementById('room-code-display');
        if (roomCode) {
            roomCode.textContent = this.sessionId;
        }
        
        // Initialize the start game button state (will be disabled until we know host status)
        this.updateStartGameButton();
    }

    leaveGame() {
        if (this.ws) {
            this.ws.close();
        }
        
        // Hide player controls
        const controls = document.getElementById('player-controls');
        if (controls) controls.style.display = 'none';
        
        // Hide any game-specific content
        const checkboxBoard = document.getElementById('checkbox-game-board');
        if (checkboxBoard) checkboxBoard.style.display = 'none';
        
        document.getElementById('game-room').classList.remove('active');
        document.getElementById('game-portal').classList.add('active');
    }

    formatGameName(gameType) {
        return gameType
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }


    showError(message) {
        const container = document.getElementById('error-container');
        if (!container) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.background = '#ff4444';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '10px';
        errorDiv.style.margin = '10px 0';
        errorDiv.style.borderRadius = '4px';

        container.appendChild(errorDiv);

        setTimeout(() => {
            if (container.contains(errorDiv)) {
                container.removeChild(errorDiv);
            }
        }, 5000);
    }

    showSuccessMessage(message) {
        const container = document.getElementById('error-container');
        if (!container) return;

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.background = '#28a745';
        successDiv.style.color = 'white';
        successDiv.style.padding = '10px';
        successDiv.style.margin = '10px 0';
        successDiv.style.borderRadius = '4px';

        container.appendChild(successDiv);

        setTimeout(() => {
            if (container.contains(successDiv)) {
                container.removeChild(successDiv);
            }
        }, 3000);
    }

    setupEmojiPicker() {
        const emojiGrid = document.getElementById('emoji-grid');
        if (!emojiGrid) return;

        // Animal emojis array (same as server)
        const animalEmojis = [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
            '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣',
            '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
            '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
            '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐟', '🐠', '🐡',
            '🦈', '🐳', '🐋', '🐬', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘',
            '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎',
            '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈'
        ];

        this.updateEmojiPicker(animalEmojis);
    }

    updateEmojiPicker(animalEmojis) {
        const emojiGrid = document.getElementById('emoji-grid');
        if (!emojiGrid) return;

        // Clear existing emojis
        emojiGrid.innerHTML = '';

        // Get emojis currently in use by other players
        const usedEmojis = new Set();
        if (this.gameState && this.gameState.players) {
            Object.values(this.gameState.players).forEach(player => {
                if (player.id !== this.currentPlayerId) {
                    usedEmojis.add(player.emoji);
                }
            });
        }

        // Add each emoji as a clickable button
        animalEmojis.forEach(emoji => {
            const button = document.createElement('button');
            button.textContent = emoji;
            button.style.background = 'none';
            button.style.border = '1px solid #ddd';
            button.style.borderRadius = '4px';
            button.style.padding = '8px';
            button.style.fontSize = '20px';
            button.style.transition = 'background-color 0.2s, opacity 0.2s';
            
            const isInUse = usedEmojis.has(emoji);
            if (isInUse) {
                button.style.opacity = '0.4';
                button.style.cursor = 'not-allowed';
                button.disabled = true;
                button.title = 'Already in use by another player';
            } else {
                button.style.cursor = 'pointer';
                button.disabled = false;
                
                button.addEventListener('mouseenter', () => {
                    button.style.backgroundColor = '#f0f0f0';
                });
                
                button.addEventListener('mouseleave', () => {
                    button.style.backgroundColor = 'transparent';
                });
                
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectEmoji(emoji);
                });
            }
            
            emojiGrid.appendChild(button);
        });
    }

    toggleEmojiPicker() {
        const emojiPicker = document.getElementById('emoji-picker');
        const emojiBtn = document.getElementById('current-emoji-btn');
        
        if (emojiPicker && emojiBtn) {
            const isVisible = emojiPicker.style.display !== 'none';
            
            if (isVisible) {
                emojiPicker.style.display = 'none';
            } else {
                // CRITICAL: Move picker to body to escape parent container stacking contexts
                // This prevents any parent div from clipping or hiding the picker
                if (emojiPicker.parentNode !== document.body) {
                    document.body.appendChild(emojiPicker);
                }
                
                // CRITICAL: Small delay to ensure button is properly rendered
                // getBoundingClientRect() needs the button to be in the DOM and positioned
                setTimeout(() => {
                    // Get exact button position on screen
                    const btnRect = emojiBtn.getBoundingClientRect();
                    console.log('Button rect:', btnRect); // Keep for debugging
                    
                    // CRITICAL: Use setProperty with 'important' to force override CSS conflicts
                    // Regular style.property assignments were being overridden by CSS rules
                    emojiPicker.style.setProperty('position', 'fixed', 'important');
                    emojiPicker.style.setProperty('left', Math.max(0, btnRect.left - 50) + 'px', 'important');
                    emojiPicker.style.setProperty('top', Math.max(0, btnRect.bottom + 10) + 'px', 'important');
                    emojiPicker.style.setProperty('right', 'auto', 'important'); // Clear conflicting properties
                    emojiPicker.style.setProperty('bottom', 'auto', 'important'); // Clear conflicting properties
                    emojiPicker.style.setProperty('z-index', '999999', 'important');
                    emojiPicker.style.setProperty('display', 'block', 'important');
                    
                    console.log('Positioned picker at:', {
                        left: Math.max(0, btnRect.left - 50) + 'px',
                        top: Math.max(0, btnRect.bottom + 10) + 'px'
                    });
                }, 10); // 10ms delay is minimum needed for reliable positioning
            }
        }
    }

    selectEmoji(emoji) {
        console.log('Selected emoji:', emoji);
        this.updateEmoji(emoji);
        
        // Update the current emoji button
        const currentEmojiBtn = document.getElementById('current-emoji-btn');
        if (currentEmojiBtn) {
            currentEmojiBtn.textContent = emoji;
        }
        
        // Hide the picker
        const emojiPicker = document.getElementById('emoji-picker');
        if (emojiPicker) {
            emojiPicker.style.display = 'none';
        }
    }

    refreshEmojiPicker() {
        // Only refresh if the emoji picker exists and has been set up
        const emojiGrid = document.getElementById('emoji-grid');
        if (emojiGrid && emojiGrid.children.length > 0) {
            const animalEmojis = [
                '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
                '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣',
                '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
                '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
                '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐟', '🐠', '🐡',
                '🦈', '🐳', '🐋', '🐬', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘',
                '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎',
                '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈'
            ];
            this.updateEmojiPicker(animalEmojis);
        }
    }

    // Bouncing emoji methods
    updateBouncingEmojis(players) {
        console.log('updateBouncingEmojis called with:', players);
        
        if (!players) {
            // If no players, remove all emojis
            document.querySelectorAll('.floating-emoji').forEach(el => el.remove());
            return;
        }

        // Handle both array and object formats
        const playersArray = Array.isArray(players) ? players : Object.values(players);
        const currentPlayerIds = playersArray.map(p => p.id);
        const existingEmojis = document.querySelectorAll('.floating-emoji[data-player-id]');
        
        console.log('Current player IDs:', currentPlayerIds);
        console.log('Existing emoji elements:', existingEmojis.length);
        
        // Remove emojis for players who left
        existingEmojis.forEach(emoji => {
            const playerId = emoji.getAttribute('data-player-id');
            if (!currentPlayerIds.includes(playerId)) {
                console.log('Removing emoji for player who left:', playerId);
                emoji.remove();
            }
        });
        
        // Add or update emojis for current players
        playersArray.forEach((player, index) => {
            const existingEmoji = document.querySelector(`.floating-emoji[data-player-id="${player.id}"]`);
            
            if (existingEmoji) {
                // Update existing emoji if it changed
                const yContainer = existingEmoji.querySelector('.floating-emoji-y');
                if (yContainer && yContainer.textContent !== (player.emoji || '🎾')) {
                    console.log('Updating emoji content for player:', player.id, 'from', yContainer.textContent, 'to', player.emoji);
                    yContainer.textContent = player.emoji || '🎾';
                }
                console.log('Emoji already exists for player:', player.id, '- skipping creation');
            } else {
                // Add new emoji for new player
                console.log('Adding floating emoji for new player:', player);
                
                // Create nested structure: outer div for X movement, inner div for Y movement
                const xContainer = document.createElement('div');
                xContainer.className = 'floating-emoji floating-emoji-x';
                xContainer.setAttribute('data-player-id', player.id);
                
                const yContainer = document.createElement('div');
                yContainer.className = 'floating-emoji-y';
                
                // The actual emoji content
                yContainer.textContent = player.emoji || '🎾';
                
                // Random animation patterns and durations for chaos (slower speeds)
                const xAnimations = ['move-x', 'move-x-chaos1', 'move-x-chaos2'];
                const yAnimations = ['move-y', 'move-y-chaos1', 'move-y-chaos2'];
                const xDurations = [15, 20, 25, 30, 35]; // seconds - much slower
                const yDurations = [12, 16, 20, 24, 28]; // seconds - much slower
                
                const randomXAnim = xAnimations[Math.floor(Math.random() * xAnimations.length)];
                const randomYAnim = yAnimations[Math.floor(Math.random() * yAnimations.length)];
                const randomXDuration = xDurations[Math.floor(Math.random() * xDurations.length)];
                const randomYDuration = yDurations[Math.floor(Math.random() * yDurations.length)];
                
                xContainer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 10000;
                    pointer-events: none;
                    user-select: none;
                    animation: ${randomXAnim} ${randomXDuration}s ease-in-out infinite alternate;
                `;
                
                yContainer.style.cssText = `
                    font-size: 4rem;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    animation: ${randomYAnim} ${randomYDuration}s ease-in-out infinite alternate;
                `;
                
                // Nest the elements
                xContainer.appendChild(yContainer);
                
                console.log('Adding bouncing emoji to body:', xContainer);
                document.body.appendChild(xContainer);
            }
        });
    }

    addFloatingEmoji(emoji, playerId, index) {
        console.log('addFloatingEmoji called with:', emoji, playerId, index);
        
        // Create floating emoji attached directly to body
        const floatingEmoji = document.createElement('div');
        floatingEmoji.className = 'floating-emoji';
        floatingEmoji.setAttribute('data-player-id', playerId);
        floatingEmoji.textContent = emoji || '🎾';
        
        // Position randomly across the screen
        const positions = [
            { left: '10%', top: '20%' },
            { left: '80%', top: '15%' },
            { left: '70%', top: '60%' },
            { left: '20%', top: '70%' },
            { left: '50%', top: '10%' },
            { left: '90%', top: '40%' },
            { left: '30%', top: '80%' },
            { left: '60%', top: '30%' }
        ];
        
        const position = positions[index % positions.length];
        
        // Style the floating emoji
        floatingEmoji.style.cssText = `
            position: fixed;
            left: ${position.left};
            top: ${position.top};
            font-size: 3rem;
            z-index: 10000;
            pointer-events: none;
            user-select: none;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            animation: float 3s ease-in-out infinite;
            animation-delay: ${index * 0.5}s;
        `;
        
        console.log('Adding floating emoji to body:', floatingEmoji);
        document.body.appendChild(floatingEmoji);
    }

    removeFloatingEmoji(playerId) {
        const emojiElement = document.querySelector(`.floating-emoji[data-player-id="${playerId}"]`);
        if (emojiElement) {
            emojiElement.style.opacity = '0';
            emojiElement.style.transform = 'scale(0)';
            setTimeout(() => {
                if (emojiElement.parentNode) {
                    emojiElement.parentNode.removeChild(emojiElement);
                }
            }, 300);
        }
    }

    async loadActiveRooms() {
        try {
            const response = await fetch('/api/active-rooms');
            const data = await response.json();
            this.displayActiveRooms(data.rooms);
        } catch (error) {
            console.error('Failed to load active rooms:', error);
            this.displayActiveRooms([]);
        }
    }

    displayActiveRooms(rooms) {
        const container = document.getElementById('active-rooms-list');
        if (!container) return;

        if (rooms.length === 0) {
            container.innerHTML = '<div class="no-rooms">No active rooms available</div>';
            return;
        }

        container.innerHTML = '';
        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.setAttribute('data-session-id', room.sessionId);
            
            const playersList = room.players.map(p => `${p.emoji} ${p.name}`).join(', ');
            const timeAgo = this.getTimeAgo(room.createdAt);
            
            roomElement.innerHTML = `
                <div class="room-info">
                    <div class="room-title">${room.gameType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div class="room-code">${room.sessionId}</div>
                    <div class="room-players">${room.playerCount} player${room.playerCount !== 1 ? 's' : ''}: ${playersList}</div>
                    <div class="room-time">Created ${timeAgo}</div>
                </div>
                <button class="join-room-btn" data-session-id="${room.sessionId}">Join</button>
            `;
            
            container.appendChild(roomElement);
        });

        // Add click handlers for join buttons
        container.querySelectorAll('.join-room-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.getAttribute('data-session-id');
                this.joinExistingRoom(sessionId);
            });
        });
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return 'today';
    }

    // Checkbox Game specific methods
    initializeCheckboxGrid() {
        const checkboxGrid = document.getElementById('checkbox-grid');
        if (!checkboxGrid) {
            console.error('🐰 Checkbox grid element not found!');
            return;
        }
        
        // Ensure checkboxStates is initialized
        if (!this.checkboxStates || this.checkboxStates.length !== 9) {
            console.log('🐰 Initializing checkbox states array');
            this.checkboxStates = new Array(9).fill(false);
        }
        
        // Clear any existing content
        checkboxGrid.innerHTML = '';
        
        console.log('🐰 Creating 3x3 checkbox grid');
        
        // Create 3x3 grid of checkboxes (9 total)
        for (let i = 0; i < 9; i++) {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            checkboxItem.dataset.index = i;
            
            const checkboxIcon = document.createElement('span');
            checkboxIcon.className = 'checkbox-icon';
            checkboxIcon.textContent = this.checkboxStates[i] ? '✓' : '';
            
            checkboxItem.appendChild(checkboxIcon);
            
            // Add click handler
            checkboxItem.addEventListener('click', () => {
                console.log('🐰 Checkbox clicked:', i);
                this.toggleCheckbox(i);
            });
            
            checkboxGrid.appendChild(checkboxItem);
            
            // Update visual state
            if (this.checkboxStates[i]) {
                checkboxItem.classList.add('checked');
            }
        }
        
        console.log('🐰 Checkbox grid initialized with', checkboxGrid.children.length, 'checkboxes');
    }

    toggleCheckbox(checkboxIndex) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('🐰 Game Logic Specialist: Toggling checkbox', checkboxIndex);
            
            // Add temporary visual feedback while waiting for server response
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
        } else {
            console.error('🐰 Game Logic Specialist: WebSocket not connected - cannot toggle checkbox');
        }
    }

    updateCheckboxUI(checkboxIndex, newState) {
        const checkboxItem = document.querySelector(`.checkbox-item[data-index="${checkboxIndex}"]`);
        if (!checkboxItem) return;
        
        const checkboxIcon = checkboxItem.querySelector('.checkbox-icon');
        if (!checkboxIcon) return;
        
        if (newState) {
            checkboxItem.classList.add('checked');
            checkboxIcon.textContent = '✓';
        } else {
            checkboxItem.classList.remove('checked');
            checkboxIcon.textContent = '';
        }
    }

    updateAllCheckboxes() {
        for (let i = 0; i < this.checkboxStates.length; i++) {
            this.updateCheckboxUI(i, this.checkboxStates[i]);
        }
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-indicator');
        const text = document.getElementById('connection-text');
        
        if (indicator && text) {
            if (connected) {
                indicator.className = 'status-indicator connected';
                text.textContent = 'Connected';
            } else {
                indicator.className = 'status-indicator disconnected';  
                text.textContent = 'Disconnected';
            }
        }
    }

    updatePlayerCount() {
        const activePlayersSpan = document.getElementById('active-players');
        if (activePlayersSpan && this.gameState && this.gameState.players) {
            const connectedPlayers = Object.values(this.gameState.players).filter(p => p.connected).length;
            activePlayersSpan.textContent = connectedPlayers;
        }
    }

    startGameSession() {
        console.log('🐰 Game Logic Specialist: Starting game session for', this.gameType);
        
        // Send start game message to server to notify all players
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'START_GAME',
                data: { gameType: this.gameType }
            }));
            console.log('🐰 Game Logic Specialist: Sent START_GAME message to server');
        } else {
            console.error('🐰 Game Logic Specialist: Cannot start game - WebSocket not connected');
        }
    }
    
    handleGameStart(gameType) {
        console.log('🐰 Game Logic Specialist: Game started for all players:', gameType);
        
        // Show the appropriate game board based on game type
        if (gameType === 'checkbox-game') {
            const checkboxBoard = document.getElementById('checkbox-game-board');
            if (checkboxBoard) {
                checkboxBoard.style.display = 'block';
                console.log('🐰 Game Logic Specialist: Checkbox game board is now visible');
            }
        }
        
        // Could add other game types here in the future
        // if (gameType === 'tic-tac-toe') { ... }
        // if (gameType === 'rock-paper-scissors') { ... }
    }

    isCurrentPlayerHost() {
        if (!this.currentPlayerId || !this.gameState || !this.gameState.players) {
            return false;
        }
        
        const currentPlayer = this.gameState.players[this.currentPlayerId];
        return currentPlayer && currentPlayer.isHost;
    }

    updateStartGameButton() {
        const startGameBtn = document.getElementById('start-game-btn-header');
        if (!startGameBtn) return;

        const isHost = this.isCurrentPlayerHost();
        
        if (isHost) {
            startGameBtn.disabled = false;
            startGameBtn.style.opacity = '1';
            startGameBtn.style.cursor = 'pointer';
            startGameBtn.style.backgroundColor = '#28a745';
            startGameBtn.style.color = 'white';
            startGameBtn.textContent = 'Start Game';
            startGameBtn.title = 'Start the game for all players';
        } else {
            startGameBtn.disabled = true;
            startGameBtn.style.opacity = '0.5';
            startGameBtn.style.cursor = 'not-allowed';
            startGameBtn.style.backgroundColor = '#6c757d';
            startGameBtn.style.color = '#ccc';
            startGameBtn.textContent = 'only the host may start the game :<';
            startGameBtn.title = 'Only the host can start the game';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.gameClient = new GameClient();
});