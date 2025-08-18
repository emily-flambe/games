# Visual Testing Quick Start Guide

Get up and running with visual regression testing in 5 minutes.

## 1. Install Dependencies

```bash
# Install visual testing dependencies
npm install pixelmatch pngjs --save-dev
```

## 2. Create Initial Baselines

```bash
# Create baselines for all visual tests
npm run test:visual:update
```

This will:
- Start the development server
- Open games in browser
- Capture screenshots for all test scenarios
- Save them as baseline images

## 3. Run Visual Tests

```bash
# Run all visual tests
npm run test:visual:cli
```

Expected output:
```
🧪 Running County Game visual tests...
✅ county-game-portal-card: PASSED
✅ county-game-player-setup: PASSED
✅ county-game-win-screen: PASSED
...
🎉 All visual tests passed!
```

## 4. Verify Setup

```bash
# Validate test environment
node scripts/visual-test.js validate
```

Should show:
```
✅ Environment validation passed
```

## 5. Make a Change and Test

1. **Make a CSS change** (e.g., change button color in `src/static/styles.css`)

2. **Run tests** to see failure:
   ```bash
   npm run test:visual:cli
   ```

3. **Update baselines** if change is intentional:
   ```bash
   npm run test:visual:update
   ```

## Common Commands

```bash
# Run with visible browser (for debugging)
npm run test:visual:cli -- --no-headless

# Show latest test report
node scripts/visual-test.js report

# Clean up test artifacts
node scripts/visual-test.js clean

# Help
node scripts/visual-test.js help
```

## File Structure After Setup

```
tests/visual/
├── baselines/
│   └── test_chrome_1280x720/     # Your baseline images
├── screenshots/                  # Temporary test screenshots
├── diffs/                       # Diff images when tests fail
└── reports/                     # Test execution reports
```

## What's Being Tested

- **County Game**: Portal card, setup screen, waiting room, gameplay, win screen
- **Other Games**: Portal cards, setup screens, waiting rooms
- **Responsive**: Mobile and tablet layouts
- **Layout Consistency**: Cross-game UI consistency

## Troubleshooting

- **"Pixelmatch not available"**: Run `npm install pixelmatch pngjs`
- **Tests failing**: Check diff images in `tests/visual/diffs/`
- **Server not starting**: Make sure no other server is running on port 8777

## Next Steps

- Read the full [README.md](./README.md) for advanced usage
- Add your own visual tests for new features
- Integrate with your CI/CD pipeline

---

**Need help?** Check the troubleshooting section in the full README or run `node scripts/visual-test.js validate` to diagnose issues.