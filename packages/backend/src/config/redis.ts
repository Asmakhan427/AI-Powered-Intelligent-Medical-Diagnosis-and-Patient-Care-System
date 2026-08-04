// ============================================
// MEDASSIST AI - Redis client (ioredis)
// --------------------------------------------
// Redis is OPTIONAL. When REDIS_ENABLED is false (or the server is
// unreachable) the app keeps running — caching simply becomes a no-op and
// callers fall back to computing the value. This keeps local dev and CI
// from requiring a Redis instance.
//
// High-level cache helpers (cacheGet/cacheSet/...) live in
// `../utils/redisClient.ts` and build on the client exported here.
// ============================================
import Redis, { type Redis as RedisClient } from 'ioredis';
import logger from '../utils/logger';
import { REDIS_URL, REDIS_ENABLED } from './env';

let client: RedisClient | null = null;

/**
 * Lazily creates (and returns) the shared Redis client, or `null` when Redis
 * is disabled. Connection is established lazily by ioredis on first command.
 */
export function getRedisClient(): RedisClient | null {
  if (!REDIS_ENABLED) return null;
  if (client) return client;

  client = new Redis(REDIS_URL, {
    // Cap reconnection backoff and don't queue commands forever if Redis is
    // down — fail fast so callers degrade to the no-cache path.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
    lazyConnect: false,
  });

  client.on('connect', () => logger.info('✅ Redis connected'));
  client.on('ready', () => logger.debug('Redis ready'));
  client.on('error', (err) => logger.warn('Redis error', { error: err.message }));
  client.on('close', () => logger.warn('⚠️  Redis connection closed'));

  return client;
}

/**
 * Eagerly connect at boot so we log connectivity early. Never throws — a
 * missing Redis must not stop the API from serving.
 */
export async function connectRedis(): Promise<void> {
  if (!REDIS_ENABLED) {
    logger.info('Redis disabled (REDIS_ENABLED=false) — caching is a no-op');
    return;
  }
  try {
    const c = getRedisClient();
    // A cheap round-trip to confirm connectivity.
    await c?.ping();
  } catch (err) {
    logger.warn('Redis unavailable at startup — continuing without cache', {
      error: (err as Error).message,
    });
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => client?.disconnect());
    client = null;
    logger.info('Redis connection closed');
  }
}

export function isRedisHealthy(): boolean {
  return !!client && client.status === 'ready';
}

export default getRedisClient;
