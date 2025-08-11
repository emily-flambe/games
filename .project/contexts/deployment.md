# Deployment Guide

## Quick Start
```bash
# Install and build
npm install
npm run build

# Development
npm run dev  # http://localhost:8777

# Production
npx wrangler login
npm run deploy
```

## Automated Versioning

**CRITICAL**: Commit messages control automated deployments!

### Commit Format → Version Bump
- `feat:` → Minor version (1.0.0 → 1.1.0)
- `fix:` → Patch version (1.0.0 → 1.0.1)
- `feat!:` → Major version (1.0.0 → 2.0.0)
- `docs:`, `chore:` → No version bump

### Examples
```bash
# Auto-deploy with minor bump
git commit -m "feat: add spectator mode"

# Auto-deploy with patch bump  
git commit -m "fix: WebSocket reconnection"

# No deployment
git commit -m "docs: update README"
```

### Deployment Flow
1. Push to `main` with conventional commit
2. GitHub Actions auto-bumps version
3. Creates git tag and deploys to Cloudflare
4. Updates version display on site

## Requirements
- Node.js 18+
- Cloudflare account with Workers enabled
- Environment variables (set in Cloudflare dashboard):
  - `JWT_SECRET`
  - `API_KEY_SALT`

## Endpoints
- **HTTP**: `/`, `/api/sessions`, `/api/game/{sessionId}`
- **WebSocket**: `/api/game/{sessionId}/ws`

## Testing
```bash
npm run test:local      # Unit tests
npm run test:integration # WebSocket tests
```

## Monitoring
- **Logs**: `wrangler tail`
- **Metrics**: Cloudflare dashboard
- **Analytics**: Built-in Workers analytics

## Performance
- 1,000 concurrent WebSocket connections per Worker
- 100 connections per Durable Object
- Edge deployment for low latency
- 23KB frontend bundle

## Troubleshooting
- **Port 8777 in use**: Kill process or change port
- **WebSocket fails**: Check firewall/network
- **Build errors**: Verify Node.js version
- **Deploy errors**: Check Wrangler auth