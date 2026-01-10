---
allowed-tools:
  - Bash
description: Run all verification checks before committing
---

# Pre-commit Verification

Run all checks to verify the codebase is ready to commit.

## Steps

1. **Build static assets**
   ```bash
   npm run build
   ```

2. **Run unit tests**
   ```bash
   npm run test:unit
   ```

3. **Run browser tests**
   ```bash
   npm run test:browser
   ```

4. **Run Vitest integration tests**
   ```bash
   npm run test:vitest
   ```

5. **Report results**
   - Summarize pass/fail status for each step
   - List any failing tests with error messages
   - Recommend next steps if failures occurred

## Optional: E2E Tests

If you need to run e2e tests (requires dev server):

```bash
npm run test:e2e
```

Note: E2E tests start the dev server automatically if not running.
