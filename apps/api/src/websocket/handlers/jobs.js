import { db } from '../../db/connection.js';
import { createRedisClient } from '../../cache/redis.js';

/**
 * Bridges the best-effort Redis pub/sub fan-out published by
 * modules/applications/applications.service.js, modules/screening,
 * modules/interviews, and modules/offers onto Socket.IO rooms, mirroring
 * registerProjectRealtimeBridge. Subscribed once per server process (called
 * from websocket/index.js).
 */
export function registerJobsRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('job-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const { applicationId, jobId, type, payload } = JSON.parse(message);
      if (jobId) io.to(`job:${jobId}`).emit(type, payload);
      if (applicationId) io.to(`application:${applicationId}`).emit(type, payload);
    } catch {
      // Malformed pub/sub payload — safe to drop.
    }
  });

  return subscriber;
}

/**
 * Server-side authorization for joining a job's live-update room — a socket
 * can only join `job:${id}` if it posted the job or is an active member of
 * the job's owning company, the same check the HTTP layer (jobs module)
 * enforces via resolveWorkspaceContext, so a client can never subscribe its
 * way around recruiter-only visibility.
 */
async function canAccessJob(userId, jobId) {
  if (!jobId) return false;
  const job = await db('jobs').where({ id: jobId }).first('id', 'company_id', 'posted_by');
  if (!job) return false;
  if (job.posted_by === userId) return true;
  if (!job.company_id) return false;
  const membership = await db('company_members').where({ company_id: job.company_id, user_id: userId, status: 'active' }).first('id');
  return Boolean(membership);
}

/**
 * Server-side authorization for joining an application's live-update room —
 * a socket can join `application:${id}` if it is the candidate who applied,
 * or has access to the underlying job per canAccessJob above.
 */
async function canAccessApplication(userId, applicationId) {
  if (!applicationId) return false;
  const application = await db('applications').where({ id: applicationId }).first('id', 'job_id', 'applicant_id');
  if (!application) return false;
  if (application.applicant_id === userId) return true;
  return canAccessJob(userId, application.job_id);
}

export function registerJobsHandlers(io, socket) {
  socket.on('job:join', async (jobId) => {
    if (!(await canAccessJob(socket.user.sub, jobId))) return;
    socket.join(`job:${jobId}`);
  });

  socket.on('job:leave', (jobId) => {
    if (typeof jobId === 'string') socket.leave(`job:${jobId}`);
  });

  socket.on('application:join', async (applicationId) => {
    if (!(await canAccessApplication(socket.user.sub, applicationId))) return;
    socket.join(`application:${applicationId}`);
  });

  socket.on('application:leave', (applicationId) => {
    if (typeof applicationId === 'string') socket.leave(`application:${applicationId}`);
  });
}
