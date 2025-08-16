# Development Guidelines

## 🛑 UNSKIPPABLE RULE: DELETE TESTING ARTIFACTS IMMEDIATELY 🛑

### THIS RULE IS NON-NEGOTIABLE AND MUST BE FOLLOWED WITHOUT EXCEPTION

**YOU MUST DELETE ALL TESTING AND DEBUGGING ARTIFACTS THE MOMENT THEY ARE NO LONGER NEEDED.**

This means:
1. ✅ Run your test
2. ✅ Get your results
3. 🗑️ **DELETE THE TEST FILE IMMEDIATELY**
4. ❌ Do NOT move on to the next task until artifacts are deleted
5. ❌ Do NOT "save them for later"
6. ❌ Do NOT commit them "temporarily"

**ENFORCEMENT**: Any PR with testing artifacts will be REJECTED. No exceptions.

### Immediate Deletion Checklist
After EVERY debugging session:
- [ ] Delete all test-*.js files
- [ ] Delete all *.png screenshots
- [ ] Delete all debug-*.js files
- [ ] Delete all temporary HTML files
- [ ] Delete all .json test outputs
- [ ] Run `git status` to verify deletion
- [ ] Only THEN proceed to next task

**Remember**: A clean repository is a professional repository. Delete artifacts IMMEDIATELY.

---

## 🚫 CRITICAL: DO NOT COMMIT TROUBLESHOOTING ARTIFACTS

### What NOT to Commit
The following files should **NEVER** be committed to the repository:

#### Screenshots and Images
- `*.png` files (except favicon and official documentation diagrams)
- `screenshot*.png`, `capture*.png`, `*-test.png`
- `*-error.png`, `*-debug.png`, `production-*.png`
- `frame_*.png`, `screencast*.webp`

#### Temporary Scripts and Files
- `test-*.js`, `debug-*.js`, `simple-*.js`
- `*-fix.js`, `*-actual-fix.*`, `*-verification.*`
- `*-comprehensive-*.*`, `*-websocket-*.*`
- `*-button-fix.*`, `*-end-game-*.*`
- `*-flow.*`, `*-manual-*.*`, `*-multiplayer-*.*`
- `*-single-player.*`, `*-local-*.*`, `*-production-*.*`

#### Temporary Documentation
- `DEPLOYMENT_*.md`, `TROUBLESHOOTING*.md` (in root - should be in `.project/`)
- `github-issue-*.md`, `*-lessons-learned.md`, `*-best-practices.md`

### Where Files Should Go Instead

#### Screenshots and Testing Assets
- **Local only**: Keep in your personal workspace, do not commit
- **If needed for documentation**: Place in `docs/diagrams/` with descriptive names
- **Official screenshots**: Use `docs/architecture-*.png` pattern for permanent docs

#### Debugging Scripts
- **Puppeteer tests**: Create in `scripts/testing/` with proper naming
- **One-off tests**: Keep local, delete when done
- **Reusable utilities**: Add to `scripts/` with clear purpose

#### Documentation
- **Troubleshooting guides**: Place in `.project/TROUBLESHOOTING.md`
- **Best practices**: Place in `.project/DEPLOYMENT_BEST_PRACTICES.md`
- **Architecture docs**: Place in `.project/contexts/`
- **Issues and proposals**: Place in `.project/` with descriptive names

### Pre-Commit Checklist

Before committing, check:
- [ ] No `*.png` files except favicon and official docs
- [ ] No `test-*.js` or `debug-*.js` files
- [ ] No temporary fix files (`*-fix.*`, `*-actual-fix.*`)
- [ ] No troubleshooting documentation in root directory
- [ ] All valuable documentation moved to `.project/`

### Professional Repository Standards

#### What Makes a Repository Look Professional
✅ **Clean root directory** - Only essential project files  
✅ **Organized documentation** - In `.project/` or `docs/` directories  
✅ **No debugging artifacts** - Keep troubleshooting local  
✅ **Descriptive commit messages** - Follow conventional commits  
✅ **Proper .gitignore** - Prevents accidental commits  

#### What Makes a Repository Look Unprofessional
❌ **Debugging screenshots everywhere**  
❌ **test-*.js files littering the root**  
❌ **Temporary fix files committed**  
❌ **frame_*.png captures in git history**  
❌ **Random troubleshooting docs in root**  

### Debugging Best Practices

#### For Screenshots
```bash
# Create a local debugging directory (gitignored)
mkdir -p .debug/screenshots
# Take screenshots there
puppeteer screenshot --output .debug/screenshots/issue-123.png
```

#### For Test Scripts
```bash
# Create temporary test in gitignored location
touch .debug/test-websocket-connection.js
# Or use scripts/testing/ for reusable tests
```

#### For Documentation
```bash
# Always place troubleshooting docs in .project/
touch .project/issue-123-troubleshooting.md
# Update .project/config.md to reference it
```

### Enforcement

The enhanced `.gitignore` will prevent most troubleshooting artifacts from being committed. However:

1. **Developer responsibility** - Check your commits before pushing
2. **Code review requirement** - Reviewers should reject PRs with artifacts
3. **Regular cleanup** - Periodic repository hygiene reviews

### Emergency Cleanup

If troubleshooting artifacts are accidentally committed:

```bash
# Create cleanup branch
git checkout -b cleanup-artifacts

# Remove artifacts (example patterns)
git rm test-*.js debug-*.js *.png
git rm production-*.png frame_*.png

# Move valuable docs to .project/
mv TROUBLESHOOTING.md .project/
git add .project/TROUBLESHOOTING.md

# Commit cleanup
git commit -m "chore: remove troubleshooting artifacts"
```

### Summary

**Golden Rule**: If it's for debugging, testing, or troubleshooting a specific issue, it probably shouldn't be committed to the main repository. Keep the repo clean and professional.