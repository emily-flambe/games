# Games Platform

A simple multiplayer games platform built on Cloudflare Workers with real-time WebSocket support.

## What is this?

This is a collection of browser-based multiplayer games that run on Cloudflare's edge network. Players can create game rooms, share links with friends, and play together in real-time. The platform supports games like collaborative drawing, voting, tournaments, and price guessing.

## Tech Stack

- **Cloudflare Workers** - Serverless edge computing
- **Durable Objects** - Stateful WebSocket connections for real-time gameplay
- **TypeScript** - Type-safe development
- **Vanilla JS** - No frontend framework dependencies

## Local Development

```bash
# Install dependencies
npm install

# Build frontend assets
npm run build

# Start dev server (runs on http://localhost:8777)
npm run dev
```

## Deployment

This project is configured for Cloudflare Workers deployment. You'll need:

1. A Cloudflare account with Workers enabled
2. Your own domain configured in `wrangler.toml`
3. Durable Objects enabled on your account

```bash
# Deploy to Cloudflare (requires configuration)
npm run deploy
```

**Note:** The current `wrangler.toml` contains deployment settings specific to the original domain. You'll need to update it with your own domain and zone settings before deploying.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build frontend assets |
| `npm run build:watch` | Build and watch for changes |
| `npm run dev` | Start development server |
| `npm run dev:remote` | Start development server with remote mode |
| `npm run test` | Run all tests |
| `npm run test:local` | Test local setup (no server required) |
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Test WebSocket connections (requires running server) |
| `npm run lint` | Check TypeScript types |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run deploy:production` | Deploy to production environment |
| `npm run clean` | Clean build artifacts |

## Testing

### Local Setup Testing
```bash
npm run test:local
```
Tests that all required files exist and are properly configured.

### Unit Testing
```bash
npm run test:unit
```
Tests individual components without requiring a running server.

### Integration Testing
```bash
npm run test:integration
```
Tests WebSocket functionality against a running development server.

**Note**: Integration tests require the development server to be running (`npm run dev`).

### Full Testing Workflow
```bash
# 1. Test local setup
npm run test:local

# 2. Install dependencies if needed
npm install

# 3. Start development server
npm run dev

# 4. In another terminal, run integration tests
npm run test:integration
```

## Development Workflow

### Starting Development

1. **Initial setup:**
   ```bash
   npm run test:local    # Verify setup
   npm install           # Install dependencies
   npm run build         # Build frontend
   ```

2. **Start development:**
   ```bash
   npm run dev           # Start server
   ```

3. **Verify WebSocket functionality:**
   ```bash
   npm run test:integration
   ```

### Making Changes

1. **Frontend changes:**
   - Edit files in `frontend-src/`
   - Run `npm run build` or use `npm run build:watch`

2. **Backend changes:**
   - Edit files in `src/`
   - The development server will automatically reload

3. **Test changes:**
   ```bash
   npm run test:integration
   ```

### Troubleshooting Development

**Server won't start:**
- Check that port 8777 is available
- Verify `wrangler.toml` configuration
- Run `npm run test:local` to check setup

**WebSocket tests fail:**
- Ensure development server is running
- Check console for WebSocket upgrade errors
- Verify firewall allows local connections

**Build fails:**
- Check TypeScript errors with `npm run lint`
- Verify all dependencies are installed

## Deployment

### Development Deployment
```bash
npm run deploy
```
Deploys to the development environment configured in `wrangler.toml`.

### Production Deployment
```bash
npm run deploy:production
```
Deploys to the production environment.

### Deployment Requirements

1. **Cloudflare account** with Workers enabled
2. **Wrangler CLI** authenticated:
   ```bash
   npx wrangler login
   ```
3. **Environment configuration** in `wrangler.toml`

## Project Structure

```
games/
├── src/                          # Backend source code
│   ├── index.ts                  # Main Worker entry point
│   ├── router.ts                 # HTTP request routing
│   ├── durable-objects/          # Durable Object classes
│   │   ├── GameSession.ts        # Game room management
│   │   └── SessionManager.ts     # Session coordination
│   └── static/                   # Static web assets
│       ├── index.html            # Game client HTML
│       ├── bundle.js             # Compiled frontend JS
│       └── styles.css            # Game styling
├── frontend-src/                 # Frontend TypeScript source
│   ├── main.ts                   # Frontend entry point
│   ├── GamePortal.ts             # Game selection interface
│   └── GameRoom.ts               # Game room client logic
├── build-scripts/                # Build configuration
│   └── build-frontend.js         # Frontend build script
├── tests/                        # Test suite
│   ├── local-test.js             # Local setup verification
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests
├── types/                        # TypeScript type definitions
│   └── shared.ts                 # Shared types
├── wrangler.toml                 # Cloudflare Workers config
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

## WebSocket API

### Connection
Connect to WebSocket endpoint: `ws://localhost:8777/ws` (development)

### Message Format
```typescript
{
  type: string;           // Message type
  data: any;             // Message payload
  sessionId?: string;    // Optional session identifier
  playerId?: string;     // Optional player identifier
}
```

### Message Types

**Client to Server:**
- `join`: Join a game session
- `move`: Send game move/action
- `chat`: Send chat message
- `ping`: Heartbeat/keep-alive

**Server to Client:**
- `joined`: Successful session join
- `gameState`: Current game state update  
- `playerJoined`: New player joined
- `playerLeft`: Player disconnected
- `spectator_identity`: Spectator mode assignment
- `spectator_joined`/`spectator_left`: Spectator count updates
- `error`: Error message
- `pong`: Heartbeat response

## Adding New Games

1. **Create game logic** in `src/durable-objects/`
2. **Update routing** in `src/router.ts`
3. **Add frontend components** in `frontend-src/`
4. **Build frontend** with `npm run build`
5. **Test** with integration tests

## Configuration

### Environment Variables (Cloudflare Workers)
Set via Cloudflare dashboard or `wrangler secret`:

- `JWT_SECRET`: For session token signing
- `API_KEY_SALT`: For API key generation

### Local Development Variables
Create `.dev.vars` file (not committed) for local development:
```
JWT_SECRET=dev-secret-key-for-local-testing-only
API_KEY_SALT=dev-salt-for-api-keys-local-testing-only
```

## Performance Considerations

- **Connection limits**: Cloudflare Workers support up to 1,000 concurrent WebSocket connections
- **Durable Object limits**: Each DO instance can handle ~1,000 concurrent operations
- **Memory usage**: Monitor DO memory usage for large game states
- **Network optimization**: Use message batching for high-frequency updates

## Security

- WebSocket connections use same-origin policy
- Game sessions use secure token validation
- Durable Objects provide isolation between game rooms
- Rate limiting prevents spam/DoS attacks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm run test`
4. Submit a pull request

## License

MIT License - see LICENSE file for details
