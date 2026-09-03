import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import * as messagingService from './messaging.service.js';
import * as outbox from '../../common/events/outbox.js';
import { notify } from '../notifications/notify.js';

async function areConnected(userId, otherUserId) {
  const row = await db('connections')
    .where('status', 'accepted')
    .andWhere((qb) =>
      qb
        .where({ requester_id: userId, addressee_id: otherUserId })
        .orWhere({ requester_id: otherUserId, addressee_id: userId })
    )
    .first();
  return Boolean(row);
}

/**
 * Replaces the previous plain getOrCreateDirectConversation call at the
 * POST /conversations/direct boundary: connected users start a normal
 * conversation as before; unconnected users get a conversation flagged
 * is_request=true plus a message_requests row the recipient must
 * accept/decline/block/spam before it behaves like a normal DM.
 */
export async function createOrRouteDirectConversation(senderId, recipientId, firstMessageBody) {
  if (senderId === recipientId) throw new AppError('Cannot start a conversation with yourself', 422);

  const connected = await areConnected(senderId, recipientId);

  const existing = await db('conversation_participants as a')
    .join('conversation_participants as b', 'a.conversation_id', 'b.conversation_id')
    .join('conversations as c', 'c.id', 'a.conversation_id')
    .where({ 'a.user_id': senderId, 'b.user_id': recipientId, 'c.is_group': false })
    .first('c.id', 'c.is_request');

  if (existing) {
    if (firstMessageBody?.trim()) {
      await messagingService.sendMessage(senderId, existing.id, { body: firstMessageBody });
    }
    return { conversationId: existing.id, isRequest: Boolean(existing.is_request), requestId: null };
  }

  if (connected) {
    const conversationId = await messagingService.getOrCreateDirectConversation(senderId, recipientId);
    if (firstMessageBody?.trim()) {
      await messagingService.sendMessage(senderId, conversationId, { body: firstMessageBody });
    }
    return { conversationId, isRequest: false, requestId: null };
  }

  const relevanceScore = await messagingService.computeRelevanceScore(senderId, recipientId);

  const result = await db.transaction(async (trx) => {
    const [conversation] = await trx('conversations').insert({ is_group: false, is_request: true }).returning('*');
    await trx('conversation_participants').insert([
      { conversation_id: conversation.id, user_id: senderId },
      { conversation_id: conversation.id, user_id: recipientId },
    ]);

    const [request] = await trx('message_requests')
      .insert({
        conversation_id: conversation.id,
        sender_id: senderId,
        recipient_id: recipientId,
        status: 'pending',
        relevance_score: relevanceScore,
      })
      .returning('*');

    await outbox.emitMessagingEvent(
      {
        aggregateType: 'message_request',
        aggregateId: request.id,
        eventType: 'message_request.created',
        payload: { recipientId, requestId: request.id },
      },
      trx
    );

    return { conversationId: conversation.id, isRequest: true, requestId: request.id };
  });

  // Sending the first message MUST happen after the transaction above
  // commits — sendMessage's own membership check queries via the plain `db`
  // connection, which can't see conversation_participants rows inserted but
  // not yet committed inside `trx` (real bug found and fixed here: the
  // previous in-transaction call threw "Conversation not found" every time).
  if (firstMessageBody?.trim()) {
    const message = await messagingService.sendMessage(senderId, result.conversationId, { body: firstMessageBody });
    await db('message_requests')
      .where({ id: result.requestId })
      .update({ safety_label: message.safety_label || null, safety_confidence: message.safety_confidence || null });
  }

  const sender = await db('users').where({ id: senderId }).first('first_name', 'last_name');
  await notify({
    userId: recipientId,
    actorId: senderId,
    type: 'message_request.created',
    payload: { actorName: sender ? `${sender.first_name} ${sender.last_name}` : 'Someone', deepLink: '/app/message-requests' },
  });

  return result;
}

export async function listMessageRequests(userId, status) {
  let query = db('message_requests as mr')
    .join('conversations as c', 'c.id', 'mr.conversation_id')
    .leftJoin('users as u', 'u.id', 'mr.sender_id')
    .leftJoin('profiles as p', 'p.user_id', 'mr.sender_id')
    .where('mr.recipient_id', userId);

  if (status) query = query.andWhere('mr.status', status);

  return query
    .orderBy('mr.created_at', 'desc')
    .select(
      'mr.id',
      'mr.conversation_id',
      'mr.sender_id',
      'mr.recipient_id',
      'mr.status',
      'mr.relevance_score',
      'mr.safety_label',
      'mr.safety_confidence',
      'mr.created_at',
      'mr.decided_at',
      'u.first_name as sender_first_name',
      'u.last_name as sender_last_name',
      'u.headline as sender_headline',
      'p.avatar_url as sender_avatar_url',
      'p.industry as sender_industry',
      'p.location as sender_location'
    );
}

async function getOwnedPendingRequest(userId, requestId) {
  const request = await db('message_requests').where({ id: requestId }).first();
  if (!request) throw new AppError('Message request not found', 404);
  if (request.recipient_id !== userId) throw new AppError('Message request not found', 404);
  if (request.status !== 'pending') throw new AppError('Message request already decided', 422);
  return request;
}

export async function acceptMessageRequest(userId, requestId) {
  const request = await getOwnedPendingRequest(userId, requestId);

  return db.transaction(async (trx) => {
    const [updated] = await trx('message_requests')
      .where({ id: requestId })
      .update({ status: 'accepted', decided_at: trx.fn.now() })
      .returning('*');
    await trx('conversations').where({ id: request.conversation_id }).update({ is_request: false });
    return updated;
  });
}

export async function declineMessageRequest(userId, requestId) {
  await getOwnedPendingRequest(userId, requestId);
  const [updated] = await db('message_requests')
    .where({ id: requestId })
    .update({ status: 'declined', decided_at: db.fn.now() })
    .returning('*');
  return updated;
}

// requester_id/addressee_id ordering follows connections.service.js's own
// convention of not normalizing pair order — mirrors how connection rows are
// created elsewhere in the codebase (requester = the acting user).
export async function blockMessageRequest(userId, requestId) {
  const request = await getOwnedPendingRequest(userId, requestId);

  return db.transaction(async (trx) => {
    const [updated] = await trx('message_requests')
      .where({ id: requestId })
      .update({ status: 'blocked', decided_at: trx.fn.now() })
      .returning('*');

    const existingConnection = await trx('connections')
      .where((qb) =>
        qb
          .where({ requester_id: userId, addressee_id: request.sender_id })
          .orWhere({ requester_id: request.sender_id, addressee_id: userId })
      )
      .first();

    if (existingConnection) {
      await trx('connections').where({ id: existingConnection.id }).update({ status: 'blocked' });
    } else {
      await trx('connections').insert({ requester_id: userId, addressee_id: request.sender_id, status: 'blocked' });
    }

    return updated;
  });
}

export async function markSpamMessageRequest(userId, requestId) {
  await getOwnedPendingRequest(userId, requestId);
  const [updated] = await db('message_requests')
    .where({ id: requestId })
    .update({ status: 'spam', decided_at: db.fn.now() })
    .returning('*');
  return updated;
}
