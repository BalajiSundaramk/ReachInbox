import { Redis } from 'ioredis';
import { env } from './env.js';

export const redisConnection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

export async function connectRedis(): Promise<void> {
  await redisConnection.ping();
  console.log('Redis connected');
}

export async function disconnectRedis(): Promise<void> {
  await redisConnection.quit();
}
