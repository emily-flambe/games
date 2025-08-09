import type { WebSocketManager } from './main';

interface Player {
    id: string;
    name: string;
    isReady: boolean;
    symbol?: string;
}

interface GameState {
    status: 'waiting' | 'playing' | 'finished';
    currentPlayer?: string;
    winner?: string;
    board?: any;
    players: Player[];
    moves?: any[];
}

export class GameRoom {
    private wsManager: WebSocketManager;
    private app: any; // App instance reference
    private roomCode: string = '';
    private gameType: string = '';
    private gameState: GameState | null = null;
    // Drawing game specific properties
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private isDrawing: boolean = false;
    private currentStroke: any[] = [];
    private playerId: string = '';
    private isCurrentDrawer: boolean = false;

    constructor(wsManager: WebSocketManager, app: any) {
        this.wsManager = wsManager;
        this.app = app;
    }

    public initialize(roomCode: string, gameType: string): void {
        this.roomCode = roomCode;
        this.gameType = gameType;
        this.playerId = this.generatePlayerId();
        this.setupUI();
        this.setupEventListeners();
        this.setupMessageHandlers();
        
        if (gameType === 'drawing') {
            this.setupDrawingGame();
        }
    }

    private generatePlayerId(): string {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    private setupUI(): void {
        const gameTitle = document.getElementById('game-title');
        const roomCodeDisplay = document.getElementById('room-code-display');

        if (gameTitle) {
            gameTitle.textContent = this.formatGameName(this.gameType);
        }

        if (roomCodeDisplay) {
            roomCodeDisplay.textContent = this.roomCode;
        }

        this.updateGameState('Waiting for players...');
        this.clearBoard();
    }

    private setupEventListeners(): void {
        const leaveRoomBtn = document.getElementById('leave-room-btn');
        const restartGameBtn = document.getElementById('restart-game-btn');
        const startGameBtn = document.getElementById('start-game-btn');

        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', () => {
                this.leaveRoom();
            });
        }

        if (restartGameBtn) {
            restartGameBtn.addEventListener('click', () => {
                this.restartGame();
            });
        }

        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startGame();
            });
        }

        // Drawing game specific listeners
        if (this.gameType === 'drawing') {
            this.setupDrawingEventListeners();
        }
    }

    private setupDrawingEventListeners(): void {
        const clearBtn = document.getElementById('clear-canvas-btn');
        const submitGuessBtn = document.getElementById('submit-guess-btn');
        const guessInput = document.getElementById('guess-input') as HTMLInputElement;

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearCanvas();
            });
        }

        if (submitGuessBtn) {
            submitGuessBtn.addEventListener('click', () => {
                this.submitGuess();
            });
        }

        if (guessInput) {
            guessInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitGuess();
                }
            });
        }
    }

    private setupMessageHandlers(): void {
        this.wsManager.onMessage('game_state_update', (data) => {
            this.gameState = data;
            this.updateUI();
        });

        this.wsManager.onMessage('player_joined', (data) => {
            console.log('Player joined:', data);
            this.updatePlayers(data.players);
        });

        this.wsManager.onMessage('player_left', (data) => {
            console.log('Player left:', data);
            this.updatePlayers(data.players);
        });

        this.wsManager.onMessage('game_started', (data) => {
            console.log('Game started:', data);
            this.gameState = data.gameState;
            this.updateUI();
        });

        this.wsManager.onMessage('move_made', (data) => {
            console.log('Move made:', data);
            this.gameState = data.gameState;
            this.updateUI();
        });

        this.wsManager.onMessage('game_ended', (data) => {
            console.log('Game ended:', data);
            this.gameState = data.gameState;
            this.updateUI();
            this.showRestartButton();
        });

        this.wsManager.onMessage('invalid_move', (data) => {
            this.app.showError(data.message || 'Invalid move');
        });

        // Drawing game specific message handlers
        if (this.gameType === 'drawing') {
            this.setupDrawingMessageHandlers();
        }
    }

    private setupDrawingMessageHandlers(): void {
        this.wsManager.onMessage('start_turn', (data) => {
            this.handleStartTurn(data);
        });

        this.wsManager.onMessage('draw_stroke', (data) => {
            this.handleDrawStroke(data);
        });

        this.wsManager.onMessage('clear_canvas', () => {
            this.handleClearCanvas();
        });

        this.wsManager.onMessage('correct_guess', (data) => {
            this.app.showMessage(data.message);
        });

        this.wsManager.onMessage('player_guessed', (data) => {
            this.app.showMessage(`${data.playerName} guessed correctly!`);
        });

        this.wsManager.onMessage('new_guess', (data) => {
            // Only show to drawer
            if (this.isCurrentDrawer) {
                const color = data.isCorrect ? 'green' : 'orange';
                this.app.showMessage(`${data.playerName}: ${data.guess}`, color);
            }
        });
    }

    private updateUI(): void {
        if (!this.gameState) return;

        this.updatePlayers(this.gameState.players);
        this.updateGameStatus();
        this.updateBoard();
    }

    private updatePlayers(players: Player[]): void {
        const container = document.getElementById('players-container');
        if (!container) return;

        container.innerHTML = '';

        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name;

            const symbolSpan = document.createElement('span');
            symbolSpan.className = 'player-symbol';
            symbolSpan.textContent = player.symbol ? ` (${player.symbol})` : '';

            const statusSpan = document.createElement('span');
            statusSpan.className = 'player-status';
            statusSpan.textContent = player.isReady ? ' ✓' : ' ○';

            playerDiv.appendChild(nameSpan);
            playerDiv.appendChild(symbolSpan);
            playerDiv.appendChild(statusSpan);

            container.appendChild(playerDiv);
        });
    }

    private updateGameStatus(): void {
        if (!this.gameState) return;

        const gameStateEl = document.getElementById('game-state');
        const playerTurnEl = document.getElementById('player-turn');

        if (gameStateEl) {
            let statusText = '';
            switch (this.gameState.status) {
                case 'waiting':
                    statusText = 'Waiting for players...';
                    break;
                case 'playing':
                    statusText = 'Game in progress';
                    break;
                case 'finished':
                    if (this.gameState.winner) {
                        statusText = `Game finished! Winner: ${this.gameState.winner}`;
                    } else {
                        statusText = 'Game finished! It\'s a draw!';
                    }
                    break;
            }
            gameStateEl.textContent = statusText;
        }

        if (playerTurnEl) {
            if (this.gameState.status === 'playing' && this.gameState.currentPlayer) {
                playerTurnEl.textContent = `Current turn: ${this.gameState.currentPlayer}`;
                playerTurnEl.style.display = 'block';
            } else {
                playerTurnEl.style.display = 'none';
            }
        }
    }

    private updateBoard(): void {
        switch (this.gameType) {
            case 'tic-tac-toe':
                if (this.gameState?.board) this.renderTicTacToeBoard();
                break;
            case 'connect-four':
                if (this.gameState?.board) this.renderConnectFourBoard();
                break;
            case 'rock-paper-scissors':
                this.renderRockPaperScissorsBoard();
                break;
            case 'drawing':
                this.renderDrawingBoard();
                break;
            default:
                this.renderGenericBoard();
        }
    }

    private renderTicTacToeBoard(): void {
        const container = document.getElementById('game-board-container');
        if (!container || !this.gameState?.board) return;

        let boardHTML = '<div class="tic-tac-toe-board">';
        for (let i = 0; i < 9; i++) {
            const cellValue = this.gameState.board[i] || '';
            boardHTML += `<button class="tic-tac-toe-cell" data-index="${i}" ${cellValue ? 'disabled' : ''}>${cellValue}</button>`;
        }
        boardHTML += '</div>';

        container.innerHTML = boardHTML;

        // Add click handlers to cells
        const cells = container.querySelectorAll('.tic-tac-toe-cell');
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                const index = parseInt((e.target as HTMLElement).dataset.index || '0');
                this.makeMove({ position: index });
            });
        });
    }

    private renderConnectFourBoard(): void {
        const container = document.getElementById('game-board-container');
        if (!container || !this.gameState?.board) return;

        let boardHTML = '<div class="connect-four-board">';
        
        // Column buttons
        boardHTML += '<div class="connect-four-columns">';
        for (let col = 0; col < 7; col++) {
            boardHTML += `<button class="connect-four-column-btn" data-column="${col}">↓</button>`;
        }
        boardHTML += '</div>';

        // Game grid
        boardHTML += '<div class="connect-four-grid">';
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                const cellValue = this.gameState.board[row]?.[col] || '';
                boardHTML += `<div class="connect-four-cell ${cellValue ? 'filled' : ''}" data-row="${row}" data-col="${col}">${cellValue}</div>`;
            }
        }
        boardHTML += '</div>';
        boardHTML += '</div>';

        container.innerHTML = boardHTML;

        // Add click handlers to column buttons
        const columnBtns = container.querySelectorAll('.connect-four-column-btn');
        columnBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const column = parseInt((e.target as HTMLElement).dataset.column || '0');
                this.makeMove({ column });
            });
        });
    }

    private renderRockPaperScissorsBoard(): void {
        const container = document.getElementById('game-board-container');
        if (!container) return;

        let boardHTML = `
            <div class="rock-paper-scissors-board">
                <h3>Make your choice:</h3>
                <div class="rps-choices">
                    <button class="rps-choice" data-choice="rock">✊ Rock</button>
                    <button class="rps-choice" data-choice="paper">✋ Paper</button>
                    <button class="rps-choice" data-choice="scissors">✌️ Scissors</button>
                </div>
        `;

        if (this.gameState?.moves && this.gameState.moves.length > 0) {
            boardHTML += '<div class="rps-results">';
            this.gameState.moves.forEach((move: any, index: number) => {
                boardHTML += `<div class="rps-move">Round ${index + 1}: ${move.player1} vs ${move.player2} - ${move.result}</div>`;
            });
            boardHTML += '</div>';
        }

        boardHTML += '</div>';
        container.innerHTML = boardHTML;

        // Add click handlers to choices
        const choices = container.querySelectorAll('.rps-choice');
        choices.forEach(choice => {
            choice.addEventListener('click', (e) => {
                const choiceValue = (e.target as HTMLElement).dataset.choice;
                this.makeMove({ choice: choiceValue });
            });
        });
    }

    private renderGenericBoard(): void {
        const container = document.getElementById('game-board-container');
        if (!container) return;

        container.innerHTML = `
            <div class="generic-board">
                <p>Game board for ${this.formatGameName(this.gameType)}</p>
                <pre>${JSON.stringify(this.gameState?.board, null, 2)}</pre>
            </div>
        `;
    }

    private makeMove(moveData: any): void {
        if (!this.wsManager.isConnected()) {
            this.app.showError('Not connected to server');
            return;
        }

        const success = this.wsManager.send('make_move', {
            roomCode: this.roomCode,
            move: moveData
        });

        if (!success) {
            this.app.showError('Failed to send move');
        }
    }

    private leaveRoom(): void {
        this.wsManager.send('leave_room', { roomCode: this.roomCode });
        this.app.switchToGamePortal();
    }

    private restartGame(): void {
        const success = this.wsManager.send('restart_game', { roomCode: this.roomCode });
        if (!success) {
            this.app.showError('Failed to restart game');
        } else {
            this.hideRestartButton();
        }
    }

    private showRestartButton(): void {
        const btn = document.getElementById('restart-game-btn');
        if (btn) {
            btn.style.display = 'block';
        }
    }

    private hideRestartButton(): void {
        const btn = document.getElementById('restart-game-btn');
        if (btn) {
            btn.style.display = 'none';
        }
    }

    private updateGameState(message: string): void {
        const gameStateEl = document.getElementById('game-state');
        if (gameStateEl) {
            gameStateEl.textContent = message;
        }
    }

    private clearBoard(): void {
        const container = document.getElementById('game-board-container');
        if (container) {
            container.innerHTML = '<div class="empty-board">Game board will appear here</div>';
        }
    }

    private formatGameName(gameType: string): string {
        return gameType
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Drawing game specific methods
    private setupDrawingGame(): void {
        const drawingControls = document.getElementById('drawing-controls');
        if (drawingControls) {
            drawingControls.style.display = 'block';
        }

        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.style.display = 'inline-block';
        }
    }

    private renderDrawingBoard(): void {
        const container = document.getElementById('game-board-container');
        if (!container) return;

        if (!this.canvas) {
            container.innerHTML = `
                <canvas id="drawing-canvas" class="drawing-canvas" width="600" height="400">
                    Your browser does not support the HTML5 canvas element.
                </canvas>
            `;
            
            this.canvas = document.getElementById('drawing-canvas') as HTMLCanvasElement;
            this.ctx = this.canvas?.getContext('2d') || null;
            
            if (this.canvas && this.ctx) {
                this.setupCanvasEvents();
                this.ctx.lineJoin = 'round';
                this.ctx.lineCap = 'round';
            }
        }
    }

    private setupCanvasEvents(): void {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas?.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas?.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas?.dispatchEvent(mouseEvent);
        });
    }

    private startDrawing(e: MouseEvent): void {
        if (!this.isCurrentDrawer || !this.canvas || !this.ctx) return;

        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.currentStroke = [{ x, y }];
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    private draw(e: MouseEvent): void {
        if (!this.isDrawing || !this.isCurrentDrawer || !this.canvas || !this.ctx) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.currentStroke.push({ x, y });
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    private stopDrawing(): void {
        if (!this.isDrawing || !this.isCurrentDrawer) return;
        
        this.isDrawing = false;
        
        if (this.currentStroke.length > 1) {
            const brushColor = (document.getElementById('brush-color') as HTMLInputElement)?.value || '#000000';
            const brushSize = parseInt((document.getElementById('brush-size') as HTMLInputElement)?.value || '3');
            
            const stroke = {
                id: crypto.randomUUID(),
                points: this.currentStroke,
                color: brushColor,
                width: brushSize,
                timestamp: Date.now()
            };

            this.wsManager.send('draw_stroke', stroke);
        }
        
        this.currentStroke = [];
    }

    private handleStartTurn(data: any): void {
        this.isCurrentDrawer = data.phase === 'drawing';
        
        const wordDisplay = document.getElementById('word-display');
        const guessContainer = document.getElementById('guess-input-container');
        const drawingControls = document.querySelector('.drawing-tools') as HTMLElement;
        
        if (wordDisplay) {
            wordDisplay.textContent = data.word;
        }
        
        if (guessContainer) {
            guessContainer.style.display = this.isCurrentDrawer ? 'none' : 'flex';
        }
        
        if (drawingControls) {
            drawingControls.style.display = this.isCurrentDrawer ? 'flex' : 'none';
        }
        
        if (this.canvas) {
            this.canvas.className = this.isCurrentDrawer ? 'drawing-canvas' : 'drawing-canvas disabled';
        }
        
        // Clear canvas for new round
        this.handleClearCanvas();
    }

    private handleDrawStroke(stroke: any): void {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineWidth = stroke.width;
        this.ctx.beginPath();
        
        stroke.points.forEach((point: any, index: number) => {
            if (index === 0) {
                this.ctx?.moveTo(point.x, point.y);
            } else {
                this.ctx?.lineTo(point.x, point.y);
            }
        });
        
        this.ctx.stroke();
    }

    private handleClearCanvas(): void {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private clearCanvas(): void {
        if (!this.isCurrentDrawer) return;
        this.wsManager.send('clear_canvas', {});
    }

    private submitGuess(): void {
        const guessInput = document.getElementById('guess-input') as HTMLInputElement;
        if (!guessInput || !guessInput.value.trim()) return;
        
        const guess = guessInput.value.trim();
        this.wsManager.send('submit_guess', { guess });
        guessInput.value = '';
    }

    private startGame(): void {
        this.wsManager.send('start_game', {});
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.style.display = 'none';
        }
    }

    public cleanup(): void {
        this.roomCode = '';
        this.gameType = '';
        this.gameState = null;
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentStroke = [];
        this.isCurrentDrawer = false;
        this.hideRestartButton();
        
        // Hide drawing controls
        const drawingControls = document.getElementById('drawing-controls');
        if (drawingControls) {
            drawingControls.style.display = 'none';
        }
        
        // Remove specific message handlers
        this.wsManager.removeMessageHandler('game_state_update');
        this.wsManager.removeMessageHandler('player_joined');
        this.wsManager.removeMessageHandler('player_left');
        this.wsManager.removeMessageHandler('game_started');
        this.wsManager.removeMessageHandler('move_made');
        this.wsManager.removeMessageHandler('game_ended');
        this.wsManager.removeMessageHandler('invalid_move');
        
        // Remove drawing game handlers
        this.wsManager.removeMessageHandler('start_turn');
        this.wsManager.removeMessageHandler('draw_stroke');
        this.wsManager.removeMessageHandler('clear_canvas');
        this.wsManager.removeMessageHandler('correct_guess');
        this.wsManager.removeMessageHandler('player_guessed');
        this.wsManager.removeMessageHandler('new_guess');
    }
}