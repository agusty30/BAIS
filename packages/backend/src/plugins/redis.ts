import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    cache: {
      get: <T>(key: string) => Promise<T | null>;
      set: (key: string, value: unknown, ttlSeconds?: number) => Promise<void>;
      del: (key: string) => Promise<void>;
    };
  }
}

async function redisPlugin(app: FastifyInstance) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const noopRedis = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    quit: async () => 'OK',
    ping: async () => { throw new Error('Redis unavailable'); },
    status: 'end',
    on: () => noopRedis,
  } as unknown as Redis;

  let redis: Redis;
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.on('error', (err) => {
      app.log.debug(`Redis error: ${err.message}`);
    });
    await redis.connect();
    app.log.info('Redis connected');
  } catch {
    app.log.warn('Redis unavailable — running without cache');
    redis = noopRedis;
  }

  app.decorate('redis', redis);

  app.decorate('cache', {
    get: async <T>(key: string): Promise<T | null> => {
      try {
        const val = await redis.get(`bais:${key}`);
        return val ? JSON.parse(val) : null;
      } catch {
        return null;
      }
    },
    set: async (key: string, value: unknown, ttlSeconds = 300) => {
      try {
        await redis.set(`bais:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
      } catch { /* cache write failure is non-fatal */ }
    },
    del: async (key: string) => {
      try {
        await redis.del(`bais:${key}`);
      } catch { /* cache delete failure is non-fatal */ }
    },
  });

  app.addHook('onClose', async () => {
    if (redis.status !== 'end') {
      await redis.quit();
    }
  });
}

export const redisCachePlugin = fp(redisPlugin, { name: 'redis' });
