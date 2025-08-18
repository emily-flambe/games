# Games Platform

A simple multiplayer games platform built on Cloudflare Workers with real-time WebSocket support.

## **IMPORTANT: Automated Versioning**

**Your commit messages control deployments!**

Quick reference:
- `feat: description` → Minor version bump + deploy
- `fix: description` → Patch version bump + deploy  
- `docs: description` → No version bump
- `feat!: description` → Major version bump + deploy

Full details in [.project/contexts/deployment.md](.project/contexts/deployment.md#automated-versioning)

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

# Start wrangler dev server (runs on http://localhost:8777)
npm run dev

# For remote development (connects to Cloudflare)
npm run dev:remote
```

## Deployment

This project is configured for Cloudflare Workers deployment with automated preview environments.

### Preview Environments

Every commit automatically gets its own preview URL using aliased preview deployments:

- **Format**: `https://{commit-hash}-games.emily-cogsdill.workers.dev`
- **Example**: `https://a1b2c3d-games.emily-cogsdill.workers.dev`
- **Lifecycle**: Created automatically in CI/CD, managed by Cloudflare

### Production Deployment

For production deployment, you'll need:

1. A Cloudflare account with Workers enabled
2. Your own domain configured in `wrangler.toml`
3. Durable Objects enabled on your account

```bash
# Deploy to Cloudflare (requires configuration)
npm run deploy
```

**Note:** The current `wrangler.toml` contains deployment settings specific to the original domain. You'll need to update it with your own domain and zone settings before deploying.