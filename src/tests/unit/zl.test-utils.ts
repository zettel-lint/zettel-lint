import { vi } from 'vitest';

/**
 * Test utilities for ZL module testing
 */

export interface TestCase<T = any, R = any> {
  input: T;
  expected?: R;
  shouldThrow?: boolean;
  description: string;
  options?: Record<string, any>;
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  callCount: number;
}

export class TestDataGenerator {
  static randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  static randomNumber(min: number = 0, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomObject(depth: number = 3): Record<string, any> {
    if (depth === 0) {
      return { value: this.randomString() };
    }
    
    return {
      string: this.randomString(),
      number: this.randomNumber(),
      boolean: Math.random() > 0.5,
      nested: this.randomObject(depth - 1),
      array: Array.from({ length: 3 }, () => this.randomString(5))
    };
  }

  static createTestCases<T, R>(scenarios: Omit<TestCase<T, R>, 'id'>[]): TestCase<T, R>[] {
    return scenarios.map((scenario, index) => ({
      ...scenario,
      id: `test-case-${index}-${Date.now()}`
    }));
  }
}

export class PerformanceProfiler {
  private startTime: number = 0;
  private startMemory: number = 0;
  private metrics: PerformanceMetrics[] = [];

  start(): void {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  stop(callCount: number = 1): PerformanceMetrics {
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    const metrics: PerformanceMetrics = {
      executionTime: endTime - this.startTime,
      memoryUsage: endMemory - this.startMemory,
      callCount
    };
    
    this.metrics.push(metrics);
    return metrics;
  }

  getAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return { executionTime: 0, memoryUsage: 0, callCount: 0 };
    }
    
    return {
      executionTime: this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / this.metrics.length,
      memoryUsage: this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length,
      callCount: this.metrics.reduce((sum, m) => sum + m.callCount, 0) / this.metrics.length
    };
  }

  reset(): void {
    this.metrics = [];
  }
}

export class MockBuilder {
  private mockFn = vi.fn();
  
  returns(value: any): this {
    this.mockFn.mockReturnValue(value);
    return this;
  }
  
  throws(error: Error | string): this {
    this.mockFn.mockImplementation(() => {
      throw typeof error === 'string' ? new Error(error) : error;
    });
    return this;
  }
  
  resolves(value: any): this {
    this.mockFn.mockResolvedValue(value);
    return this;
  }
  
  rejects(error: Error | string): this {
    this.mockFn.mockRejectedValue(typeof error === 'string' ? new Error(error) : error);
    return this;
  }
  
  implementation(fn: (...args: any[]) => any): this {
    this.mockFn.mockImplementation(fn);
    return this;
  }
  
  build(): any {
    return this.mockFn;
  }
}

export const createMock = () => new MockBuilder();

export const assertValidOutput = (output: any, expectedType?: string): void => {
  expect(output).toBeDefined();
  expect(output).not.toBeNull();
  
  if (expectedType) {
    expect(typeof output).toBe(expectedType);
  }
};

export const assertPerformance = (metrics: PerformanceMetrics, thresholds: Partial<PerformanceMetrics>): void => {
  if (thresholds.executionTime) {
    expect(metrics.executionTime).toBeLessThan(thresholds.executionTime);
  }
  
  if (thresholds.memoryUsage) {
    expect(metrics.memoryUsage).toBeLessThan(thresholds.memoryUsage);
  }
};

export const runWithTimeout = async <T>(
  fn: () => Promise<T> | T,
  timeoutMs: number = 5000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    Promise.resolve(fn())
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
};

export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};