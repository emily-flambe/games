# Games Platform - Project Documentation

## 🚨 CRITICAL - READ BEFORE DEVELOPMENT

### Essential Rules
1. **[Development Guidelines](development/guidelines.md)** - 🛑 DELETE TEST ARTIFACTS IMMEDIATELY
2. **[Testing Requirements](development/testing-requirements.md)** - Test EVERYTHING on localhost:8777
3. **Port 8777 ONLY** - Never change development port

## Quick Start
```bash
npm install
npm run dev  # Always localhost:8777

# After ANY testing:
./scripts/clean-test-artifacts.sh
```

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

## Documentation Structure

### 📁 development/
**Day-to-day development practices and requirements**
- [guidelines.md](development/guidelines.md) - Comprehensive development standards
- [testing-requirements.md](development/testing-requirements.md) - Mandatory testing protocols

### 📁 docs/
**Technical documentation and specifications**
- [README.md](docs/README.md) - Technical docs overview
- [architecture.md](docs/architecture.md) - System design and data flow
- [coding-standards.md](docs/coding-standards.md) - TypeScript/WebSocket patterns
- [dependencies.md](docs/dependencies.md) - Package requirements
- [debugging.md](docs/debugging.md) - Debugging strategies

### 📁 deployment/
**Everything related to deploying the application**
- [guide.md](deployment/guide.md) - Step-by-step deployment process
- [best-practices.md](deployment/best-practices.md) - Production deployment guidelines
- [lessons-learned.md](deployment/lessons-learned.md) - Historical deployment issues

### 📁 troubleshooting/
**Game-specific debugging and migration logs**
- [everybody-votes-debug.md](troubleshooting/everybody-votes-debug.md) - EV game issues
- [wrangler-dev-migration-completed.md](troubleshooting/wrangler-dev-migration-completed.md) - Dev server migration

### 📄 Root Files
- [VERSIONING.md](VERSIONING.md) - Simple patch-bump versioning convention
- [settings.json](settings.json) - Project configuration

## Key Commands

### Development
```bash
npm run dev              # Start dev server (port 8777)
npm run build           # Build for production
npm run deploy          # Deploy to Cloudflare
```

### Version Management
```bash
npm run bump-patch      # 1.1.1 → 1.1.2
npm run bump-minor      # 1.1.1 → 1.2.0
npm run bump-major      # 1.1.1 → 2.0.0
```

### Cleanup (MANDATORY after testing)
```bash
./scripts/clean-test-artifacts.sh  # Remove ALL test files
git status                         # Verify clean
```

## Performance Targets
- WebSocket latency: <100ms
- Connection limit: 100 per Durable Object
- Bundle size: ~23KB frontend

## Security
- Input validation + rate limiting
- CORS configuration
- Session isolation via Durable Objects

## Remember
1. **Delete test artifacts IMMEDIATELY** (within 30 seconds)
2. **Test everything** before claiming it works
3. **Keep the repository professional** - no debugging files in commits

For detailed information, explore the documentation folders above.