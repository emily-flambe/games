# Git Hooks

This directory contains optional Git hooks for local development.

## Available Hooks

### commit-msg
Validates commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) format.

**Valid types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore

**Examples**:
- ✅ `feat: add new game mode`
- ✅ `fix: resolve WebSocket connection issue`
- ✅ `docs: update deployment guide`
- ❌ `Added new feature` (missing type)
- ❌ `feat - new game` (wrong separator)

## Installation

**Optional** - Run this if you want local commit validation:
```bash
npm run setup-hooks
# or
./setup-hooks.sh
```

## Note
These hooks are **completely optional**. The project enforces commit standards through:
- Code review process
- CI/CD pipeline checks
- Developer awareness

You don't need to install these hooks unless you want local validation before pushing.