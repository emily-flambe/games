# 🎮 Games Platform - Project Overview

## 🚨 **READ FIRST - CRITICAL DEPLOYMENT INFO**

**This project uses FULLY AUTOMATED semantic versioning and deployments.**

**⚡ Your commit messages directly control production deployments!**

👉 **[CRITICAL-DEPLOYMENT-RULES.md](CRITICAL-DEPLOYMENT-RULES.md)** - READ BEFORE ANY COMMIT
👉 **[DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md)** - Development best practices

---

## 🏗️ **Project Architecture**

### **Frontend:**
- **Vanilla JavaScript** - No framework dependencies
- **WebSocket** - Real-time multiplayer communication
- **Modular Game System** - GameShell + GameModules architecture

### **Backend:**
- **Cloudflare Workers** - Serverless edge computing
- **Durable Objects** - Stateful WebSocket connections
- **TypeScript** - Type-safe server development

### **Deployment:**
- **Automated Versioning** - Conventional commits → semantic versions
- **GitHub Actions** - CI/CD pipeline
- **Production URL**: https://games.emilycogsdill.com

---

## 📁 **Key Project Files**

### **🚨 Critical - Deployment System:**
- `.project/CRITICAL-DEPLOYMENT-RULES.md` - **MUST READ FIRST**
- `.project/DEVELOPMENT-WORKFLOW.md` - Development best practices
- `VERSIONING.md` - Complete conventional commits guide
- `.github/workflows/auto-version.yml` - GitHub Actions CI/CD
- `.releaserc.json` - Semantic release configuration
- `setup-hooks.sh` - Git hooks installer

### **📋 Development:**
- `package.json` - Dependencies and scripts
- `src/index.ts` - Cloudflare Workers entry point
- `src/static/` - Frontend assets
- `scripts/` - Build and development scripts
- `wrangler.toml` - Cloudflare Workers configuration

### **🧪 Testing:**
- `tests/` - Unit and integration tests
- `jest.config.js` - Jest configuration
- `tests/TESTING_PLAN.md` - Testing strategy

### **📖 Documentation:**
- `README.md` - Project overview and setup
- `docs/` - Additional documentation and screenshots

---

## 🚀 **Quick Start**

### **First Time Setup:**
```bash
git clone [repo-url]
cd games
npm install
npm run setup-hooks  # CRITICAL - Installs commit validation
npm run dev          # Start development server
```

### **Development:**
```bash
# Always use conventional commits!
git commit -m "feat: add new game feature"
git commit -m "fix: repair WebSocket issue"
git commit -m "docs: update documentation"
```

### **Deployment:**
- Push to `main` branch → Automatic version bump + deployment
- Feature branches → Show as `-alpha` version
- Failed tests → Block deployment

---

## 🎯 **Game Development**

### **Current Games:**
- **Checkbox Game** - Collaborative 3x3 grid interaction
- **More games** - Coming soon (see "Coming Soon" cards)

### **Adding New Games:**
1. Create game module in `src/static/js/games/`
2. Follow GameModule interface pattern
3. Add to game selection UI
4. Use `feat:` commit for version bump
5. Test multiplayer functionality

### **Game Architecture:**
- **GameShell** - Core multiplayer infrastructure
- **GameModule** - Individual game implementations
- **WebSocket** - Real-time state synchronization
- **Durable Objects** - Server-side game state

---

## 🔧 **Available Scripts**

```bash
npm run dev          # Start development server (localhost:8777)
npm run build        # Build static assets
npm run deploy       # Build + deploy to Cloudflare
npm run test         # Run all tests
npm run setup-hooks  # Install Git commit validation hooks
npm run version      # Generate version info manually
```

---

## 🌐 **Environments**

### **Development:**
- **URL**: http://localhost:8777
- **WebSocket**: ws://localhost:8777/ws
- **Version Display**: Shows `-alpha` suffix

### **Production:**
- **URL**: https://games.emilycogsdill.com
- **Auto-deployed** from main branch
- **Version Display**: Shows clean version numbers

---

## 🛡️ **Safety & Quality**

### **Automated Checks:**
- **Git Hooks** - Block invalid commit messages
- **GitHub Actions** - Run tests on all PRs
- **Semantic Release** - Prevent accidental major bumps
- **Test Gates** - Failed tests block deployment

### **Manual Checks:**
- Code review on PRs
- Local testing before push
- Monitor deployment logs
- Version verification on live site

---

## 🆘 **Emergency Contacts & Procedures**

### **Rollback Bad Deployment:**
```bash
git revert HEAD
git commit -m "revert: undo problematic deployment"
git push origin main
```

### **Check Deployment Status:**
- GitHub Actions logs
- Live site version display
- GitHub releases page

### **Get Help:**
- Check GitHub Issues
- Review deployment logs
- Test locally with `npm run dev`

---

**⚡ Remember: This project auto-deploys on every main branch push with conventional commits!**