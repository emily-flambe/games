# 🔧 Development Workflow for Automated Versioning

## 🎯 **Quick Reference - Print This Out**

```
🚨 COMMIT = DEPLOYMENT 🚨

feat: → Minor + Deploy (1.0.0 → 1.1.0)
fix:  → Patch + Deploy (1.0.0 → 1.0.1)
perf: → Patch + Deploy (1.0.0 → 1.0.1)
feat!:→ Major + Deploy (1.0.0 → 2.0.0)
docs: → Safe, no deploy
chore:→ Safe, no deploy

⚠️ Setup: npm run setup-hooks
📖 Full guide: VERSIONING.md
```

---

## 🚀 **Standard Development Flow**

### **For New Features:**
```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feat/new-game-mode

# 2. Develop using conventional commits
git commit -m "feat: add game mode selection UI"
git commit -m "feat: implement turn-based game logic"
git commit -m "test: add game mode unit tests"
git commit -m "docs: update game mode documentation"

# 3. Push feature branch
git push origin feat/new-game-mode
# → Shows version as X.X.X-alpha on deployment

# 4. Create PR → Tests run automatically
# 5. Merge to main → Auto version bump + deploy
```

### **For Bug Fixes:**
```bash
# 1. Work directly on main or hotfix branch
git checkout main
git pull origin main

# 2. Fix and commit
git commit -m "fix: prevent duplicate WebSocket connections"

# 3. Push → Automatic patch deployment
git push origin main
```

### **For Documentation/Maintenance:**
```bash
# Safe - won't trigger deployment
git commit -m "docs: update setup instructions"
git commit -m "chore: update dependencies"
git push origin main
```

---

## 🎮 **Game-Specific Commit Patterns**

### **New Games:**
```bash
git commit -m "feat: add Tic-Tac-Toe game implementation"
git commit -m "feat: add Connect Four game with AI opponent"
```

### **Game Improvements:**
```bash
git commit -m "feat: add spectator mode to checkbox game"
git commit -m "feat: enhance game UI with animations"
git commit -m "perf: optimize game state synchronization"
```

### **Game Fixes:**
```bash
git commit -m "fix: prevent checkbox game state desync"
git commit -m "fix: repair WebSocket reconnection in games"
```

### **Breaking Changes:**
```bash
git commit -m "feat!: redesign game room API

BREAKING CHANGE: Room codes now use UUID format instead of 4-letter codes. 
Existing room links will no longer work."
```

---

## 🔍 **Pre-Commit Checklist**

Before committing to main:

- [ ] **Tests pass locally**: `npm test`
- [ ] **Build succeeds**: `npm run build`
- [ ] **Commit message follows conventional format**
- [ ] **Changes are appropriate for the version bump type**
- [ ] **Breaking changes are documented in commit body**

---

## 📊 **Version Planning**

### **When to use each bump type:**

**MAJOR (Breaking Changes):**
- API changes that break existing clients
- Room code format changes
- WebSocket protocol changes
- Database schema changes

**MINOR (New Features):**
- New games
- New UI components
- New API endpoints (backward compatible)
- New game modes or features

**PATCH (Bug Fixes):**
- Bug fixes
- Performance improvements
- Security patches
- Dependency updates
- UI polish

---

## 🔧 **Local Development Setup**

### **Initial Setup:**
```bash
# Clone repo
git clone [repo-url]
cd games

# Install dependencies
npm install

# Setup commit hooks (CRITICAL)
npm run setup-hooks

# Start development
npm run dev
```

### **Ongoing Development:**
```bash
# Always start from latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/your-feature

# Develop with conventional commits
git commit -m "feat: your feature description"

# Push and create PR
git push origin feat/your-feature
```

---

## 🚨 **Common Mistakes to Avoid**

1. **Wrong commit type**:
   - ❌ `update: fixed bug` 
   - ✅ `fix: prevent connection timeout`

2. **Missing type prefix**:
   - ❌ `added new feature`
   - ✅ `feat: add new feature`

3. **Inappropriate version bump**:
   - ❌ `feat: fix typo` (should be `fix:` or `docs:`)
   - ❌ `fix: add new game` (should be `feat:`)

4. **Not setting up hooks**:
   - Always run `npm run setup-hooks` after clone

5. **Forgetting breaking changes**:
   - Use `feat!:` and add `BREAKING CHANGE:` in body

---

## 📈 **Monitoring Deployments**

- **GitHub Actions**: Check workflow runs for deployment status
- **Live Site**: Bottom of page shows current version and deploy time
- **GitHub Releases**: Automatic releases with changelogs
- **Git Tags**: Each version tagged automatically

**Live URL**: https://games.emilycogsdill.com