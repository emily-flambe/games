import type { GameState, Player, WebSocketMessage, DrawingStroke } from '../../types/shared';
import { DrawingGame } from '../games/DrawingGame';

export class GameSession {
  private state: DurableObjectState;
  private sessions: Set<WebSocket> = new Set();
  private gameState: GameState | null = null;
  private drawingGame: DrawingGame | null = null;
  private playerSocketMap: Map<string, WebSocket> = new Map();

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle HTTP requests
    switch (request.method) {
      case 'GET':
        return this.getGameState();
      case 'POST':
        return this.createGame(request);
      case 'PUT':
        return this.updateGame(request);
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    server.accept();
    this.sessions.add(server);

    // Handle WebSocket events
    server.addEventListener('message', async (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(server, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
        server.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: Date.now()
        }));
      }
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
      this.handlePlayerDisconnect(server);
    });

    // Send current game state to new connection
    if (this.gameState) {
      server.send(JSON.stringify({
        type: 'game_state',
        data: this.gameState,
        timestamp: Date.now()
      }));
    }
    
    // Auto-join with a temporary player ID if this is a drawing game
    if (this.gameState?.type === 'drawing') {
      const tempPlayerId = 'player_' + Math.random().toString(36).substr(2, 9);
      setTimeout(() => {
        this.handlePlayerJoin(server, { 
          id: tempPlayerId, 
          name: `Player ${this.gameState?.players.length ? this.gameState.players.length + 1 : 1}` 
        });
      }, 100);
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleWebSocketMessage(socket: WebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'join_game':
        await this.handlePlayerJoin(socket, message.data);
        break;
      case 'start_game':
        await this.handleStartGame(socket);
        break;
      case 'game_action':
        await this.handleGameAction(socket, message.data);
        break;
      case 'draw_stroke':
        await this.handleDrawStroke(socket, message.data);
        break;
      case 'clear_canvas':
        await this.handleClearCanvas(socket);
        break;
      case 'submit_guess':
        await this.handleSubmitGuess(socket, message.data);
        break;
      case 'ping':
        socket.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private async handlePlayerJoin(socket: WebSocket, playerData: any) {
    if (!this.gameState) {
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: 'No active game session' },
        timestamp: Date.now()
      }));
      return;
    }

    const player: Player = {
      id: playerData.id || crypto.randomUUID(),
      name: playerData.name || 'Anonymous',
      connected: true,
      joinedAt: Date.now()
    };

    // Map player to socket for drawing game communication
    this.playerSocketMap.set(player.id, socket);

    // Check if player already exists, update instead of adding
    const existingPlayerIndex = this.gameState.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex >= 0) {
      this.gameState.players[existingPlayerIndex] = player;
    } else {
      this.gameState.players.push(player);
    }
    
    this.gameState.updatedAt = Date.now();
    
    // Initialize drawing game if this is a drawing game type
    if (this.gameState.type === 'drawing' && !this.drawingGame) {
      this.drawingGame = new DrawingGame(this.gameState);
    }
    
    await this.state.storage.put('gameState', this.gameState);

    // Broadcast to all connected clients
    this.broadcast({
      type: 'player_joined',
      data: { player, gameState: this.gameState },
      timestamp: Date.now()
    });
  }

  private async handleGameAction(socket: WebSocket, actionData: any) {
    if (!this.gameState) return;

    // Basic game action handling - extend based on game type
    this.gameState.data = { ...this.gameState.data, ...actionData };
    this.gameState.updatedAt = Date.now();
    
    await this.state.storage.put('gameState', this.gameState);

    // Broadcast action to all clients
    this.broadcast({
      type: 'game_action',
      data: { action: actionData, gameState: this.gameState },
      timestamp: Date.now()
    });
  }

  private async handleStartGame(socket: WebSocket) {
    if (!this.gameState || !this.drawingGame) {
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: 'Drawing game not initialized' },
        timestamp: Date.now()
      }));
      return;
    }

    if (!this.drawingGame.canStartGame()) {
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: 'Need at least 2 players to start' },
        timestamp: Date.now()
      }));
      return;
    }

    this.drawingGame.startGame();
    await this.state.storage.put('gameState', this.gameState);

    // Notify drawer of their word and other players of game start
    const currentDrawer = this.drawingGame.getCurrentDrawer();
    if (currentDrawer) {
      const drawerSocket = this.playerSocketMap.get(currentDrawer.id);
      if (drawerSocket) {
        drawerSocket.send(JSON.stringify({
          type: 'start_turn',
          data: { 
            drawer: currentDrawer.name,
            word: this.drawingGame.getWordForDrawer(),
            phase: 'drawing'
          },
          timestamp: Date.now()
        }));
      }

      // Notify other players
      this.gameState.players.forEach(player => {
        if (player.id !== currentDrawer.id) {
          const playerSocket = this.playerSocketMap.get(player.id);
          if (playerSocket) {
            playerSocket.send(JSON.stringify({
              type: 'start_turn',
              data: { 
                drawer: currentDrawer.name,
                word: this.drawingGame.getWordForGuessers(),
                phase: 'guessing'
              },
              timestamp: Date.now()
            }));
          }
        }
      });
    }

    // Broadcast game state update
    this.broadcast({
      type: 'game_started',
      data: { gameState: this.gameState },
      timestamp: Date.now()
    });
  }

  private async handleDrawStroke(socket: WebSocket, strokeData: DrawingStroke) {
    if (!this.gameState || !this.drawingGame) return;

    const playerId = this.getPlayerIdFromSocket(socket);
    if (!playerId) return;

    const success = this.drawingGame.handleDrawStroke(strokeData, playerId);
    if (success) {
      await this.state.storage.put('gameState', this.gameState);
      
      // Broadcast stroke to all other players
      this.broadcast({
        type: 'draw_stroke',
        data: strokeData,
        timestamp: Date.now()
      }, socket);
    }
  }

  private async handleClearCanvas(socket: WebSocket) {
    if (!this.gameState || !this.drawingGame) return;

    const playerId = this.getPlayerIdFromSocket(socket);
    if (!playerId) return;

    const success = this.drawingGame.handleClearCanvas(playerId);
    if (success) {
      await this.state.storage.put('gameState', this.gameState);
      
      // Broadcast clear to all players
      this.broadcast({
        type: 'clear_canvas',
        data: {},
        timestamp: Date.now()
      });
    }
  }

  private async handleSubmitGuess(socket: WebSocket, guessData: { guess: string }) {
    if (!this.gameState || !this.drawingGame) return;

    const playerId = this.getPlayerIdFromSocket(socket);
    if (!playerId) return;

    const isCorrect = this.drawingGame.handleGuess(guessData.guess, playerId);
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (isCorrect && player) {
      // Notify player they got it right
      socket.send(JSON.stringify({
        type: 'correct_guess',
        data: { message: 'Correct!' },
        timestamp: Date.now()
      }));
      
      // Notify other players (except drawer) someone guessed correctly
      this.gameState.players.forEach(p => {
        if (p.id !== playerId && p.id !== this.drawingGame?.getCurrentDrawer()?.id) {
          const playerSocket = this.playerSocketMap.get(p.id);
          if (playerSocket) {
            playerSocket.send(JSON.stringify({
              type: 'player_guessed',
              data: { playerName: player.name },
              timestamp: Date.now()
            }));
          }
        }
      });
    }
    
    await this.state.storage.put('gameState', this.gameState);
    
    // Broadcast guess to drawer only (for feedback)
    const currentDrawer = this.drawingGame.getCurrentDrawer();
    if (currentDrawer && player) {
      const drawerSocket = this.playerSocketMap.get(currentDrawer.id);
      if (drawerSocket) {
        drawerSocket.send(JSON.stringify({
          type: 'new_guess',
          data: { 
            playerName: player.name,
            guess: guessData.guess,
            isCorrect 
          },
          timestamp: Date.now()
        }));
      }
    }
  }

  private getPlayerIdFromSocket(socket: WebSocket): string | null {
    for (const [playerId, playerSocket] of this.playerSocketMap.entries()) {
      if (playerSocket === socket) {
        return playerId;
      }
    }
    return null;
  }

  private handlePlayerDisconnect(socket: WebSocket) {
    if (!this.gameState) return;

    // Remove from player socket mapping
    const playerId = this.getPlayerIdFromSocket(socket);
    if (playerId) {
      this.playerSocketMap.delete(playerId);
    }

    // Mark player as disconnected
    this.gameState.players.forEach(player => {
      if (this.playerSocketMap.has(player.id)) {
        player.connected = true;
      } else {
        player.connected = false;
      }
    });

    this.broadcast({
      type: 'player_disconnected',
      data: { gameState: this.gameState },
      timestamp: Date.now()
    });
  }

  private broadcast(message: WebSocketMessage, excludeSocket?: WebSocket) {
    const messageStr = JSON.stringify(message);
    this.sessions.forEach(socket => {
      if (socket === excludeSocket) return;
      try {
        socket.send(messageStr);
      } catch (error) {
        console.error('Broadcast error:', error);
        this.sessions.delete(socket);
      }
    });
  }

  private async getGameState(): Promise<Response> {
    const gameState = await this.state.storage.get('gameState') || this.gameState;
    return new Response(JSON.stringify(gameState), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async createGame(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      
      this.gameState = {
        id: crypto.randomUUID(),
        type: body.type || 'generic',
        players: [],
        status: 'waiting',
        data: body.data || {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await this.state.storage.put('gameState', this.gameState);

      return new Response(JSON.stringify(this.gameState), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response('Invalid request body', { status: 400 });
    }
  }

  private async updateGame(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      
      if (!this.gameState) {
        this.gameState = await this.state.storage.get('gameState');
        if (!this.gameState) {
          return new Response('Game not found', { status: 404 });
        }
      }

      // Update game state
      this.gameState = { ...this.gameState, ...body, updatedAt: Date.now() };
      await this.state.storage.put('gameState', this.gameState);

      // Broadcast update to connected clients
      this.broadcast({
        type: 'game_updated',
        data: this.gameState,
        timestamp: Date.now()
      });

      return new Response(JSON.stringify(this.gameState), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response('Invalid request body', { status: 400 });
    }
  }
}