import type { Env, Context } from '../types/shared';

class Router {
  private routes: Array<{
    method: string;
    pattern: RegExp;
    handler: (ctx: Context) => Promise<Response>;
    paramNames: string[];
  }> = [];

  // Register a route
  private addRoute(
    method: string,
    path: string,
    handler: (ctx: Context) => Promise<Response>
  ) {
    const paramNames: string[] = [];
    const pattern = new RegExp(
      '^' + 
      path
        .replace(/\/:([^/]+)/g, (_, paramName) => {
          paramNames.push(paramName);
          return '/([^/]+)';
        })
        .replace(/\*/g, '.*') +
      '$'
    );
    
    this.routes.push({ method, pattern, handler, paramNames });
  }

  get(path: string, handler: (ctx: Context) => Promise<Response>) {
    this.addRoute('GET', path, handler);
  }

  post(path: string, handler: (ctx: Context) => Promise<Response>) {
    this.addRoute('POST', path, handler);
  }

  put(path: string, handler: (ctx: Context) => Promise<Response>) {
    this.addRoute('PUT', path, handler);
  }

  delete(path: string, handler: (ctx: Context) => Promise<Response>) {
    this.addRoute('DELETE', path, handler);
  }

  // Handle incoming requests
  async handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = url.pathname.match(route.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });

      const ctx: Context = { env, request, params };
      return await route.handler(ctx);
    }

    return new Response('Not Found', { status: 404 });
  }
}

// Create router instance and define routes
export const router = new Router();

// Health check (moved to specific path)
router.get('/api/health', async (ctx) => {
  return new Response(JSON.stringify({ 
    status: 'ok',
    timestamp: Date.now(),
    environment: ctx.env.ENVIRONMENT || 'development'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// API routes
router.get('/api/sessions', async (ctx) => {
  // TODO: Implement session listing without SessionManager
  return new Response(JSON.stringify([]), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.post('/api/sessions', async (ctx) => {
  // TODO: Implement session creation without SessionManager
  return new Response(JSON.stringify({ error: 'Not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Create or update specific game session
router.post('/api/game/:sessionId', async (ctx) => {
  const sessionId = ctx.params?.sessionId;
  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  const id = ctx.env.GAME_SESSION.idFromName(sessionId);
  const gameSession = ctx.env.GAME_SESSION.get(id);
  return await gameSession.fetch(ctx.request);
});

// Game session HTTP API
router.get('/api/game/:sessionId', async (ctx) => {
  const sessionId = ctx.params?.sessionId;
  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  const id = ctx.env.GAME_SESSION.idFromName(sessionId);
  const gameSession = ctx.env.GAME_SESSION.get(id);
  return await gameSession.fetch(ctx.request);
});

// Game session WebSocket
router.get('/api/game/:sessionId/ws', async (ctx) => {
  const sessionId = ctx.params?.sessionId;
  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  const id = ctx.env.GAME_SESSION.idFromName(sessionId);
  const gameSession = ctx.env.GAME_SESSION.get(id);
  return await gameSession.fetch(ctx.request);
});

// Simple WebSocket endpoint for testing
router.get('/ws', async (ctx) => {
  // Create a test game session for WebSocket testing
  const testSessionId = 'test-session';
  const id = ctx.env.GAME_SESSION.idFromName(testSessionId);
  const gameSession = ctx.env.GAME_SESSION.get(id);
  return await gameSession.fetch(ctx.request);
});

// Static file serving (basic implementation)
router.get('/*', async (ctx) => {
  const url = new URL(ctx.request.url);
  let path = url.pathname;
  
  // Default to index.html for SPA routing
  if (path === '/' || !path.includes('.')) {
    path = '/index.html';
  }

  // Serve the actual HTML file
  if (path === '/index.html') {
    return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Games Platform</title>
    <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>Games Platform</h1>
            <div id="connection-status" class="status-disconnected">Disconnected</div>
        </header>
        
        <main>
            <!-- Game Portal View -->
            <div id="game-portal" class="view active">
                <h2>Select a Game</h2>
                <div class="games-grid">
                    <button class="game-card" data-game="tic-tac-toe">
                        <h3>Tic Tac Toe</h3>
                        <p>Classic 3x3 strategy game</p>
                    </button>
                    <button class="game-card" data-game="rock-paper-scissors">
                        <h3>Rock Paper Scissors</h3>
                        <p>Quick decision-based game</p>
                    </button>
                    <button class="game-card" data-game="connect-four">
                        <h3>Connect Four</h3>
                        <p>Drop chips to connect four in a row</p>
                    </button>
                    <button class="game-card" data-game="drawing">
                        <h3>Drawing Game</h3>
                        <p>Draw and guess words with friends</p>
                    </button>
                </div>
                
                <div class="join-room-section">
                    <h3>Join Existing Room</h3>
                    <input type="text" id="room-code-input" placeholder="Enter room code">
                    <button id="join-room-btn">Join Room</button>
                </div>
            </div>
            
            <!-- Game Room View -->
            <div id="game-room" class="view">
                <div class="room-header">
                    <div class="room-info">
                        <h2 id="game-title">Game Room</h2>
                        <div class="room-code">Room: <span id="room-code-display"></span></div>
                    </div>
                    <button id="leave-room-btn">Leave Room</button>
                </div>
                
                <div class="game-status">
                    <div id="game-state">Waiting for players...</div>
                    <div id="player-turn"></div>
                </div>
                
                <div class="players-list">
                    <h3>Players</h3>
                    <div id="players-container"></div>
                </div>
                
                <div id="game-board-container">
                    <!-- Game-specific board will be inserted here -->
                </div>
                
                <!-- Drawing Game Specific UI -->
                <div id="drawing-controls" class="drawing-controls" style="display: none;">
                    <div class="drawing-tools">
                        <button id="clear-canvas-btn">Clear</button>
                        <label>Color: <input type="color" id="brush-color" value="#000000"></label>
                        <label>Size: <input type="range" id="brush-size" min="1" max="10" value="3"></label>
                    </div>
                    <div id="word-display" class="word-display"></div>
                    <div id="guess-input-container" class="guess-input" style="display: none;">
                        <input type="text" id="guess-input" placeholder="Enter your guess...">
                        <button id="submit-guess-btn">Guess</button>
                    </div>
                    <div id="game-timer" class="game-timer"></div>
                </div>
                
                <div class="game-controls">
                    <button id="start-game-btn" style="display: none;">Start Game</button>
                    <button id="restart-game-btn" style="display: none;">Restart Game</button>
                </div>
            </div>
        </main>
        
        <!-- Loading overlay -->
        <div id="loading-overlay" class="overlay" style="display: none;">
            <div class="spinner"></div>
            <p>Connecting...</p>
        </div>
        
        <!-- Error messages -->
        <div id="error-container" class="error-container"></div>
    </div>
    
    <script src="/static/bundle.js"></script>
</body>
</html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Serve CSS and JS files - in a real Cloudflare Worker deployment,
  // these would be served as static assets or bundled differently
  if (path === '/static/styles.css') {
    try {
      // Try to import the CSS as a module (this is a simplified approach)
      const cssContent = `/* Basic styling for development - CSS would be imported properly in production */
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
      .games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
      .game-card { background: white; border: 1px solid #ccc; border-radius: 8px; padding: 15px; cursor: pointer; transition: transform 0.2s; min-height: 100px; }
      .game-card h3 { margin: 0 0 10px 0; color: #333; font-size: 16px; }
      .game-card p { margin: 0; color: #666; font-size: 14px; line-height: 1.4; }
      .game-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
      .view { display: none; } .view.active { display: block; }
      #connection-status { padding: 5px 10px; border-radius: 4px; }
      .status-connected { background: green; color: white; }
      .status-disconnected { background: red; color: white; }
      .drawing-controls { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 8px; }
      .drawing-tools { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
      .drawing-canvas { border: 2px solid #ccc; border-radius: 4px; display: block; margin: 10px auto; cursor: crosshair; }
      .word-display { text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0; padding: 10px; background: #e9e9e9; border-radius: 4px; }
      .guess-input { display: flex; gap: 10px; justify-content: center; margin: 10px 0; }
      #guess-input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
      button { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
      button:hover { background: #0056b3; }
      #clear-canvas-btn { background: #dc3545; }
      #submit-guess-btn { background: #28a745; }
      .players-list { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #ddd; }`;
      return new Response(cssContent, {
        headers: { 'Content-Type': 'text/css' }
      });
    } catch (error) {
      return new Response('/* CSS loading error */', {
        headers: { 'Content-Type': 'text/css' }
      });
    }
  }
  
  // Serve JS bundle
  if (path === '/static/bundle.js') {
    try {
      // In development, we need to serve the actual bundle content
      // This is a simplified approach - in production this would be handled differently
      const jsContent = `console.log('Games Platform JS Loading...');
      // This is a placeholder - the actual JS bundle content would be loaded here
      // For now, we'll include a basic initialization
      document.addEventListener('DOMContentLoaded', function() {
        console.log('Games platform loaded successfully');
        
        // Basic game card click handling
        const gameCards = document.querySelectorAll('.game-card');
        gameCards.forEach(card => {
          card.addEventListener('click', function() {
            const gameType = this.dataset.game;
            console.log('Selected game:', gameType);
            alert('Selected: ' + gameType + '. Full functionality requires WebSocket connection.');
          });
        });
        
        // Update connection status
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
          connectionStatus.textContent = 'Ready (Demo Mode)';
          connectionStatus.className = 'status-connected';
        }
      });`;
      
      return new Response(jsContent, {
        headers: { 'Content-Type': 'application/javascript' }
      });
    } catch (error) {
      return new Response('console.error("JS bundle loading error");', {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
  }

  return new Response('File not found', { status: 404 });
});