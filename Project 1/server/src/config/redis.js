import Redis from 'ioredis';
import logger from '../utils/logger.js';

const host = process.env.REDIS_HOST || 'localhost';
const port = parseInt(process.env.REDIS_PORT || '6379', 10);
const password = process.env.REDIS_PASSWORD || undefined;

let redisClient = null;
let redisConnected = false;

try {
  redisClient = new Redis({
    host,
    port,
    password,
    maxRetriesPerRequest: null, // Required for Bull queue compatibility
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  });

  redisClient.on('connect', () => {
    redisConnected = true;
    logger.info('Connected to Redis server');
  });

  redisClient.on('error', (err) => {
    redisConnected = false;
    logger.warn(`Redis connection error: ${err.message}`);
  });

  redisClient.on('end', () => {
    redisConnected = false;
    logger.warn('Redis connection closed');
  });
} catch (e) {
  logger.error('Failed to initialize Redis client', e);
}

export const isRedisConnected = () => redisConnected;
export default redisClient;
export { host, port, password };
