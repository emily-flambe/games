/**
 * Jest E2E Test Setup
 * 
 * Global setup for end-to-end tests to ensure consistent test environment
 * and prevent architecture regression test failures.
 */

// Increase timeout for E2E tests
jest.setTimeout(30000);

// Ensure development server is running
beforeAll(async () => {
    console.log('🚀 Setting up E2E test environment...');
    
    // Check if dev server is running
    const checkServer = async () => {
        try {
            const response = await fetch('http://localhost:8777');
            return response.ok;
        } catch (error) {
            return false;
        }
    };
    
    const isServerRunning = await checkServer();
    if (!isServerRunning) {
        console.error('❌ Development server is not running on localhost:8777');
        console.error('Please start the server with: npm run dev');
        process.exit(1);
    }
    
    console.log('✅ Development server is running');
});

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception in E2E test:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection in E2E test at:', promise, 'reason:', reason);
});

// Test utilities available globally
global.waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.retryUntilSuccess = async (fn, maxAttempts = 5, delayMs = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxAttempts) {
                throw new Error(`Failed after ${maxAttempts} attempts: ${error.message}`);
            }
            await global.waitFor(delayMs);
        }
    }
};

// Custom matchers for E2E tests
expect.extend({
    toBeEmoji(received) {
        const pass = typeof received === 'string' && 
                    received.match(/[\u{1F300}-\u{1F9FF}]/u) !== null;
        
        return {
            pass,
            message: () => pass 
                ? `Expected ${received} not to be an emoji`
                : `Expected ${received} to be an emoji`
        };
    },
    
    toNotBeGenericCheckmark(received) {
        const pass = received !== '✓' && received !== '✔' && received !== '☑';
        
        return {
            pass,
            message: () => pass
                ? `Expected ${received} not to be a generic checkmark`
                : `Expected ${received} to not be a generic checkmark (✓, ✔, ☑)`
        };
    }
});