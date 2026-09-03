import { createRedisClient } from '../../cache/redis.js';

/**
 * Bridges apps/api/src/modules/ai/aiRealtime.js's Redis pub/sub onto each
 * user's Socket.IO room — mirrors registerSecurityRealtimeBridge /
 * registerMessagingRealtimeBridge exactly. Subscribed once per server
 * process, not per-socket.
 */
export function registerAiRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('ai-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const { userId, eventType, payload } = JSON.parse(message);
      if (!userId || !eventType) return;
      io.to(`user:${userId}`).emit(eventType, payload);
    } catch {
      // Malformed pub/sub payload — safe to drop.
    }
  });

  return subscriber;
}
