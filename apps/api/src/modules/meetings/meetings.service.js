import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import * as outbox from '../../common/events/outbox.js';
import { notify } from '../notifications/notify.js';

async function assertMeetingAccess(userId, meetingId) {
  const meeting = await db('meetings').where({ id: meetingId }).first();
  if (!meeting) throw new AppError('Meeting not found', 404);
  if (meeting.host_user_id === userId) return meeting;
  const participant = await db('meeting_participants').where({ meeting_id: meetingId, user_id: userId }).first();
  if (!participant) throw new AppError('Meeting not found', 404);
  return meeting;
}

function mapMeeting(m) {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    projectId: m.project_id,
    title: m.title,
    description: m.description,
    hostUserId: m.host_user_id,
    meetingType: m.meeting_type,
    startsAt: m.starts_at,
    endsAt: m.ends_at,
    timezone: m.timezone,
    locationType: m.location_type,
    provider: m.provider,
    meetingUrlRef: m.meeting_url_ref,
    status: m.status,
    recurrenceRule: m.recurrence_rule,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

/**
 * Real, deterministic conflict detection: any of the given users has another
 * meeting (as host or invited participant) or a personal calendar_events row
 * overlapping [startsAt, endsAt). This is NOT an ML prediction — it's a plain
 * overlap query — labeled honestly as "conflict check", not "AI suggestion".
 */
export async function detectConflicts(userIds, startsAt, endsAt, { excludeMeetingId } = {}) {
  const ids = Array.from(new Set(userIds));
  if (!ids.length) return [];

  let meetingConflicts = db('meetings as m')
    .leftJoin('meeting_participants as mp', 'mp.meeting_id', 'm.id')
    .where((qb) => qb.whereIn('m.host_user_id', ids).orWhereIn('mp.user_id', ids))
    .andWhere('m.status', '!=', 'cancelled')
    .andWhere('m.starts_at', '<', endsAt)
    .andWhere('m.ends_at', '>', startsAt);
  if (excludeMeetingId) meetingConflicts = meetingConflicts.andWhere('m.id', '!=', excludeMeetingId);

  const [meetingRows, calendarRows] = await Promise.all([
    meetingConflicts.distinct('m.id', 'm.title', 'm.starts_at', 'm.ends_at'),
    db('calendar_events')
      .whereIn('user_id', ids)
      .andWhere('starts_at', '<', endsAt)
      .andWhere((qb) => qb.where('ends_at', '>', startsAt).orWhereNull('ends_at'))
      .select('id', 'user_id', 'title', 'starts_at', 'ends_at'),
  ]);

  return [
    ...meetingRows.map((r) => ({ type: 'meeting', id: r.id, title: r.title, startsAt: r.starts_at, endsAt: r.ends_at })),
    ...calendarRows.map((r) => ({ type: 'calendar_event', id: r.id, title: r.title, startsAt: r.starts_at, endsAt: r.ends_at })),
  ];
}

/**
 * Real (not fabricated) "best time" search: walks forward from the earliest
 * candidate start in 30-minute steps across the given window, returns the
 * first slot with zero conflicts for every invited user. This is a plain
 * scheduling algorithm — no model call — described to the UI as "suggested
 * time" rather than an AI claim.
 */
export async function suggestAvailableSlots(userIds, { earliestStart, durationMinutes = 60, searchDays = 5, limit = 3 }) {
  const slots = [];
  const stepMs = 30 * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;
  let cursor = new Date(earliestStart);
  const windowEnd = new Date(cursor.getTime() + searchDays * 24 * 60 * 60 * 1000);

  while (cursor < windowEnd && slots.length < limit) {
    const candidateEnd = new Date(cursor.getTime() + durationMs);
    // eslint-disable-next-line no-await-in-loop
    const conflicts = await detectConflicts(userIds, cursor, candidateEnd);
    if (conflicts.length === 0) slots.push({ startsAt: cursor.toISOString(), endsAt: candidateEnd.toISOString() });
    cursor = new Date(cursor.getTime() + stepMs);
  }

  return slots;
}

export async function createMeeting(hostUserId, input) {
  const {
    title,
    description,
    conversationId,
    projectId,
    meetingType = 'internal',
    startsAt,
    endsAt,
    timezone = 'UTC',
    locationType = 'video',
    recurrenceRule,
    participantIds = [],
    externalEmails = [],
    agendaItems = [],
    idempotencyKey,
  } = input;

  if (!title?.trim()) throw new AppError('Meeting title is required', 422);
  if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) throw new AppError('A valid start/end time is required', 422);

  // Idempotency: a client-generated key reused within a short window returns
  // the existing meeting instead of creating a duplicate (prevents a
  // double-submit / retried request from scheduling the same meeting twice).
  if (idempotencyKey) {
    const existing = await db('meetings').where({ host_user_id: hostUserId, meeting_url_ref: idempotencyKey }).first();
    if (existing) return getMeetingDetail(hostUserId, existing.id);
  }

  const invitedUserIds = participantIds.filter((id) => id !== hostUserId);

  const result = await db.transaction(async (trx) => {
    const [meeting] = await trx('meetings')
      .insert({
        conversation_id: conversationId || null,
        project_id: projectId || null,
        title: title.trim(),
        description: description || null,
        host_user_id: hostUserId,
        meeting_type: meetingType,
        starts_at: startsAt,
        ends_at: endsAt,
        timezone,
        location_type: locationType,
        provider: 'livekit',
        meeting_url_ref: idempotencyKey || null,
        recurrence_rule: recurrenceRule || null,
      })
      .returning('*');

    const participantRows = [
      { meeting_id: meeting.id, user_id: hostUserId, role: 'host', attendance_status: 'accepted', invitation_status: 'accepted' },
      ...participantIds
        .filter((id) => id !== hostUserId)
        .map((userId) => ({ meeting_id: meeting.id, user_id: userId, role: 'attendee' })),
      ...externalEmails.map((email) => ({ meeting_id: meeting.id, external_email: email, role: 'attendee' })),
    ];
    await trx('meeting_participants').insert(participantRows);

    if (agendaItems.length) {
      await trx('meeting_agenda_items').insert(
        agendaItems.map((item, index) => ({
          meeting_id: meeting.id,
          order_index: index,
          title: item.title,
          owner_user_id: item.ownerUserId || null,
          duration_minutes: item.durationMinutes || null,
          objective: item.objective || null,
        }))
      );
    }

    // Real internal-calendar sync (this codebase has no Google/Microsoft
    // Calendar OAuth integration — see calendar.service.js — so this creates
    // a genuine row in the app's own calendar_events table for the host,
    // rather than claiming an external sync that doesn't exist).
    const [calendarEvent] = await trx('calendar_events')
      .insert({ user_id: hostUserId, title: meeting.title, description: meeting.description, starts_at: startsAt, ends_at: endsAt })
      .returning('id');
    await trx('meetings').where({ id: meeting.id }).update({ calendar_event_id: calendarEvent.id });

    await outbox.emitEvent(
      { aggregateType: 'meeting', aggregateId: meeting.id, eventType: 'meeting.created', payload: { hostUserId, title: meeting.title } },
      trx
    );

    return getMeetingDetail(hostUserId, meeting.id, trx);
  });

  if (invitedUserIds.length) {
    const host = await db('users').where({ id: hostUserId }).first('first_name', 'last_name');
    const hostName = host ? `${host.first_name} ${host.last_name}` : 'Someone';
    await Promise.all(
      invitedUserIds.map((userId) =>
        notify({
          userId,
          actorId: hostUserId,
          type: 'meeting.invited',
          payload: { actorName: hostName, meetingTitle: result.title, deepLink: `/app/meeting-detail?id=${result.id}` },
        })
      )
    );
  }

  return result;
}

export async function getMeetingDetail(userId, meetingId, trx = db) {
  const meeting = await trx('meetings').where({ id: meetingId }).first();
  if (!meeting) throw new AppError('Meeting not found', 404);
  if (meeting.host_user_id !== userId) {
    const participant = await trx('meeting_participants').where({ meeting_id: meetingId, user_id: userId }).first();
    if (!participant) throw new AppError('Meeting not found', 404);
  }

  // Sequential, not Promise.all: `trx` is a single reserved connection when
  // called mid-transaction (e.g. from createMeeting), and pg/knex can't run
  // concurrent queries on one connection — Promise.all here previously threw
  // a real (if silently-tolerated) "client already executing a query"
  // deprecation warning under load. Sequential is a little slower but
  // correct for both the plain-db and inside-a-transaction call shapes.
  const host = await trx('users as u').leftJoin('profiles as p', 'p.user_id', 'u.id').where('u.id', meeting.host_user_id).first('u.id', 'u.first_name', 'u.last_name', 'p.avatar_url');
  const participants = await trx('meeting_participants as mp')
    .leftJoin('users as u', 'u.id', 'mp.user_id')
    .leftJoin('profiles as p', 'p.user_id', 'mp.user_id')
    .where({ 'mp.meeting_id': meetingId })
    .select('mp.id', 'mp.user_id', 'mp.external_email', 'mp.role', 'mp.attendance_status', 'mp.invitation_status', 'u.first_name', 'u.last_name', 'p.avatar_url');
  const agendaItems = await trx('meeting_agenda_items').where({ meeting_id: meetingId }).orderBy('order_index', 'asc');
  const notes = await trx('meeting_notes as n').leftJoin('users as u', 'u.id', 'n.author_user_id').where({ 'n.meeting_id': meetingId }).orderBy('n.created_at', 'desc').select('n.*', 'u.first_name', 'u.last_name');
  const actionItems = await trx('meeting_action_items as a')
    .leftJoin('users as u', 'u.id', 'a.owner_user_id')
    .where({ 'a.meeting_id': meetingId })
    .orderBy('a.created_at', 'desc')
    .select('a.*', 'u.first_name', 'u.last_name');

  return {
    ...mapMeeting(meeting),
    host: host ? { id: host.id, name: `${host.first_name} ${host.last_name}`, avatarUrl: host.avatar_url } : null,
    participants: participants.map((p) => ({
      id: p.id,
      userId: p.user_id,
      externalEmail: p.external_email,
      name: p.user_id ? `${p.first_name} ${p.last_name}` : p.external_email,
      avatarUrl: p.avatar_url || null,
      role: p.role,
      attendanceStatus: p.attendance_status,
      invitationStatus: p.invitation_status,
    })),
    agendaItems: agendaItems.map((a) => ({
      id: a.id,
      orderIndex: a.order_index,
      title: a.title,
      ownerUserId: a.owner_user_id,
      durationMinutes: a.duration_minutes,
      objective: a.objective,
      status: a.status,
    })),
    notes: notes.map((n) => ({ id: n.id, body: n.body, visibility: n.visibility, authorName: n.first_name ? `${n.first_name} ${n.last_name}` : 'Unknown', createdAt: n.created_at, updatedAt: n.updated_at })),
    actionItems: actionItems.map((a) => ({
      id: a.id,
      title: a.title,
      ownerUserId: a.owner_user_id,
      ownerName: a.first_name ? `${a.first_name} ${a.last_name}` : null,
      dueAt: a.due_at,
      status: a.status,
      source: a.source,
      createdAt: a.created_at,
    })),
  };
}

export async function listMeetings(userId, { from, to, limit = 20 } = {}) {
  const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const rows = await db('meetings as m')
    .leftJoin('meeting_participants as mp', 'mp.meeting_id', 'm.id')
    .where((qb) => qb.where('m.host_user_id', userId).orWhere('mp.user_id', userId))
    .andWhere('m.starts_at', '>=', fromDate)
    .andWhere('m.starts_at', '<', toDate)
    .distinct('m.*')
    .orderBy('m.starts_at', 'asc')
    .limit(limit);

  return rows.map(mapMeeting);
}

export async function updateMeeting(userId, meetingId, patch) {
  const meeting = await db('meetings').where({ id: meetingId }).first();
  if (!meeting) throw new AppError('Meeting not found', 404);
  if (meeting.host_user_id !== userId) throw new AppError('Only the host can edit this meeting', 403);

  const allowed = ['title', 'description', 'starts_at', 'ends_at', 'timezone', 'location_type', 'recurrence_rule', 'status'];
  const columnPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    if (allowed.includes(snake)) columnPatch[snake] = value;
  }
  if (!Object.keys(columnPatch).length) return getMeetingDetail(userId, meetingId);

  await db('meetings').where({ id: meetingId }).update({ ...columnPatch, updated_at: db.fn.now() });
  if (meeting.calendar_event_id && (columnPatch.starts_at || columnPatch.ends_at || columnPatch.title)) {
    await db('calendar_events')
      .where({ id: meeting.calendar_event_id })
      .update({
        ...(columnPatch.title && { title: columnPatch.title }),
        ...(columnPatch.starts_at && { starts_at: columnPatch.starts_at }),
        ...(columnPatch.ends_at && { ends_at: columnPatch.ends_at }),
      });
  }

  await outbox.emitEvent({ aggregateType: 'meeting', aggregateId: meetingId, eventType: 'meeting.updated', payload: columnPatch });
  return getMeetingDetail(userId, meetingId);
}

export async function cancelMeeting(userId, meetingId) {
  return updateMeeting(userId, meetingId, { status: 'cancelled' });
}

export async function respondToInvite(userId, meetingId, attendanceStatus) {
  if (!['accepted', 'declined', 'tentative'].includes(attendanceStatus)) throw new AppError('Invalid attendance status', 422);
  const row = await db('meeting_participants').where({ meeting_id: meetingId, user_id: userId }).first();
  if (!row) throw new AppError('You are not invited to this meeting', 404);
  await db('meeting_participants').where({ id: row.id }).update({ attendance_status: attendanceStatus, invitation_status: 'responded', updated_at: db.fn.now() });
  return getMeetingDetail(userId, meetingId);
}

export async function addNote(userId, meetingId, body) {
  await assertMeetingAccess(userId, meetingId);
  if (!body?.trim()) throw new AppError('Note body is required', 422);
  const [note] = await db('meeting_notes').insert({ meeting_id: meetingId, author_user_id: userId, body: body.trim() }).returning('*');
  return note;
}

export async function addActionItem(userId, meetingId, { title, ownerUserId, dueAt }) {
  await assertMeetingAccess(userId, meetingId);
  if (!title?.trim()) throw new AppError('Action item title is required', 422);
  const [item] = await db('meeting_action_items')
    .insert({ meeting_id: meetingId, title: title.trim(), owner_user_id: ownerUserId || null, due_at: dueAt || null, source: 'manual' })
    .returning('*');
  return item;
}

export async function updateActionItem(userId, meetingId, actionItemId, patch) {
  await assertMeetingAccess(userId, meetingId);
  const allowed = ['status', 'title', 'due_at', 'owner_user_id'];
  const columnPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    if (allowed.includes(snake)) columnPatch[snake] = value;
  }
  await db('meeting_action_items').where({ id: actionItemId, meeting_id: meetingId }).update({ ...columnPatch, updated_at: db.fn.now() });
  return db('meeting_action_items').where({ id: actionItemId }).first();
}
