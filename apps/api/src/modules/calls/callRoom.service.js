import { randomUUID } from 'node:crypto';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { config } from '../../config/index.js';
import * as livekit from './livekitGateway.js';
import * as outbox from '../../common/events/outbox.js';

async function assertConversationMember(userId, conversationId) {
  const row = await db('conversation_participants').where({ conversation_id: conversationId, user_id: userId }).first();
  if (!row) throw new AppError('Conversation not found', 404);
}

async function assertMeetingParticipant(userId, meetingId) {
  const meeting = await db('meetings').where({ id: meetingId }).first();
  if (!meeting) throw new AppError('Meeting not found', 404);
  if (meeting.host_user_id === userId) return meeting;
  const row = await db('meeting_participants').where({ meeting_id: meetingId, user_id: userId }).first();
  if (!row) throw new AppError('Meeting not found', 404);
  return meeting;
}

async function getUserSummary(userId) {
  const user = await db('users as u')
    .leftJoin('profiles as p', 'p.user_id', 'u.id')
    .where('u.id', userId)
    .first('u.id', 'u.first_name', 'u.last_name', 'p.avatar_url');
  if (!user) return { id: userId, name: 'Unknown' };
  return { id: user.id, name: `${user.first_name} ${user.last_name}`, avatarUrl: user.avatar_url || null };
}

/**
 * Finds the active call room for a conversation/meeting, creating one if
 * none exists (idempotent — "Join" always converges on one active room).
 * Meetings take priority when both are supplied (a meeting's own linked
 * conversation should never fork a second, conversation-keyed room).
 */
async function getOrCreateCallRoom({ conversationId = null, meetingId = null, createdBy }) {
  const existing = meetingId
    ? await db('call_rooms').where({ status: 'active', meeting_id: meetingId }).first()
    : await db('call_rooms').where({ status: 'active', conversation_id: conversationId }).first();
  if (existing) return existing;

  const providerRoomId = `gigvora-${randomUUID()}`;
  await livekit.ensureRoom(providerRoomId);

  const [room] = await db('call_rooms')
    .insert({ conversation_id: conversationId, meeting_id: meetingId, provider: 'livekit', provider_room_id: providerRoomId, created_by: createdBy })
    .returning('*');
  return room;
}

/** Verifies membership of whatever the call room is attached to, then returns {room, joinToken, url}. */
export async function joinCall(userId, { conversationId, meetingId }) {
  if (!conversationId && !meetingId) throw new AppError('conversationId or meetingId is required', 422);
  if (conversationId) await assertConversationMember(userId, conversationId);
  let meeting = null;
  if (meetingId) meeting = await assertMeetingParticipant(userId, meetingId);

  const room = await getOrCreateCallRoom({ conversationId, meetingId, createdBy: userId });
  const isHost = Boolean(meeting && meeting.host_user_id === userId);
  const userSummary = await getUserSummary(userId);

  if (!livekit.isConfigured()) {
    throw new AppError('Calling is temporarily unavailable — the media server is not configured.', 503, { reason: 'livekit_not_configured' });
  }

  const token = await livekit.createJoinToken({
    roomName: room.provider_room_id,
    userId,
    userName: userSummary.name,
    role: isHost ? 'host' : 'participant',
  });

  const existingParticipant = await db('call_participants').where({ call_id: room.id, user_id: userId }).whereNull('left_at').first();
  if (!existingParticipant) {
    await db('call_participants').insert({ call_id: room.id, user_id: userId, role: isHost ? 'host' : 'participant' });
  }

  if (meetingId && meeting.status === 'scheduled') {
    await db('meetings').where({ id: meetingId }).update({ status: 'live', updated_at: db.fn.now() });
  }

  const eventConversationId = conversationId || meeting?.conversation_id;
  if (eventConversationId) {
    await outbox.emitMessagingEvent({
      aggregateType: 'conversation',
      aggregateId: eventConversationId,
      eventType: 'call.participant.joined',
      payload: { callId: room.id, userId, user: userSummary },
    });
  }

  return {
    callId: room.id,
    provider: 'livekit',
    url: config.livekit.url,
    token,
    roomName: room.provider_room_id,
    isHost,
  };
}

export async function leaveCall(userId, callId) {
  const room = await db('call_rooms').where({ id: callId }).first();
  if (!room) throw new AppError('Call not found', 404);

  await db('call_participants').where({ call_id: callId, user_id: userId }).whereNull('left_at').update({ left_at: db.fn.now() });

  const remaining = await db('call_participants').where({ call_id: callId }).whereNull('left_at').count('id as count').first();
  const conversationId = room.conversation_id || (room.meeting_id ? (await db('meetings').where({ id: room.meeting_id }).first('conversation_id'))?.conversation_id : null);

  if (Number(remaining.count) === 0) {
    await db('call_rooms').where({ id: callId }).update({ status: 'ended', ended_at: db.fn.now() });
    await livekit.endRoom(room.provider_room_id);
  }

  if (conversationId) {
    await outbox.emitMessagingEvent({
      aggregateType: 'conversation',
      aggregateId: conversationId,
      eventType: 'call.participant.left',
      payload: { callId, userId },
    });
  }
}

export async function endCallForHost(userId, callId) {
  const room = await db('call_rooms').where({ id: callId }).first();
  if (!room) throw new AppError('Call not found', 404);
  if (room.created_by !== userId) {
    const hostRow = await db('call_participants').where({ call_id: callId, user_id: userId, role: 'host' }).first();
    if (!hostRow) throw new AppError('Only the host can end this call for everyone', 403);
  }

  await db('call_participants').where({ call_id: callId }).whereNull('left_at').update({ left_at: db.fn.now() });
  await db('call_rooms').where({ id: callId }).update({ status: 'ended', ended_at: db.fn.now() });
  await livekit.endRoom(room.provider_room_id);

  const conversationId = room.conversation_id || (room.meeting_id ? (await db('meetings').where({ id: room.meeting_id }).first('conversation_id'))?.conversation_id : null);
  if (conversationId) {
    await outbox.emitMessagingEvent({ aggregateType: 'conversation', aggregateId: conversationId, eventType: 'call.state.updated', payload: { callId, status: 'ended' } });
  }
}

export async function getCallInfo(userId, callId) {
  const room = await db('call_rooms').where({ id: callId }).first();
  if (!room) throw new AppError('Call not found', 404);

  if (room.conversation_id) {
    await assertConversationMember(userId, room.conversation_id);
  } else if (room.meeting_id) {
    await assertMeetingParticipant(userId, room.meeting_id);
  } else if (room.created_by !== userId) {
    throw new AppError('Call not found', 404);
  }

  const participants = await livekit.listParticipants(room.provider_room_id);
  const dbParticipants = await db('call_participants as cp')
    .join('users as u', 'u.id', 'cp.user_id')
    .where({ 'cp.call_id': callId })
    .whereNull('cp.left_at')
    .select('u.id', 'u.first_name', 'u.last_name', 'cp.role', 'cp.joined_at');
  return { room, livekitParticipants: participants, participants: dbParticipants };
}
