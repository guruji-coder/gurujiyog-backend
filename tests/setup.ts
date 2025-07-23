/**
 * Jest Setup File
 * Configures global test environment
 */

// Extend Jest matchers
import 'jest';

// Set test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  createMockFastifyRequest: (overrides = {}) => ({
    headers: {},
    cookies: {},
    ...overrides
  }),
  
  createMockFastifyReply: () => ({
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    headers: jest.fn().mockReturnThis()
  })
};

// Declare global types
declare global {
  var testUtils: {
    sleep: (ms: number) => Promise<void>;
    createMockFastifyRequest: (overrides?: any) => any;
    createMockFastifyReply: () => any;
  };
}
