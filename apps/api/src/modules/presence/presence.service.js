import { redis } from '../../cache/redis.js';

const MAX_USER_IDS = 200;

/**
 * Reads the SAME presence:${userId} Redis key convention set by
 * websocket/handlers/presence.js#markOnline — does not invent a new scheme.
 */
export async function getPresence(userIds = []) {
  const capped = userIds.slice(0, MAX_USER_IDS);
  if (!capped.length) return {};

  const keys = capped.map((id) => `presence:${id}`);
  const values = await redis.mget(...keys);

  const result = {};
  capped.forEach((id, index) => {
    result[id] = Boolean(values[index]);
  });
  return result;
}
