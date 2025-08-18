# E2E Testing with Preview Deployments

## Overview
This project uses preview deployments for comprehensive E2E testing before production deployment. Every commit gets its own isolated preview environment for testing.

## How It Works

### 1. Automatic Preview Deployments
- Every push and PR triggers a preview deployment
- Preview URL format: `https://games-preview-{commit-sha}.workers.dev`
- Each preview is isolated and independent

### 2. E2E Test Execution
- Tests run against the deployed preview URL
- No local server required in CI/CD
- Tests use Puppeteer for browser automation

### 3. Production Deployment
- Only occurs after all tests pass
- Main branch deployments go to production
- Preview URLs are included in PR comments

## Local Testing

### Against Localhost
```bash
# Start dev server
npm run dev

# In another terminal, run E2E tests
npm run test:e2e
```

### Against Preview Deployment
```bash
# Test a specific preview URL
node scripts/test-preview.js https://games-preview-abc1234.workers.dev
```

## CI/CD Pipeline Flow

```
1. Code Push/PR
   ↓
2. Build Project
   ↓
3. Run Unit Tests
   ↓
4. Run Integration Tests (Vitest)
   ↓
5. Deploy to Preview Environment
   ↓
6. Run E2E Tests Against Preview
   ↓
7. (If main branch) Deploy to Production
```

## Environment Variables

- `TEST_URL`: The URL to test against (set automatically in CI)
- `CI`: Set to 'true' in CI environment
- `HEADLESS`: Set to 'true' for headless browser testing

## Preview Cleanup

Old preview deployments are automatically cleaned up:
- Runs daily at 2 AM UTC
- Removes previews older than 7 days
- Can be triggered manually via GitHub Actions

## Troubleshooting

### E2E Tests Failing in CI
1. Check the preview URL is accessible
2. Verify Puppeteer dependencies are installed
3. Check for timeout issues (CI uses longer timeouts)

### Local E2E Tests
1. Ensure dev server is running (`npm run dev`)
2. Check port 8777 is available
3. Run with `HEADLESS=false` to see browser

## Adding New E2E Tests

1. Create test file in `tests/e2e/`
2. Use the `baseUrl` variable for URL flexibility
3. Consider CI timeouts (30s vs 10s local)
4. Test both single and multiplayer scenarios

## Benefits

✅ **Real Environment Testing**: Tests run against actual deployed Workers
✅ **Isolation**: Each PR gets its own test environment
✅ **Confidence**: Production only updates after all tests pass
✅ **Visibility**: Preview URLs in PR comments for manual testing
✅ **Cost Effective**: Leverages Workers free tier for previews