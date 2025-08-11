# Dependencies

## Core Packages
```json
{
  "dependencies": {
    "@cloudflare/workers-types": "^4.20240117.0",
    "typescript": "^5.3.3"
  },
  "devDependencies": {
    "wrangler": "^3.22.1",
    "@types/node": "^20.10.6"
  }
}
```

## Workers-Compatible Libraries
- **zod**: Runtime validation
- **date-fns**: Date utilities (Web API functions only)
- Native WebSocket API (no socket.io)

## Prohibited in Workers
❌ Node.js built-ins (`fs`, `path`, `http`)
❌ Node frameworks (`express`, `koa`)
❌ Database drivers (use D1/KV)

## Testing Stack
```json
{
  "devDependencies": {
    "vitest": "^1.1.3",
    "miniflare": "^3.20231218.0",
    "jsdom": "^23.2.0"
  }
}
```

## Build Configuration
- Node.js: >=18.0.0
- TypeScript target: ES2022
- Module: ESNext
- Bundle limit: 1MB compressed

## NPM Scripts
```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "build": "tsc",
    "test": "vitest"
  }
}