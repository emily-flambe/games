/**
 * Jest Integration for Visual Regression Tests
 * 
 * Integrates the visual regression testing framework with the existing Jest test suite.
 * Allows running visual tests as part of the normal test pipeline.
 */

const VisualTestRunner = require('./framework/VisualTestRunner');
const path = require('path');

describe('Visual Regression Tests', () => {
    let visualRunner;
    
    beforeAll(async () => {
        // Initialize visual test runner
        visualRunner = new VisualTestRunner({
            headless: process.env.CI === 'true', // Headless in CI, visible locally
            threshold: 0.1, // 0.1% difference threshold
            updateBaselines: process.env.UPDATE_BASELINES === 'true',
            failFast: false, // Don't stop on first failure
            environment: process.env.NODE_ENV || 'test'
        });
        
        await visualRunner.initialize();
    }, 30000); // 30 second timeout for setup
    
    afterAll(async () => {
        if (visualRunner) {
            await visualRunner.cleanup();
        }
    }, 10000);

    describe('County Game Visual Tests', () => {
        test('should pass all County Game visual regression tests', async () => {
            const suitePath = path.join(__dirname, 'county-game.visual.js');
            const report = await visualRunner.runTestSuite(suitePath);
            
            // Assert that all visual tests passed
            expect(report.summary.failed).toBe(0);
            expect(report.summary.total).toBeGreaterThan(0);
            
            // Log results for debugging
            if (report.summary.failed > 0) {
                console.log('Failed visual tests:', report.failed_tests);
            }
        }, 120000); // 2 minute timeout for all County Game tests
    });

    describe('Other Games Visual Tests', () => {
        test('should pass all other games visual regression tests', async () => {
            const suitePath = path.join(__dirname, 'other-games.visual.js');
            const report = await visualRunner.runTestSuite(suitePath);
            
            // Assert that all visual tests passed
            expect(report.summary.failed).toBe(0);
            expect(report.summary.total).toBeGreaterThan(0);
            
            // Log results for debugging
            if (report.summary.failed > 0) {
                console.log('Failed visual tests:', report.failed_tests);
            }
        }, 180000); // 3 minute timeout for all other games tests
    });

    describe('Visual Test Environment', () => {
        test('should have valid test environment', async () => {
            const validation = await visualRunner.validateEnvironment();
            
            expect(validation.framework).toBe(true);
            expect(validation.baselines).toBe(true);
            
            if (validation.errors.length > 0) {
                console.warn('Environment validation warnings:', validation.errors);
            }
        });

        test('should be able to capture baseline screenshots', async () => {
            // This test helps ensure the framework can capture screenshots
            const page = await visualRunner.framework.createPage();
            
            try {
                await visualRunner.framework.navigateToPortal(page);
                
                const result = await visualRunner.framework.captureAndCompare(
                    page, 
                    'test-baseline-capture',
                    { updateBaseline: true }
                );
                
                expect(result.status).toMatch(/baseline_created|passed/);
            } finally {
                await page.close();
            }
        }, 30000);
    });
});