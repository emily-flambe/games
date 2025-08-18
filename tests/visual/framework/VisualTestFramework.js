/**
 * Visual Regression Testing Framework
 * 
 * A simple, maintainable framework for visual regression testing of game UI states.
 * Focuses on game end screens and critical UI components that functional tests miss.
 * 
 * Key Features:
 * - Simple API for capturing and comparing screenshots
 * - Built-in threshold management for flexible comparisons
 * - Automatic baseline management
 * - Clear error reporting with visual diffs
 * - Integration with existing Jest test suite
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class VisualTestFramework {
    constructor(options = {}) {
        this.options = {
            // Browser options
            headless: options.headless !== false, // Default to headless
            viewport: options.viewport || { width: 1280, height: 720 },
            
            // Screenshot options
            screenshotDir: options.screenshotDir || path.join(__dirname, '../screenshots'),
            baselineDir: options.baselineDir || path.join(__dirname, '../baselines'),
            diffDir: options.diffDir || path.join(__dirname, '../diffs'),
            
            // Comparison options
            threshold: options.threshold || 0.1, // 0.1% difference threshold
            pixelThreshold: options.pixelThreshold || 0.1, // Per-pixel threshold
            
            // Test server options
            serverUrl: options.serverUrl || 'http://localhost:8777',
            serverStartupDelay: options.serverStartupDelay || 5000,
            
            // Cleanup options
            keepDiffs: options.keepDiffs !== false,
            keepFailedScreenshots: options.keepFailedScreenshots !== false,
            
            ...options
        };
        
        this.browser = null;
        this.devServer = null;
    }

    /**
     * Initialize the framework - start browser and dev server
     */
    async initialize() {
        // Ensure directories exist
        await this.ensureDirectories();
        
        // Start development server if not already running
        await this.startDevServer();
        
        // Launch browser
        this.browser = await puppeteer.launch({
            headless: this.options.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        console.log('Visual test framework initialized');
    }

    /**
     * Cleanup - close browser and server
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        
        if (this.devServer) {
            this.devServer.kill();
            this.devServer = null;
        }
        
        console.log('Visual test framework cleaned up');
    }

    /**
     * Create a new page with standard setup
     */
    async createPage() {
        if (!this.browser) {
            throw new Error('Framework not initialized. Call initialize() first.');
        }
        
        const page = await this.browser.newPage();
        
        // Set viewport
        await page.setViewport(this.options.viewport);
        
        // Set user agent for consistent rendering
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Disable animations for consistent screenshots
        await page.evaluateOnNewDocument(() => {
            const style = document.createElement('style');
            style.innerHTML = `
                *, *::before, *::after {
                    animation-duration: 0s !important;
                    animation-delay: 0s !important;
                    transition-duration: 0s !important;
                    transition-delay: 0s !important;
                }
            `;
            document.head.appendChild(style);
        });
        
        return page;
    }

    /**
     * Navigate to the game portal
     */
    async navigateToPortal(page) {
        await page.goto(this.options.serverUrl, {
            waitUntil: 'networkidle2',
            timeout: 10000
        });
        
        // Wait for scripts to load
        await page.waitForTimeout(2000);
    }

    /**
     * Capture a screenshot and compare with baseline
     */
    async captureAndCompare(page, testName, options = {}) {
        const testOptions = {
            fullPage: false,
            element: null,
            delay: 1000, // Default delay for UI to settle
            updateBaseline: false,
            ...options
        };

        // Wait for UI to settle
        await page.waitForTimeout(testOptions.delay);

        // Remove any potentially flaky elements
        await page.evaluate(() => {
            // Remove timestamps, random IDs, etc.
            const timeElements = document.querySelectorAll('[data-timestamp], .timestamp, .random-id');
            timeElements.forEach(el => el.remove());
            
            // Hide cursor if visible
            document.body.style.cursor = 'none';
        });

        const screenshotPath = path.join(this.options.screenshotDir, `${testName}.png`);
        const baselinePath = path.join(this.options.baselineDir, `${testName}.png`);
        
        // Capture screenshot
        const screenshotOptions = {
            path: screenshotPath,
            fullPage: testOptions.fullPage
        };
        
        if (testOptions.element) {
            await testOptions.element.screenshot(screenshotOptions);
        } else {
            await page.screenshot(screenshotOptions);
        }

        // Check if baseline exists
        const baselineExists = await this.fileExists(baselinePath);
        
        if (!baselineExists || testOptions.updateBaseline) {
            // Create or update baseline
            await fs.copyFile(screenshotPath, baselinePath);
            console.log(`📸 Baseline created/updated for ${testName}`);
            return {
                status: 'baseline_created',
                testName,
                baselinePath,
                screenshotPath
            };
        }

        // Compare with baseline
        const comparison = await this.compareImages(baselinePath, screenshotPath, testName);
        
        if (comparison.passed) {
            // Clean up current screenshot if test passed
            if (!this.options.keepFailedScreenshots) {
                await fs.unlink(screenshotPath).catch(() => {});
            }
            console.log(`✅ Visual test passed: ${testName}`);
        } else {
            console.log(`❌ Visual test failed: ${testName} (${comparison.differencePercentage.toFixed(3)}% difference)`);
        }

        return comparison;
    }

    /**
     * Compare two images and return detailed results
     */
    async compareImages(baselinePath, screenshotPath, testName) {
        try {
            // Use simple file comparison first (exact match)
            const baselineStats = await fs.stat(baselinePath);
            const screenshotStats = await fs.stat(screenshotPath);
            
            if (baselineStats.size === screenshotStats.size) {
                const baselineContent = await fs.readFile(baselinePath);
                const screenshotContent = await fs.readFile(screenshotPath);
                
                if (baselineContent.equals(screenshotContent)) {
                    return {
                        passed: true,
                        testName,
                        differencePercentage: 0,
                        message: 'Images are identical'
                    };
                }
            }
            
            // Use pixelmatch for detailed comparison if available
            if (await this.isPixelMatchAvailable()) {
                const pixelmatchResult = await this.pixelMatchCompare(baselinePath, screenshotPath, testName);
                return pixelmatchResult;
            }
            
            // Fallback to simple file comparison
            console.log(`⚠️  Pixelmatch not available for ${testName}, using simple file comparison`);
            return {
                passed: false,
                testName,
                differencePercentage: 100, // Unknown difference
                message: 'Images differ (detailed comparison unavailable)'
            };
            
        } catch (error) {
            console.error(`Error comparing images for ${testName}:`, error);
            return {
                passed: false,
                testName,
                error: error.message,
                differencePercentage: 100
            };
        }
    }

    /**
     * Use pixelmatch for detailed image comparison
     */
    async pixelMatchCompare(baselinePath, screenshotPath, testName) {
        try {
            const PNG = require('pngjs').PNG;
            const pixelmatch = require('pixelmatch');
            
            const baseline = PNG.sync.read(await fs.readFile(baselinePath));
            const screenshot = PNG.sync.read(await fs.readFile(screenshotPath));
            
            const { width, height } = baseline;
            const diff = new PNG({ width, height });
            
            const numDiffPixels = pixelmatch(
                baseline.data,
                screenshot.data,
                diff.data,
                width,
                height,
                {
                    threshold: this.options.pixelThreshold,
                    alpha: 0.1,
                    antialiasing: true
                }
            );
            
            const totalPixels = width * height;
            const differencePercentage = (numDiffPixels / totalPixels) * 100;
            const passed = differencePercentage <= this.options.threshold;
            
            if (!passed) {
                // Save diff image
                const diffPath = path.join(this.options.diffDir, `${testName}_diff.png`);
                await fs.writeFile(diffPath, PNG.sync.write(diff));
                console.log(`💾 Diff image saved: ${diffPath}`);
            }
            
            return {
                passed,
                testName,
                differencePercentage,
                numDiffPixels,
                totalPixels,
                diffPath: !passed ? path.join(this.options.diffDir, `${testName}_diff.png`) : null,
                message: passed 
                    ? `Images match within threshold (${differencePercentage.toFixed(3)}% < ${this.options.threshold}%)`
                    : `Images differ significantly (${differencePercentage.toFixed(3)}% > ${this.options.threshold}%)`
            };
            
        } catch (error) {
            console.error(`Pixelmatch comparison failed for ${testName}:`, error);
            throw error;
        }
    }

    /**
     * Game-specific helper: Navigate to a specific game
     */
    async navigateToGame(page, gameId) {
        await this.navigateToPortal(page);
        await page.waitForSelector(`[data-game="${gameId}"]`, { timeout: 5000 });
        await page.click(`[data-game="${gameId}"]`);
        await page.waitForTimeout(2000);
    }

    /**
     * Game-specific helper: Setup a player and join room
     */
    async setupPlayer(page, playerName = 'VisualTestPlayer') {
        await page.waitForSelector('#player-name-input', { timeout: 5000 });
        await page.clear('#player-name-input');
        await page.type('#player-name-input', playerName);
        await page.click('#join-room-btn');
        await page.waitForTimeout(3000);
    }

    /**
     * Game-specific helper: Start the game
     */
    async startGame(page) {
        await page.waitForSelector('#start-game-btn', { timeout: 5000 });
        await page.click('#start-game-btn');
        await page.waitForTimeout(2000);
    }

    /**
     * Game-specific helper: Wait for game end screen
     */
    async waitForEndScreen(page, timeout = 30000) {
        await page.waitForSelector('#end-game-screen', { 
            visible: true, 
            timeout 
        });
        await page.waitForTimeout(2000); // Let animations settle
    }

    /**
     * Utility: Ensure required directories exist
     */
    async ensureDirectories() {
        const dirs = [
            this.options.screenshotDir,
            this.options.baselineDir,
            this.options.diffDir
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Utility: Start development server
     */
    async startDevServer() {
        return new Promise((resolve) => {
            // Check if server is already running
            this.checkServerRunning()
                .then(isRunning => {
                    if (isRunning) {
                        console.log('Development server already running');
                        resolve();
                        return;
                    }
                    
                    // Start new server
                    this.devServer = exec('npm run dev', { 
                        cwd: path.join(__dirname, '../../..') 
                    });
                    
                    this.devServer.stdout.on('data', (data) => {
                        if (data.includes('Ready on')) {
                            console.log('Development server started');
                            resolve();
                        }
                    });
                    
                    // Fallback timeout
                    setTimeout(resolve, this.options.serverStartupDelay);
                })
                .catch(() => {
                    // If check fails, try starting server anyway
                    setTimeout(resolve, this.options.serverStartupDelay);
                });
        });
    }

    /**
     * Utility: Check if server is running
     */
    async checkServerRunning() {
        try {
            const response = await fetch(this.options.serverUrl);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Utility: Check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Utility: Check if pixelmatch is available
     */
    async isPixelMatchAvailable() {
        try {
            require('pixelmatch');
            require('pngjs');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Clean up test artifacts
     */
    async cleanupTestArtifacts(keepBaselines = true) {
        const cleanupDirs = [this.options.screenshotDir];
        
        if (!this.options.keepDiffs) {
            cleanupDirs.push(this.options.diffDir);
        }
        
        if (!keepBaselines) {
            cleanupDirs.push(this.options.baselineDir);
        }
        
        for (const dir of cleanupDirs) {
            try {
                const files = await fs.readdir(dir);
                for (const file of files) {
                    if (file.endsWith('.png')) {
                        await fs.unlink(path.join(dir, file));
                    }
                }
                console.log(`🧹 Cleaned up ${dir}`);
            } catch (error) {
                // Directory might not exist or be empty
            }
        }
    }
}

module.exports = VisualTestFramework;