import type { WebSocketManager } from './main';

export class GamePortal {
    private wsManager: WebSocketManager;
    private app: any; // App instance reference

    constructor(wsManager: WebSocketManager, app: any) {
        this.wsManager = wsManager;
        this.app = app;
        this.initialize();
    }

    private initialize(): void {
        this.setupEventListeners();
        this.setupMessageHandlers();
    }

    private setupEventListeners(): void {
        // Game selection buttons
        const gameCards = document.querySelectorAll('.game-card');
        gameCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const gameType = (e.currentTarget as HTMLElement).dataset.game;
                if (gameType) {
                    this.createGameRoom(gameType);
                }
            });
        });

        // Join room functionality
        const joinRoomBtn = document.getElementById('join-room-btn');
        const roomCodeInput = document.getElementById('room-code-input') as HTMLInputElement;

        if (joinRoomBtn && roomCodeInput) {
            joinRoomBtn.addEventListener('click', () => {
                const roomCode = roomCodeInput.value.trim().toUpperCase();
                if (roomCode) {
                    this.joinGameRoom(roomCode);
                    roomCodeInput.value = '';
                }
            });

            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const roomCode = roomCodeInput.value.trim().toUpperCase();
                    if (roomCode) {
                        this.joinGameRoom(roomCode);
                        roomCodeInput.value = '';
                    }
                }
            });

            // Format room code input as user types
            roomCodeInput.addEventListener('input', (e) => {
                const input = e.target as HTMLInputElement;
                let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 6) {
                    value = value.substring(0, 6);
                }
                input.value = value;
            });
        }
    }

    private setupMessageHandlers(): void {
        this.wsManager.onMessage('room_created', (data) => {
            console.log('Room created:', data);
            this.app.switchToGameRoom(data.roomCode, data.gameType);
        });

        this.wsManager.onMessage('room_join_failed', (data) => {
            this.app.showError(data.message || 'Failed to join room');
        });

        this.wsManager.onMessage('room_not_found', () => {
            this.app.showError('Room not found. Please check the room code.');
        });

        this.wsManager.onMessage('room_full', () => {
            this.app.showError('Room is full. Please try another room.');
        });
    }

    private createGameRoom(gameType: string): void {
        if (!this.wsManager.isConnected()) {
            this.app.showError('Not connected to server. Please wait...');
            return;
        }

        const success = this.wsManager.send('create_room', { gameType });
        if (!success) {
            this.app.showError('Failed to create room. Please try again.');
        }
    }

    private joinGameRoom(roomCode: string): void {
        if (!this.wsManager.isConnected()) {
            this.app.showError('Not connected to server. Please wait...');
            return;
        }

        if (roomCode.length < 4) {
            this.app.showError('Room code must be at least 4 characters long.');
            return;
        }

        const success = this.wsManager.send('join_room', { roomCode });
        if (!success) {
            this.app.showError('Failed to join room. Please try again.');
        }
    }

    public getAvailableGames(): string[] {
        const gameCards = document.querySelectorAll('.game-card');
        return Array.from(gameCards).map(card => 
            (card as HTMLElement).dataset.game || ''
        ).filter(Boolean);
    }

    public highlightGame(gameType: string): void {
        const gameCards = document.querySelectorAll('.game-card');
        gameCards.forEach(card => {
            const element = card as HTMLElement;
            if (element.dataset.game === gameType) {
                element.classList.add('highlighted');
            } else {
                element.classList.remove('highlighted');
            }
        });
    }

    public removeHighlight(): void {
        const gameCards = document.querySelectorAll('.game-card');
        gameCards.forEach(card => {
            card.classList.remove('highlighted');
        });
    }

    public disable(): void {
        const gameCards = document.querySelectorAll('.game-card');
        const joinRoomBtn = document.getElementById('join-room-btn');
        const roomCodeInput = document.getElementById('room-code-input') as HTMLInputElement;

        gameCards.forEach(card => {
            (card as HTMLButtonElement).disabled = true;
        });

        if (joinRoomBtn) {
            (joinRoomBtn as HTMLButtonElement).disabled = true;
        }

        if (roomCodeInput) {
            roomCodeInput.disabled = true;
        }
    }

    public enable(): void {
        const gameCards = document.querySelectorAll('.game-card');
        const joinRoomBtn = document.getElementById('join-room-btn');
        const roomCodeInput = document.getElementById('room-code-input') as HTMLInputElement;

        gameCards.forEach(card => {
            (card as HTMLButtonElement).disabled = false;
        });

        if (joinRoomBtn) {
            (joinRoomBtn as HTMLButtonElement).disabled = false;
        }

        if (roomCodeInput) {
            roomCodeInput.disabled = false;
        }
    }

    public reset(): void {
        this.removeHighlight();
        this.enable();
        
        const roomCodeInput = document.getElementById('room-code-input') as HTMLInputElement;
        if (roomCodeInput) {
            roomCodeInput.value = '';
        }
    }
}