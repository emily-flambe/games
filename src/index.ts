/**
 * Games Platform - Cloudflare Worker Entry Point
 * Serves the games platform with WebSocket support
 */

import { staticAssets } from './lib/static';

export interface Env {
  // Add any environment variables here
  GAME_SESSIONS: DurableObjectNamespace;
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

  constructor(private state: DurableObjectState, private env: Env) {
    // Initialize game state
    this.gameState = {
      type: 'checkbox-game',
      status: 'waiting',
      players: {},
      hostId: null,
      checkboxStates: new Array(9).fill(false),
      checkboxPlayers: new Array(9).fill(null),
      playerScores: {},
      gameStarted: false,
      spectatorCount: 0,
      spectators: {}
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Extract session ID from URL
    const pathMatch = url.pathname.match(/^\/api\/game\/([A-Z0-9]+)\/ws$/);
    if (pathMatch) {
      this.sessionId = pathMatch[1];
    }

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

    // Add player or spectator
    this.addPlayer(playerId, server);

    // Set up message handler
    server.addEventListener('message', (event) => {
      this.handleMessage(event.data, server, playerId);
    });

    // Set up close handler  
    server.addEventListener('close', () => {
      this.removePlayer(playerId, server);
    });

    // Return the client side of the WebSocket
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  addPlayer(playerId: string, ws: WebSocket) {
    // Check if game has already started - if so, add as spectator
    if (this.gameState.gameStarted) {
      this.addSpectator(playerId, ws);
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

    console.log(`Player ${playerId} joined session ${this.sessionId}`);
  }

  addSpectator(spectatorId: string, ws: WebSocket) {
    console.log(`Adding spectator ${spectatorId} to game in progress`);
    
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

  removePlayer(playerId: string, ws: WebSocket) {
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

  handleMessage(message: string, ws: WebSocket, playerId: string) {
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
            console.log(`Host ${playerId} starting game`);
            this.gameState.status = 'started';
            this.gameState.gameStarted = true;
            
            this.broadcast({
              type: 'game_started',
              data: {
                gameType: 'checkbox-game',
                gameState: this.gameState
              },
              timestamp: Date.now()
            });
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
    const checkboxIndex = data.checkboxIndex || data.data?.checkboxIndex;
    
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
      this.handleGameEnd();
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

  handleGameEnd() {
    console.log('Game ended - all checkboxes checked');
    
    // Find winner (highest score)
    let winnerId = null;
    let highestScore = -1;
    
    for (const [playerId, score] of Object.entries(this.gameState.playerScores)) {
      if ((score as number) > highestScore) {
        highestScore = score as number;
        winnerId = playerId;
      }
    }
    
    const winner = winnerId ? this.players.get(winnerId) : null;
    const winnerName = winner ? winner.name : 'Unknown';
    
    console.log(`Game result: ${winnerName} wins!`);
    console.log('Final scores:', this.gameState.playerScores);
    
    this.broadcast({
      type: 'game_ended',
      data: {
        winner: winner,
        winnerId: winnerId,
        winnerName: winnerName,
        finalScores: this.gameState.playerScores,
        gameState: this.gameState
      },
      timestamp: Date.now()
    });
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
}