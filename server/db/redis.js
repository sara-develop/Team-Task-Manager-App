import { createClient } from 'redis';

let redisClient;

export const initRedis = async () => {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379)
      }
    });
    redisClient.on('error', (e) => console.error('Redis error:', e));
    await redisClient.connect();
    console.log('✅ Connected to Redis');
    return redisClient;
  } catch (err) {
    console.warn('⚠ Redis connection failed, skipping...', err.message);
    return null;
  }
};

export const getRedisClient = () => redisClient;
