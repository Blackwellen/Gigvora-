import { createRedisClient } from '../../cache/redis.js';

export function registerNotificationHandlers(io, socket) {
  socket.on('notification:read', async ({ notificationId }) => {
    socket.to(`user:${socket.user.sub}`).emit('notification:updated', { id: notificationId, is_read: true });
  });
}

export function emitNotification(io, userId, notification) {
  io.to(`user:${userId}`).emit('notification:new', notification);
}

/** Bridges modules/notifications/notify.js's Redis publish onto the user's own socket room — mirrors registerMessagingRealtimeBridge/registerAiRealtimeBridge. */
export function registerNotificationsRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('notification-events').catch(() => {});
  subscriber.on('message', (_channel, message) => {
    try {
      const { userId, notification } = JSON.parse(message);
      if (!userId || !notification) return;
      io.to(`user:${userId}`).emit('notification:new', notification);
    } catch {
      // Malformed pub/sub payload — safe to drop.
    }
  });
  return subscriber;
}
