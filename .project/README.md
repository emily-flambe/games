# Games Platform - Project Documentation

## 🚨 CRITICAL - READ BEFORE DEVELOPMENT

### Essential Rules
1. **[DEVELOPMENT_GUIDELINES.md](DEVELOPMENT_GUIDELINES.md)** - 🚫 DO NOT commit troubleshooting artifacts
2. **Port 8777 ONLY** - Never change development port
3. **Test everything** - Use Puppeteer on localhost:8777 before claiming fixes

## Architecture Overview
**Multiplayer games platform on Cloudflare Workers + Durable Objects**

### Core Components
- **GameSession**: Base class with shared functionality (chat, spectators, players)
- **Game-Specific Sessions**: CheckboxGameSession, EverybodyVotesGameSession
- **GameSessionRegistry**: Tracks active sessions
- **Frontend**: Vanilla JS with GameShell/GameModule architecture

### Current Games
1. **Checkbox Game** - Competitive clicking (CheckboxGameSession)
2. **Everybody Votes** - Real-time voting (EverybodyVotesGameSession)

## Technical Stack
- **Runtime**: Cloudflare Workers + Durable Objects
- **Language**: TypeScript (strict mode)
- **WebSocket**: Real-time communication
- **Build**: Wrangler CLI

## Development
```bash
npm install
npm run dev  # Always localhost:8777

# Version bumping (simple patch-bump convention)
npm run bump-patch  # 1.1.1 → 1.1.2
npm run bump-minor  # 1.1.1 → 1.2.0  
npm run bump-major  # 1.1.1 → 2.0.0
```

## Documentation Structure
```
.project/
├── README.md (this file)           # Quick start and overview  
├── DEVELOPMENT_GUIDELINES.md       # 🚫 Critical artifact prevention rules
├── VERSIONING.md                   # Simple patch-bump convention
├── contexts/                       # Detailed technical docs
│   ├── architecture.md            # System design and data flow
│   ├── coding-standards.md         # TypeScript/WebSocket patterns  
│   └── deployment.md              # Build and deployment processes
├── troubleshooting/                # Historical issues and solutions
│   ├── DEPLOYMENT_LESSONS_LEARNED.md
│   ├── TROUBLESHOOTING.md
│   └── github-issue-wrangler-dev.md
└── pre-commit-check.sh            # Artifact prevention script
```

## Key Performance Targets
- WebSocket latency: <100ms
- Connection limit: 100 per Durable Object  
- Bundle size: 23KB frontend

## Security
- Input validation + rate limiting
- CORS configuration  
- Session isolation via Durable Objects