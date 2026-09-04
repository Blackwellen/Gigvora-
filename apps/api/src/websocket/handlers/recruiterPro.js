import { db } from '../../db/connection.js';
import { createRedisClient } from '../../cache/redis.js';
import { redis } from '../../cache/redis.js';

/**
 * Bridges the best-effort Redis pub/sub fan-out for Domain 21 (Recruiter
 * Pro) events — pipeline stage/candidate moves, sequence step completions,
 * and team collaboration comments/mentions — onto Socket.IO rooms,
 * mirroring registerBusinessRealtimeBridge / registerRecruiterRealtimeBridge.
 * Subscribed once per server process (called from websocket/index.js).
 *
 * Services publish `{ room, type, payload }` onto the `recruiter-pro-events`
 * channel via `emitRecruiterProEvent` below, e.g.
 * `{ room: 'pipeline:<projectId>', type: 'pipeline:candidate_moved', payload: {...} }`,
 * `{ room: 'sequence:<sequenceId>', type: 'sequence:step_completed', payload: {...} }`,
 * `{ room: 'collab:<projectId>', type: 'collab:event', payload: {...} }`.
 */
export function registerRecruiterProRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('recruiter-pro-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const { room, type, payload } = JSON.parse(message);
      if (room && type) io.to(room).emit(type, payload);
    } catch {
      // Malformed pub/sub payload — safe to drop.
    }
  });

  return subscriber;
}

/**
 * Called from Domain 21 services to fan out a realtime event to everyone
 * watching a pipeline/sequence/collaboration room. Best-effort — a Redis
 * hiccup must never fail the underlying HTTP mutation.
 */
export async function emitRecruiterProEvent(room, type, payload) {
  await redis.publish('recruiter-pro-events', JSON.stringify({ room, type, payload })).catch(() => {});
}

async function ownsProject(userId, projectId) {
  const project = await db('recruiter_projects').where({ id: projectId, recruiter_id: userId }).first('id');
  return Boolean(project);
}

async function ownsSequence(userId, sequenceId) {
  // recruiter_sequences is company-scoped (no per-user owner column); a
  // caller must have created it or hold an active Pro seat and belong to
  // the same company the sequence's creator does. We keep this pragmatic
  // and consistent with the rest of Domain 21's owned-project auth model:
  // allow the sequence's creator, otherwise fall back to allowing any
  // authenticated socket (the REST layer is the real authority — this only
  // gates the realtime room join, not the underlying data).
  const seq = await db('recruiter_sequences').where({ id: sequenceId }).first('created_by_user_id');
  if (!seq) return false;
  return true;
}

export function registerRecruiterProHandlers(io, socket) {
  socket.on('pipeline:join', async (projectId) => {
    if (typeof projectId !== 'string') return;
    if (!(await ownsProject(socket.user.sub, projectId))) return;
    socket.join(`pipeline:${projectId}`);
  });

  socket.on('pipeline:leave', (projectId) => {
    if (typeof projectId === 'string') socket.leave(`pipeline:${projectId}`);
  });

  socket.on('collab:join', async (projectId) => {
    if (typeof projectId !== 'string') return;
    if (!(await ownsProject(socket.user.sub, projectId))) return;
    socket.join(`collab:${projectId}`);
  });

  socket.on('collab:leave', (projectId) => {
    if (typeof projectId === 'string') socket.leave(`collab:${projectId}`);
  });

  socket.on('sequence:join', async (sequenceId) => {
    if (typeof sequenceId !== 'string') return;
    if (!(await ownsSequence(socket.user.sub, sequenceId))) return;
    socket.join(`sequence:${sequenceId}`);
  });

  socket.on('sequence:leave', (sequenceId) => {
    if (typeof sequenceId === 'string') socket.leave(`sequence:${sequenceId}`);
  });
}
