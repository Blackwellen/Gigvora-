import { createRedisClient } from '../../cache/redis.js';

/**
 * Bridges import/file pipeline stage-change events (published by the import
 * BullMQ workers via common/events/importEvents.js, which run in a separate
 * process from the API/socket server per apps/api/src/workers.js) onto the
 * owning user's Socket.IO room, matching the pattern in security.js.
 */
export function registerImportsRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('import-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const event = JSON.parse(message);
      const { ownerUserId, workspaceId } = event;
      if (ownerUserId) {
        io.to(`user:${ownerUserId}`).emit('import:event', event);
      }
      if (workspaceId) {
        io.to(`workspace:${workspaceId}`).emit('import:event', event);
      }
    } catch {
      // Malformed pub/sub payload — safe to drop, clients fall back to polling GET /imports/:id/status.
    }
  });

  return subscriber;
}

export function registerImportsHandlers(io, socket) {
  socket.on('import:subscribe', ({ workspaceId }) => {
    if (workspaceId) socket.join(`workspace:${workspaceId}`);
  });

  socket.on('import:unsubscribe', ({ workspaceId }) => {
    if (workspaceId) socket.leave(`workspace:${workspaceId}`);
  });
}
