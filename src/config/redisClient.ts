// src/config/redisClient.ts
import { Redis as IoRedisClass } from 'ioredis'; // Import the named export 'Redis' and alias it
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.warn('Warning: REDIS_URL is not defined in .env. Caching will be disabled or may fail.');
}

let redisClient: InstanceType<typeof IoRedisClass> | null = null;

if (REDIS_URL) {
  try {
    redisClient = new IoRedisClass(REDIS_URL, { // Use the aliased class constructor
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
      console.log('Redis Connected Successfully');
    });

    redisClient.on('error', (err) => {
      console.error('Redis Connection Error:', err);
    });
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
  }
} else {
    console.log('Redis client not initialized as REDIS_URL is not provided.');
}

export default redisClient;