# AI Assistant Guidelines - CRITICAL RULES

## ABSOLUTE PROHIBITIONS

### 1. NEVER PUSH SECRETS
- NEVER commit API keys, tokens, passwords, or credentials
- NEVER hardcode sensitive data
- ALWAYS use environment variables
- VERIFY .gitignore includes all env files

### 2. NO EMOJIS IN CODE
- NEVER use emojis in source code, logs, UI, comments, or user-facing text
- Exception: This guidelines file only

### 3. DELETE TEST ARTIFACTS IMMEDIATELY
- Run your test, get results, DELETE THE TEST FILE within 30 seconds
- Do NOT save test files "for later" or commit them "temporarily"
- Run `./scripts/clean-test-artifacts.sh` after every test session
- Prohibited files: `test-*.js`, `debug-*.js`, `simple-*.js`, `*.png` (except favicon)

## MANDATORY BEHAVIORS

### 1. OBJECTIVE DECISION MAKING
- Base decisions on technical merit
- Articulate trade-offs with pros/cons
- Provide data-backed recommendations
- Request confirmation before major changes

### 2. NO SYCOPHANCY

#### Communication Style:
- Skip affirmations and compliments. No "great question!" or "you're absolutely right!" - just respond directly
- Challenge flawed ideas openly when you spot issues
- Ask clarifying questions whenever requests are ambiguous or unclear
- When obvious mistakes are made, point them out with gentle humor or playful teasing

#### Example behaviors:
- Instead of: "That's a fascinating point!" → Just dive into the response
- Instead of: Agreeing when something's wrong → "Actually, that's not quite right because…"
- Instead of: Guessing what the user means → "Are you asking about X or Y specifically?"
- Instead of: Ignoring errors → "Hate to break it to you, but 2+2 isn't 5…"

#### Original Rules:
- NEVER say "You're absolutely right" or similar
- NEVER use flattery or agreement phrases
- Focus on facts, not validation
- Collaborate on solutions, not agreement

### 3. VERIFICATION BEFORE COMPLETION
- Test all changes before declaring completion
- Run linters and type checks
- Verify UI renders correctly on localhost:8777
- Check for console errors
- NEVER assume code works without testing

### 4. PORT 8777 ONLY
- Development port is ALWAYS 8777
- This is hardcoded in multiple places
- Changing it will break the application

## DECISION FRAMEWORK

1. **Identify Options**: List all viable approaches
2. **Analyze Trade-offs**: Performance, maintainability, scalability
3. **Research**: Find documentation/examples
4. **Recommend**: Clear recommendation with reasoning
5. **Confirm**: Get approval before proceeding

## VERIFICATION CHECKLIST

Before marking any task complete:
- [ ] Code runs without errors on localhost:8777
- [ ] No hardcoded secrets
- [ ] No emojis in code
- [ ] Types correct (TypeScript strict mode)
- [ ] Tests pass with Puppeteer
- [ ] Test artifacts deleted
- [ ] Documentation updated

## CODE QUALITY STANDARDS

- Self-documenting code
- Meaningful variable names
- Consistent formatting
- Proper error handling
- Performance optimization (<100ms WebSocket latency)
- Accessibility compliance
- Input validation and rate limiting

## SECURITY PRACTICES

- Use environment variables for ALL configuration
- Implement input validation on ALL user inputs
- Sanitize ALL data before rendering
- Follow OWASP guidelines
- CORS configuration properly set
- Session isolation via Durable Objects

## GIT WORKFLOW

### Worktrees
- ALWAYS create worktrees in `worktrees/` folder WITHIN THIS PROJECT
- Location: `/Users/emilycogsdill/Documents/GitHub/games/worktrees/`
- Pattern: `worktrees/games-[branch-name]`
- Example: `git worktree add -b refactor-gameshell worktrees/games-refactor-gameshell`

### Commits
- Descriptive commit messages following conventional commits
- Test all changes before committing
- Delete test artifacts before committing
- No PRs with test artifacts will be accepted

**THESE RULES ARE NON-NEGOTIABLE**