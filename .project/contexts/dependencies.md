# Dependencies & Package Management

## Cloudflare Workers Dependencies

### Core Requirements
These packages are essential for the multiplayer games platform:

```json
{
  "dependencies": {
    "@cloudflare/workers-types": "^4.20240117.0",
    "typescript": "^5.3.3"
  },
  "devDependencies": {
    "wrangler": "^3.22.1",
    "@types/node": "^20.10.6",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1"
  }
}
```

### Workers-Compatible Libraries
Only Web API compatible libraries can be used in Cloudflare Workers:

#### WebSocket & Real-time Communication
- **Native WebSocket API**: Built-in Workers support, no additional dependencies
- **Server-Sent Events**: Native fetch/Response APIs for SSE

#### Data Processing & Validation
- **zod** `^3.22.4`: Runtime type validation (Workers compatible)
- **uuid** `^9.0.1`: UUID generation (use crypto.randomUUID() when possible)
- **date-fns** `^3.0.6`: Date manipulation (avoid Node.js specific functions)

#### Utility Libraries (Workers Compatible)
```json
{
  "dependencies": {
    "zod": "^3.22.4",
    "date-fns": "^3.0.6"
  }
}
```

### Prohibited Dependencies
These common Node.js packages are NOT compatible with Workers:

❌ **Node.js Built-ins**
- `fs`, `path`, `os`, `crypto` (use Web Crypto API instead)
- `http`, `https` (use fetch API instead)  
- `stream`, `buffer` (limited support)

❌ **Common Frameworks**
- `express`, `koa`, `fastify` (use Workers' fetch handler)
- `socket.io` (use native WebSocket API)
- `lodash` (many functions rely on Node.js APIs)

❌ **Database Drivers**
- `mysql`, `postgres`, `mongodb` drivers
- Use Cloudflare D1, KV, or external APIs instead

## Frontend Dependencies (Vanilla TypeScript)

### Build Tools
```json
{
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.10",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1"
  }
}
```

### UI Libraries (Optional)
Since we're using vanilla TypeScript, these are optional but useful:

```json
{
  "dependencies": {
    "@types/web": "^0.0.136"
  }
}
```

### Canvas & Graphics
For the drawing game, no external dependencies needed:
- **HTML5 Canvas API**: Native browser support
- **Web APIs**: MouseEvent, TouchEvent for input handling
- **RequestAnimationFrame**: For smooth animations

## Development Tools

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Wrangler Configuration
```toml
name = "games-platform"
compatibility_date = "2024-01-01"
main = "src/index.ts"

[durable_objects]
bindings = [
  { name = "GAME_SESSION", class_name = "GameSession" },
  { name = "DRAWING_SESSION", class_name = "DrawingSession" },
  { name = "BRACKET_SESSION", class_name = "BracketSession" },
  { name = "VOTING_SESSION", class_name = "VotingSession" },
  { name = "PRICE_GUESSING_SESSION", class_name = "PriceGuessingSession" }
]

[[migrations]]
tag = "v1"
new_classes = ["GameSession", "DrawingSession", "BracketSession", "VotingSession", "PriceGuessingSession"]
```

## Package Management Strategy

### npm Scripts
```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "build": "tsc",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

### Version Management
- **Node.js**: >=18.0.0 (for Wrangler compatibility)
- **npm**: >=8.0.0 or yarn >=1.22.0
- **TypeScript**: ^5.3.0 for latest language features
- **Wrangler**: ^3.22.0 for latest Workers features

## Workers Runtime Limitations

### Memory Constraints
- **Heap Memory**: 128MB limit per Worker invocation
- **CPU Time**: 30 seconds for HTTP requests, 15 minutes for Durable Objects
- **WebSocket Connections**: 100 per Durable Object

### API Limitations
- **No File System**: Can't read/write files, use KV or D1 for persistence
- **No Process APIs**: No child processes, clustering, etc.
- **Limited Node.js APIs**: Only Web Standard APIs available

### Bundle Size Considerations
- **Total Bundle**: 1MB compressed limit per Worker
- **Asset Bundling**: Large assets should be stored in KV or served externally
- **Tree Shaking**: Use build tools that support tree shaking

## Testing Dependencies

### Test Framework
```json
{
  "devDependencies": {
    "vitest": "^1.1.3",
    "@vitest/ui": "^1.1.3",
    "jsdom": "^23.2.0",
    "miniflare": "^3.20231218.0"
  }
}
```

### Testing Strategy
- **Miniflare**: Local Workers runtime for testing
- **Vitest**: Fast test runner with TypeScript support
- **jsdom**: DOM environment for frontend testing
- **MSW**: Mock service worker for API testing

### Test Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'miniflare',
    environmentOptions: {
      modules: true,
      durableObjects: {
        'GAME_SESSION': 'GameSession'
      }
    }
  }
});
```

## Security Dependencies

### Input Validation
```json
{
  "dependencies": {
    "zod": "^3.22.4"
  }
}
```

Example usage:
```typescript
import { z } from 'zod';

const GameMessageSchema = z.object({
  type: z.enum(['JOIN', 'LEAVE', 'GAME_ACTION', 'STATE_UPDATE']),
  playerId: z.string().min(1).max(50),
  data: z.unknown()
});

function validateMessage(message: unknown): GameMessage {
  return GameMessageSchema.parse(message);
}
```

### Rate Limiting
Built into Workers platform - no additional dependencies needed:
- Use Durable Objects for stateful rate limiting
- Leverage Workers KV for distributed rate limiting

## Performance Monitoring

### Built-in Analytics
- Cloudflare Analytics: Built-in, no dependencies
- Workers Analytics Engine: For custom metrics
- Durable Objects metrics: Built-in monitoring

### Custom Monitoring (Optional)
```json
{
  "dependencies": {
    "@cloudflare/workers-wasi": "^1.0.0"
  }
}
```

For advanced performance monitoring, custom metrics can be sent to external services via fetch API.