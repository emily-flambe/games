# Games Platform Configuration

## Overview
Multiplayer games platform on Cloudflare Workers with WebSocket support via Durable Objects.

## Technical Stack
- **Runtime**: Cloudflare Workers + Durable Objects
- **Language**: TypeScript (strict mode)
- **Frontend**: Vanilla JS with GameShell architecture
- **WebSocket**: Real-time game communication
- **Build**: Wrangler CLI

## Current Games
1. **Checkbox Game**: Competitive checkbox clicking
2. **Everybody Votes**: Real-time voting polls
3. **Price is Weird**: Price guessing game
4. **That's a Paddlin**: Drawing game

## Performance Targets
- WebSocket latency: <100ms
- Connection limit: 100 per Durable Object
- Bundle size: 23KB frontend

## Security
- Input validation (Zod)
- Rate limiting
- CORS configuration
- Session tokens