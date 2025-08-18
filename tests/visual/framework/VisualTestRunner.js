/**
 * Visual Test Runner
 * 
 * Main orchestrator for visual regression tests. Provides simple APIs for
 * running tests, managing baselines, and generating reports.
 */

const VisualTestFramework = require('./VisualTestFramework');
const BaselineManager = require('./BaselineManager');
const ImageComparator = require('./ImageComparator');
const path = require('path');
const fs = require('fs').promises;

class VisualTestRunner {
    constructor(options = {}) {
        this.options = {
            // Framework options
            headless: options.headless !== false,
            viewport: options.viewport || { width: 1280, height: 720 },
            
            // Directory structure
            testDir: options.testDir || path.join(__dirname, '..'),
            screenshotDir: options.screenshotDir || path.join(__dirname, '../screenshots'),
            baselineDir: options.baselineDir || path.join(__dirname, '../baselines'),
            diffDir: options.diffDir || path.join(__dirname, '../diffs'),
            reportDir: options.reportDir || path.join(__dirname, '../reports'),
            
            // Test execution
            threshold: options.threshold || 0.1,
            updateBaselines: options.updateBaselines || false,
            failFast: options.failFast || false,
            
            // Environment
            environment: options.environment || 'test',
            browser: options.browser || 'chrome',
            
            ...options
        };
        
        // Initialize components
        this.framework = new VisualTestFramework({
            headless: this.options.headless,
            viewport: this.options.viewport,
            screenshotDir: this.options.screenshotDir,
            baselineDir: this.options.baselineDir,
            diffDir: this.options.diffDir,
            threshold: this.options.threshold
        });
        
        this.baselineManager = new BaselineManager(this.options.baselineDir, {
            environment: this.options.environment,
            browser: this.options.browser,
            viewport: `${this.options.viewport.width}x${this.options.viewport.height}`
        });
        
        this.comparator = new ImageComparator({
            threshold: this.options.threshold
        });
        
        this.testResults = [];
        this.startTime = null;
    }

    /**
     * Initialize the test runner
     */
    async initialize() {
        console.log('🚀 Initializing Visual Test Runner...');
        await this.framework.initialize();
        await this.ensureDirectories();
        
        this.startTime = Date.now();
        console.log('✅ Visual Test Runner ready');
    }

    /**
     * Cleanup test runner
     */
    async cleanup() {
        await this.framework.cleanup();
        console.log('🧹 Visual Test Runner cleaned up');
    }

    /**
     * Run a single visual test
     */
    async runTest(testDefinition) {
        const { name, description, setup, capture, options = {} } = testDefinition;
        
        console.log(`🧪 Running visual test: ${name}`);
        
        const page = await this.framework.createPage();
        
        try {
            // Execute test setup
            await setup(page, this.framework);
            
            // Capture and compare
            const result = await capture(page, this.framework, {
                ...options,
                updateBaseline: this.options.updateBaselines
            });
            
            // Store result
            const testResult = {
                name,
                description,
                timestamp: new Date().toISOString(),
                ...result
            };
            
            this.testResults.push(testResult);
            
            if (result.passed) {
                console.log(`✅ ${name}: PASSED`);
            } else {
                console.log(`❌ ${name}: FAILED (${result.differencePercentage?.toFixed(3)}% difference)`);
                
                if (this.options.failFast) {
                    throw new Error(`Visual test failed: ${name}`);
                }
            }
            
            return testResult;
            
        } finally {
            await page.close();
        }
    }

    /**
     * Run multiple visual tests
     */
    async runTests(testDefinitions) {
        console.log(`🧪 Running ${testDefinitions.length} visual tests...`);
        
        for (const testDef of testDefinitions) {
            try {
                await this.runTest(testDef);
            } catch (error) {
                console.error(`❌ Test ${testDef.name} failed:`, error.message);
                
                if (this.options.failFast) {
                    throw error;
                }
                
                // Record failed test
                this.testResults.push({
                    name: testDef.name,
                    description: testDef.description,
                    timestamp: new Date().toISOString(),
                    passed: false,
                    error: error.message
                });
            }
        }
        
        return this.generateReport();
    }

    /**
     * Run tests from a test suite file
     */
    async runTestSuite(suitePath) {
        const suite = require(path.resolve(suitePath));
        
        if (typeof suite.setup === 'function') {
            await suite.setup(this);
        }
        
        const report = await this.runTests(suite.tests);
        
        if (typeof suite.teardown === 'function') {
            await suite.teardown(this);
        }
        
        return report;
    }

    /**
     * Generate comprehensive test report
     */
    async generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = this.testResults.length - passed;
        
        const report = {
            summary: {
                total: this.testResults.length,
                passed,
                failed,
                passRate: this.testResults.length > 0 ? (passed / this.testResults.length * 100).toFixed(1) : 0,
                duration: `${(duration / 1000).toFixed(2)}s`
            },
            environment: {
                browser: this.options.browser,
                viewport: this.options.viewport,
                environment: this.options.environment,
                threshold: this.options.threshold
            },
            results: this.testResults,
            failed_tests: this.testResults.filter(r => !r.passed),
            baseline_info: await this.baselineManager.generateReport()
        };
        
        // Save report
        await this.saveReport(report);
        
        // Print summary
        this.printSummary(report);
        
        return report;
    }

    /**
     * Print test summary to console
     */
    printSummary(report) {
        console.log('\n📊 Visual Test Results Summary');
        console.log('═══════════════════════════════');
        console.log(`Total Tests: ${report.summary.total}`);
        console.log(`Passed: ${report.summary.passed} ✅`);
        console.log(`Failed: ${report.summary.failed} ❌`);
        console.log(`Pass Rate: ${report.summary.passRate}%`);
        console.log(`Duration: ${report.summary.duration}`);
        console.log(`Environment: ${report.environment.environment} (${report.environment.browser})`);
        console.log(`Viewport: ${report.environment.viewport.width}x${report.environment.viewport.height}`);
        console.log(`Threshold: ${report.environment.threshold}%`);
        
        if (report.failed_tests.length > 0) {
            console.log('\n❌ Failed Tests:');
            for (const test of report.failed_tests) {
                console.log(`  • ${test.name}: ${test.error || `${test.differencePercentage?.toFixed(3)}% difference`}`);
            }
        }
        
        console.log('═══════════════════════════════\n');
    }

    /**
     * Save report to file
     */
    async saveReport(report) {
        await fs.mkdir(this.options.reportDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(
            this.options.reportDir,
            `visual-test-report-${timestamp}.json`
        );
        
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Report saved: ${reportPath}`);
        
        // Also save as latest
        const latestPath = path.join(this.options.reportDir, 'latest.json');
        await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
    }

    /**
     * Update all baselines for current environment
     */
    async updateAllBaselines() {
        console.log('🔄 Updating all baselines...');
        
        const originalUpdateBaselines = this.options.updateBaselines;
        this.options.updateBaselines = true;
        
        try {
            // Re-run all tests to update baselines
            const testFiles = await this.findTestFiles();
            
            for (const testFile of testFiles) {
                console.log(`Updating baselines from: ${testFile}`);
                await this.runTestSuite(testFile);
            }
            
            console.log('✅ All baselines updated');
        } finally {
            this.options.updateBaselines = originalUpdateBaselines;
        }
    }

    /**
     * Clean up test artifacts
     */
    async cleanupArtifacts(options = {}) {
        const cleanup = {
            screenshots: true,
            diffs: true,
            reports: false,
            baselines: false,
            ...options
        };
        
        if (cleanup.screenshots) {
            await this.cleanDirectory(this.options.screenshotDir);
        }
        
        if (cleanup.diffs) {
            await this.cleanDirectory(this.options.diffDir);
        }
        
        if (cleanup.reports) {
            await this.cleanDirectory(this.options.reportDir);
        }
        
        if (cleanup.baselines) {
            await this.baselineManager.deleteAllBaselines();
        }
        
        console.log('🧹 Test artifacts cleaned up');
    }

    /**
     * Validate current test environment
     */
    async validateEnvironment() {
        console.log('🔍 Validating test environment...');
        
        const validation = {
            framework: true,
            baselines: true,
            dependencies: true,
            errors: []
        };
        
        try {
            // Check framework capabilities
            const capabilities = await this.comparator.getCapabilities();
            if (!capabilities.pixelmatch) {
                validation.dependencies = false;
                validation.errors.push('Pixelmatch not available - install with: npm install pixelmatch pngjs');
            }
            
            // Validate baselines
            const baselineValidation = await this.baselineManager.validateBaselines();
            if (baselineValidation.invalid.length > 0 || baselineValidation.missing.length > 0) {
                validation.baselines = false;
                validation.errors.push(`Baseline issues: ${baselineValidation.invalid.length} invalid, ${baselineValidation.missing.length} missing`);
            }
            
        } catch (error) {
            validation.framework = false;
            validation.errors.push(`Framework error: ${error.message}`);
        }
        
        if (validation.errors.length === 0) {
            console.log('✅ Environment validation passed');
        } else {
            console.log('❌ Environment validation failed:');
            validation.errors.forEach(error => console.log(`  • ${error}`));
        }
        
        return validation;
    }

    /**
     * Find all test files in the test directory
     */
    async findTestFiles() {
        const testFiles = [];
        
        try {
            const files = await fs.readdir(this.options.testDir);
            
            for (const file of files) {
                if (file.endsWith('.visual.js') || file.endsWith('.visual-test.js')) {
                    testFiles.push(path.join(this.options.testDir, file));
                }
            }
        } catch (error) {
            console.warn(`Could not scan test directory: ${error.message}`);
        }
        
        return testFiles;
    }

    /**
     * Ensure required directories exist
     */
    async ensureDirectories() {
        const dirs = [
            this.options.screenshotDir,
            this.options.baselineDir,
            this.options.diffDir,
            this.options.reportDir
        ];
        
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    /**
     * Clean a directory of PNG files
     */
    async cleanDirectory(dir) {
        try {
            const files = await fs.readdir(dir);
            const pngFiles = files.filter(file => file.endsWith('.png') || file.endsWith('.json'));
            
            for (const file of pngFiles) {
                await fs.unlink(path.join(dir, file));
            }
            
            console.log(`🧹 Cleaned ${pngFiles.length} files from ${dir}`);
        } catch (error) {
            // Directory might not exist
        }
    }

    /**
     * Get test statistics
     */
    getStatistics() {
        return {
            testsRun: this.testResults.length,
            passed: this.testResults.filter(r => r.passed).length,
            failed: this.testResults.filter(r => !r.passed).length,
            duration: this.startTime ? Date.now() - this.startTime : 0
        };
    }
}

module.exports = VisualTestRunner;