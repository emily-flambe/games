/**
 * Games Platform - Cloudflare Worker Entry Point
 * Serves the games platform with WebSocket support
 */

import { staticAssets } from './lib/static';

export interface Env {
  // Add any environment variables here
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
  roomStatus: 'active' | 'inactive';  // Room can be active even if game is over
  gameStatus: 'waiting' | 'in-progress' | 'finished';  // Actual game state
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle WebSocket upgrade requests
    if (request.headers.get("Upgrade") === "websocket") {
      return handleWebSocket(request, env);
    }

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Handle API routes
    if (path === '/api/active-rooms' && request.method === 'GET') {
      return handleActiveRoomsAPI(env);
    }

    // Serve static assets
    try {
      const asset = getStaticAsset(path);
      if (asset) {
        return new Response(asset.content, {
          headers: {
            'Content-Type': asset.contentType,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Default to serving the main HTML page
      const htmlAsset = staticAssets['/static/index.html'];
      if (htmlAsset) {
        return new Response(htmlAsset, {
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

/**
 * Handle WebSocket connections
 */
async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/api\/game\/([A-Z0-9]+)\/ws$/);
  
  if (!pathMatch) {
    return new Response('Invalid WebSocket path', { status: 400 });
  }
  
  const sessionId = pathMatch[1];
  
  // Get the Durable Object for this game session
  const id = env.GAME_SESSIONS.idFromName(sessionId);
  const gameSession = env.GAME_SESSIONS.get(id);
  
  // Forward the WebSocket request to the Durable Object
  return gameSession.fetch(request);
}

/**
 * Handle Active Rooms API requests
 */
async function handleActiveRoomsAPI(env: Env): Promise<Response> {
  try {
    const registry = env.GAME_REGISTRY.get(
      env.GAME_REGISTRY.idFromName('singleton')
    );
    
    const response = await registry.fetch(
      new Request('http://internal/list', { method: 'GET' })
    );
    
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Active rooms API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch active rooms',
      rooms: [] 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * Get static asset by path
 */
function getStaticAsset(path: string): { content: string; contentType: string } | null {
  // Normalize path
  if (path === '/' || path === '') {
    path = '/static/index.html';
  }

  const asset = staticAssets[path];
  if (!asset) {
    return null;
  }

  // Determine content type
  let contentType = 'text/plain';
  if (path.endsWith('.html')) {
    contentType = 'text/html; charset=UTF-8';
  } else if (path.endsWith('.css')) {
    contentType = 'text/css; charset=UTF-8';
  } else if (path.endsWith('.js')) {
    contentType = 'application/javascript; charset=UTF-8';
  } else if (path.endsWith('.json')) {
    contentType = 'application/json; charset=UTF-8';
  }

  return {
    content: asset,
    contentType,
  };
}

/**
 * GameSession Durable Object
 * Handles multiplayer game sessions with WebSocket connections
 */
export class GameSession implements DurableObject {
  private websockets: Map<WebSocket, string> = new Map(); // WebSocket -> playerId
  private players: Map<string, any> = new Map();
  private spectators: Map<string, any> = new Map(); 
  private gameState: any;
  private sessionId: string = '';
  private initialized: boolean = false;

  constructor(private state: DurableObjectState, private env: Env) {
    // Game state will be loaded lazily in initializeGameState()
    this.gameState = null;
  }

  /**
   * Initialize or load existing game state from Durable Object storage
   */
  private async initializeGameState() {
    if (this.initialized) return;
    
    // Try to load existing game state from storage
    const storedState = await this.state.storage.get('gameState');
    const storedPlayers = await this.state.storage.get('players');
    const storedSpectators = await this.state.storage.get('spectators');
    
    if (storedState) {
      // Load existing game state
      this.gameState = storedState;
      console.log(`🔄 Loaded existing game state - gameStarted: ${this.gameState.gameStarted}`);
    } else {
      // Initialize fresh game state
      this.gameState = {
        type: 'checkbox-game',
        status: 'waiting',
        players: {},
        hostId: null,
        checkboxStates: new Array(9).fill(false),
        checkboxPlayers: new Array(9).fill(null),
        playerScores: {},
        gameStarted: false,
        gameFinished: false,
        spectatorCount: 0,
        spectators: {}
      };
      console.log('🆕 Initialized fresh game state');
    }
    
    // Restore players and spectators maps
    if (storedPlayers) {
      this.players = new Map(storedPlayers);
    }
    if (storedSpectators) {
      this.spectators = new Map(storedSpectators);
    }
    
    this.initialized = true;
  }

  /**
   * Save current game state to Durable Object storage
   */
  private async saveGameState() {
    await this.state.storage.put({
      gameState: this.gameState,
      players: Array.from(this.players.entries()),
      spectators: Array.from(this.spectators.entries())
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Extract session ID from URL
    const pathMatch = url.pathname.match(/^\/api\/game\/([A-Z0-9]+)\/ws$/);
    if (pathMatch) {
      this.sessionId = pathMatch[1];
    }

    // Initialize game state before processing any requests
    await this.initializeGameState();

    // Check for WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair());

    // Generate player ID
    const playerId = 'player_' + Math.random().toString(36).substr(2, 9);

    // Accept the WebSocket connection
    server.accept();

    // Add to our connections
    this.websockets.set(server, playerId);

    // Add player or spectator (pass sessionId)
    await this.addPlayer(playerId, server, this.sessionId);

    // Set up message handler
    server.addEventListener('message', async (event) => {
      await this.handleMessage(event.data, server, playerId);
    });

    // Set up close handler  
    server.addEventListener('close', async () => {
      await this.removePlayer(playerId, server);
    });

    // Return the client side of the WebSocket
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async addPlayer(playerId: string, ws: WebSocket, sessionId?: string) {
    // Check if game has already started - if so, add as spectator
    if (this.gameState.gameStarted) {
      console.log(`\ud83d\udc40 Game already started - adding ${playerId} as spectator`);
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
    this.gameState.playerScores[playerId] = 0;

    // Save state after adding player
    await this.saveGameState();

    // Set host if this is the first player
    if (isFirstPlayer) {
      this.gameState.hostId = playerId;
      ws.send(JSON.stringify({
        type: 'host_assigned',
        data: { hostId: playerId },
        timestamp: Date.now()
      }));
    }

    // Send current state to new player
    ws.send(JSON.stringify({
      type: 'gameState',
      gameState: this.gameState,
      playerId: playerId
    }));

    // Broadcast player joined
    this.broadcast({
      type: 'playerJoined', 
      playerId: playerId,
      player: player,
      gameState: this.gameState
    });

    // Registry integration
    if (sessionId) {
      this.sessionId = sessionId; // Ensure sessionId is set
    }
    if (isFirstPlayer && this.sessionId) {
      await this.registerWithRegistry();
    } else if (this.sessionId) {
      await this.updateRegistry();
    }

    console.log(`Player ${playerId} joined session ${this.sessionId}`);
  }

  async addSpectator(spectatorId: string, ws: WebSocket) {
    console.log(`\ud83d\udc40 Adding spectator ${spectatorId} to game in progress`);
    
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
    
    // Save state after adding spectator
    await this.saveGameState();
    
    // Send spectator identity
    ws.send(JSON.stringify({
      type: 'spectator_identity',
      data: { 
        spectatorId: spectatorId,
        spectator: spectator,
        isSpectator: true 
      },
      timestamp: Date.now()
    }));
    
    // Send current game state
    ws.send(JSON.stringify({
      type: 'gameState',
      gameState: this.gameState,
      spectatorId: spectatorId,
      isSpectator: true
    }));
    
    // Broadcast spectator joined
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
    
    // Check if this is a spectator
    if (this.spectators.has(playerId)) {
      this.removeSpectator(playerId);
      return;
    }
    
    if (this.players.has(playerId)) {
      const wasHost = this.gameState.hostId === playerId;
      this.players.delete(playerId);
      delete this.gameState.players[playerId];
      delete this.gameState.playerScores[playerId];
      
      // Handle host transition
      if (wasHost && this.players.size > 0) {
        const newHostId = this.players.keys().next().value;
        this.gameState.hostId = newHostId;
        const newHost = this.players.get(newHostId);
        newHost.isHost = true;
        this.gameState.players[newHostId] = newHost;
        
        // Find the new host's WebSocket
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

      // Registry integration
      if (this.players.size === 0 && this.sessionId) {
        // Last player left, unregister the session
        await this.unregisterFromRegistry();
      } else if (this.sessionId) {
        // Update player count
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

  async handleMessage(message: string, ws: WebSocket, playerId: string) {
    try {
      const data = JSON.parse(message);
      const isSpectator = this.spectators.has(playerId);
      
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'toggle_checkbox':
        case 'TOGGLE_CHECKBOX':
          if (this.players.has(playerId) && !isSpectator) {
            this.handleCheckboxToggle(data, playerId);
          } else if (isSpectator) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Spectators cannot interact with the game',
              timestamp: Date.now()
            }));
          }
          break;

        case 'START_GAME':
          if (this.players.has(playerId) && !isSpectator && this.gameState.hostId === playerId) {
            console.log(`\ud83c\udfc1 Host ${playerId} starting game`);
            this.gameState.status = 'started';
            this.gameState.gameStarted = true;
            
            // Save state immediately after starting game
            await this.saveGameState();
            
            // Update registry to mark game as in-progress
            this.updateRegistryStatus('in-progress');
            
            this.broadcast({
              type: 'game_started',
              data: {
                gameType: 'checkbox-game',
                gameState: this.gameState
              },
              timestamp: Date.now()
            });

            // Update registry to reflect game is in progress
            if (this.sessionId) {
              await this.updateRegistry();
            }
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
            
            // Update registry with new player info
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
            
            // Update registry with new player info
            if (this.sessionId) {
              await this.updateRegistry();
            }
          }
          break;

        case 'RETURN_TO_HOME':
          console.log(`Player ${playerId} returning to home screen`);
          ws.close();
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  handleCheckboxToggle(data: any, playerId: string) {
    const checkboxIndex = data.checkboxIndex !== undefined ? data.checkboxIndex : data.data?.checkboxIndex;
    
    if (typeof checkboxIndex !== 'number' || checkboxIndex < 0 || checkboxIndex > 8) {
      console.error('Invalid checkbox index:', checkboxIndex);
      return;
    }
    
    const newState = !this.gameState.checkboxStates[checkboxIndex];
    this.gameState.checkboxStates[checkboxIndex] = newState;
    
    const previousPlayer = this.gameState.checkboxPlayers[checkboxIndex];
    
    if (newState) {
      // Player checked the box
      this.gameState.checkboxPlayers[checkboxIndex] = playerId;
      this.gameState.playerScores[playerId] = (this.gameState.playerScores[playerId] || 0) + 1;
      
      // If another player had this box checked, decrement their score
      if (previousPlayer && previousPlayer !== playerId) {
        this.gameState.playerScores[previousPlayer] = Math.max(0, (this.gameState.playerScores[previousPlayer] || 0) - 1);
      }
    } else {
      // Player unchecked the box
      this.gameState.checkboxPlayers[checkboxIndex] = null;
      this.gameState.playerScores[playerId] = Math.max(0, (this.gameState.playerScores[playerId] || 0) - 1);
    }
    
    const player = this.players.get(playerId);
    console.log(`Player ${player ? player.name : playerId} toggled checkbox ${checkboxIndex} to ${newState}`);
    
    // Check for win condition
    const allBoxesChecked = this.gameState.checkboxStates.every(state => state === true);
    
    if (allBoxesChecked && this.gameState.gameStarted) {
      await this.handleGameEnd();
    } else {
      this.broadcast({
        type: 'checkbox_toggled',
        data: {
          checkboxIndex: checkboxIndex,
          newState: this.gameState.checkboxStates[checkboxIndex],
          playerId: playerId,
          playerScores: this.gameState.playerScores,
          gameState: this.gameState
        },
        timestamp: Date.now()
      });
    }
  }

  async handleGameEnd() {
    console.log('\ud83c\udfc6 Game ended - all checkboxes checked');
    
    // Update game state to mark game as finished
    this.gameState.gameStarted = false;  // Game is no longer in progress
    this.gameState.gameFinished = true;  // Game is finished
    this.gameState.status = 'finished';  // Update status
    
    // Save state after game ends
    await this.saveGameState();
    
    // Find the highest score
    const scores = this.gameState.playerScores;
    const maxScore = Math.max(...Object.values(scores));
    
    // Find all players with the highest score
    const winners = Object.keys(scores).filter(playerId => scores[playerId] === maxScore);
    
    let resultMessage;
    if (winners.length > 1) {
      // Tie - everyone loses
      resultMessage = "EVERYONE LOSES";
    } else {
      // Single winner
      const winnerId = winners[0];
      const winner = this.players.get(winnerId);
      const winnerName = winner ? winner.name : 'Unknown';
      resultMessage = `${winnerName.toUpperCase()} WINS!`;
    }
    
    console.log('Game result:', resultMessage);
    console.log('Final scores:', scores);
    
    // Update registry to mark game as finished
    this.updateRegistryStatus('finished');
    
    this.broadcast({
      type: 'game_ended',
      data: {
        message: resultMessage,
        winners: winners,
        scores: scores,
        gameState: this.gameState
      },
      timestamp: Date.now()
    });
  }

  // Registry update methods
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

  // Helper functions
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
          gameType: 'checkbox-game',
          playerCount: this.players.size,
          players: Array.from(this.players.values()).map(p => ({
            name: p.name,
            emoji: p.emoji
          })),
          createdAt: Date.now()
          // roomStatus and gameStatus will be set by the registry
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

/**
 * GameSessionRegistry Durable Object
 * Tracks active game sessions for room discovery
 */
export class GameSessionRegistry implements DurableObject {
  private sessions: Map<string, SessionMetadata> = new Map();

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      if (request.method === 'POST' && url.pathname === '/register') {
        const data: SessionMetadata = await request.json();
        this.sessions.set(data.sessionId, {
          ...data,
          roomStatus: 'active',  // Room is active when first created
          gameStatus: 'waiting', // Game starts in waiting state
          lastHeartbeat: Date.now()
        });
        console.log(`Registered session: ${data.sessionId} (${data.gameType})`);
        return new Response('OK');
      }
      
      if (request.method === 'PUT' && url.pathname.startsWith('/update/')) {
        const sessionId = url.pathname.split('/')[2];
        const updateData = await request.json();
        
        const existingSession = this.sessions.get(sessionId);
        if (existingSession) {
          this.sessions.set(sessionId, {
            ...existingSession,
            ...updateData,
            lastHeartbeat: Date.now()
          });
          console.log(`Updated session: ${sessionId}`);
        }
        return new Response('OK');
      }
      
      if (request.method === 'POST' && url.pathname === '/update-game-status') {
        const { sessionId, gameStatus } = await request.json();
        const existingSession = this.sessions.get(sessionId);
        
        if (existingSession) {
          this.sessions.set(sessionId, {
            ...existingSession,
            gameStatus: gameStatus,
            lastHeartbeat: Date.now()
          });
          console.log(`Updated game status for session ${sessionId} to: ${gameStatus}`);
        }
        return new Response('OK');
      }
      
      if (request.method === 'DELETE' && url.pathname.startsWith('/unregister/')) {
        const sessionId = url.pathname.split('/')[2];
        this.sessions.delete(sessionId);
        console.log(`Unregistered session: ${sessionId}`);
        return new Response('OK');
      }
      
      if (request.method === 'GET' && url.pathname === '/list') {
        this.cleanupStale();
        // Only show games that are not finished (waiting or in-progress)
        const activeGames = Array.from(this.sessions.values())
          .filter(session => session.gameStatus !== 'finished');
        return Response.json({ rooms: activeGames });
      }
      
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('GameSessionRegistry error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  private cleanupStale() {
    const now = Date.now();
    const TTL = 30 * 60 * 1000; // 30 minutes
    
    for (const [id, session] of this.sessions) {
      if (now - session.lastHeartbeat > TTL) {
        this.sessions.delete(id);
        console.log(`Cleaned up stale session: ${id}`);
      }
    }
  }
}