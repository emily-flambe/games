# Dependencies

## Core Packages
```json
{
  "dependencies": {
    "puppeteer": "^24.16.0",
    "sillyname": "^0.1.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241230.0",
    "@types/jest": "^30.0.0",
    "jest": "^30.0.5",
    "jsdom": "^26.1.0",
    "typescript": "^5.7.3",
    "wrangler": "^4.28.1"
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
- **jest**: Primary test framework for unit tests
- **puppeteer**: Browser automation for E2E testing
- **jsdom**: DOM simulation for unit tests

## Build Configuration
- Node.js: >=18.0.0
- TypeScript target: ES2022
- Module: ESNext
- Bundle limit: 1MB compressed

## NPM Scripts
```json
{
  "scripts": {
    "dev": "wrangler dev --local --persist-to .wrangler/state",
    "deploy": "npm run build && wrangler deploy",
    "build": "node scripts/build-static.js",
    "test": "jest"
  }
}