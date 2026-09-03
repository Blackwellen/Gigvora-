import { createRedisClient } from '../../cache/redis.js';

/**
 * Bridges the best-effort Redis pub/sub fan-out from common/events/outbox.js onto the
 * per-user Socket.IO room, so Session & Devices / Security Alerts refresh live. Subscribed
 * once per server process (not per-socket) — io.to() fans out to whichever sockets are
 * currently joined to that user's room.
 */
export function registerSecurityRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('security-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const event = JSON.parse(message);
      const userId = event.payload?.userId || (event.aggregateType === 'user' ? event.aggregateId : null);
      if (!userId) return;
      io.to(`user:${userId}`).emit('security:event', {
        type: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
      });
    } catch {
      // Malformed pub/sub payload — safe to drop, the durable event_outbox row is unaffected.
    }
  });

  return subscriber;
}
