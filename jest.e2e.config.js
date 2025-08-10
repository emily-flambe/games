/**
 * Jest configuration for E2E tests
 * 
 * Separate configuration for end-to-end tests using Puppeteer
 * to prevent architecture regressions like the player emoji display issue.
 */

module.exports = {
    // E2E tests are in tests/e2e/
    testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
    
    // E2E tests take longer due to browser automation
    testTimeout: 30000,
    
    // Don't transform node_modules for E2E tests
    transformIgnorePatterns: [
        'node_modules/(?!(puppeteer)/)'
    ],
    
    // Setup file for E2E test environment
    setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.js'],
    
    // Test environment
    testEnvironment: 'node',
    
    // Verbose output for debugging
    verbose: true,
    
    // Coverage collection (optional for E2E)
    collectCoverage: false,
    
    // Test result processors
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: 'test-results/e2e',
            outputName: 'junit.xml',
            classNameTemplate: '{classname}',
            titleTemplate: '{title}',
            ancestorSeparator: ' › ',
            usePathForSuiteName: true
        }]
    ],
    
    // Global setup/teardown
    globalSetup: '<rootDir>/tests/e2e/global-setup.js',
    globalTeardown: '<rootDir>/tests/e2e/global-teardown.js',
    
    // Fail fast in CI environments
    bail: process.env.CI ? 1 : 0,
    
    // Run tests in serial to avoid port conflicts
    maxWorkers: 1,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Display individual test results
    displayName: 'E2E Tests',
    
    // Test name pattern for filtering
    testNamePattern: process.env.TEST_NAME_PATTERN || '.*'
};