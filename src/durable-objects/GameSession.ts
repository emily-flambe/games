/**
 * Base GameSession Durable Object
 * Handles multiplayer game sessions with WebSocket connections
 */

import { DurableObject, DurableObjectState } from '@cloudflare/workers-types';

export interface Env {
  GAME_SESSIONS: DurableObjectNamespace;
  GAME_REGISTRY: DurableObjectNamespace;
}

interface SessionMetadata {
  sessionId: string;
  gameType: string;
  playerCount: number;
  players: Array<{name: string; emoji: string}>;
  createdAt: number;
  lastHeartbeat: number;
  roomStatus: 'active' | 'inactive';
  gameStatus: 'waiting' | 'in-progress' | 'finished';
}

export class GameSession implements DurableObject {
  protected websockets: Map<WebSocket, string> = new Map();
  protected players: Map<string, any> = new Map();
  protected spectators: Map<string, any> = new Map(); 
  protected gameState: any;
  protected sessionId: string = '';
  protected initialized: boolean = false;
  protected chatHistory: Array<{playerId: string, message: string, timestamp: number}> = [];

  constructor(protected state: DurableObjectState, protected env: Env) {
    this.gameState = null;
  }

  protected async initializeGameState(gameType: string = 'checkbox-game') {
    if (this.initialized) return;
    
    const storedState = await this.state.storage.get('gameState');
    const storedPlayers = await this.state.storage.get('players');
    const storedSpectators = await this.state.storage.get('spectators');
    const storedChatHistory = await this.state.storage.get('chatHistory');
    
    if (storedState) {
      this.gameState = storedState;
      console.log(`🔄 Loaded existing game state - type: ${this.gameState.type}, gameStarted: ${this.gameState.gameStarted}`);
    } else {
      this.gameState = this.createInitialGameState(gameType);
      console.log(`🆕 Initialized fresh game state with type: ${gameType}`);
    }
    
    if (storedPlayers) {
      this.players = new Map(storedPlayers);
    }
    if (storedSpectators) {
      this.spectators = new Map(storedSpectators);
    }
    if (storedChatHistory) {
      this.chatHistory = storedChatHistory as Array<{playerId: string, message: string, timestamp: number}>;
    }
    
    this.initialized = true;
  }

  protected createInitialGameState(gameType: string): any {
    return {
      type: gameType,
      status: 'waiting',
      players: {},
      hostId: null,
      gameStarted: false,
      gameFinished: false,
      spectatorCount: 0,
      spectators: {}
    };
  }

  protected async saveGameState() {
    await this.state.storage.put({
      gameState: this.gameState,
      players: Array.from(this.players.entries()),
      spectators: Array.from(this.spectators.entries()),
      chatHistory: this.chatHistory
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    const pathMatch = url.pathname.match(/^\/api\/game\/([A-Z0-9]+)\/ws$/);
    if (pathMatch) {
      this.sessionId = pathMatch[1];
    }

    const gameType = url.searchParams.get('gameType') || 'checkbox-game';
    await this.initializeGameState(gameType);

    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    const playerId = 'player_' + Math.random().toString(36).substr(2, 9);

    server.accept();
    this.websockets.set(server, playerId);
    await this.addPlayer(playerId, server, this.sessionId);

    server.addEventListener('message', async (event) => {
      await this.handleMessage(event.data, server, playerId);
    });

    server.addEventListener('close', async () => {
      await this.removePlayer(playerId, server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async addPlayer(playerId: string, ws: WebSocket, sessionId?: string) {
    if (this.gameState.gameStarted) {
      console.log(`👀 Game already started - adding ${playerId} as spectator`);
      await this.addSpectator(playerId, ws);
      return;
    }

    const isFirstPlayer = this.players.size === 0;
    
    const player = {
      id: playerId,
      name: this.generateSillyName(),
      emoji: this.getRandomAnimalEmoji(),
      connected: true,
      joinedAt: Date.now(),
      isHost: isFirstPlayer
    };

    this.players.set(playerId, player);
    this.gameState.players[playerId] = player;

    await this.saveGameState();

    if (isFirstPlayer) {
      this.gameState.hostId = playerId;
      ws.send(JSON.stringify({
        type: 'host_assigned',
        data: { hostId: playerId },
        timestamp: Date.now()
      }));
    }

    ws.send(JSON.stringify({
      type: 'gameState',
      gameState: this.gameState,
      playerId: playerId
    }));
    
    if (this.chatHistory.length > 0) {
      ws.send(JSON.stringify({
        type: 'chat_history',
        data: {
          messages: this.chatHistory.map(msg => {
            const sender = this.players.get(msg.playerId) || this.spectators.get(msg.playerId);
            return {
              playerId: msg.playerId,
              playerName: sender?.name || 'Unknown',
              playerEmoji: sender?.emoji || '👤',
              message: msg.message,
              timestamp: msg.timestamp,
              isSpectator: this.spectators.has(msg.playerId)
            };
          })
        }
      }));
    }

    this.broadcast({
      type: 'playerJoined', 
      playerId: playerId,
      player: player,
      gameState: this.gameState
    });

    if (sessionId) {
      this.sessionId = sessionId;
    }
    if (isFirstPlayer && this.sessionId) {
      await this.registerWithRegistry();
    } else if (this.sessionId) {
      await this.updateRegistry();
    }

    console.log(`Player ${playerId} joined session ${this.sessionId}`);
  }

  async addSpectator(spectatorId: string, ws: WebSocket) {
    console.log(`👀 Adding spectator ${spectatorId} to game in progress`);
    
    const spectator = {
      id: spectatorId,
      name: this.generateSillyName(),
      emoji: this.getRandomAnimalEmoji(),
      isSpectator: true,
      connected: true,
      joinedAt: Date.now()
    };
    
    this.spectators.set(spectatorId, spectator);
    this.gameState.spectatorCount = this.spectators.size;
    this.gameState.spectators[spectatorId] = spectator;
    
    await this.saveGameState();
    
    ws.send(JSON.stringify({
      type: 'spectator_identity',
      data: { 
        spectatorId: spectatorId,
        spectator: spectator,
        isSpectator: true 
      },
      timestamp: Date.now()
    }));
    
    ws.send(JSON.stringify({
      type: 'gameState',
      gameState: this.gameState,
      spectatorId: spectatorId,
      isSpectator: true
    }));
    
    if (this.chatHistory.length > 0) {
      ws.send(JSON.stringify({
        type: 'chat_history',
        data: {
          messages: this.chatHistory.map(msg => {
            const sender = this.players.get(msg.playerId) || this.spectators.get(msg.playerId);
            return {
              playerId: msg.playerId,
              playerName: sender?.name || 'Unknown',
              playerEmoji: sender?.emoji || '👤',
              message: msg.message,
              timestamp: msg.timestamp,
              isSpectator: this.spectators.has(msg.playerId)
            };
          })
        }
      }));
    }
    
    this.broadcast({
      type: 'spectator_joined',
      data: {
        spectator: spectator,
        spectatorCount: this.gameState.spectatorCount,
        gameState: this.gameState
      }
    });
  }

  async removePlayer(playerId: string, ws: WebSocket) {
    this.websockets.delete(ws);
    
    if (this.spectators.has(playerId)) {
      this.removeSpectator(playerId);
      return;
    }
    
    if (this.players.has(playerId)) {
      const wasHost = this.gameState.hostId === playerId;
      this.players.delete(playerId);
      delete this.gameState.players[playerId];
      
      if (wasHost && this.players.size > 0) {
        const newHostId = this.players.keys().next().value;
        this.gameState.hostId = newHostId;
        const newHost = this.players.get(newHostId);
        newHost.isHost = true;
        this.gameState.players[newHostId] = newHost;
        
        for (const [socket, id] of this.websockets) {
          if (id === newHostId) {
            socket.send(JSON.stringify({
              type: 'host_assigned',
              data: { hostId: newHostId },
              timestamp: Date.now()
            }));
            break;
          }
        }
        
        this.broadcast({
          type: 'host_changed',
          data: { newHostId, gameState: this.gameState }
        });
      }
      
      this.broadcast({
        type: 'playerLeft',
        playerId: playerId,
        gameState: this.gameState
      });

      if (this.players.size === 0 && this.sessionId) {
        await this.unregisterFromRegistry();
      } else if (this.sessionId) {
        await this.updateRegistry();
      }
    }

    console.log(`Player ${playerId} disconnected from session ${this.sessionId}`);
  }

  removeSpectator(spectatorId: string) {
    console.log(`Removing spectator ${spectatorId}`);
    const spectator = this.spectators.get(spectatorId);
    this.spectators.delete(spectatorId);
    delete this.gameState.spectators[spectatorId];
    this.gameState.spectatorCount = this.spectators.size;
    
    this.broadcast({
      type: 'spectator_left',
      data: {
        spectatorId: spectatorId,
        spectator: spectator,
        spectatorCount: this.gameState.spectatorCount,
        gameState: this.gameState
      }
    });
  }

  broadcast(message: any, excludeWs?: WebSocket) {
    const messageStr = JSON.stringify(message);
    for (const ws of this.websockets.keys()) {
      if (ws !== excludeWs && ws.readyState === WebSocket.READY_STATE_OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting message:', error);
          this.websockets.delete(ws);
        }
      }
    }
  }

  sendTo(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.READY_STATE_OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to specific client:', error);
        this.websockets.delete(ws);
      }
    }
  }

  async handleMessage(message: string, ws: WebSocket, playerId: string) {
    try {
      const data = JSON.parse(message);
      const isSpectator = this.spectators.has(playerId);
      
      console.log(`🔍 GameSession received message from ${playerId}:`, data.type, data);
      
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;


        case 'START_GAME':
          if (this.players.has(playerId) && !isSpectator && this.gameState.hostId === playerId) {
            await this.handleStartGame(ws, playerId);
          }
          break;

        case 'updateName':
        case 'change_name':
          if (this.players.has(playerId)) {
            const player = this.players.get(playerId);
            player.name = data.name || data.data?.newName || player.name;
            this.gameState.players[playerId] = player;
            this.broadcast({
              type: 'name_changed',
              playerId: playerId,
              data: { playerId, newName: player.name, gameState: this.gameState }
            });
            
            if (this.sessionId) {
              await this.updateRegistry();
            }
          }
          break;

        case 'updateEmoji':
        case 'change_emoji':
          if (this.players.has(playerId)) {
            const player = this.players.get(playerId);
            player.emoji = data.emoji || data.data?.newEmoji || player.emoji;
            this.gameState.players[playerId] = player;
            this.broadcast({
              type: 'emoji_changed',
              playerId: playerId,
              data: { playerId, newEmoji: player.emoji, gameState: this.gameState }
            });
            
            if (this.sessionId) {
              await this.updateRegistry();
            }
          }
          break;

        case 'chat_message':
          const messageText = data.data?.message || data.message;
          if (messageText && messageText.trim()) {
            const chatMessage = {
              playerId: playerId,
              message: messageText.trim(),
              timestamp: Date.now()
            };
            
            this.chatHistory.push(chatMessage);
            if (this.chatHistory.length > 50) {
              this.chatHistory.shift();
            }
            
            await this.saveGameState();
            
            const sender = this.players.get(playerId) || this.spectators.get(playerId);
            
            this.broadcast({
              type: 'chat_message',
              data: {
                playerId: playerId,
                playerName: sender?.name || 'Unknown',
                playerEmoji: sender?.emoji || '👤',
                message: messageText.trim(),
                timestamp: chatMessage.timestamp,
                isSpectator: this.spectators.has(playerId)
              }
            });
          }
          break;

        case 'RETURN_TO_HOME':
          console.log(`Player ${playerId} returning to home screen`);
          ws.close();
          break;

        default:
          await this.handleGameSpecificMessage(ws, playerId, data);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  protected async handleGameSpecificMessage(ws: WebSocket, playerId: string, data: any) {
    // Override in subclasses
  }

  protected async handleStartGame(ws: WebSocket, playerId: string) {
    console.log(`🏁 Host starting game`);
    this.gameState.status = 'started';
    this.gameState.gameStarted = true;
    
    await this.saveGameState();
    this.updateRegistryStatus('in-progress');
    
    this.broadcast({
      type: 'game_started',
      data: {
        gameType: this.gameState.type,
        gameState: this.gameState
      },
      timestamp: Date.now()
    });

    if (this.sessionId) {
      await this.updateRegistry();
    }
  }


  async updateRegistryStatus(gameStatus: 'waiting' | 'in-progress' | 'finished') {
    if (!this.sessionId) return;
    
    try {
      const registry = this.env.GAME_REGISTRY.get(
        this.env.GAME_REGISTRY.idFromName('singleton')
      );
      
      await registry.fetch(new Request('http://internal/update-game-status', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: this.sessionId,
          gameStatus: gameStatus
        })
      }));
    } catch (error) {
      console.error('Failed to update registry game status:', error);
    }
  }

  generateSillyName(): string {
    const adjectives = ['Happy', 'Silly', 'Brave', 'Clever', 'Swift', 'Mighty', 'Gentle', 'Bold'];
    const nouns = ['Cat', 'Dog', 'Fox', 'Bear', 'Wolf', 'Eagle', 'Lion', 'Tiger'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }

  getRandomAnimalEmoji(): string {
    const ANIMAL_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦏', '🦛', '🐘', '🦒', '🐪', '🐫', '🦙', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦌', '🐐', '🦚', '🦜', '🦢', '🦩', '🕊️', '🦝', '🦨', '🦡', '🦫'];
    return ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)];
  }

  private async registerWithRegistry() {
    try {
      const registry = this.env.GAME_REGISTRY.get(
        this.env.GAME_REGISTRY.idFromName('singleton')
      );
      
      await registry.fetch(new Request('http://internal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          gameType: this.gameState.type || 'checkbox-game',
          playerCount: this.players.size,
          players: Array.from(this.players.values()).map(p => ({
            name: p.name,
            emoji: p.emoji
          })),
          createdAt: Date.now()
        } as SessionMetadata)
      }));
      console.log(`Registered session ${this.sessionId} with registry`);
    } catch (error) {
      console.error('Failed to register with registry:', error);
    }
  }
  
  private async updateRegistry() {
    try {
      const registry = this.env.GAME_REGISTRY.get(
        this.env.GAME_REGISTRY.idFromName('singleton')
      );
      
      await registry.fetch(new Request(`http://internal/update/${this.sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerCount: this.players.size,
          players: Array.from(this.players.values()).map(p => ({
            name: p.name,
            emoji: p.emoji
          })),
          gameStatus: this.gameState.gameStarted ? 'in-progress' : 'waiting'
        })
      }));
    } catch (error) {
      console.error('Failed to update registry:', error);
    }
  }

  private async unregisterFromRegistry() {
    try {
      const registry = this.env.GAME_REGISTRY.get(
        this.env.GAME_REGISTRY.idFromName('singleton')
      );
      
      await registry.fetch(new Request(`http://internal/unregister/${this.sessionId}`, {
        method: 'DELETE'
      }));
      console.log(`Unregistered session ${this.sessionId} from registry`);
    } catch (error) {
      console.error('Failed to unregister from registry:', error);
    }
  }
}