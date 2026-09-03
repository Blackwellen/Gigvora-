import Redis from 'ioredis';
import { config } from '../config/index.js';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
});

export function createRedisClient() {
  return new Redis(config.redis.url, { maxRetriesPerRequest: null });
}

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[redis] connection error', err.message);
});
