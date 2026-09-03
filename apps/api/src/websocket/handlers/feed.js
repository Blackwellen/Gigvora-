import { db } from '../../db/connection.js';
import { createRedisClient } from '../../cache/redis.js';
import { visibleCandidates } from '../../modules/posts/posts.service.js';

/**
 * Bridges the best-effort Redis pub/sub fan-out published by
 * common/events/feedEvents.js#publishFeedEvent onto Socket.IO rooms —
 * mirroring registerSecurityRealtimeBridge / registerMessagingRealtimeBridge.
 * Subscribed once per server process (called from websocket/index.js), not
 * per-socket. The publisher already computed the exact room list per the
 * post's real visibility, so this bridge just relays — it does no
 * authorization itself (that already happened when the room list was built,
 * and again below when a socket asks to join a `post:${id}` room).
 */
export function registerFeedRealtimeBridge(io) {
  const subscriber = createRedisClient();
  subscriber.subscribe('feed-events').catch(() => {});

  subscriber.on('message', (_channel, message) => {
    try {
      const { event, payload, rooms } = JSON.parse(message);
      for (const room of rooms || []) {
        io.to(room).emit(event, payload);
      }
    } catch {
      // Malformed pub/sub payload — safe to drop.
    }
  });

  return subscriber;
}

/**
 * Server-side authorization for joining a post's live-update room —
 * reuses the exact same visibility predicate the feed/post-detail HTTP
 * endpoints already enforce (visibleCandidates), so a socket can never join
 * `post:${id}` for a post it isn't otherwise allowed to see (private/
 * connections-only posts, drafts, deleted posts). Mirrors the
 * isConversationMember() membership check in handlers/messaging.js.
 */
async function canViewPost(userId, postId) {
  if (!postId) return false;
  const row = await visibleCandidates(db('posts').where('posts.id', postId), userId).first('posts.id');
  return Boolean(row);
}

export function registerFeedHandlers(io, socket) {
  socket.on('post:join', async (postId) => {
    if (!(await canViewPost(socket.user.sub, postId))) return;
    socket.join(`post:${postId}`);
  });

  socket.on('post:leave', (postId) => {
    if (typeof postId === 'string') socket.leave(`post:${postId}`);
  });

  // The shared "public feed" room only ever carries a
  // { postId, authorId } nudge for a public post — no private content — so
  // any authenticated socket may join it, same as the messaging typing/read
  // events are broadcast without a per-event membership re-check.
  socket.on('feed:join-public', () => socket.join('feed:public'));
  socket.on('feed:leave-public', () => socket.leave('feed:public'));
}
