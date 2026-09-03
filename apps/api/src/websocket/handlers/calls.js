import { db } from '../../db/connection.js';

/**
 * WebRTC call signaling — pure relay, no media server. The client does
 * peer-to-peer WebRTC (mesh for group calls); the server only tracks call
 * membership/status and relays SDP/ICE between participants.
 *
 * In-memory Map keyed by callId, mirroring the ephemeral-state approach used
 * elsewhere (presence.js keeps per-connection state in Redis with a TTL
 * because presence must survive across multiple API instances/reconnects;
 * an active call's participant list is short-lived and only ever read by
 * the instance handling its socket events, so a module-level Map is
 * sufficient here and avoids an extra Redis round-trip per signal).
 */
const activeCalls = new Map();

function otherParticipants(call, excludeUserId) {
  return call.participants.filter((userId) => userId !== excludeUserId);
}

function emitToUsers(io, userIds, event, payload) {
  for (const userId of userIds) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

async function getUserSummary(userId) {
  const user = await db('users as u')
    .leftJoin('profiles as p', 'p.user_id', 'u.id')
    .where('u.id', userId)
    .first('u.id', 'u.first_name', 'u.last_name', 'p.avatar_url');
  if (!user) return { id: userId, name: 'Unknown', avatarUrl: null };
  return { id: user.id, name: `${user.first_name} ${user.last_name}`, avatarUrl: user.avatar_url || null };
}

export function registerCallHandlers(io, socket) {
  socket.on('call:invite', async ({ conversationId, callId, type, targetUserIds = [] }, callback) => {
    try {
      if (!callId || !conversationId || !['audio', 'video'].includes(type) || !Array.isArray(targetUserIds) || !targetUserIds.length) {
        callback?.({ ok: false, error: 'Invalid call:invite payload' });
        return;
      }

      const callerId = socket.user.sub;
      const participants = Array.from(new Set([callerId, ...targetUserIds]));

      activeCalls.set(callId, {
        callId,
        conversationId,
        type,
        callerId,
        participants,
        status: 'ringing',
        createdAt: Date.now(),
      });

      const fromUser = await getUserSummary(callerId);

      emitToUsers(io, targetUserIds, 'call:incoming', {
        callId,
        conversationId,
        type,
        fromUserId: callerId,
        fromUser,
      });

      callback?.({ ok: true, callId });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  socket.on('call:accept', ({ callId }, callback) => {
    try {
      const call = activeCalls.get(callId);
      if (!call) {
        callback?.({ ok: false, error: 'Call not found' });
        return;
      }

      const userId = socket.user.sub;
      if (!call.participants.includes(userId)) {
        callback?.({ ok: false, error: 'Not a participant of this call' });
        return;
      }

      call.status = 'active';

      emitToUsers(io, otherParticipants(call, userId), 'call:accepted', { callId, byUserId: userId });
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  socket.on('call:reject', ({ callId }, callback) => {
    try {
      const call = activeCalls.get(callId);
      if (!call) {
        callback?.({ ok: false, error: 'Call not found' });
        return;
      }

      const userId = socket.user.sub;
      const remaining = otherParticipants(call, userId);

      emitToUsers(io, remaining, 'call:rejected', { callId, byUserId: userId });

      call.participants = remaining;
      if (call.participants.length <= 1) {
        activeCalls.delete(callId);
      }

      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  socket.on('call:end', ({ callId }, callback) => {
    try {
      const call = activeCalls.get(callId);
      if (!call) {
        callback?.({ ok: false, error: 'Call not found' });
        return;
      }

      const userId = socket.user.sub;
      emitToUsers(io, otherParticipants(call, userId), 'call:ended', { callId, byUserId: userId });
      activeCalls.delete(callId);

      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  socket.on('call:signal', ({ callId, targetUserId, signal }, callback) => {
    try {
      const call = activeCalls.get(callId);
      if (!call || !targetUserId || signal === undefined) {
        callback?.({ ok: false, error: 'Invalid call:signal payload' });
        return;
      }

      const fromUserId = socket.user.sub;
      io.to(`user:${targetUserId}`).emit('call:signal', { callId, fromUserId, signal });
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  socket.on('disconnect', () => {
    const userId = socket.user.sub;

    for (const [callId, call] of activeCalls) {
      if (!call.participants.includes(userId)) continue;

      const remaining = otherParticipants(call, userId);

      if (remaining.length === 0) {
        activeCalls.delete(callId);
        continue;
      }

      if (remaining.length === 1) {
        emitToUsers(io, remaining, 'call:ended', { callId, byUserId: userId });
        activeCalls.delete(callId);
      } else {
        call.participants = remaining;
        emitToUsers(io, remaining, 'call:participant-left', { callId, userId });
      }
    }
  });
}
