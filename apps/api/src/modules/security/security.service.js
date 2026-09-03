import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { revokeSession, revokeAllSessions } from '../../common/security/sessionManager.js';
import { recordSecurityEvent, emitEvent } from '../../common/events/outbox.js';

function scopeToUser(query, userId, isAdmin) {
  if (!isAdmin) return query.where('sessions.user_id', userId);
  return query;
}

export async function listSessions({ userId, isAdmin, search, riskBand, platform, status = 'active', page = 1, pageSize = 20 }) {
  let query = db('sessions')
    .join('users', 'users.id', 'sessions.user_id')
    .leftJoin('devices', 'devices.id', 'sessions.device_id')
    .select(
      'sessions.*',
      'users.id as user_id_ref',
      'users.email as user_email',
      'users.first_name',
      'users.last_name',
      'devices.display_name as device_name',
      'devices.platform',
      'devices.device_type',
      'devices.browser_name',
      'devices.os_name'
    );

  query = scopeToUser(query, userId, isAdmin);

  if (status === 'active') query = query.whereNull('sessions.revoked_at').andWhere('sessions.expires_at', '>', new Date());
  if (status === 'revoked') query = query.whereNotNull('sessions.revoked_at');
  if (riskBand) query = query.where('sessions.risk_band', riskBand);
  if (platform) query = query.where('devices.platform', platform);
  if (search) {
    query = query.andWhere((qb) => {
      qb.whereILike('users.email', `%${search}%`).orWhereILike('devices.display_name', `%${search}%`);
    });
  }

  const countQuery = query.clone().clearSelect().clearOrder().count('sessions.id as count').first();
  const rows = await query
    .orderBy('sessions.last_seen_at', 'desc')
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const { count } = await countQuery;

  return { rows, total: Number(count), page, pageSize };
}

export async function getSession({ sessionId, userId, isAdmin }) {
  let query = db('sessions')
    .join('users', 'users.id', 'sessions.user_id')
    .leftJoin('devices', 'devices.id', 'sessions.device_id')
    .select('sessions.*', 'users.email as user_email', 'devices.*', 'sessions.id as id')
    .where('sessions.id', sessionId);
  query = scopeToUser(query, userId, isAdmin);
  const session = await query.first();
  if (!session) throw new AppError('Session not found', 404);
  return session;
}

export async function revokeSessionById({ sessionId, userId, isAdmin, actorId }) {
  const session = await getSession({ sessionId, userId, isAdmin });
  const revoked = await revokeSession(sessionId, 'manual_revoke');
  await recordSecurityEvent({ userId: session.user_id, sessionId, type: 'security.session.revoked', severity: 'info', actorId, actorType: isAdmin ? 'admin' : 'user' });
  await emitEvent({ aggregateType: 'session', aggregateId: sessionId, eventType: 'security.session.revoked', payload: { userId: session.user_id } });
  return revoked;
}

export async function revokeOtherSessions({ userId, currentSessionId }) {
  const revoked = await revokeAllSessions(userId, { exceptSessionId: currentSessionId });
  await recordSecurityEvent({ userId, type: 'security.session.revoked_all', severity: 'medium' });
  return revoked;
}

export async function listDevices({ userId, isAdmin, search, page = 1, pageSize = 20 }) {
  let query = db('devices').select('*');
  if (!isAdmin) query = query.where({ user_id: userId });
  if (search) query = query.whereILike('display_name', `%${search}%`);

  const countQuery = query.clone().clearSelect().count('id as count').first();
  const rows = await query.orderBy('last_seen_at', 'desc').limit(pageSize).offset((page - 1) * pageSize);
  const { count } = await countQuery;
  return { rows, total: Number(count), page, pageSize };
}

async function getOwnedDevice(deviceId, userId, isAdmin) {
  const query = db('devices').where({ id: deviceId });
  if (!isAdmin) query.andWhere({ user_id: userId });
  const device = await query.first();
  if (!device) throw new AppError('Device not found', 404);
  return device;
}

export async function renameDevice({ deviceId, userId, isAdmin, displayName }) {
  await getOwnedDevice(deviceId, userId, isAdmin);
  const [device] = await db('devices').where({ id: deviceId }).update({ display_name: displayName, updated_at: db.fn.now() }).returning('*');
  return device;
}

export async function trustDevice({ deviceId, userId, isAdmin }) {
  const device = await getOwnedDevice(deviceId, userId, isAdmin);
  const [updated] = await db('devices')
    .where({ id: deviceId })
    .update({ trusted_at: db.fn.now(), trust_expires_at: db.raw("now() + interval '90 days'") })
    .returning('*');
  await recordSecurityEvent({ userId: device.user_id, deviceId, type: 'security.device.trusted', severity: 'info' });
  await emitEvent({ aggregateType: 'device', aggregateId: deviceId, eventType: 'security.device.trusted', payload: { userId: device.user_id } });
  return updated;
}

export async function untrustDevice({ deviceId, userId, isAdmin }) {
  const device = await getOwnedDevice(deviceId, userId, isAdmin);
  const [updated] = await db('devices').where({ id: deviceId }).update({ trusted_at: null, trust_expires_at: null }).returning('*');
  await recordSecurityEvent({ userId: device.user_id, deviceId, type: 'security.device.untrusted', severity: 'info' });
  return updated;
}

export async function revokeDevice({ deviceId, userId, isAdmin, actorId }) {
  const device = await getOwnedDevice(deviceId, userId, isAdmin);
  await db.transaction(async (trx) => {
    await trx('devices').where({ id: deviceId }).update({ revoked_at: trx.fn.now() });
    await trx('sessions').where({ device_id: deviceId, revoked_at: null }).update({ revoked_at: trx.fn.now(), revoked_reason: 'device_revoked' });
    await recordSecurityEvent({ userId: device.user_id, deviceId, type: 'security.device.revoked', severity: 'medium', actorId, actorType: isAdmin ? 'admin' : 'user' }, trx);
    await emitEvent({ aggregateType: 'device', aggregateId: deviceId, eventType: 'security.device.revoked', payload: { userId: device.user_id } }, trx);
  });
  return { revoked: true };
}

export async function listLoginHistory({ userId, isAdmin, page = 1, pageSize = 20 }) {
  let query = db('auth_attempts').where({ attempt_type: 'signin' });
  if (!isAdmin) query = query.andWhere({ user_id: userId });
  const countQuery = query.clone().count('id as count').first();
  const rows = await query.orderBy('created_at', 'desc').limit(pageSize).offset((page - 1) * pageSize);
  const { count } = await countQuery;
  return { rows, total: Number(count), page, pageSize };
}

export async function getSecurityHealth({ userId }) {
  const user = await db('users').where({ id: userId }).first();
  const mfaCount = await db('mfa_methods').where({ user_id: userId, status: 'active' }).count('id as c').first();
  const passkeyCount = await db('passkey_credentials').where({ user_id: userId }).whereNull('revoked_at').count('id as c').first();
  const trustedDeviceCount = await db('devices').where({ user_id: userId }).whereNotNull('trusted_at').whereNull('revoked_at').count('id as c').first();
  const openHighAlerts = await db('security_alerts')
    .where({ user_id: userId, status: 'open' })
    .whereIn('severity', ['high', 'critical'])
    .count('id as c')
    .first();
  const recentReset = await db('security_events')
    .where({ user_id: userId, type: 'auth.password_reset.completed' })
    .andWhere('created_at', '>', db.raw("now() - interval '7 days'"))
    .first();

  const checks = {
    emailVerified: Boolean(user.email_verified_at),
    mfaEnabled: Number(mfaCount.c) > 0,
    passkeyRegistered: Number(passkeyCount.c) > 0,
    trustedDevices: Number(trustedDeviceCount.c),
    openHighSeverityAlerts: Number(openHighAlerts.c),
    recentPasswordReset: Boolean(recentReset),
  };

  let status = 'good';
  if (checks.openHighSeverityAlerts > 0 || !checks.emailVerified) status = 'at_risk';
  else if (!checks.mfaEnabled && !checks.passkeyRegistered) status = 'attention';

  return { status, checks };
}
