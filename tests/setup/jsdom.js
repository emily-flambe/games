/**
 * JSDOM test environment setup
 * Fixes common issues with JSDOM testing environment
 */

// Fix TextEncoder/TextDecoder for JSDOM environment
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock fetch for testing (if needed)
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Silence console.log in tests unless explicitly testing it
  console.log = jest.fn();
  // Keep console.error visible for debugging
  console.error = originalConsoleError;
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Clean up between tests
afterEach(() => {
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
});