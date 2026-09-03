import { createRedisClient } from '../../cache/redis.js';

/**
 * Bridges the best-effort Redis pub/sub fan-out from
 * common/events/outbox.js#emitMessagingEvent onto Socket.IO rooms, mirroring
 * registerSecurityRealtimeBridge in security.js. Subscribed once per server
 * process (called from websocket/index.js), NOT per-socket — do not confuse
 * with the per-socket handlers in handlers/messaging.js.
 *
 * - aggregateType 'conversation' -> fan out to everyone currently joined to
 *   that conversation's room (conversation:join in handlers/messaging.js is
 *   membership-gated, so this stays safe).
 * - aggregateType 'message_request' -> fan out to the request's recipient's
 *   personal room only (payload.recipientId), since a message request isn't
 *   visible to the sender's other tabs/devices in this join.
 */
export function registerMessagingRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('messaging-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const event = JSON.parse(message);
      const { aggregateType, aggregateId, eventType, payload } = event;

      if (aggregateType === 'conversation') {
        io.to(`conversation:${aggregateId}`).emit(eventType, payload);
      } else if (aggregateType === 'message_request') {
        const recipientId = payload?.recipientId;
        if (recipientId) io.to(`user:${recipientId}`).emit(eventType, payload);
      }
    } catch {
      // Malformed pub/sub payload — safe to drop, the durable event_outbox row is unaffected.
    }
  });

  return subscriber;
}
