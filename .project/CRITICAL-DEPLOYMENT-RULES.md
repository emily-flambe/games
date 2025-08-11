# 🚨 CRITICAL: AUTOMATED DEPLOYMENT SYSTEM

## ⚡ **YOUR COMMIT MESSAGE CONTROLS PRODUCTION DEPLOYMENTS**

**THIS PROJECT USES FULLY AUTOMATED SEMANTIC VERSIONING**
Every push to `main` triggers automatic version bumps and deployments based on your commit message format.

---

## 🔴 **MANDATORY SETUP - RUN ONCE**

```bash
npm run setup-hooks
```

This installs Git hooks that will **BLOCK INVALID COMMIT MESSAGES** before they can break the system.

---

## 📋 **REQUIRED COMMIT MESSAGE FORMAT**

| Format | Version Bump | Production Deploy | When to Use |
|--------|--------------|-------------------|-------------|
| `feat: description` | **MINOR** (1.0.0 → 1.1.0) | ✅ YES | New features, games, UI |
| `fix: description` | **PATCH** (1.0.0 → 1.0.1) | ✅ YES | Bug fixes, crashes |
| `perf: description` | **PATCH** (1.0.0 → 1.0.1) | ✅ YES | Performance improvements |
| `feat!: description` | **MAJOR** (1.0.0 → 2.0.0) | ✅ YES | Breaking changes |
| `docs: description` | No change | ❌ NO | Documentation only |
| `chore: description` | No change | ❌ NO | Maintenance, cleanup |

---

## ✅ **CORRECT EXAMPLES**

```bash
# ✅ New feature → Minor version + Deploy
git commit -m "feat: add spectator mode to games"

# ✅ Bug fix → Patch version + Deploy  
git commit -m "fix: prevent WebSocket connection drops"

# ✅ Performance → Patch version + Deploy
git commit -m "perf: optimize game state synchronization"

# ✅ Breaking change → Major version + Deploy
git commit -m "feat!: change room codes to UUIDs"

# ✅ Documentation → No deploy
git commit -m "docs: update README with new setup instructions"

# ✅ Maintenance → No deploy
git commit -m "chore: update dependencies"
```

---

## ❌ **BLOCKED BY GIT HOOKS** (Will prevent commit)

```bash
# ❌ No type prefix
git commit -m "added new feature"

# ❌ Wrong type
git commit -m "update: fixed something"

# ❌ Missing colon
git commit -m "feat added dark mode"

# ❌ Generic messages
git commit -m "wip"
git commit -m "fixes"
```

---

## 🔄 **AUTOMATED WORKFLOW**

1. **You push to `main`** with conventional commit
2. **GitHub Actions automatically**:
   - Analyzes all commits since last release
   - Calculates appropriate version bump
   - Updates `package.json` version
   - Creates git tag (e.g., `v1.2.3`)
   - Builds and deploys to games.emilycogsdill.com
   - Creates GitHub release with changelog

3. **Live site displays version**:
   - Main: `running version 1.2.3, last deployed on DATE`
   - Branches: `running version 1.2.3-alpha, last deployed on DATE`

---

## 🛡️ **SAFETY SYSTEMS**

- **Git Hooks**: Block invalid commits locally
- **PR Testing**: All PRs run tests, no deployment
- **Main Only**: Only main branch pushes trigger deployments
- **Test Gates**: Failed tests block deployment
- **Rollback**: Git tags enable easy rollback

---

## 🆘 **EMERGENCY PROCEDURES**

### **Revert Bad Deployment:**
```bash
git revert HEAD
git commit -m "revert: undo problematic change"
git push origin main
```

### **Check Version Impact (Dry Run):**
```bash
npx semantic-release --dry-run
```

### **Manual Version Override** (Emergency Only):
```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

---

**⚡ REMEMBER: Every commit to main = automatic production deployment!**