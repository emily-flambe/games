# Games Platform - Claude Code Context

## What This Is

A real-time multiplayer games platform running on Cloudflare Workers with Durable Objects. Players create rooms, share links, and play games together via WebSocket connections.

**Live**: https://games.emilycogsdill.com

## Tech Stack

- **Runtime**: Cloudflare Workers (serverless edge)
- **State**: Durable Objects (WebSocket sessions, game state persistence)
- **Backend**: TypeScript
- **Frontend**: Vanilla JavaScript (no framework)
- **Testing**: Jest (unit/browser), Playwright (e2e), Vitest (integration)
- **Build**: Custom `scripts/build-static.js` bundles static assets into Worker

## Project Structure

```
src/
  index.ts              # Worker entry point, routes requests
  types.ts              # TypeScript interfaces
  durable-objects/      # Game session state managers
    GameSession.ts      # Base class for all games
    CheckboxGameSession.ts
    EverybodyVotesGameSession.ts
    CountyGameSession.ts
    GameSessionRegistry.ts
  static/               # Frontend (served by Worker)
    index.html
    styles.css
    app.js
    js/
      GameShell.js      # Shared game shell (WebSocket, players, UI)
      GameModule.js     # Base class for game modules
      games/            # Individual game implementations

e2e/                    # Playwright tests
tests/
  unit/                 # Jest unit tests
  browser/              # Jest browser/DOM tests
  vitest/               # Vitest integration tests

wrangler.toml           # Cloudflare Workers config (environments: staging, preview, production)
```

## Architecture

1. **Request Flow**: Worker (`index.ts`) routes HTTP to static assets, WebSocket upgrades to Durable Objects
2. **Game Sessions**: Each room is a Durable Object instance keyed by 6-char room code
3. **Frontend Pattern**: `GameShell.js` handles connection/players, delegates to `*GameModule.js` for game logic
4. **Static Bundling**: Build step reads `src/static/` and generates `src/lib/static.ts` for inline serving

## Essential Commands

```bash
# Development
npm install              # Install dependencies
npm run build            # Bundle static assets into Worker
npm run dev              # Start local dev server (port 8777)

# Testing
npm run test:unit        # Jest unit tests
npm run test:browser     # Jest browser tests (JSDOM)
npm run test:e2e         # Playwright e2e (requires dev server or TEST_URL)
npm run test:vitest      # Vitest integration tests
npm run test             # unit + browser
npm run test:all         # unit + browser + e2e

# Deployment
npm run deploy           # Build and deploy to Cloudflare (production)
```

## Adding a New Game

1. Create Durable Object: `src/durable-objects/MyGameSession.ts` extending `GameSession`
2. Add bindings to `wrangler.toml` (all environments: top-level, staging, preview)
3. Add migration in `wrangler.toml` if new Durable Object class
4. Create frontend module: `src/static/js/games/MyGameModule.js` extending `GameModule`
5. Add script tag to `src/static/index.html`
6. Add game card to `index.html`
7. Wire up in `GameShell.js` `loadGameModule()` and `src/index.ts` `handleWebSocket()`
8. Add tests in `tests/unit/` and `e2e/`

## Key Patterns

- **WebSocket Messages**: JSON with `type` field, handled by `handleMessage()` in GameSession/GameShell
- **Player State**: Managed by base `GameSession`, includes name, emoji, host status
- **Game-specific Logic**: Override `handleGameSpecificMessage()` and `createInitialGameState()`
- **Frontend State**: `GameShell` owns connection/players, `GameModule` owns game UI/logic

## Testing Notes

- Unit tests mock Durable Object storage
- E2E tests run against local dev server or preview URL (`TEST_URL` env var)
- Visual tests use pixelmatch for screenshot comparison
- Use `npm run test:e2e:headed` for debugging Playwright

## Environments

| Env | URL | Trigger |
|-----|-----|---------|
| Local | localhost:8777 | `npm run dev` |
| Preview | games-preview.emily-cogsdill.workers.dev | PR deploy |
| Production | games.emilycogsdill.com | Manual `npm run deploy` |
