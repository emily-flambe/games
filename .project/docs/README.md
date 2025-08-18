# Project Contexts

Quick reference for project documentation:

## Core Docs
- **[architecture.md](./architecture.md)** - System design, components, data flow
- **[coding-standards.md](./coding-standards.md)** - TypeScript patterns, WebSocket handling
- **[dependencies.md](./dependencies.md)** - Package requirements, Workers limitations
- **[deployment.md](../deployment/guide.md)** - Setup, testing, **automated versioning**
- **[debugging.md](./debugging.md)** - Puppeteer testing, common issues

## Key Points
- **Stack**: Cloudflare Workers + Durable Objects
- **Frontend**: Vanilla JS with GameShell/GameModule architecture
- **WebSocket**: 100 connections per DO, automatic reconnection
- **Bundle**: 23KB frontend, 1MB Worker limit
- **Testing**: Puppeteer for multi-player scenarios
- **Deployment**: Automated via conventional commits (`feat:`, `fix:`)

## Quick Commit Reference
```bash
feat: description    # Minor version + deploy
fix: description     # Patch version + deploy
docs: description    # No version bump
```