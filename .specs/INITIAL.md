# Multiplayer Games Platform - Cloudflare Workers Specification

## Project Overview
Build a web-based multiplayer games platform deployed entirely to a **single Cloudflare Worker** named "games". The platform includes real-time websocket communication using Cloudflare's Durable Objects and WebSockets API.

## Technology Stack
- **Runtime**: Cloudflare Workers (V8 isolate)
- **Real-time Communication**: Cloudflare WebSockets + Durable Objects
- **Frontend**: Vanilla TypeScript/JavaScript (no React - Workers don't support full React)
- **Bundler**: Wrangler CLI + esbuild
- **Storage**: Durable Objects for session state
- **Static Assets**: Served directly from Worker

## Architecture Constraints for Cloudflare Workers
- **No Node.js APIs**: No fs, path, etc. Use Web APIs only
- **No persistent file system**: All assets must be bundled or fetched from external sources
- **Limited package ecosystem**: Only packages compatible with Workers runtime
- **Durable Objects**: Required for maintaining websocket connections and game state
- **Single entry point**: One Worker handles all routes (static files, API, websockets)

## Project Structure
```
games-worker/
├── wrangler.toml                # Cloudflare Workers configuration
├── package.json                 # Dependencies (workers-compatible only)
├── src/
│   ├── index.ts                 # Main Worker entry point
│   ├── router.ts                # Request routing logic
│   ├── durable-objects/
│   │   ├── GameSession.ts       # Durable Object for game sessions
│   │   └── SessionManager.ts    # Manages multiple sessions
│   ├── game-engine/
│   │   ├── BaseGame.ts          # Abstract base game class
│   │   ├── Player.ts            # Player entity
│   │   ├── GameState.ts         # Game state management
│   │   └── types.ts             # Engine types
│   ├── games/
│   │   ├── DrawingGame.ts       # Drawing competition logic
│   │   ├── BracketGame.ts       # Bracket battle logic
│   │   ├── VotingGame.ts        # Everybody votes logic
│   │   └── PriceGame.ts         # Price is wrong logic
│   ├── api/
│   │   ├── gameRoutes.ts        # Game API endpoints
│   │   ├── sessionRoutes.ts     # Session management
│   │   └── etsyApi.ts           # Etsy API integration
│   ├── static/
│   │   ├── index.html           # Main HTML template
│   │   ├── app.js               # Frontend JavaScript bundle
│   │   ├── styles.css           # CSS styles
│   │   └── assets/              # Images, fonts, etc.
│   └── utils/
│       ├── websocket.ts         # WebSocket utilities
│       ├── validation.ts        # Input validation
│       └── constants.ts         # App constants
├── frontend-src/                # Source for frontend (gets bundled)
│   ├── main.ts                  # Frontend entry point
│   ├── GamePortal.ts            # Game selection interface
│   ├── GameRoom.ts              # Game room interface
│   ├── components/
│   │   ├── PlayerList.ts        # Player list component
│   │   ├── GameLobby.ts         # Pre-game lobby
│   │   ├── VotingInterface.ts   # Generic voting UI
│   │   └── Results.ts           # Results display
│   └── games/
│       ├── DrawingUI.ts         # Drawing game frontend
│       ├── BracketUI.ts         # Bracket game frontend
│       ├── VotingUI.ts          # Voting game frontend
│       └── PriceUI.ts           # Price game frontend
├── build-scripts/
│   └── build-frontend.js        # Script to bundle frontend code
└── types/
    ├── shared.ts                # Shared types between frontend/backend
    ├── websocket.ts             # WebSocket message types
    └── games.ts                 # Game-specific types
```

## Cloudflare Workers Specific Requirements

### 1. Wrangler Configuration (wrangler.toml)
```toml
name = "games"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[durable_objects]
bindings = [
  { name = "GAME_SESSIONS", class_name = "GameSession" },
  { name = "SESSION_MANAGER", class_name = "SessionManager" }
]

[[migrations]]
tag = "v1"
new_classes = ["GameSession", "SessionManager"]
```

### 2. Main Worker Entry Point (src/index.ts)
```typescript
import { Router } from './router';
import { GameSession } from './durable-objects/GameSession';
import { SessionManager } from './durable-objects/SessionManager';

export { GameSession, SessionManager };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const router = new Router(env);
    return router.handle(request);
  }
};

interface Env {
  GAME_SESSIONS: DurableObjectNamespace;
  SESSION_MANAGER: DurableObjectNamespace;
}
```

### 3. Durable Object Structure
Each game session must be a Durable Object to handle WebSocket connections:

```typescript
// src/durable-objects/GameSession.ts
export class GameSession implements DurableObject {
  private state: DurableObjectState;
  private websockets: WebSocket[];
  private gameState: any;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.websockets = [];
  }

  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrades and HTTP requests
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    // Handle game messages
  }

  async webSocketClose(ws: WebSocket) {
    // Clean up disconnected players
  }
}
```

### 4. Static Asset Serving
All HTML, CSS, and JavaScript must be bundled into the Worker:

```typescript
// src/router.ts - serving static files
if (url.pathname === '/') {
  return new Response(HTML_TEMPLATE, {
    headers: { 'Content-Type': 'text/html' }
  });
}

if (url.pathname === '/app.js') {
  return new Response(BUNDLED_JS, {
    headers: { 'Content-Type': 'application/javascript' }
  });
}
```

### 5. Frontend Constraints
- **No React**: Use vanilla TypeScript/JavaScript with Web Components or simple DOM manipulation
- **No bundler at runtime**: All code must be pre-bundled
- **WebSocket client**: Must use native WebSocket API
- **State management**: Use simple JavaScript objects or classes

### 6. Build Process
1. Bundle frontend code into single JavaScript file
2. Inline CSS and HTML templates as strings in Worker code
3. Use Wrangler to deploy everything as single Worker

### 7. API Structure
```typescript
// All routes handled in single Worker
GET  /                          -> Serve main HTML
GET  /app.js                    -> Serve bundled frontend JS  
GET  /styles.css                -> Serve CSS
POST /api/sessions              -> Create new game session
GET  /api/sessions/:id          -> Get session info
GET  /api/sessions/:id/ws       -> WebSocket upgrade
POST /api/etsy/random-item      -> Fetch random Etsy item
```

### 8. Package.json Dependencies
Only include packages compatible with Workers runtime:
```json
{
  "dependencies": {
    "@cloudflare/workers-types": "^4.20241127.0"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "typescript": "^5.0.0",
    "esbuild": "^0.19.0"
  }
}
```

## Implementation Steps
1. Set up basic Worker with routing
2. Implement Durable Objects for session management
3. Create WebSocket handling for real-time communication
4. Build simple frontend with vanilla JS
5. Implement one game as proof of concept
6. Add remaining games
7. Deploy to Cloudflare Workers

## Key Differences from Node.js Approach
- Single Worker handles everything (no separate frontend/backend)
- Durable Objects replace traditional database/session storage
- All assets must be bundled into Worker
- WebSocket connections tied to Durable Object instances
- No traditional package ecosystem (limited to Workers-compatible packages)