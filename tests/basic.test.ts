import { MemoryCache } from '../src/cache/memoryCache';

/**
 * Simple working test to verify setup
 * Run with: npm test
 */

describe('Memory Cache - Basic Tests', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  test('should create cache instance', () => {
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe('function');
    expect(typeof cache.setex).toBe('function');
    expect(typeof cache.del).toBe('function');
  });

  test('should set and get values', async () => {
    await cache.setex('test-key', 60, 'test-value');
    const value = await cache.get('test-key');
    
    expect(value).toBe('test-value');
  });

  test('should return null for non-existent keys', async () => {
    const value = await cache.get('non-existent');
    expect(value).toBeNull();
  });

  test('should delete keys', async () => {
    await cache.setex('delete-me', 60, 'test-value');
    
    // Verify it exists
    let value = await cache.get('delete-me');
    expect(value).toBe('test-value');
    
    // Delete it
    await cache.del('delete-me');
    
    // Should be null
    value = await cache.get('delete-me');
    expect(value).toBeNull();
  });

  test('should handle TTL expiry', async () => {
    // Set with 1 second TTL
    await cache.setex('expires-soon', 1, 'test-value');
    
    // Should exist immediately
    let value = await cache.get('expires-soon');
    expect(value).toBe('test-value');
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Should be null after expiry
    value = await cache.get('expires-soon');
    expect(value).toBeNull();
  });

  test('should provide cache statistics', async () => {
    await cache.setex('key1', 60, 'value1');
    await cache.setex('key2', 60, 'value2');
    
    const stats = cache.getStats();
    
    expect(stats.totalEntries).toBe(2);
    expect(stats.keys).toContain('key1');
    expect(stats.keys).toContain('key2');
    expect(stats.memoryUsage).toBeDefined();
  });

  test('should clear all cache entries', async () => {
    await cache.setex('key1', 60, 'value1');
    await cache.setex('key2', 60, 'value2');
    
    expect(cache.getStats().totalEntries).toBe(2);
    
    cache.clear();
    
    expect(cache.getStats().totalEntries).toBe(0);
  });
});

describe('Cache Factory', () => {
  test('should create cache instance', () => {
    const { createCache } = require('../src/cache/memoryCache');
    const cache = createCache();
    
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe('function');
    
    // Cleanup
    if (cache.destroy) {
      cache.destroy();
    }
  });
});
