import { db } from '../../db/connection.js';
import * as messagingService from '../../modules/messaging/messaging.service.js';

async function isConversationMember(userId, conversationId) {
  if (!conversationId) return false;
  const row = await db('conversation_participants')
    .where({ conversation_id: conversationId, user_id: userId })
    .whereNull('archived_at')
    .first();
  return Boolean(row);
}

export function registerMessagingHandlers(io, socket) {
  socket.on('conversation:join', async (conversationId) => {
    // Security fix: previously joined ANY conversationId with no membership
    // check, letting any authenticated socket subscribe to any
    // conversation's messages by guessing/enumerating a UUID. Now silently
    // refuses (no error emitted) if the caller isn't a participant, so
    // membership isn't leaked via an error response either.
    if (!(await isConversationMember(socket.user.sub, conversationId))) return;
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('conversation:leave', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('message:send', async ({ conversationId, body, attachments = [], clientMessageId, replyToMessageId }, callback) => {
    try {
      if (!(await isConversationMember(socket.user.sub, conversationId))) {
        return callback?.({ ok: false, error: 'Conversation not found' });
      }

      // Routed through the shared service (membership check, idempotency,
      // reply-to, best-effort safety classification, mention parsing) —
      // previously this did a raw, unchecked db('messages').insert bypassing
      // all of that.
      const message = await messagingService.sendMessage(socket.user.sub, conversationId, {
        body,
        attachments,
        clientMessageId,
        replyToMessageId,
      });

      io.to(`conversation:${conversationId}`).emit('message:new', message);
      callback?.({ ok: true, message });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  socket.on('message:react', async ({ conversationId, messageId, reaction }, callback) => {
    try {
      if (!(await isConversationMember(socket.user.sub, conversationId))) {
        return callback?.({ ok: false, error: 'Conversation not found' });
      }
      const data = await messagingService.addReaction(socket.user.sub, messageId, reaction);
      io.to(`conversation:${conversationId}`).emit('message.reaction.created', { conversationId, messageId, userId: socket.user.sub, reaction });
      callback?.({ ok: true, data });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  socket.on('message:unreact', async ({ conversationId, messageId, reaction }, callback) => {
    try {
      if (!(await isConversationMember(socket.user.sub, conversationId))) {
        return callback?.({ ok: false, error: 'Conversation not found' });
      }
      await messagingService.removeReaction(socket.user.sub, messageId, reaction);
      io.to(`conversation:${conversationId}`).emit('message.reaction.deleted', { conversationId, messageId, userId: socket.user.sub, reaction });
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  socket.on('message:read', async ({ conversationId }, callback) => {
    try {
      if (!(await isConversationMember(socket.user.sub, conversationId))) {
        return callback?.({ ok: false, error: 'Conversation not found' });
      }
      await messagingService.markConversationRead(socket.user.sub, conversationId);
      const readAt = new Date().toISOString();
      io.to(`conversation:${conversationId}`).emit('message.read', { conversationId, userId: socket.user.sub, readAt });
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  socket.on('typing:start', async ({ conversationId }) => {
    if (!(await isConversationMember(socket.user.sub, conversationId))) return;
    socket.to(`conversation:${conversationId}`).emit('typing:start', { userId: socket.user.sub, conversationId });
  });

  socket.on('typing:stop', async ({ conversationId }) => {
    if (!(await isConversationMember(socket.user.sub, conversationId))) return;
    socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId: socket.user.sub, conversationId });
  });
}
