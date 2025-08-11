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