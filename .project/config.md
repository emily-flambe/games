# Games Platform Configuration

## Overview
Multiplayer games platform on Cloudflare Workers with WebSocket support via Durable Objects.

## Technical Stack
- **Runtime**: Cloudflare Workers + Durable Objects
- **Language**: TypeScript (strict mode)
- **Frontend**: Vanilla JS with GameShell/GameModule architecture
- **WebSocket**: Real-time game communication
- **Build**: Wrangler CLI

## Architecture
- **Modular Durable Objects**: Each game type has its own Durable Object class
- **Base GameSession**: Shared functionality (chat, spectators, player management)
- **Game-Specific Sessions**: Extended classes for each game type
- **GameSessionRegistry**: Tracks active game sessions

## Current Games
1. **Checkbox Game**: Competitive checkbox clicking (CheckboxGameSession)
2. **Everybody Votes**: Real-time voting polls (EverybodyVotesGameSession)
3. **Price is Weird**: Price guessing game (planned)
4. **That's a Paddlin**: Drawing game (planned)

## Performance Targets
- WebSocket latency: <100ms
- Connection limit: 100 per Durable Object
- Bundle size: 23KB frontend

## Security
- Input validation
- Rate limiting
- CORS configuration
- Session isolation via Durable Objects

## Documentation
- **DEPLOYMENT_BEST_PRACTICES.md**: Core deployment and development guidelines
- **DEPLOYMENT_LESSONS_LEARNED.md**: Historical deployment issues and solutions
- **TROUBLESHOOTING.md**: Everybody Votes MVP troubleshooting guide
- **github-issue-wrangler-dev.md**: Proposal to switch to wrangler dev environment