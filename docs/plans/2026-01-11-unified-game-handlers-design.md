# Unified Game Handlers Architecture

## Goal

Simplify adding new games by eliminating configuration changes. A new game should only require:
1. One backend handler file
2. One frontend module file
3. One manifest entry

## Current State (Problems)

Adding a game requires touching 6+ files:
- `src/durable-objects/XxxGameSession.ts` - new class
- `wrangler.toml` - 4 entries (binding, migration, staging, preview)
- `src/index.ts` - import, routing case, export
- `src/static/js/games/XxxGameModule.js` - frontend
- `src/static/index.html` - game card in portal

## Proposed Architecture

### 1. Game Manifest (`src/games/manifest.ts`)

Single source of truth for all games:

```typescript
export interface GameDefinition {
  id: string;           // e.g., 'checkbox-game'
  name: string;         // e.g., 'Checkbox Game'
  description: string;  // e.g., 'Not really a game lol'
  enabled: boolean;     // Show in portal?
  comingSoon?: boolean; // Grayed out in portal
}

export const games: GameDefinition[] = [
  {
    id: 'checkbox-game',
    name: 'Checkbox Game',
    description: 'Not really a game lol',
    enabled: true
  },
  // ... other games
];
```

### 2. Game Handler Interface (`src/games/types.ts`)

```typescript
export interface GameHandler {
  // Create initial game-specific state
  createInitialState(): Record<string, any>;

  // Handle game start (called when host clicks Start)
  onStart(ctx: GameContext): Promise<void>;

  // Handle game-specific messages
  onMessage(ctx: GameContext, message: any): Promise<void>;

  // Handle player disconnect (optional)
  onPlayerDisconnect?(ctx: GameContext, playerId: string): Promise<void>;
}

export interface GameContext {
  gameState: any;
  players: Map<string, Player>;
  spectators: Map<string, Spectator>;
  hostId: string | null;
  broadcast: (message: any, excludeWs?: WebSocket) => void;
  sendTo: (ws: WebSocket, message: any) => void;
  saveState: () => Promise<void>;
  updateRegistryStatus: (status: 'waiting' | 'in-progress' | 'finished') => void;
}
```

### 3. Game Handler Files (`src/games/{game-id}/handler.ts`)

Each game implements the interface:

```typescript
// src/games/checkbox-game/handler.ts
import { GameHandler, GameContext } from '../types';

export const handler: GameHandler = {
  createInitialState() {
    return {
      checkboxStates: new Array(9).fill(false),
      checkboxPlayers: new Array(9).fill(null),
      playerScores: {}
    };
  },

  async onStart(ctx) {
    ctx.gameState.status = 'started';
    ctx.gameState.gameStarted = true;
    await ctx.saveState();
    ctx.updateRegistryStatus('in-progress');
    ctx.broadcast({
      type: 'gameStarted',
      gameType: ctx.gameState.type,
      gameState: ctx.gameState,
      timestamp: Date.now()
    });
  },

  async onMessage(ctx, message) {
    if (message.type === 'toggle_checkbox' || message.type === 'TOGGLE_CHECKBOX') {
      // ... checkbox toggle logic
    }
  }
};
```

### 4. Unified GameSession (`src/durable-objects/GameSession.ts`)

The base class uses a handler registry:

```typescript
import { checkboxHandler } from '../games/checkbox-game/handler';
import { everybodyVotesHandler } from '../games/everybody-votes/handler';
import { countyHandler } from '../games/county-game/handler';

const handlers: Record<string, GameHandler> = {
  'checkbox-game': checkboxHandler,
  'everybody-votes': everybodyVotesHandler,
  'county-game': countyHandler,
};

export class GameSession implements DurableObject {
  private handler: GameHandler | null = null;

  private getHandler(gameType: string): GameHandler {
    const handler = handlers[gameType];
    if (!handler) {
      throw new Error(`Unknown game type: ${gameType}`);
    }
    return handler;
  }
}
```

### 5. Frontend Module Loading

Already works dynamically via `loadGameModule()` in GameShell.js. Just needs to read from manifest for portal display.

### 6. Portal Generation

Generate game cards from manifest using safe DOM methods:

```javascript
// In app.js
async function renderGamePortal() {
  const response = await fetch('/api/games');
  const games = await response.json();

  const container = document.querySelector('.games-grid');
  container.replaceChildren(); // Clear existing

  games.filter(g => g.enabled).forEach(g => {
    const card = document.createElement('button');
    card.className = 'game-card' + (g.comingSoon ? ' coming-soon' : '');
    card.dataset.game = g.id;

    const title = document.createElement('h3');
    title.textContent = g.name;

    const desc = document.createElement('p');
    desc.textContent = g.description;

    card.appendChild(title);
    card.appendChild(desc);

    if (g.comingSoon) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Coming soon';
      card.appendChild(badge);
    }

    container.appendChild(card);
  });
}
```

## File Structure After Refactor

```
src/
  games/
    manifest.ts           # Game definitions
    types.ts              # GameHandler interface
    checkbox-game/
      handler.ts          # Backend logic
    everybody-votes/
      handler.ts
    county-game/
      handler.ts
  durable-objects/
    GameSession.ts        # Unified session (uses handler registry)
    GameSessionRegistry.ts
  static/js/
    games/
      CheckboxGameModule.js    # Frontend modules (unchanged)
      EverybodyVotesGameModule.js
      CountyGameModule.js
```

## Migration Plan

1. Create `src/games/types.ts` with interfaces
2. Create `src/games/manifest.ts` with game definitions
3. Extract handler logic from each `*GameSession.ts` into `src/games/*/handler.ts`
4. Modify `GameSession.ts` to use handler registry
5. Add `/api/games` endpoint to serve manifest
6. Update frontend to generate portal from manifest
7. Remove individual `*GameSession` classes
8. Clean up `wrangler.toml` (remove per-game bindings)
9. Clean up `index.ts` (remove per-game imports/routing)

## Adding a New Game (After Refactor)

1. Create `src/games/new-game/handler.ts` implementing `GameHandler`
2. Create `src/static/js/games/NewGameModule.js` extending `GameModule`
3. Add entry to `src/games/manifest.ts`
4. Add handler import to `GameSession.ts` registry
5. Add module case to `GameShell.js` loadGameModule()
6. Run `npm run build` to rebuild static assets

Note: Steps 4-5 are small one-line additions, not new files or config.

## Risks & Mitigations

**Risk:** Breaking existing games during migration
**Mitigation:** Migrate one game at a time, run full test suite after each
