import { db } from '../../db/connection.js';
import { createRedisClient } from '../../cache/redis.js';

/**
 * Bridges the best-effort Redis pub/sub fan-out published by
 * modules/pm-projects/tasks.service.js#broadcastTaskChange onto Socket.IO
 * rooms, mirroring registerFeedRealtimeBridge/registerMessagingRealtimeBridge.
 * Subscribed once per server process (called from websocket/index.js).
 */
export function registerProjectRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('project-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const { projectId, type, task } = JSON.parse(message);
      if (type === 'task') io.to(`project:${projectId}`).emit('project:task-changed', task);
    } catch {
      // Malformed pub/sub payload — safe to drop.
    }
  });

  return subscriber;
}

/**
 * Server-side authorization for joining a project's live-update room — a
 * socket can only join `project:${id}` if it has an accepted membership row,
 * the same check the HTTP layer (pm-projects module) enforces, so a client
 * can never subscribe its way around project access control.
 */
async function isProjectMember(userId, projectId) {
  if (!projectId) return false;
  const row = await db('pm_project_members').where({ project_id: projectId, user_id: userId, invitation_status: 'accepted' }).first('id');
  return Boolean(row);
}

export function registerProjectHandlers(io, socket) {
  socket.on('project:join', async (projectId) => {
    if (!(await isProjectMember(socket.user.sub, projectId))) return;
    socket.join(`project:${projectId}`);
  });

  socket.on('project:leave', (projectId) => {
    if (typeof projectId === 'string') socket.leave(`project:${projectId}`);
  });
}
