import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

/**
 * Global test setup and configuration
 */

// Global setup that runs once before all tests
beforeAll(() => {
  // Set up global test environment
  process.env.NODE_ENV = 'test';
  
  // Configure global timeouts
  vi.setConfig({ testTimeout: 10000 });
  
  // Mock global objects if needed
  Object.defineProperty(global, 'fetch', {
    value: vi.fn(),
    configurable: true
  });
});

// Global cleanup that runs once after all tests
afterAll(() => {
  // Clean up global mocks
  vi.restoreAllMocks();
  
  // Reset environment
  delete process.env.NODE_ENV;
});

// Setup that runs before each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset any global state
  if (global.gc) {
    global.gc();
  }
});

// Cleanup that runs after each test
afterEach(() => {
  // Clean up any test-specific state
  vi.clearAllTimers();
});

// Custom matchers
expect.extend({
  toBeValidZLOutput(received: any) {
    const pass = received !== null && received !== undefined && typeof received === 'string';
    return {
      message: () => `expected ${received} to be valid ZL output (non-null, defined string)`,
      pass,
    };
  },
  
  toCompleteWithinTime(received: number, expected: number) {
    const pass = received <= expected;
    return {
      message: () => `expected operation to complete within ${expected}ms, but took ${received}ms`,
      pass,
    };
  },
  
  toHaveMemoryUsageBelow(received: number, expected: number) {
    const pass = received < expected;
    return {
      message: () => `expected memory usage to be below ${expected} bytes, but was ${received} bytes`,
      pass,
    };
  }
});

// Global error handlers for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Extend global types for custom matchers
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeValidZLOutput(): T;
      toCompleteWithinTime(timeMs: number): T;
      toHaveMemoryUsageBelow(bytes: number): T;
    }
  }
}