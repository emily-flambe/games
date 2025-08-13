# Switch Primary Development Environment from Node.js to Wrangler Dev

## Problem
We consistently encounter issues where games work perfectly on `localhost:8777` (Node.js dev server) but fail on production (Cloudflare Workers). Recent debugging of the Everybody Votes game revealed critical state synchronization issues that only manifested in production, causing significant debugging overhead.

## Root Cause
The Node.js development server (`scripts/dev-server.js`) doesn't accurately replicate Cloudflare Workers' behavior, particularly:
- WebSocket connection lifecycle differences
- State synchronization timing
- Error propagation and handling
- Durable Objects behavior simulation

## Proposed Solution
Switch to `wrangler dev` as the primary development environment, which runs actual Cloudflare Workers locally and provides much closer parity with production.

## Implementation Tasks

### Phase 1: Update Development Scripts
- [ ] Modify `package.json` to use `wrangler dev` as primary dev command
- [ ] Keep Node.js server as `dev:node` for specific testing needs
- [ ] Update `make dev` to use wrangler instead of Node.js

### Phase 2: Configuration Changes
- [ ] Ensure `wrangler.toml` has proper local development configuration
- [ ] Set up local environment variables (`.dev.vars`) if needed
- [ ] Configure local Durable Objects persistence

### Phase 3: Documentation Updates
- [ ] Update README with new development workflow
- [ ] Document any limitations of wrangler dev
- [ ] Add troubleshooting guide for common wrangler dev issues

### Phase 4: Developer Experience
- [ ] Ensure hot reload works with wrangler dev
- [ ] Verify debugging capabilities
- [ ] Test development workflow end-to-end

## Benefits
1. **Catch production issues early** - Bugs will manifest during development
2. **Reduce debugging time** - No more "works locally but not in production"
3. **True Durable Objects behavior** - Accurate state persistence and lifecycle
4. **Consistent WebSocket handling** - Same connection behavior as production
5. **Better error messages** - Cloudflare's actual error handling

## Potential Drawbacks
- Slightly slower startup time compared to Node.js
- Requires Cloudflare account even for local development
- May need internet connection for some features
- Different debugging tools/workflow

## Migration Plan
1. **Week 1**: Update scripts and test wrangler dev setup
2. **Week 2**: Run both servers in parallel, compare behavior
3. **Week 3**: Switch team to wrangler dev as default
4. **Week 4**: Deprecate Node.js server (keep as fallback)

## Success Criteria
- [ ] All games work identically in wrangler dev and production
- [ ] No "works locally but not in production" issues for 30 days
- [ ] Developer productivity maintained or improved
- [ ] Deployment confidence increased

## Code Changes Required

### package.json
```json
{
  "scripts": {
    "dev": "wrangler dev --local --persist",
    "dev:node": "node scripts/dev-server.js",
    "dev:remote": "wrangler dev"
  }
}
```

### Makefile
```makefile
dev:
	@echo "🚀 Starting Wrangler development server..."
	npm run dev

dev-node:
	@echo "🚀 Starting Node.js development server (legacy)..."
	npm run dev:node
```

### .gitignore
```
# Wrangler local state
.wrangler/
.dev.vars
```

## Testing Requirements
- [ ] Verify all games work in wrangler dev
- [ ] Test WebSocket connections stability
- [ ] Confirm state persistence works correctly
- [ ] Validate hot reload functionality
- [ ] Check performance is acceptable

## Timeline
- **Priority**: High
- **Estimated effort**: 1 week
- **Impact**: Prevents future production issues

## References
- [Wrangler Dev Documentation](https://developers.cloudflare.com/workers/wrangler/commands/#dev)
- Recent production issue: Everybody Votes game state synchronization
- DEPLOYMENT_BEST_PRACTICES.md in repository

## Labels
`enhancement`, `developer-experience`, `production-parity`, `high-priority`

## Assignee
TBD

## Acceptance Criteria
- [ ] `npm run dev` starts wrangler dev server
- [ ] All existing games work without modification
- [ ] Documentation updated with new workflow
- [ ] Team trained on new development process
- [ ] No regression in developer productivity