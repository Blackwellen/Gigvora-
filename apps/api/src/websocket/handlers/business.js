import { db } from '../../db/connection.js';
import { createRedisClient } from '../../cache/redis.js';

/**
 * Bridges the best-effort Redis pub/sub fan-out for company-scoped business
 * workspace events (hiring pipeline stage changes, spend flags, workforce
 * plan updates, KPI refreshes for the Business Dashboard) onto Socket.IO
 * rooms, mirroring registerJobsRealtimeBridge / registerProjectRealtimeBridge.
 * Subscribed once per server process (called from websocket/index.js).
 *
 * Publishers (future work, out of scope here) push
 * `{ companyId, type, payload }` onto the `business-events` channel, e.g.
 * `{ companyId, type: 'hiring:funnel_updated', payload: {...} }`,
 * `{ companyId, type: 'spend:flagged', payload: {...} }`,
 * `{ companyId, type: 'workforce:plan_updated', payload: {...} }`.
 */
export function registerBusinessRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('business-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const { companyId, type, payload } = JSON.parse(message);
      if (companyId && type) io.to(`company:${companyId}`).emit(type, payload);
    } catch {
      // Malformed pub/sub payload — safe to drop.
    }
  });

  return subscriber;
}

/**
 * Server-side authorization for joining a company's live-update room — a
 * socket can only join `company:${id}` if it is an active member of that
 * company, the same check the HTTP layer (workspaceContext middleware)
 * enforces, so a client can never subscribe its way around workspace
 * membership.
 */
async function canAccessCompany(userId, companyId) {
  if (!companyId) return false;
  const membership = await db('company_members').where({ company_id: companyId, user_id: userId, status: 'active' }).first('id');
  return Boolean(membership);
}

export function registerBusinessHandlers(io, socket) {
  socket.on('company:join', async (companyId) => {
    if (!(await canAccessCompany(socket.user.sub, companyId))) return;
    socket.join(`company:${companyId}`);
  });

  socket.on('company:leave', (companyId) => {
    if (typeof companyId === 'string') socket.leave(`company:${companyId}`);
  });
}
