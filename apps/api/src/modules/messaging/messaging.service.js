import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import * as messagingAi from '../ai/messagingAi.service.js';
import * as aiGovernance from '../ai/aiGovernance.service.js';

const TABLE = 'conversations';
const POSTGRES_UNIQUE_VIOLATION = '23505';

export async function list({ limit = 20, offset = 0 } = {}) {
  return db(TABLE).select('*').orderBy('created_at', 'desc').limit(limit).offset(offset);
}

export async function getById(id) {
  const record = await db(TABLE).where({ id }).first();
  if (!record) throw new AppError('messaging not found', 404);
  return record;
}

export async function create(data) {
  const [record] = await db(TABLE).insert(data).returning('*');
  return record;
}

export async function update(id, data) {
  const [record] = await db(TABLE).where({ id }).update(data).returning('*');
  if (!record) throw new AppError('messaging not found', 404);
  return record;
}

export async function remove(id) {
  const count = await db(TABLE).where({ id }).del();
  if (!count) throw new AppError('messaging not found', 404);
}

export async function listConversations(userId, { contextType } = {}) {
  let query = db('conversations as c')
    .join('conversation_participants as cp', 'cp.conversation_id', 'c.id')
    .where('cp.user_id', userId)
    .whereNull('cp.archived_at')
    // Pending message requests live in the dedicated Message Requests inbox
    // (message_requests table / GET /message-requests) until accepted, not
    // the normal conversation list.
    .andWhere('c.is_request', false);

  if (contextType) query = query.andWhere('c.context_type', contextType);

  const conversations = await query.select(
    'c.id',
    'c.is_group',
    'c.type',
    'c.topic',
    'c.is_public',
    'c.title',
    'c.context_type',
    'c.context_id',
    'c.is_request',
    'c.created_at',
    'cp.last_read_at',
    'cp.is_pinned',
    'cp.is_muted'
  );

  if (!conversations.length) return [];
  const ids = conversations.map((c) => c.id);

  const [participants, lastMessages, unreadRows] = await Promise.all([
    db('conversation_participants as cp')
      .whereIn('cp.conversation_id', ids)
      .join('users as u', 'u.id', 'cp.user_id')
      .select('cp.conversation_id', 'u.id as user_id', 'u.first_name', 'u.last_name'),
    db('messages as m')
      .whereIn('m.conversation_id', ids)
      .whereNotExists(function notExists() {
        this.select(1).from('messages as m2').whereRaw('m2.conversation_id = m.conversation_id').andWhereRaw('m2.created_at > m.created_at');
      }),
    db('messages as m')
      .join('conversation_participants as cp', function j() {
        this.on('cp.conversation_id', '=', 'm.conversation_id').andOn('cp.user_id', '=', db.raw('?', [userId]));
      })
      .whereIn('m.conversation_id', ids)
      .andWhere('m.sender_id', '!=', userId)
      .andWhere((qb) => qb.whereNull('cp.last_read_at').orWhereRaw('m.created_at > cp.last_read_at'))
      .groupBy('m.conversation_id')
      .select('m.conversation_id')
      .count('m.id as count'),
  ]);

  const participantsByConv = {};
  for (const p of participants) (participantsByConv[p.conversation_id] ||= []).push(p);
  const lastMessageByConv = Object.fromEntries(lastMessages.map((m) => [m.conversation_id, m]));
  const unreadByConv = Object.fromEntries(unreadRows.map((u) => [u.conversation_id, Number(u.count)]));

  return conversations
    .map((c) => {
      const others = (participantsByConv[c.id] || []).filter((p) => p.user_id !== userId);
      const title = c.title || others.map((o) => `${o.first_name} ${o.last_name}`).join(', ') || 'Conversation';
      const last = lastMessageByConv[c.id];
      return {
        id: c.id,
        isGroup: c.is_group,
        type: c.type,
        topic: c.topic,
        isPublic: c.is_public,
        title,
        contextType: c.context_type,
        contextId: c.context_id,
        isPinned: c.is_pinned,
        isMuted: c.is_muted,
        participants: others.map((o) => ({ id: o.user_id, name: `${o.first_name} ${o.last_name}` })),
        lastMessage: last ? { body: last.body, createdAt: last.created_at, senderId: last.sender_id } : null,
        unreadCount: unreadByConv[c.id] || 0,
        updatedAt: last?.created_at || c.created_at,
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// DMs are always 2 participants and groups are capped to keep the mesh
// signaling (calls.js) and read-receipt fan-out affordable; public channels
// are exempt since they're designed for open, larger-scale membership.
const MAX_GROUP_PARTICIPANTS = 50;

/**
 * Creates a group ('group') or public channel ('channel') conversation.
 * DMs continue to go through getOrCreateDirectConversation below.
 */
export async function createConversation(userId, { type = 'group', title, topic, isPublic = false, participantIds = [] } = {}) {
  if (!['group', 'channel'].includes(type)) {
    throw new AppError('type must be "group" or "channel"', 422);
  }

  const uniqueParticipantIds = Array.from(new Set([userId, ...participantIds]));

  if (type === 'group' && uniqueParticipantIds.length > MAX_GROUP_PARTICIPANTS) {
    throw new AppError(`Groups are limited to ${MAX_GROUP_PARTICIPANTS} participants`, 422);
  }

  return db.transaction(async (trx) => {
    const [conversation] = await trx('conversations')
      .insert({
        is_group: type === 'group',
        type,
        title: title || null,
        topic: topic || null,
        is_public: type === 'channel' ? Boolean(isPublic) : false,
      })
      .returning('*');

    await trx('conversation_participants').insert(
      uniqueParticipantIds.map((participantId) => ({ conversation_id: conversation.id, user_id: participantId }))
    );

    return conversation;
  });
}

/**
 * Public channels (type='channel', is_public=true) the given user has not
 * already joined — for a "discover channels" list.
 */
export async function listPublicChannels(userId, { limit = 20, offset = 0 } = {}) {
  return db('conversations as c')
    .where({ 'c.type': 'channel', 'c.is_public': true })
    .whereNotExists(function notExists() {
      this.select(1)
        .from('conversation_participants as cp')
        .whereRaw('cp.conversation_id = c.id')
        .andWhere('cp.user_id', userId);
    })
    .orderBy('c.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select('c.id', 'c.title', 'c.topic', 'c.is_public', 'c.type', 'c.created_at');
}

export async function joinChannel(userId, conversationId) {
  const conversation = await db('conversations').where({ id: conversationId }).first();
  if (!conversation) throw new AppError('Channel not found', 404);
  if (conversation.type !== 'channel' || !conversation.is_public) {
    throw new AppError('This conversation is not a joinable public channel', 422);
  }

  const existing = await db('conversation_participants').where({ conversation_id: conversationId, user_id: userId }).first();
  if (existing) return conversation;

  await db('conversation_participants').insert({ conversation_id: conversationId, user_id: userId });
  return conversation;
}

export async function getOrCreateDirectConversation(userId, otherUserId) {
  const existing = await db('conversation_participants as a')
    .join('conversation_participants as b', 'a.conversation_id', 'b.conversation_id')
    .join('conversations as c', 'c.id', 'a.conversation_id')
    .where({ 'a.user_id': userId, 'b.user_id': otherUserId, 'c.is_group': false })
    .first('c.id');
  if (existing) return existing.id;

  return db.transaction(async (trx) => {
    const [conv] = await trx('conversations').insert({ is_group: false }).returning('id');
    await trx('conversation_participants').insert([
      { conversation_id: conv.id, user_id: userId },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);
    return conv.id;
  });
}

export async function getMessages(userId, conversationId, { limit = 30 } = {}) {
  const participant = await db('conversation_participants').where({ conversation_id: conversationId, user_id: userId }).first();
  if (!participant) throw new AppError('Conversation not found', 404);

  const rows = await db('messages as m')
    .where({ conversation_id: conversationId })
    .leftJoin('users as u', 'u.id', 'm.sender_id')
    .orderBy('m.created_at', 'asc')
    .limit(limit)
    .select(
      'm.id',
      'm.body',
      'm.sender_id',
      'm.attachments',
      'm.created_at',
      'm.edited_at',
      'm.reply_to_message_id',
      'm.client_message_id',
      'm.status',
      'm.message_type',
      'm.safety_label',
      'm.safety_confidence',
      'u.first_name',
      'u.last_name'
    );

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    senderId: r.sender_id,
    senderName: `${r.first_name} ${r.last_name}`,
    attachments: r.attachments,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    replyToMessageId: r.reply_to_message_id,
    clientMessageId: r.client_message_id,
    status: r.status,
    messageType: r.message_type,
    safetyLabel: r.safety_label,
    safetyConfidence: r.safety_confidence,
  }));
}

/**
 * Accepts either a bare string body (kept for callers still on the old
 * signature) or an options object. Idempotent when clientMessageId is
 * given: a retried send with the same (conversationId, clientMessageId)
 * returns the original row instead of erroring or duplicating.
 */
export async function sendMessage(userId, conversationId, bodyOrOptions) {
  const opts = typeof bodyOrOptions === 'string' ? { body: bodyOrOptions } : bodyOrOptions || {};
  const { body, attachments = [], clientMessageId = null, replyToMessageId = null } = opts;

  if (!body?.trim()) throw new AppError('Message cannot be empty', 422);
  const participant = await db('conversation_participants').where({ conversation_id: conversationId, user_id: userId }).first();
  if (!participant) throw new AppError('Conversation not found', 404);

  let message;
  try {
    [message] = await db('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body,
        attachments: JSON.stringify(attachments),
        client_message_id: clientMessageId,
        reply_to_message_id: replyToMessageId,
      })
      .returning('*');
  } catch (err) {
    if (clientMessageId && err?.code === POSTGRES_UNIQUE_VIOLATION) {
      const existing = await db('messages').where({ conversation_id: conversationId, client_message_id: clientMessageId }).first();
      if (existing) return existing;
    }
    throw err;
  }

  await db('conversations').where({ id: conversationId }).update({ last_message_id: message.id, last_message_at: message.created_at });

  // Best-effort safety classification — never fails the send. On failure the
  // columns are simply left null; messagingAi.classifySafety itself always
  // resolves (falls back to the rules-based classifier), so this try/catch
  // is only a defensive backstop.
  try {
    const safety = await messagingAi.classifySafety(body);
    if (safety.ok) {
      await db('messages').where({ id: message.id }).update({ safety_label: safety.label, safety_confidence: safety.confidence });
      message.safety_label = safety.label;
      message.safety_confidence = safety.confidence;
    }
    // Only a real model call (not the rules-v1 fallback) burns tokens/is
    // worth recording as AI usage/audit — the deterministic fallback is free
    // and isn't a model invocation.
    if (safety.model) {
      await aiGovernance.recordUsage({
        userId,
        model: safety.model,
        inputTokens: safety.usage?.prompt_tokens || 0,
        outputTokens: safety.usage?.completion_tokens || 0,
        success: safety.ok,
      });
      await aiGovernance.recordAuditEvent({
        actorId: userId,
        eventType: 'message.safety_classification',
        messageId: message.id,
        model: safety.model,
        riskScore: safety.label === 'safe' ? 0 : safety.confidence,
        policyDecision: safety.label === 'safe' ? 'allow' : 'escalate',
        groundingJson: { label: safety.label, classifierVersion: safety.classifierVersion },
      });
    }
  } catch {
    // leave safety fields null — usage/audit recording is best-effort too
  }

  // @Name mention parsing against the conversation's actual participants
  // (case-insensitive full-name match) — best-effort, never fails the send.
  try {
    const mentionCandidates = Array.from(body.matchAll(/@([A-Za-z][\w'-]*(?:\s+[A-Za-z][\w'-]*)?)/g)).map((m) =>
      m[1].trim().toLowerCase()
    );
    if (mentionCandidates.length) {
      const participants = await db('conversation_participants as cp')
        .join('users as u', 'u.id', 'cp.user_id')
        .where('cp.conversation_id', conversationId)
        .select('u.id', 'u.first_name', 'u.last_name');

      const matchedIds = new Set();
      for (const p of participants) {
        const fullName = `${p.first_name} ${p.last_name}`.trim().toLowerCase();
        if (mentionCandidates.includes(fullName)) matchedIds.add(p.id);
      }
      if (matchedIds.size) {
        await db('message_mentions')
          .insert(Array.from(matchedIds).map((mentionedUserId) => ({ message_id: message.id, mentioned_user_id: mentionedUserId })))
          .onConflict(['message_id', 'mentioned_user_id'])
          .ignore();
      }
    }
  } catch {
    // mention parsing is a nice-to-have — never fails the send
  }

  await db('conversation_participants').where({ conversation_id: conversationId, user_id: userId }).update({ last_read_at: db.fn.now() });

  return message;
}

export async function markConversationRead(userId, conversationId) {
  await db('conversation_participants').where({ conversation_id: conversationId, user_id: userId }).update({ last_read_at: db.fn.now() });
}

/**
 * Total unread messages across every conversation the user participates in:
 * messages sent by someone else, after the participant's last_read_at
 * (or since the conversation began if they've never read it).
 */
export async function getUnreadCount(userId) {
  const row = await db('messages as m')
    .join('conversation_participants as cp', function join() {
      this.on('cp.conversation_id', '=', 'm.conversation_id').andOn('cp.user_id', '=', db.raw('?', [userId]));
    })
    .where('m.sender_id', '!=', userId)
    .andWhere((qb) => qb.whereNull('cp.last_read_at').orWhereRaw('m.created_at > cp.last_read_at'))
    .count('m.id as count')
    .first();
  return Number(row?.count || 0);
}

async function assertParticipant(userId, conversationId) {
  const participant = await db('conversation_participants').where({ conversation_id: conversationId, user_id: userId }).first();
  if (!participant) throw new AppError('Conversation not found', 404);
  return participant;
}

async function getMessageConversationId(messageId) {
  const message = await db('messages').where({ id: messageId }).first('id', 'conversation_id');
  if (!message) throw new AppError('Message not found', 404);
  return message.conversation_id;
}

export async function addReaction(userId, messageId, reaction) {
  if (!reaction?.trim()) throw new AppError('reaction is required', 422);
  const conversationId = await getMessageConversationId(messageId);
  await assertParticipant(userId, conversationId);

  await db('message_reactions')
    .insert({ message_id: messageId, user_id: userId, reaction })
    .onConflict(['message_id', 'user_id', 'reaction'])
    .ignore();

  return { messageId, userId, reaction, conversationId };
}

export async function removeReaction(userId, messageId, reaction) {
  const conversationId = await getMessageConversationId(messageId);
  await assertParticipant(userId, conversationId);

  await db('message_reactions').where({ message_id: messageId, user_id: userId, reaction }).del();
  return { messageId, userId, reaction, conversationId };
}

export async function pinMessage(userId, conversationId, messageId) {
  await assertParticipant(userId, conversationId);
  const message = await db('messages').where({ id: messageId, conversation_id: conversationId }).first();
  if (!message) throw new AppError('Message not found', 404);

  const [pin] = await db('message_pins')
    .insert({ conversation_id: conversationId, message_id: messageId, pinned_by: userId })
    .onConflict(['conversation_id', 'message_id'])
    .merge({ pinned_by: userId })
    .returning('*');
  return pin;
}

export async function unpinMessage(userId, conversationId, messageId) {
  await assertParticipant(userId, conversationId);
  await db('message_pins').where({ conversation_id: conversationId, message_id: messageId }).del();
}

export async function getPinnedMessages(conversationId) {
  return db('message_pins as mp')
    .join('messages as m', 'm.id', 'mp.message_id')
    .leftJoin('users as u', 'u.id', 'm.sender_id')
    .where('mp.conversation_id', conversationId)
    .orderBy('mp.pinned_at', 'desc')
    .select(
      'm.id',
      'm.body',
      'm.sender_id',
      'm.created_at',
      'mp.pinned_by',
      'mp.pinned_at',
      'u.first_name',
      'u.last_name'
    );
}

/**
 * Updates only the CALLING user's own conversation_participants row — never
 * accepts a target user id, so it can't be used to mutate someone else's
 * pin/mute state.
 */
export async function setConversationParticipantFlags(userId, conversationId, { isPinned, isMuted } = {}) {
  await assertParticipant(userId, conversationId);
  const patch = {};
  if (typeof isPinned === 'boolean') patch.is_pinned = isPinned;
  if (typeof isMuted === 'boolean') patch.is_muted = isMuted;
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);

  const [row] = await db('conversation_participants').where({ conversation_id: conversationId, user_id: userId }).update(patch).returning('*');
  return row;
}

export async function createPoll(userId, conversationId, { question, options, closesAt } = {}) {
  await assertParticipant(userId, conversationId);
  if (!question?.trim()) throw new AppError('question is required', 422);
  if (!Array.isArray(options) || options.length < 2 || options.length > 10 || options.some((o) => !o?.trim())) {
    throw new AppError('options must be an array of 2-10 non-empty strings', 422);
  }

  return db.transaction(async (trx) => {
    const [message] = await trx('messages')
      .insert({ conversation_id: conversationId, sender_id: userId, body: question, message_type: 'poll' })
      .returning('*');

    const [poll] = await trx('message_polls')
      .insert({ message_id: message.id, question, options: JSON.stringify(options), closes_at: closesAt || null })
      .returning('*');

    await trx('conversations').where({ id: conversationId }).update({ last_message_id: message.id, last_message_at: message.created_at });

    return { ...poll, messageId: message.id };
  });
}

export async function votePoll(userId, pollId, optionIndex) {
  const poll = await db('message_polls').where({ id: pollId }).first();
  if (!poll) throw new AppError('Poll not found', 404);
  const conversationId = await getMessageConversationId(poll.message_id);
  await assertParticipant(userId, conversationId);

  const options = Array.isArray(poll.options) ? poll.options : JSON.parse(poll.options || '[]');
  const index = Number(optionIndex);
  if (!Number.isInteger(index) || index < 0 || index >= options.length) {
    throw new AppError('optionIndex out of range', 422);
  }

  await db('message_poll_votes')
    .insert({ poll_id: pollId, user_id: userId, option_index: index })
    .onConflict(['poll_id', 'user_id'])
    .merge({ option_index: index });

  return getPollResults(pollId);
}

export async function getPollResults(pollId) {
  const poll = await db('message_polls').where({ id: pollId }).first();
  if (!poll) throw new AppError('Poll not found', 404);
  const options = Array.isArray(poll.options) ? poll.options : JSON.parse(poll.options || '[]');

  const tallies = await db('message_poll_votes').where({ poll_id: pollId }).groupBy('option_index').select('option_index').count('id as count');
  const countByIndex = Object.fromEntries(tallies.map((t) => [t.option_index, Number(t.count)]));

  const votes = options.map((_, index) => ({ optionIndex: index, count: countByIndex[index] || 0 }));
  const totalVotes = votes.reduce((sum, v) => sum + v.count, 0);

  return { pollId, question: poll.question, options, votes, totalVotes, closesAt: poll.closes_at };
}

/**
 * v1 relevance heuristic: mutual-accepted-connections count only, normalized
 * to 0-1. This intentionally does NOT reach into profiles/company/industry
 * data — those columns don't exist on the current users/profiles tables —
 * and is documented here as a starting point to extend once
 * profile-similarity or company-match signals become available.
 */
export async function computeRelevanceScore(userId, otherUserId) {
  const [mineRows, theirRows] = await Promise.all([
    db('connections')
      .where('status', 'accepted')
      .andWhere((qb) => qb.where('requester_id', userId).orWhere('addressee_id', userId))
      .select('requester_id', 'addressee_id'),
    db('connections')
      .where('status', 'accepted')
      .andWhere((qb) => qb.where('requester_id', otherUserId).orWhere('addressee_id', otherUserId))
      .select('requester_id', 'addressee_id'),
  ]);

  const mineSet = new Set(mineRows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id)));
  const theirSet = new Set(theirRows.map((r) => (r.requester_id === otherUserId ? r.addressee_id : r.requester_id)));
  mineSet.delete(otherUserId);
  theirSet.delete(userId);

  let mutualCount = 0;
  for (const id of mineSet) if (theirSet.has(id)) mutualCount += 1;

  return Math.min(1, mutualCount / 10);
}

export async function listGroupChats(userId) {
  const conversations = await listConversations(userId);
  return conversations.filter((c) => c.type === 'group');
}

const URL_PATTERN = /https?:\/\/[^\s)]+/gi;

export async function getConversationDetail(userId, conversationId) {
  await assertParticipant(userId, conversationId);

  const messages = await db('messages')
    .where({ conversation_id: conversationId })
    .orderBy('created_at', 'desc')
    .limit(500)
    .select('id', 'sender_id', 'body', 'attachments', 'created_at');

  const sharedFiles = [];
  const seenUrls = new Set();
  const sharedLinks = [];

  for (const m of messages) {
    const attachments = Array.isArray(m.attachments) ? m.attachments : m.attachments ? JSON.parse(m.attachments) : [];
    for (const att of attachments) {
      sharedFiles.push({ messageId: m.id, senderId: m.sender_id, createdAt: m.created_at, ...att });
    }
    const urls = String(m.body || '').match(URL_PATTERN) || [];
    for (const url of urls) {
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      sharedLinks.push({ url, messageId: m.id, senderId: m.sender_id, createdAt: m.created_at });
    }
  }

  const [reactions, pins, recentMessages] = await Promise.all([
    db('message_reactions as mr')
      .join('messages as m', 'm.id', 'mr.message_id')
      .where('m.conversation_id', conversationId)
      .orderBy('mr.created_at', 'desc')
      .limit(10)
      .select('mr.user_id as actor_id', 'mr.reaction', 'mr.created_at as timestamp'),
    db('message_pins').where({ conversation_id: conversationId }).orderBy('pinned_at', 'desc').limit(10).select('pinned_by as actor_id', 'pinned_at as timestamp'),
    db('messages').where({ conversation_id: conversationId }).orderBy('created_at', 'desc').limit(10).select('sender_id as actor_id', 'created_at as timestamp'),
  ]);

  const recentActivity = [
    ...reactions.map((r) => ({ actorId: r.actor_id, action: 'reacted', reaction: r.reaction, timestamp: r.timestamp })),
    ...pins.map((p) => ({ actorId: p.actor_id, action: 'pinned', timestamp: p.timestamp })),
    ...recentMessages.map((m) => ({ actorId: m.actor_id, action: 'messaged', timestamp: m.timestamp })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  return { sharedFiles, sharedLinks, recentActivity };
}
