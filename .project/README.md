# Games Platform - Project Documentation

## For AI Assistants
**MANDATORY**: Read ALL files in `.project/` before starting work, especially:
1. `guidelines/ai-behavior.md` - Critical behavioral rules (NO EMOJIS, DELETE TEST FILES)
2. `requirements/overview.md` - What we're building
3. `requirements/technical.md` - How we're building it
4. `guidelines/tdd-approach.md` - Testing philosophy (Puppeteer on port 8777)
5. `guidelines/troubleshooting.md` - Common issues and solutions

## For Humans
- Requirements: See `requirements/overview.md`  
- Tech Stack: See `requirements/technical.md`
- Common Issues: See `guidelines/troubleshooting.md`
- Testing: See `guidelines/tdd-approach.md`

## Project Overview
A multiplayer games platform built on Cloudflare Workers that provides instant, real-time gaming experiences without downloads or accounts. Features multiple game types with shared infrastructure for chat, player management, and session handling.

## Key Commands
```bash
# Development
npm run dev  # ALWAYS runs on localhost:8777

# Testing
node scripts/testing/test-[game-name].js
./scripts/clean-test-artifacts.sh  # MANDATORY after testing

# Build/Deploy
npm run build
npm run deploy
```

## Architecture
```
Browser → CloudFlare Worker → Durable Object (Game Session) → WebSocket → All Clients
          
Game Types:
- CheckboxGameSession: Competitive checkbox clicking
- CountyGameSession: County celebration game
- EverybodyVotesGameSession: Real-time voting
- Additional frontend modules: Price Is Weird, That's A Paddlin
```

### Core Components
- **GameSession**: Base class with shared functionality (chat, spectators, players)
- **Game-Specific Sessions**: Extend GameSession for each game type
- **GameShell/GameModule**: Frontend architecture for code reuse
- **WebSocket Protocol**: JSON messages for real-time communication

## Performance Targets
- WebSocket latency: <100ms
- Bundle size: ~23KB frontend
- Connection limit: 100 per Durable Object
- Page load: <3 seconds on 3G

## Security Considerations
- Input validation with rate limiting (10 msg/sec)
- Message size limits (1MB)
- Session isolation via Durable Objects
- CORS properly configured
- No secrets in code - environment variables only

## Critical Rules for Development
1. **Port 8777 ONLY** - Never change the development port
2. **DELETE test artifacts IMMEDIATELY** - Within 30 seconds of test completion
3. **Test EVERYTHING** - Use Puppeteer on localhost:8777 before claiming completion
4. **NO EMOJIS in code** - Professional codebase only
5. **NO untested fixes** - "It should work" is not acceptable

## Project Structure
```
.project/
├── README.md                    # This file - entry point
├── guidelines/                  # How we work
│   ├── ai-behavior.md          # AI assistant rules
│   ├── coding-standards.md     # Code style and patterns
│   ├── tdd-approach.md         # Test-driven development
│   └── troubleshooting.md      # Common issues and fixes
├── requirements/                # What we're building
│   ├── overview.md             # High-level goals
│   └── technical.md            # Tech stack and architecture
└── docs/                       # Additional documentation
    ├── architecture.md         # Detailed system design
    ├── deployment/            # Deployment guides
    ├── development/           # Legacy development docs
    └── ...
```

## Quick Diagnostics
- Dev server running? `npm run dev`
- Port correct? Must be 8777
- Test artifacts cleaned? `./scripts/clean-test-artifacts.sh`
- Dependencies installed? `npm install`

For detailed information, explore the documentation folders above.