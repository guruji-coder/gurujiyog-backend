// Optional Redis implementation for production scaling
// npm install ioredis @types/ioredis

import Redis from 'ioredis';

export class RedisCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    try {
      await this.redis.setex(key, seconds, value);
    } catch (error) {
      console.error('Redis setex error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

// Usage in routes:
// import { RedisCache } from '../cache/redisCache';
// const cache = new RedisCache();
// const hybridAuthController = new HybridAuthController(cache);
