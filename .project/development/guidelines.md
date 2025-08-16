# Development Guidelines

This document consolidates all development practices, standards, and rules for the Games Platform project.

## Table of Contents
- [Core Principles](#core-principles)
- [Artifact Management](#artifact-management)
- [Development Standards](#development-standards)
- [Code Quality](#code-quality)
- [AI Assistant Guidelines](#ai-assistant-guidelines)

---

## Core Principles

### 1. **Professional Repository Standards**
- Clean root directory - only essential project files
- Organized documentation in `.project/`
- No debugging artifacts in version control
- Descriptive commit messages following conventional commits
- Proper .gitignore prevents accidental commits

### 2. **Development Port**
- **Port 8777 ONLY** - Never change the development port
- This is hardcoded in multiple places and changing it will break things

### 3. **Testing First**
- Test everything with Puppeteer on localhost:8777 before claiming fixes
- See [testing-requirements.md](testing-requirements.md) for detailed testing rules

---

## Artifact Management

### UNSKIPPABLE RULE: DELETE TESTING ARTIFACTS IMMEDIATELY

**THIS RULE IS NON-NEGOTIABLE AND MUST BE FOLLOWED WITHOUT EXCEPTION**

You MUST delete all testing and debugging artifacts THE MOMENT they are no longer needed:

1. Run your test
2. Get your results
3. **DELETE THE TEST FILE IMMEDIATELY** (within 30 seconds)
4. Do NOT move on to next task until deleted
5. Do NOT "save them for later"
6. Do NOT commit them "temporarily"

**Quick Cleanup**: Run `./scripts/clean-test-artifacts.sh` after every test session

### What NOT to Commit

#### Prohibited Files
- `test-*.js`, `debug-*.js`, `simple-*.js`
- `*.png` (except favicon and docs/diagrams)
- `*-fix.js`, `*-actual-fix.*`, `*-verification.*`
- Temporary HTML/JSON test outputs
- Screenshot files of any kind

#### Where Files Should Go Instead
- **Puppeteer tests**: Create in `scripts/testing/` with proper naming
- **Documentation**: Place in `.project/docs/` or `.project/troubleshooting/`
- **Screenshots for docs**: Use `docs/diagrams/` with descriptive names

---

## Development Standards

### Git Workflow
1. Create feature branches from main
2. Test all changes before committing
3. Delete test artifacts before committing
4. Write clear commit messages
5. Create PRs with detailed descriptions

### Code Organization
- TypeScript with strict mode enabled
- Follow existing patterns in the codebase
- Use Durable Objects for game state
- WebSocket for real-time communication

### File Structure
```
src/
├── durable-objects/    # Game session classes
├── static/            # Frontend assets
│   ├── js/           # JavaScript modules
│   └── styles.css    # All styles
├── lib/              # Utilities
└── index.ts          # Main worker
```

---

## Code Quality

### Before Committing
- [ ] Run tests with Puppeteer
- [ ] Delete all test artifacts
- [ ] Check `git status` for unwanted files
- [ ] Ensure no console.log debugging statements
- [ ] Verify no hardcoded test data

### Code Review Standards
- No PR with test artifacts will be accepted
- All game features must have test coverage
- Changes must not break existing games
- Performance impact must be considered

---

## AI Assistant Guidelines

When using AI assistants (Claude, GitHub Copilot, etc.) for this project:

### Mandatory Practices
1. **Always test generated code** - Never trust AI output without verification
2. **Delete test files immediately** - AI often creates test files; delete them after use
3. **Review for patterns** - Ensure AI follows existing code patterns
4. **Check for hallucinations** - Verify all API calls and library usage

### AI-Specific Rules
- AI must follow all guidelines in this document
- AI should use Puppeteer in headless mode for testing
- AI must not create permanent test files in root
- AI should reference existing code patterns

### Common AI Mistakes to Avoid
- Creating test files without immediate deletion
- Using incorrect selectors or API methods
- Ignoring the port 8777 requirement
- Adding unnecessary dependencies

---

## Quick Reference

### Essential Commands
```bash
# Start development
npm run dev  # Always on port 8777

# Clean up after testing
./scripts/clean-test-artifacts.sh

# Check for artifacts
git status

# Run specific game tests
node scripts/testing/test-game-name.js
```

### Key Files
- `.project/development/testing-requirements.md` - Testing rules
- `.project/deployment/guide.md` - Deployment process
- `.project/docs/architecture.md` - System design
- `.gitignore` - Prevents committing artifacts

### Enforcement
- **PRs with artifacts = REJECTED**
- **Untested changes = REJECTED**
- **No exceptions to these rules**

Remember: A clean repository is a professional repository.