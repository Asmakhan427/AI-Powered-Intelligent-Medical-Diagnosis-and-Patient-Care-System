// ============================================
// redisClient - high-level cache helpers
// --------------------------------------------
// Thin, failure-tolerant wrappers over the ioredis client from
// `../config/redis`. Every helper is a no-op / null when Redis is disabled
// or unreachable, so callers can always treat caching as best-effort:
//
//   const hit = await cacheGet(key);
//   if (hit) return JSON.parse(hit);
//   ...compute...
//   await cacheSet(key, JSON.stringify(value), 3600);
// ============================================
import { getRedisClient } from '../config/redis';
import logger from './logger';

/**
 * Returns the cached string for `key`, or null on miss / error / disabled.
 */
export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch (err) {
    logger.warn('cacheGet failed', { key, error: (err as Error).message });
    return null;
  }
}

/**
 * Stores `value` under `key` with an optional TTL (seconds). Best-effort:
 * failures are logged and swallowed.
 */
export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
  } catch (err) {
    logger.warn('cacheSet failed', { key, error: (err as Error).message });
  }
}

/**
 * Deletes one or more keys. Returns the number of keys removed (0 on error).
 */
export async function cacheDel(...keys: string[]): Promise<number> {
  const client = getRedisClient();
  if (!client || keys.length === 0) return 0;
  try {
    return await client.del(...keys);
  } catch (err) {
    logger.warn('cacheDel failed', { keys, error: (err as Error).message });
    return 0;
  }
}

/**
 * JSON convenience: get + parse. Returns null on miss or parse failure.
 */
export async function cacheGetJSON<T = unknown>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * JSON convenience: stringify + set.
 */
export async function cacheSetJSON(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}

export default { cacheGet, cacheSet, cacheDel, cacheGetJSON, cacheSetJSON };
