#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const url = require('url');

// Animal emojis for random player assignment
const ANIMAL_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣',
  '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
  '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐟', '🐠', '🐡',
  '🦈', '🐳', '🐋', '🐬', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘',
  '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎',
  '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈'
];

function getRandomAnimalEmoji() {
  return ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)];
}

const { PORT } = require('../config');

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Simple in-memory game sessions
class GameSession {
  constructor(sessionId, gameType = 'checkbox-game') {
    this.sessionId = sessionId;
    this.players = new Map();
    this.spectators = new Map(); // Track spectators separately
    this.websockets = new Set();
    this.playerSockets = new Map(); // Track player ID -> WebSocket mapping
    this.spectatorSockets = new Map(); // Track spectator ID -> WebSocket mapping
    this.chatHistory = []; // Store chat messages
    this.gameState = {
      type: gameType,
      status: 'waiting',
      players: {},
      hostId: null,
      checkboxStates: new Array(9).fill(false), // 3x3 grid of checkboxes, all initially unchecked
      checkboxPlayers: new Array(9).fill(null), // Track which player checked each checkbox
      playerScores: {}, // Track points per player (1 point per checkbox checked)
      gameStarted: false, // Track if game is in session
      gameFinished: false, // Track if game has ended
      spectatorCount: 0, // Track number of spectators
      spectators: {}, // Track spectator data
      roomStatus: 'active', // Room can be active even if game is over
      gameStatus: 'waiting' // Separate game status: 'waiting', 'in-progress', 'finished'
    };
  }

  addPlayer(playerId, ws) {
    this.websockets.add(ws);
    
    // Check if game has already started - if so, add as spectator
    if (this.gameState.gameStarted) {
      this.addSpectator(playerId, ws);
      return;
    }
    
    this.playerSockets.set(playerId, ws); // Track player-socket mapping
    const playerNumber = this.players.size + 1;
    const joinedAt = Date.now();
    const isFirstPlayer = this.players.size === 0;
    
    this.players.set(playerId, {
      id: playerId,
      name: require('sillyname')(),
      emoji: getRandomAnimalEmoji(),
      connected: true,
      joinedAt: joinedAt,
      isHost: isFirstPlayer
    });
    
    this.gameState.players[playerId] = this.players.get(playerId);
    
    // Initialize player score to 0
    this.gameState.playerScores[playerId] = 0;
    
    // Set host if this is the first player
    if (isFirstPlayer) {
      this.gameState.hostId = playerId;
      // Send host assignment message
      ws.send(JSON.stringify({
        type: 'host_assigned',
        data: { hostId: playerId },
        timestamp: Date.now()
      }));
    }
    
    this.broadcast({
      type: 'playerJoined',
      playerId: playerId,
      player: this.players.get(playerId),
      gameState: this.gameState
    });
    
    // Send current state to new player
    ws.send(JSON.stringify({
      type: 'gameState',
      gameState: this.gameState,
      playerId: playerId
    }));
    
    // Send chat history to new player
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
  }

  addSpectator(spectatorId, ws) {
    console.log(`Adding spectator ${spectatorId} to game in progress`);
    this.spectatorSockets.set(spectatorId, ws);
    
    // Create spectator with name and emoji like regular players
    const spectator = {
      id: spectatorId,
      name: require('sillyname')(),
      emoji: getRandomAnimalEmoji(),
      isSpectator: true,
      connected: true,
      joinedAt: Date.now()
    };
    
    this.spectators.set(spectatorId, spectator);
    this.gameState.spectatorCount = this.spectators.size;
    this.gameState.spectators[spectatorId] = spectator; // Add to game state
    
    // Send spectator identity to the joining spectator
    ws.send(JSON.stringify({
      type: 'spectator_identity',
      data: { 
        spectatorId: spectatorId,
        spectator: spectator,
        isSpectator: true 
      },
      timestamp: Date.now()
    }));
    
    // Send current game state to spectator (read-only)
    ws.send(JSON.stringify({
      type: 'gameState',
      gameState: this.gameState,
      spectatorId: spectatorId,
      isSpectator: true
    }));
    
    // Send chat history to spectator
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
    
    // Notify all users that a spectator joined
    this.broadcast({
      type: 'spectator_joined',
      data: {
        spectator: spectator,
        spectatorCount: this.gameState.spectatorCount,
        gameState: this.gameState
      }
    });
  }

  removePlayer(playerId, ws) {
    this.websockets.delete(ws);
    
    // Check if this is a spectator
    if (this.spectators.has(playerId)) {
      this.removeSpectator(playerId, ws);
      return;
    }
    
    this.playerSockets.delete(playerId); // Remove player-socket mapping
    if (this.players.has(playerId)) {
      const wasHost = this.gameState.hostId === playerId;
      
      this.players.delete(playerId);
      delete this.gameState.players[playerId];
      delete this.gameState.playerScores[playerId];
      
      // If host left, assign new host to earliest joined remaining player
      if (wasHost && this.players.size > 0) {
        // Find the player who joined earliest (lowest joinedAt timestamp)
        let newHost = null;
        let earliestJoinTime = Date.now();
        
        for (const [id, player] of this.players) {
          if (player.joinedAt < earliestJoinTime) {
            earliestJoinTime = player.joinedAt;
            newHost = player;
          }
        }
        
        if (newHost) {
          newHost.isHost = true;
          this.gameState.hostId = newHost.id;
          this.gameState.players[newHost.id] = newHost; // Update the gameState
          
          // Notify new host
          const newHostWs = this.getWebSocketForPlayer(newHost.id);
          if (newHostWs) {
            newHostWs.send(JSON.stringify({
              type: 'host_assigned',
              data: { hostId: newHost.id },
              timestamp: Date.now()
            }));
          }
        } else {
          this.gameState.hostId = null;
        }
      }
      
      this.broadcast({
        type: 'playerLeft',
        playerId: playerId,
        gameState: this.gameState
      });
    }
  }

  removeSpectator(spectatorId, ws) {
    console.log(`Removing spectator ${spectatorId}`);
    const spectator = this.spectators.get(spectatorId);
    this.spectatorSockets.delete(spectatorId);
    this.spectators.delete(spectatorId);
    delete this.gameState.spectators[spectatorId]; // Remove from game state
    this.gameState.spectatorCount = this.spectators.size;
    
    // Notify all users that a spectator left
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
  
  // Helper method to find WebSocket for a player
  getWebSocketForPlayer(playerId) {
    return this.playerSockets.get(playerId);
  }

  // Helper method to find WebSocket for a spectator
  getWebSocketForSpectator(spectatorId) {
    return this.spectatorSockets.get(spectatorId);
  }

  // Broadcast to players only (not spectators)
  broadcastToPlayers(message, excludeWs = null) {
    const messageStr = JSON.stringify(message);
    this.playerSockets.forEach(ws => {
      if (ws !== excludeWs && ws.readyState === 1) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting message to player:', error);
        }
      }
    });
  }

  // Broadcast to spectators only
  broadcastToSpectators(message, excludeWs = null) {
    const messageStr = JSON.stringify(message);
    this.spectatorSockets.forEach(ws => {
      if (ws !== excludeWs && ws.readyState === 1) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting message to spectator:', error);
        }
      }
    });
  }

  // Handle checkbox toggle for the shared checkbox game
  handleCheckboxToggle(data, playerId) {
    try {
      const checkboxIndex = data.checkboxIndex || data.data?.checkboxIndex;
      
      // Validate checkbox index (must be between 0 and 8 for 3x3 grid)
      if (typeof checkboxIndex !== 'number' || checkboxIndex < 0 || checkboxIndex > 8) {
        console.error('Invalid checkbox index:', checkboxIndex);
        return;
      }
      
      // Toggle the checkbox state
      const newState = !this.gameState.checkboxStates[checkboxIndex];
      this.gameState.checkboxStates[checkboxIndex] = newState;
      
      // Track which player checked/unchecked this checkbox and update scores
      const previousPlayer = this.gameState.checkboxPlayers[checkboxIndex];
      
      if (newState) {
        // Player is checking the box - record their player ID and add point
        this.gameState.checkboxPlayers[checkboxIndex] = playerId;
        
        // Add point to current player
        if (!this.gameState.playerScores[playerId]) {
          this.gameState.playerScores[playerId] = 0;
        }
        this.gameState.playerScores[playerId]++;
        
        // Remove point from previous player if there was one
        if (previousPlayer && this.gameState.playerScores[previousPlayer] > 0) {
          this.gameState.playerScores[previousPlayer]--;
        }
      } else {
        // Player is unchecking the box - clear the player ID and remove point
        this.gameState.checkboxPlayers[checkboxIndex] = null;
        
        // Remove point from player who unchecked
        if (this.gameState.playerScores[playerId] > 0) {
          this.gameState.playerScores[playerId]--;
        }
      }
      
      // Get player info for the broadcast
      const player = this.players.get(playerId);
      
      console.log(`Player ${player ? player.name : playerId} toggled checkbox ${checkboxIndex} to ${newState}`);
      console.log('Updated scores:', this.gameState.playerScores);
      
      // Check for win condition - all boxes checked
      const allBoxesChecked = this.gameState.checkboxStates.every(state => state === true);
      
      if (allBoxesChecked && this.gameState.gameStarted) {
        // Game is over - determine winner
        this.handleGameEnd();
      } else {
        // Broadcast the checkbox state change to all players
        this.broadcast({
          type: 'checkbox_toggled',
          data: {
            checkboxIndex: checkboxIndex,
            newState: this.gameState.checkboxStates[checkboxIndex],
            toggledBy: playerId,
            player: player,
            gameState: this.gameState
          },
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('Error handling checkbox toggle:', error);
    }
  }

  // Handle game end - determine winner and broadcast results
  handleGameEnd() {
    try {
      console.log('Game ended - all checkboxes checked');
      
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
        const winnerPlayer = this.players.get(winners[0]);
        resultMessage = `${winnerPlayer.name} wins!`;
      }
      
      // Update game status
      this.gameState.status = 'ended';
      this.gameState.gameStarted = false;
      this.gameState.gameFinished = true;
      this.gameState.gameStatus = 'finished';
      
      console.log('Game result:', resultMessage);
      console.log('Final scores:', scores);
      
      // Broadcast game end to all players
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
      
    } catch (error) {
      console.error('Error handling game end:', error);
    }
  }

  handleVote(data, playerId) {
    console.log('🗳️ Player voted:', playerId, 'for', data.data?.vote);
    
    // Get player name for win message
    const player = this.players.get(playerId);
    const playerName = player ? player.name : 'Unknown Player';
    const vote = data.data?.vote || 'Pizza';
    
    // For MVP: immediately end game after any vote
    console.log('Game ended - vote received');
    
    // Update game state
    this.gameState.status = 'ended';
    this.gameState.gameStarted = false;
    this.gameState.gameFinished = true;
    this.gameState.gameStatus = 'finished';
    
    // Create simple scores object (can be expanded later for multi-player)
    const scores = {};
    scores[playerId] = 1; // Winner gets 1 point
    
    const resultMessage = `${playerName} chose ${vote}! You win!`;
    
    console.log('Game result:', resultMessage);
    
    // Send consistent game_ended message (same as checkbox game)
    this.broadcast({
      type: 'game_ended',
      data: {
        message: resultMessage,
        winners: [playerId],
        scores: scores,
        gameState: this.gameState,
        // Keep voting-specific data for any game-specific handling
        vote: vote,
        question: 'Pizza or Burgers?'
      },
      timestamp: Date.now()
    });
    
    console.log('✅ Sent game_ended message');
  }

  handleMessage(message, ws, playerId) {
    try {
      const data = JSON.parse(message);
      
      // Check if this is a spectator - spectators can't perform most actions
      const isSpectator = this.spectators.has(playerId);
      
      switch (data.type) {
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
          } else if (isSpectator && this.spectators.has(playerId)) {
            const spectator = this.spectators.get(playerId);
            spectator.name = data.name || data.data?.newName || spectator.name;
            this.gameState.spectators[playerId] = spectator; // Update in game state
            this.broadcast({
              type: 'spectator_name_changed',
              spectatorId: playerId,
              data: { spectatorId: playerId, newName: spectator.name, spectator: spectator }
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
          } else if (isSpectator && this.spectators.has(playerId)) {
            const spectator = this.spectators.get(playerId);
            spectator.emoji = data.emoji || data.data?.newEmoji || spectator.emoji;
            this.gameState.spectators[playerId] = spectator; // Update in game state
            this.broadcast({
              type: 'spectator_emoji_changed',
              spectatorId: playerId,
              data: { spectatorId: playerId, newEmoji: spectator.emoji, spectator: spectator }
            });
          }
          break;
          
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
          // Only allow host to start the game (spectators can't be host)
          if (this.players.has(playerId) && !isSpectator && this.gameState.hostId === playerId) {
            console.log(`Host ${playerId} starting game: ${data.data?.gameType}`);
            
            // Update game status
            this.gameState.status = 'started';
            this.gameState.gameStarted = true;
            this.gameState.gameStatus = 'in-progress';
            
            // Broadcast game start to all players and spectators
            this.broadcast({
              type: 'game_started',
              data: {
                gameType: data.data?.gameType || this.gameState.type,
                startedBy: playerId,
                gameState: this.gameState
              },
              timestamp: Date.now()
            });
          } else if (isSpectator) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Spectators cannot start the game',
              timestamp: Date.now()
            }));
          } else {
            // Send error to non-host player who tried to start game
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Only the host can start the game',
              timestamp: Date.now()
            }));
          }
          break;

        case 'RETURN_TO_HOME':
          // Handle player/spectator returning to home screen after game ends
          console.log(`${isSpectator ? 'Spectator' : 'Player'} ${playerId} returning to home screen`);
          // This will trigger the disconnect logic which removes the player/spectator
          ws.close();
          break;
          
        case 'chat_message':
          const messageText = data.data?.message || data.message;
          if (messageText && messageText.trim()) {
            const chatMessage = {
              playerId: playerId,
              message: messageText.trim(),
              timestamp: Date.now()
            };
            
            // Add to chat history (keep last 50 messages)
            this.chatHistory.push(chatMessage);
            if (this.chatHistory.length > 50) {
              this.chatHistory.shift();
            }
            
            // Get sender info (could be player or spectator)
            const sender = this.players.get(playerId) || this.spectators.get(playerId);
            
            // Broadcast to all connected clients
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
          
        default:
          // Forward unknown messages to Durable Object (for game-specific actions)
          console.log('Forwarding game-specific message:', data.type);
          if (this.gameState.type === 'everybody-votes' && data.type === 'submit_vote') {
            console.log('📝 Processing vote:', data.data?.vote);
            this.handleVote(data, playerId);
          } else {
            console.log('Unknown message type:', data.type);
          }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  broadcast(message, excludeWs = null) {
    const messageStr = JSON.stringify(message);
    this.websockets.forEach(ws => {
      if (ws !== excludeWs && ws.readyState === 1) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting message:', error);
          this.websockets.delete(ws);
        }
      }
    });
  }
}

// Game sessions storage
const gameSessions = new Map();

// HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: Date.now(),
      environment: 'local-development'
    }));
    return;
  }

  if (pathname === '/api/active-rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const activeRooms = [];
    
    gameSessions.forEach((session, sessionId) => {
      // Only show rooms with active connections AND games that are not finished
      if (session.websockets.size > 0 && session.gameState.gameStatus !== 'finished') {
        const players = Object.values(session.gameState.players);
        activeRooms.push({
          sessionId: sessionId,
          gameType: session.gameState.type || 'hello-world',
          playerCount: players.length,
          players: players.map(p => ({ name: p.name, emoji: p.emoji })),
          createdAt: session.gameState.createdAt || Date.now(),
          roomStatus: session.gameState.roomStatus || 'active',
          gameStatus: session.gameState.gameStatus || 'waiting'
        });
      }
    });
    
    res.end(JSON.stringify({ rooms: activeRooms }));
    return;
  }

  // Static file serving  
  let filePath;
  const projectRoot = path.join(__dirname, '..');
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(projectRoot, 'src', 'static', 'index.html');
  } else if (pathname.startsWith('/static/')) {
    filePath = path.join(projectRoot, 'src', pathname);
  } else {
    // Default to index.html for SPA routing
    filePath = path.join(projectRoot, 'src', 'static', 'index.html');
  }

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    // Get file extension and MIME type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const gameType = parsedUrl.query.gameType || 'checkbox-game';
  console.log('WebSocket connection:', pathname, 'gameType:', gameType);
  
  // Extract session ID from URL (e.g., /ws, /api/game/test-session/ws)
  let sessionId = 'default-session';
  if (pathname.includes('/api/game/') && pathname.endsWith('/ws')) {
    const parts = pathname.split('/');
    sessionId = parts[3]; // /api/game/{sessionId}/ws
  } else if (pathname === '/ws') {
    sessionId = 'test-session';
  }
  
  // Get or create game session with the specified game type
  if (!gameSessions.has(sessionId)) {
    gameSessions.set(sessionId, new GameSession(sessionId, gameType));
  }
  const gameSession = gameSessions.get(sessionId);
  
  // Generate player ID
  const playerId = 'player_' + Math.random().toString(36).substr(2, 9);
  
  // Add player to session
  gameSession.addPlayer(playerId, ws);
  
  console.log(`Player ${playerId} joined session ${sessionId}`);

  // Handle messages
  ws.on('message', (message) => {
    gameSession.handleMessage(message.toString(), ws, playerId);
  });

  // Handle disconnect
  ws.on('close', () => {
    const isSpectator = gameSession.spectators.has(playerId);
    console.log(`${isSpectator ? 'Spectator' : 'Player'} ${playerId} disconnected from session ${sessionId}`);
    gameSession.removePlayer(playerId, ws);
    
    // Clean up empty sessions (only if no players or spectators)
    if (gameSession.websockets.size === 0) {
      setTimeout(() => {
        if (gameSession.websockets.size === 0) {
          gameSessions.delete(sessionId);
          console.log(`Cleaned up empty session ${sessionId}`);
        }
      }, 30000); // Clean up after 30 seconds
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    gameSession.removePlayer(playerId, ws);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🎮 Premium Web Games Online Incorporated LLC Esq. GPT CBD running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 Test WebSocket at ws://localhost:${PORT}/ws`);
});