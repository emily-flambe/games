module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Override test environment for specific test patterns
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '**/tests/unit/utilities/**/*.test.js',
        '**/tests/unit/durable-objects/**/*.test.js'
      ]
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '**/tests/unit/game-logic/**/*.test.js',
        '**/tests/unit/client/**/*.test.js',
        '**/tests/unit/county-game-input.test.js'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jsdom.js']
    },
    {
      displayName: 'browser',
      testEnvironment: 'node',
      testMatch: ['**/tests/browser/**/*.test.js']
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      testMatch: ['**/tests/e2e/**/*.test.js']
    }
  ],
  
  // Test file patterns
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/browser/**/*.test.js',
    '**/tests/integration/**/*.test.js',
    '**/tests/e2e/**/*.test.js',
    '**/tests/visual/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds (disabled for initial setup)
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 70,
  //     lines: 70,
  //     statements: 70
  //   }
  // },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  
  // Module paths
  moduleDirectories: ['node_modules', 'src'],
  
  // Timeout for tests
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};