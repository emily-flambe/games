# 🚀 AUTOMATED VERSIONING SYSTEM

## ⚡ **CRITICAL: Your Commit Messages Control Deployments!**

This project uses **FULLY AUTOMATED** semantic versioning. Your commit message format determines version bumps and deployments.

---

## 📝 **REQUIRED Commit Message Format**

```
<type>: <description>

[optional body]

[optional footer]
```

## 🎯 **Commit Types → Version Bumps**

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | **MINOR** (1.0.0 → 1.1.0) | `feat: add dark mode toggle` |
| `fix:` | **PATCH** (1.0.0 → 1.0.1) | `fix: repair WebSocket connection` |
| `perf:` | **PATCH** (1.0.0 → 1.0.1) | `perf: optimize game rendering` |
| `refactor:` | **PATCH** (1.0.0 → 1.0.1) | `refactor: simplify auth logic` |
| `feat!:` or `BREAKING CHANGE:` | **MAJOR** (1.0.0 → 2.0.0) | `feat!: redesign game API` |

### 🚫 **No Version Bump** (safe for docs/cleanup):
- `docs:` - Documentation only
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes
- `test:` - Test updates

---

## ✅ **Good Examples**

```bash
# Minor version bump (new feature)
git commit -m "feat: add spectator mode to games"

# Patch version bump (bug fix)  
git commit -m "fix: prevent duplicate player connections"

# Patch version bump (performance improvement)
git commit -m "perf: reduce WebSocket message overhead"

# Major version bump (breaking change)
git commit -m "feat!: change room code format to UUIDs

BREAKING CHANGE: Room codes are now UUIDs instead of 4-letter codes"

# No version bump (documentation)
git commit -m "docs: update README with new setup instructions"
```

## ❌ **Bad Examples** (will break automation)

```bash
# ❌ No type prefix
git commit -m "added dark mode"

# ❌ Wrong type
git commit -m "update: fixed bug"  

# ❌ Missing colon
git commit -m "feat added new game"
```

---

## 🔄 **How Automated Deployment Works**

1. **You push to `main`** with conventional commit
2. **GitHub Actions automatically**:
   - Analyzes your commit messages
   - Bumps version in `package.json`
   - Creates git tag (e.g., `v1.2.3`)
   - Builds and deploys to Cloudflare Workers
   - Creates GitHub release with changelog

3. **Version appears on site**:
   - `main` branch: `v1.2.3`
   - Other branches: `v1.2.3-alpha`

---

## 🛡️ **Safety Rules**

- **PRs to main**: Tests run, no deployment
- **Direct push to main**: Auto-version + deploy
- **Feature branches**: Always show `-alpha` suffix
- **Failed tests**: Block deployment

---

## 🔧 **Manual Version Check**

```bash
# See what version would be bumped (dry run)
npx semantic-release --dry-run

# Current version
node -p "require('./package.json').version"
```

---

## 🚨 **EMERGENCY: Manual Version Override**

Only if automation breaks:

```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0  
npm version major  # 1.0.0 → 2.0.0
```

---

## 📱 **Quick Reference Card**

**Print this out and stick to your monitor:**

| Want to... | Use this format |
|------------|-----------------|
| Add new feature | `feat: description` |
| Fix a bug | `fix: description` |
| Improve performance | `perf: description` |
| Update docs only | `docs: description` |
| Break existing API | `feat!: description` + `BREAKING CHANGE:` |

**Remember: Your commit message = automatic deployment!** 🚀