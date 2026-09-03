import { redis } from '../../cache/redis.js';
import { db } from '../../db/connection.js';

/**
 * Feed realtime fan-out, mirroring the security-events / messaging-events
 * pattern in outbox.js: publish a best-effort Redis pub/sub message that
 * websocket/handlers/feed.js#registerFeedRealtimeBridge relays onto the
 * already-connected Socket.IO rooms. There is no durable event_outbox row
 * for these (unlike emitEvent/emitMessagingEvent) — a missed publish just
 * means a connected client's feed doesn't get a live nudge; the next
 * refetch/poll still returns correct data, so nothing is lost, only delayed.
 */
export async function publishFeedEvent(event, payload, rooms) {
  if (!rooms || !rooms.length) return;
  try {
    await redis.publish('feed-events', JSON.stringify({ event, payload, rooms }));
  } catch {
    // Best-effort only — never let a realtime publish failure break the mutation that triggered it.
  }
}

/**
 * Computes which Socket.IO rooms should see a "new candidates" nudge for a
 * post, honouring the post's real visibility rather than broadcasting
 * everything to everyone:
 *  - public posts -> the shared `feed:public` room (anyone browsing Latest/
 *    Top/Recommended joins this room; it carries no private data, only a
 *    "there are new posts" signal with no post content).
 *  - connections/private posts -> only the author's own accepted
 *    connections (using the real `connections` table, same graph
 *    visibleCandidates() in posts.service.js already authorizes against)
 *    plus the author themselves, each as their personal `user:${id}` room.
 */
export async function roomsForPostAudience(authorId, visibility) {
  if (visibility === 'public') return ['feed:public'];

  const rows = await db('connections')
    .where('status', 'accepted')
    .andWhere((qb) => qb.where({ requester_id: authorId }).orWhere({ addressee_id: authorId }))
    .select('requester_id', 'addressee_id');

  const ids = new Set([authorId]);
  for (const row of rows) {
    ids.add(row.requester_id);
    ids.add(row.addressee_id);
  }
  return [...ids].map((id) => `user:${id}`);
}
