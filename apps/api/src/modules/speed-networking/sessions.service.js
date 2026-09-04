import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const ROUND_DURATION_BY_FORMAT = {
  rapid_2m: 120,
  rapid_5m: 300,
  rapid_10m: 600,
  full_length: null,
};

const WRITABLE_FIELDS = {
  title: 'title',
  description: 'description',
  format: 'format',
  capacity: 'capacity',
  priceCents: 'price_cents',
  currency: 'currency',
  startsAt: 'starts_at',
  endsAt: 'ends_at',
  timezone: 'timezone',
  coverImageUrl: 'cover_image_url',
  visibility: 'visibility',
  wizardStep: 'wizard_step',
};

const MAX_CAPACITY = 200; // conservative default ceiling on concurrent pair-rooms (see plan §risks)

function buildPatch(data = {}) {
  const patch = {};
  for (const [key, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[key] !== undefined) patch[column] = data[key];
  }
  if (patch.format) {
    patch.round_duration_seconds = ROUND_DURATION_BY_FORMAT[patch.format] ?? null;
  }
  if (patch.capacity != null && (patch.capacity < 2 || patch.capacity > MAX_CAPACITY)) {
    throw new AppError(`capacity must be between 2 and ${MAX_CAPACITY}`, 422);
  }
  return patch;
}

function mapSession(s) {
  return {
    id: s.id,
    hostUserId: s.host_user_id,
    title: s.title,
    description: s.description,
    format: s.format,
    roundDurationSeconds: s.round_duration_seconds,
    capacity: s.capacity,
    priceCents: s.price_cents,
    currency: s.currency,
    stripePriceId: s.stripe_price_id,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    timezone: s.timezone,
    status: s.status,
    visibility: s.visibility,
    coverImageUrl: s.cover_image_url,
    currentRoundNumber: s.current_round_number,
    currentRoundId: s.current_round_id,
    wizardStep: s.wizard_step,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

async function getOwnedSession(hostUserId, id) {
  const session = await db('speed_networking_sessions').where({ id }).first();
  if (!session) throw new AppError('Session not found', 404);
  if (session.host_user_id !== hostUserId) throw new AppError('Session not found', 404);
  return session;
}

export async function create(hostUserId, data) {
  const { title, format } = data;
  if (!title || !format) throw new AppError('title and format are required', 422);
  if (!ROUND_DURATION_BY_FORMAT.hasOwnProperty(format)) throw new AppError('Invalid format', 422);

  const [row] = await db('speed_networking_sessions')
    .insert({
      host_user_id: hostUserId,
      title,
      format,
      round_duration_seconds: ROUND_DURATION_BY_FORMAT[format],
      starts_at: data.startsAt || db.raw("now() + interval '1 day'"),
      wizard_step: 'format',
    })
    .returning('*');

  await db('speed_networking_participants').insert({
    session_id: row.id,
    user_id: hostUserId,
    role: 'host',
    check_in_status: 'not_checked_in',
  });

  return mapSession(row);
}

export async function update(hostUserId, id, data) {
  const session = await getOwnedSession(hostUserId, id);
  if (session.status !== 'draft' && (data.format !== undefined || data.capacity !== undefined)) {
    throw new AppError('Format and capacity can only be changed while the session is a draft', 422);
  }
  const patch = buildPatch(data);
  if (Object.keys(patch).length === 0) return mapSession(session);
  patch.updated_at = db.fn.now();
  const [row] = await db('speed_networking_sessions').where({ id }).update(patch).returning('*');
  return mapSession(row);
}

export async function getById(hostUserId, id) {
  const session = await getOwnedSession(hostUserId, id);
  const [{ count: ticketCount }] = await db('speed_networking_tickets').where({ session_id: id, status: 'active' }).count({ count: '*' });
  const [{ count: checkedInCount }] = await db('speed_networking_participants').where({ session_id: id, check_in_status: 'checked_in' }).count({ count: '*' });
  return { ...mapSession(session), ticketsSold: Number(ticketCount), checkedInCount: Number(checkedInCount) };
}

export async function listMine(hostUserId) {
  const rows = await db('speed_networking_sessions').where({ host_user_id: hostUserId }).orderBy('created_at', 'desc');
  return rows.map(mapSession);
}

const REQUIRED_FOR_PUBLISH = ['title', 'format', 'starts_at'];

export async function publish(hostUserId, id) {
  const session = await getOwnedSession(hostUserId, id);
  if (session.status !== 'draft') throw new AppError('Only draft sessions can be published', 422);
  for (const field of REQUIRED_FOR_PUBLISH) {
    if (!session[field]) throw new AppError(`Cannot publish: missing ${field}`, 422);
  }
  // Stripe Price creation for price_cents > 0 lands in Phase 2 alongside checkout — free
  // sessions (price_cents = 0, the Phase 1 default) publish immediately.
  if (session.price_cents > 0 && !session.stripe_price_id) {
    throw new AppError('Paid session ticketing is not available yet in this build — publish as a free session for now', 422);
  }
  const [row] = await db('speed_networking_sessions')
    .where({ id })
    .update({ status: 'published', wizard_step: null, updated_at: db.fn.now() })
    .returning('*');
  return mapSession(row);
}

export async function remove(hostUserId, id) {
  const session = await getOwnedSession(hostUserId, id);
  if (!['draft', 'published'].includes(session.status)) {
    throw new AppError('Only draft or published (not yet started) sessions can be cancelled', 422);
  }
  const [{ count: ticketCount }] = await db('speed_networking_tickets').where({ session_id: id, status: 'active' }).count({ count: '*' });
  if (Number(ticketCount) > 0) {
    throw new AppError('Cannot cancel a session with active tickets sold — contact support for manual refund handling', 422);
  }
  await db('speed_networking_sessions').where({ id }).update({ status: 'cancelled', updated_at: db.fn.now() });
  return { id, status: 'cancelled' };
}
