---
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
description: Scaffold a new game type using the unified handler pattern
---

# Add New Game

Create scaffolding for a new game called: $ARGUMENTS

## Overview

The games platform uses a unified handler pattern. All games share a single
GameSession Durable Object that delegates to game-specific handlers. Adding
a new game requires creating just 2 files and adding 3 small entries.

## Steps

1. **Validate game name**
   - Convert to kebab-case for directories and IDs (e.g., "my-game")
   - Convert to PascalCase for class names (e.g., "MyGame")

2. **Create handler** at `src/games/${kebab-case}/handler.ts`
   - Implement `GameHandler` interface from `../types`
   - Required methods: `createInitialState()`, `onStart()`, `onMessage()`
   - Optional methods: `onPlayerDisconnect()`, `cleanup()`
   - See existing handlers (checkbox-game, everybody-votes, county-game) for examples

3. **Add handler to registry** in `src/durable-objects/GameSession.ts`
   - Import the handler at the top:
     ```typescript
     import { handler as myGameHandler } from '../games/my-game/handler';
     ```
   - Add to the handlers object:
     ```typescript
     const handlers: Record<string, GameHandler> = {
       // ... existing handlers
       'my-game': myGameHandler,
     };
     ```

4. **Create frontend module** at `src/static/js/games/${PascalCase}GameModule.js`
   - Extend `GameModule` base class
   - Implement `getRules()`, `init()`, `render()`, `handleMessage()`, `cleanup()`
   - Use safe DOM methods (createElement, textContent, appendChild) - avoid innerHTML
   - See existing modules for examples

5. **Add module loading** in `src/static/js/GameShell.js` `loadGameModule()`:
   ```javascript
   case 'my-game':
     const { MyGameModule } = await import('./games/MyGameModule.js');
     return new MyGameModule();
   ```

6. **Add to manifest** in `src/games/manifest.ts`:
   ```typescript
   {
     id: 'my-game',
     name: 'My Game',
     description: 'Brief description of the game',
     enabled: true,
     // comingSoon: true,  // Add if not ready for players yet
   },
   ```

7. **Verify build**
   ```bash
   npm run build
   npm run test:unit
   npm run test:e2e
   ```

## Summary of Changes

With the unified handler pattern, adding a game only requires:
- **1 new file**: `src/games/{game-id}/handler.ts`
- **1 new file**: `src/static/js/games/{GameName}GameModule.js`
- **1 import + 1 line**: Add handler to `GameSession.ts` registry
- **1 case**: Add to `GameShell.js` loadGameModule()
- **1 entry**: Add to `manifest.ts`

No changes needed to:
- wrangler.toml (no new Durable Objects)
- src/index.ts (unified routing handles all games)
- src/types.ts (no new env bindings)
