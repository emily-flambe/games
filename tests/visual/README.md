# Visual Regression Testing Framework

A comprehensive, maintainable visual regression testing framework for the Games Platform. This framework focuses on catching CSS/visual bugs that functional tests miss, particularly in game end screens and critical UI states.

## Overview

The visual regression testing framework provides:

- **Simple API** for capturing and comparing screenshots
- **Automatic baseline management** with environment-specific storage
- **Flexible thresholds** for different types of UI components
- **Integration with Jest** for seamless CI/CD integration
- **CLI tools** for easy management and debugging
- **Detailed reporting** with visual diffs when tests fail

## Quick Start

### Installation

Install the required dependencies:

```bash
npm install pixelmatch pngjs --save-dev
```

### Running Visual Tests

```bash
# Run all visual tests
npm run test:visual

# Run visual tests with CLI tool (recommended for debugging)
npm run test:visual:cli

# Update all baselines
npm run test:visual:update

# Or with CLI tool
npm run test:visual:update-cli
```

### First Time Setup

1. **Create baselines** for the first time:
   ```bash
   npm run test:visual:update
   ```

2. **Validate environment**:
   ```bash
   node scripts/visual-test.js validate
   ```

3. **Run tests** to ensure everything works:
   ```bash
   npm run test:visual:cli
   ```

## Framework Architecture

### Core Components

```
tests/visual/
├── framework/
│   ├── VisualTestFramework.js    # Main framework with browser automation
│   ├── BaselineManager.js        # Baseline screenshot management
│   ├── ImageComparator.js        # Image comparison and diff generation
│   └── VisualTestRunner.js       # Test execution and reporting
├── county-game.visual.js         # County Game specific tests
├── other-games.visual.js         # Other game modules tests
├── visual-regression.test.js     # Jest integration
├── baselines/                    # Baseline screenshots (by environment)
├── screenshots/                  # Current test screenshots
├── diffs/                        # Difference images when tests fail
└── reports/                      # Test reports
```

### Key Features

1. **Environment-Specific Baselines**: Baselines are stored by environment, browser, and viewport
2. **Flexible Thresholds**: Different comparison thresholds for different UI component types
3. **Anti-Aliasing Handling**: Smart handling of font and edge rendering differences
4. **Mobile/Responsive Testing**: Built-in support for different viewport sizes
5. **Error Recovery**: Graceful fallbacks when advanced comparison tools aren't available

## Writing Visual Tests

### Basic Test Structure

Visual tests are defined as arrays of test objects:

```javascript
const tests = [
    {
        name: 'test-unique-name',
        description: 'Human readable description',
        setup: async (page, framework) => {
            // Setup the page state
            await framework.navigateToGame(page, 'county-game');
            await framework.setupPlayer(page, 'TestPlayer');
            // ... more setup
        },
        capture: async (page, framework, options) => {
            // Capture and compare screenshot
            return await framework.captureAndCompare(page, 'test-unique-name', {
                delay: 1000,
                testType: 'end_screen',
                ...options
            });
        }
    }
];
```

### Test Types and Thresholds

The framework supports different test types with appropriate thresholds:

- **`end_screen`**: Game end screens (0.5% threshold) - tolerant of minor animation differences
- **`button`**: Button states (0.05% threshold) - very strict for UI consistency
- **`form`**: Form inputs (0.2% threshold) - moderate tolerance for focus states
- **`portal`**: Game portal layout (0.1% threshold) - balanced for layout consistency
- **`modal`**: Modal dialogs (0.3% threshold) - tolerant of shadow/backdrop variations
- **`loading`**: Loading screens (2.0% threshold) - very tolerant due to animations

### Helper Methods

The framework provides game-specific helpers:

```javascript
// Navigate to game portal
await framework.navigateToPortal(page);

// Navigate to specific game
await framework.navigateToGame(page, 'county-game');

// Setup player
await framework.setupPlayer(page, 'PlayerName');

// Start game
await framework.startGame(page);

// Wait for end screen
await framework.waitForEndScreen(page);
```

### Capture Options

```javascript
await framework.captureAndCompare(page, 'test-name', {
    delay: 1000,              // Wait time before capture (ms)
    fullPage: false,          // Capture full page vs viewport
    element: elementHandle,   // Capture specific element only
    testType: 'end_screen',   // Test type for threshold selection
    updateBaseline: false     // Force baseline update
});
```

## Examples

### County Game End Screen Test

```javascript
{
    name: 'county-game-win-screen',
    description: 'County Game win screen - critical end state',
    setup: async (page, framework) => {
        await framework.navigateToGame(page, 'county-game');
        await framework.setupPlayer(page, 'VisualTestPlayer');
        await framework.startGame(page);
        
        // Complete the game
        await page.waitForSelector('#county-input', { timeout: 10000 });
        await page.type('#county-input', 'Rock');
        await page.click('#submit-county-btn');
        
        // Wait for win screen
        await framework.waitForEndScreen(page);
    },
    capture: async (page, framework, options) => {
        return await framework.captureAndCompare(page, 'county-game-win-screen', {
            delay: 2500,
            testType: 'end_screen',
            ...options
        });
    }
}
```

### Mobile Responsive Test

```javascript
{
    name: 'county-game-responsive-mobile',
    description: 'County Game win screen on mobile viewport',
    setup: async (page, framework) => {
        // Change to mobile viewport
        await page.setViewport({ width: 375, height: 667 });
        
        // ... setup game state
    },
    capture: async (page, framework, options) => {
        return await framework.captureAndCompare(page, 'county-game-responsive-mobile', {
            delay: 2000,
            fullPage: true,
            testType: 'end_screen',
            ...options
        });
    }
}
```

### Element-Specific Test

```javascript
{
    name: 'ok-button-state',
    description: 'OK button in win screen',
    setup: async (page, framework) => {
        // ... setup game to end screen
    },
    capture: async (page, framework, options) => {
        const okButton = await page.$('#ok-btn');
        
        return await framework.captureAndCompare(page, 'ok-button-state', {
            element: okButton,
            testType: 'button',
            ...options
        });
    }
}
```

## CLI Usage

The visual test CLI provides convenient commands for managing tests:

### Basic Commands

```bash
# Run all visual tests
node scripts/visual-test.js run

# Run with visible browser (for debugging)
node scripts/visual-test.js run --no-headless

# Update all baselines
node scripts/visual-test.js update

# Clean up test artifacts
node scripts/visual-test.js clean

# Validate test environment
node scripts/visual-test.js validate

# Show latest test report
node scripts/visual-test.js report

# Show help
node scripts/visual-test.js help
```

### Advanced Options

```bash
# Run with custom threshold
node scripts/visual-test.js run --threshold 0.2

# Update baselines with visible browser
node scripts/visual-test.js update --no-headless

# Clean up but keep diff images
node scripts/visual-test.js clean --keep-diffs

# Set custom environment
node scripts/visual-test.js run --environment production
```

## CI/CD Integration

### Jest Integration

The framework integrates with Jest through `visual-regression.test.js`:

```bash
# Run visual tests with Jest
npm run test:visual

# Update baselines through Jest
UPDATE_BASELINES=true npm run test:visual
```

### Environment Variables

- **`UPDATE_BASELINES=true`**: Forces baseline updates
- **`CI=true`**: Runs tests in headless mode automatically
- **`NODE_ENV`**: Sets the test environment for baseline storage

### GitHub Actions Example

```yaml
- name: Run Visual Regression Tests
  run: |
    npm run test:visual
  env:
    CI: true
    NODE_ENV: ci

- name: Upload Visual Diffs on Failure
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: visual-test-diffs
    path: tests/visual/diffs/
```

## Troubleshooting

### Common Issues

1. **"Pixelmatch not available"**: Install dependencies with `npm install pixelmatch pngjs`
2. **Tests failing after UI changes**: Update baselines with `npm run test:visual:update`
3. **Inconsistent results**: Check for animations or timing issues, increase delay
4. **Large diff percentages**: Verify the correct element is being captured

### Debugging Tips

1. **Run with visible browser**:
   ```bash
   node scripts/visual-test.js run --no-headless
   ```

2. **Check diff images**: Look in `tests/visual/diffs/` for visual differences

3. **Validate environment**:
   ```bash
   node scripts/visual-test.js validate
   ```

4. **Check latest report**:
   ```bash
   node scripts/visual-test.js report
   ```

### Environment-Specific Issues

Different environments may produce slightly different screenshots due to:
- Font rendering differences
- Browser versions
- Screen resolution/DPI
- Graphics drivers

The framework handles this by storing baselines per environment.

## Best Practices

### Test Design

1. **Focus on Critical Paths**: Test end screens, key user flows, and error states
2. **Use Appropriate Thresholds**: Match test type to expected variance
3. **Wait for Stability**: Use adequate delays for animations and async content
4. **Test Responsive Layouts**: Include mobile and tablet viewports

### Maintenance

1. **Regular Baseline Updates**: Update baselines when UI intentionally changes
2. **Clean Up Artifacts**: Regularly clean test artifacts except baselines
3. **Monitor Pass Rates**: Track visual test health over time
4. **Document Changes**: Note when and why baselines are updated

### Performance

1. **Batch Similar Tests**: Group tests by game or UI section
2. **Use Element Capture**: Capture specific elements instead of full pages when possible
3. **Optimize Test Setup**: Reuse page states when possible
4. **Limit Full-Page Tests**: Use judiciously due to size and processing time

## Extending the Framework

### Adding New Games

1. Create a new test file: `new-game.visual.js`
2. Follow the existing test structure
3. Add game-specific setup helpers if needed
4. Include in the main test suite

### Custom Comparison Logic

Extend `ImageComparator.js` for specialized comparison needs:

```javascript
// Add custom test type
getDynamicThresholds(testType, context) {
    const thresholds = {
        'custom_type': {
            threshold: 0.15,
            pixelThreshold: 0.08
        },
        // ... existing types
    };
    return thresholds[testType] || thresholds.default;
}
```

### Framework Enhancements

The framework is designed to be extensible. Common enhancement areas:
- Additional image formats (currently PNG only)
- Video comparison for animations
- Performance metrics integration
- Advanced masking for dynamic content

## Support

For issues, questions, or contributions:
1. Check the troubleshooting section above
2. Validate your environment with `node scripts/visual-test.js validate`
3. Review existing test examples
4. Check test reports for detailed failure information