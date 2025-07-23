/**
 * Simple In-Memory Cache Implementation
 * 
 * Perfect for development and single-server deployments.
 * No external dependencies required - works out of the box!
 * 
 * Features:
 * - Automatic expiry (TTL support)
 * - Background cleanup of expired entries
 * - Memory efficient
 * - Zero setup required
 */

interface CacheEntry {
  data: string;
  expiresAt: number;
}

export class MemoryCache {
  private cacheStorage = new Map<string, CacheEntry>();
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    // Start background cleanup process
    this.cleanupTimer = this.startBackgroundCleanup();
  }

  /**
   * Get value from cache
   * Returns null if key doesn't exist or has expired
   */
  async get(key: string): Promise<string | null> {
    const entry = this.cacheStorage.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (this.isExpired(entry)) {
      this.cacheStorage.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set value in cache with expiry time (TTL in seconds)
   */
  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    
    this.cacheStorage.set(key, {
      data: value,
      expiresAt
    });
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    this.cacheStorage.delete(key);
  }

  /**
   * PRIVATE HELPER METHODS
   */

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Start background cleanup process
   * Removes expired entries every minute
   */
  private startBackgroundCleanup(): NodeJS.Timeout {
    return setInterval(() => {
      this.removeExpiredEntries();
    }, 60000); // Clean every minute
  }

  /**
   * Remove all expired entries from cache
   */
  private removeExpiredEntries(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cacheStorage.entries()) {
      if (now > entry.expiresAt) {
        this.cacheStorage.delete(key);
      }
    }
  }

  /**
   * UTILITY METHODS FOR MONITORING
   */

  /**
   * Get cache statistics for monitoring
   */
  getStats() {
    return {
      totalEntries: this.cacheStorage.size,
      keys: Array.from(this.cacheStorage.keys()),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cacheStorage.clear();
  }

  /**
   * Graceful shutdown - cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cacheStorage.clear();
  }
}

/**
 * Smart Cache Factory
 * 
 * Automatically chooses the best caching implementation:
 * - Development: Memory cache (no setup required)
 * - Production: Redis cache (if REDIS_HOST is set)
 */
export function createCache() {
  // Use Redis in production if available
  if (process.env.REDIS_HOST && process.env.NODE_ENV === 'production') {
    try {
      // Dynamically import Redis only if needed
      const { RedisCache } = require('./redisCache');
      console.log('✅ Using Redis cache for production');
      return new RedisCache();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️  Redis not available, falling back to memory cache:', errorMessage);
    }
  }
  
  // Default to memory cache
  console.log('🧠 Using in-memory cache (perfect for development)');
  return new MemoryCache();
}
