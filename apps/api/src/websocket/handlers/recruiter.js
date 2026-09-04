import { createRedisClient } from '../../cache/redis.js';

/**
 * Bridges the best-effort Redis pub/sub fan-out for recruiter-scoped events
 * (a new candidate reply landing in the Recruiter Inbox, a search alert
 * producing new matches) onto Socket.IO rooms, mirroring
 * registerBusinessRealtimeBridge / registerJobsRealtimeBridge. Subscribed
 * once per server process (called from websocket/index.js).
 *
 * Publishers push `{ recruiterId, type, payload }` onto the
 * `recruiter-events` channel, e.g.
 * `{ recruiterId, type: 'inbox:message_received', payload: {...} }`,
 * `{ recruiterId, type: 'alert:new_matches', payload: {...} }`.
 */
export function registerRecruiterRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('recruiter-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const { recruiterId, type, payload } = JSON.parse(message);
      if (recruiterId && type) io.to(`recruiter:${recruiterId}`).emit(type, payload);
    } catch {
      // Malformed pub/sub payload — safe to drop.
    }
  });

  return subscriber;
}

/**
 * Recruiter-scoped rooms are self-authorizing — a socket can only ever join
 * its own `recruiter:${userId}` room, never another recruiter's, so there is
 * no membership lookup needed (unlike company/project rooms).
 */
export function registerRecruiterHandlers(io, socket) {
  socket.on('recruiter-inbox:join', () => {
    socket.join(`recruiter:${socket.user.sub}`);
  });

  socket.on('recruiter-inbox:leave', () => {
    socket.leave(`recruiter:${socket.user.sub}`);
  });

  socket.on('recruiter-inbox:typing', ({ conversationId } = {}) => {
    if (typeof conversationId !== 'string') return;
    socket.to(`recruiter:${socket.user.sub}`).emit('recruiter-inbox:typing', { conversationId, userId: socket.user.sub });
  });
}
