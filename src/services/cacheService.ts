// src/services/cacheService.ts
import redisClientInstance from '../config/redisClient.js'; // Your configured ioredis client instance
import { RedisKey } from 'ioredis'; // <--- IMPORT RedisKey DIRECTLY FROM ioredis
import crypto from 'crypto';

// Determine if caching should be active.
const CACHE_ENABLED = process.env.NODE_ENV !== 'test' && redisClientInstance !== null;
const DEFAULT_TTL_SECONDS = 3600;

if (CACHE_ENABLED) {
  console.log('[CacheService] Caching is ENABLED.');
} else {
  console.warn('[CacheService] Caching is DISABLED (Redis client not available or NODE_ENV is test).');
}

/**
 * Retrieves an item from the cache.
 * @param key The cache key.
 * @returns The cached item (parsed from JSON) or null if not found or caching is disabled.
 */
export const getFromCache = async <T>(key: string): Promise<T | null> => { // Keys are usually strings for simplicity
  if (!CACHE_ENABLED || !redisClientInstance) return null;

  try {
    const data = await redisClientInstance.get(key); // Use string key here
    if (data) {
      console.log(`[CacheService] HIT for key: ${key}`);
      return JSON.parse(data) as T;
    }
    console.log(`[CacheService] MISS for key: ${key}`);
    return null;
  } catch (error) {
    console.error(`[CacheService] Error GETTING from cache for key "${key}":`, error);
    return null;
  }
};

/**
 * Sets an item in the cache.
 * @param key The cache key.
 * @param value The value to cache (will be JSON.stringified).
 * @param ttlInSeconds Time-to-live in seconds. Defaults to DEFAULT_TTL_SECONDS.
 */
export const setToCache = async (key: string, value: any, ttlInSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> => {
  if (!CACHE_ENABLED || !redisClientInstance) return;

  try {
    const stringValue = JSON.stringify(value);
    await redisClientInstance.set(key, stringValue, 'EX', ttlInSeconds); // Use string key
    console.log(`[CacheService] SET for key: ${key}, TTL: ${ttlInSeconds}s`);
  } catch (error) {
    console.error(`[CacheService] Error SETTING to cache for key "${key}":`, error);
  }
};

/**
 * Deletes one or more keys from the cache.
 * @param keyOrKeys A single key (string or Buffer) or an array of keys (string or Buffer).
 */
export const deleteFromCache = async (keyOrKeys: RedisKey | RedisKey[]): Promise<void> => {
  if (!CACHE_ENABLED || !redisClientInstance) return;

  if (Array.isArray(keyOrKeys) && keyOrKeys.length === 0) {
    console.log(`[CacheService] DEL called with empty array. No action taken.`);
    return;
  }

  try {
    let result: number;
    if (Array.isArray(keyOrKeys)) {
      result = await redisClientInstance.del(...keyOrKeys); // Spread into arguments
    } else {
      result = await redisClientInstance.del(keyOrKeys); // Single key
    }
    console.log(`[CacheService] DEL for key(s): ${JSON.stringify(keyOrKeys)}. Deleted count: ${result}`);
  } catch (error) {
    console.error(`[CacheService] Error DELETING from cache for key(s) "${JSON.stringify(keyOrKeys)}":`, error);
  }
};

/**
 * Clears cache entries matching a given pattern.
 * @param pattern The pattern to match keys against (e.g., "properties_list:*").
 */
export const clearCacheByPattern = async (pattern: string): Promise<void> => { // Pattern is a string
  if (!CACHE_ENABLED || !redisClientInstance) return;
  console.log(`[CacheService] Attempting to clear cache with pattern: ${pattern}`);
  try {
    let cursor = '0';
    let keysFoundTotal = 0;
    const BATCH_SIZE = 100;

    do {
      const [nextCursor, keysInBatch] = await redisClientInstance.scan(cursor, 'MATCH', pattern, 'COUNT', BATCH_SIZE);
      cursor = nextCursor;

      if (keysInBatch.length > 0) {
        // SCAN returns strings, which are valid RedisKeys
        const keysToDelete: RedisKey[] = keysInBatch;
        keysFoundTotal += keysToDelete.length;
        if (keysToDelete.length > 0) { // Double check before del
            await redisClientInstance.del(...keysToDelete);
        }
        console.log(`[CacheService] Deleted ${keysToDelete.length} keys matching pattern "${pattern}" (batch).`);
      }
    } while (cursor !== '0');

    console.log(`[CacheService] Finished clearing pattern "${pattern}". Total keys deleted: ${keysFoundTotal}`);
  } catch (error) {
    console.error(`[CacheService] Error clearing cache by pattern "${pattern}":`, error);
  }
};


export const generatePropertyListCacheKey = (query: Record<string, any>): string => {
  const relevantQuery: Record<string, any> = { ...query };
  const sortedKeys = Object.keys(relevantQuery).sort();
  const queryStringParts: string[] = [];
  for (const key of sortedKeys) {
    queryStringParts.push(`${key}=${relevantQuery[key]}`);
  }
  const consistentQueryString = queryStringParts.join('&');
  const hash = crypto.createHash('md5').update(consistentQueryString).digest('hex');
  return `properties_list:${hash}`;
};

export const CACHE_KEYS = {
  PROPERTY_BY_ID: (id: string): string => `property:${id}`, // Keys are typically strings
};