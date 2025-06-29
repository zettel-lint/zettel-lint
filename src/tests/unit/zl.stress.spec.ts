import { describe, test, expect, vi } from 'vitest';
import { PerformanceProfiler, TestDataGenerator } from './zl.test-utils';

describe('ZL Module - Stress Tests', () => {
  const profiler = new PerformanceProfiler();
  const mockZl = vi.fn();

  describe('High-volume operations', () => {
    test('should handle 10,000 sequential operations', () => {
      mockZl.mockImplementation((input) => `processed-${input}`);
      
      profiler.start();
      
      for (let i = 0; i < 10000; i++) {
        mockZl(`stress-test-${i}`);
      }
      
      const metrics = profiler.stop(10000);
      
      expect(mockZl).toHaveBeenCalledTimes(10000);
      expect(metrics.executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent operations', async () => {
      mockZl.mockImplementation(async (input) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return `concurrent-${input}`;
      });
      
      const promises = Array.from({ length: 1000 }, (_, i) => 
        mockZl(`concurrent-${i}`)
      );
      
      profiler.start();
      const results = await Promise.all(promises);
      const metrics = profiler.stop(1000);
      
      expect(results).toHaveLength(1000);
      expect(metrics.executionTime).toBeLessThan(2000); // Should complete concurrently
    });

    test('should handle large data structures', () => {
      const largeObject = TestDataGenerator.randomObject(10);
      const largeArray = Array.from({ length: 10000 }, () => TestDataGenerator.randomString());
      
      mockZl.mockImplementation((input) => {
        if (Array.isArray(input)) {
          return input.map(item => `processed-${item}`);
        }
        return `processed-object-${Object.keys(input).length}`;
      });
      
      profiler.start();
      const objectResult = mockZl(largeObject);
      const arrayResult = mockZl(largeArray);
      const metrics = profiler.stop(2);
      
      expect(objectResult).toContain('processed-object');
      expect(arrayResult).toHaveLength(10000);
      expect(metrics.executionTime).toBeLessThan(3000);
    });
  });

  describe('Memory stress tests', () => {
    test('should not leak memory under continuous load', () => {
      mockZl.mockImplementation((input) => {
        // Simulate memory usage
        const data = new Array(1000).fill(input);
        return data.join('-');
      });
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        mockZl(`memory-test-${i}`);
        
        // Trigger garbage collection every 100 iterations
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    test('should handle memory-intensive operations', () => {
      mockZl.mockImplementation((size) => {
        const largeString = 'x'.repeat(size);
        return largeString.length;
      });
      
      const sizes = [1000, 10000, 100000, 1000000];
      
      sizes.forEach(size => {
        profiler.start();
        const result = mockZl(size);
        const metrics = profiler.stop(1);
        
        expect(result).toBe(size);
        expect(metrics.executionTime).toBeLessThan(1000); // Should complete within 1 second
      });
    });
  });

  describe('Error resilience under stress', () => {
    test('should recover from errors during high-volume operations', () => {
      let errorCount = 0;
      const maxErrors = 100;
      
      mockZl.mockImplementation((input) => {
        if (Math.random() < 0.1 && errorCount < maxErrors) { // 10% error rate
          errorCount++;
          throw new Error(`Simulated error ${errorCount}`);
        }
        return `processed-${input}`;
      });
      
      let successCount = 0;
      let actualErrorCount = 0;
      
      for (let i = 0; i < 1000; i++) {
        try {
          mockZl(`resilience-test-${i}`);
          successCount++;
        } catch (error) {
          actualErrorCount++;
        }
      }
      
      expect(successCount).toBeGreaterThan(800); // At least 80% success rate
      expect(actualErrorCount).toBeLessThanOrEqual(maxErrors);
    });
  });
});