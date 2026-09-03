import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent, recordSecurityEvent } from '../../common/events/outbox.js';
import { revokeAllSessions } from '../../common/security/sessionManager.js';
import { randomToken, hashToken } from '../../common/security/hash.js';

function scopeToUser(query, userId, isAdmin) {
  if (!isAdmin) return query.where('user_id', userId);
  return query;
}

export async function listAlerts({ userId, isAdmin, search, severity, status = 'open', page = 1, pageSize = 20 }) {
  let query = db('security_alerts as sa')
    .join('users', 'users.id', 'sa.user_id')
    .select('sa.*', 'users.email as user_email', 'users.first_name', 'users.last_name');

  query = scopeToUser(query, userId, isAdmin).clone();
  if (!isAdmin) query = query.where('sa.user_id', userId);
  if (status) query = query.andWhere('sa.status', status);
  if (severity) query = query.andWhere('sa.severity', severity);
  if (search) {
    query = query.andWhere((qb) => {
      qb.whereILike('sa.title', `%${search}%`).orWhereILike('users.email', `%${search}%`);
    });
  }

  const countQuery = query.clone().clearSelect().clearOrder().count('sa.id as count').first();
  const rows = await query.orderBy('sa.last_seen_at', 'desc').limit(pageSize).offset((page - 1) * pageSize);
  const { count } = await countQuery;
  return { rows, total: Number(count), page, pageSize };
}

export async function getAlert({ alertId, userId, isAdmin }) {
  let query = db('security_alerts as sa').join('users', 'users.id', 'sa.user_id').select('sa.*', 'users.email as user_email').where('sa.id', alertId);
  if (!isAdmin) query = query.andWhere('sa.user_id', userId);
  const alert = await query.first();
  if (!alert) throw new AppError('Alert not found', 404);

  const notes = await db('security_alert_notes').where({ security_alert_id: alertId }).orderBy('created_at', 'desc');
  const relatedEvents = await db('security_events').where({ user_id: alert.user_id }).orderBy('created_at', 'desc').limit(10);

  return { alert, notes, relatedEvents };
}

async function requireAlert(alertId, userId, isAdmin) {
  const query = db('security_alerts').where({ id: alertId });
  if (!isAdmin) query.andWhere({ user_id: userId });
  const alert = await query.first();
  if (!alert) throw new AppError('Alert not found', 404);
  return alert;
}

export async function resolveAlert({ alertId, userId, isAdmin, actorId, reason }) {
  const alert = await requireAlert(alertId, userId, isAdmin);
  const [updated] = await db('security_alerts')
    .where({ id: alertId })
    .update({ status: 'resolved', resolved_at: db.fn.now(), resolved_by: actorId, resolution_reason: reason || null, updated_at: db.fn.now() })
    .returning('*');
  await recordSecurityEvent({ userId: alert.user_id, type: 'security.alert.resolved', severity: 'info', actorId, actorType: isAdmin ? 'admin' : 'user' });
  await emitEvent({ aggregateType: 'security_alert', aggregateId: alertId, eventType: 'security.alert.resolved', payload: { userId: alert.user_id } });
  return updated;
}

export async function escalateAlert({ alertId, userId, isAdmin, actorId, note }) {
  const alert = await requireAlert(alertId, userId, isAdmin);
  const [updated] = await db('security_alerts')
    .where({ id: alertId })
    .update({ status: 'investigating', updated_at: db.fn.now() })
    .returning('*');
  if (note) {
    await db('security_alert_notes').insert({ security_alert_id: alertId, author_user_id: actorId, body: note });
  }
  await recordSecurityEvent({ userId: alert.user_id, type: 'security.alert.escalated', severity: 'medium', actorId, actorType: isAdmin ? 'admin' : 'user' });
  return updated;
}

export async function addAlertNote({ alertId, userId, isAdmin, actorId, body }) {
  await requireAlert(alertId, userId, isAdmin);
  const [note] = await db('security_alert_notes').insert({ security_alert_id: alertId, author_user_id: actorId, body }).returning('*');
  return note;
}

export async function forceSignOut({ alertId, userId, isAdmin, actorId }) {
  const alert = await requireAlert(alertId, userId, isAdmin);
  await revokeAllSessions(alert.user_id);
  await recordSecurityEvent({ userId: alert.user_id, type: 'security.alert.action.force_sign_out', severity: 'high', actorId, actorType: isAdmin ? 'admin' : 'user' });
  await db('security_alert_notes').insert({ security_alert_id: alertId, author_user_id: actorId, body: 'All sessions were force-signed-out in response to this alert.' });
  return { success: true };
}

export async function requirePasswordReset({ alertId, userId, isAdmin, actorId }) {
  const alert = await requireAlert(alertId, userId, isAdmin);
  const token = randomToken(32);
  await db('password_reset_challenges').insert({
    user_id: alert.user_id,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
  });
  await recordSecurityEvent({ userId: alert.user_id, type: 'security.alert.action.require_password_reset', severity: 'high', actorId, actorType: isAdmin ? 'admin' : 'user' });
  await emitEvent({ aggregateType: 'user', aggregateId: alert.user_id, eventType: 'auth.password_reset.requested', payload: { token, forced: true } });
  return { success: true, devToken: token };
}

export async function requireMfa({ alertId, userId, isAdmin, actorId }) {
  const alert = await requireAlert(alertId, userId, isAdmin);
  await db('sessions').where({ user_id: alert.user_id, revoked_at: null }).update({ auth_level: 'step_up' });
  await recordSecurityEvent({ userId: alert.user_id, type: 'security.alert.action.require_mfa', severity: 'high', actorId, actorType: isAdmin ? 'admin' : 'user' });
  return { success: true };
}

export async function dismissAlert({ alertId, userId, isAdmin, actorId }) {
  const alert = await requireAlert(alertId, userId, isAdmin);
  const [updated] = await db('security_alerts').where({ id: alertId }).update({ status: 'dismissed', updated_at: db.fn.now() }).returning('*');
  await recordSecurityEvent({ userId: alert.user_id, type: 'security.alert.dismissed', severity: 'info', actorId, actorType: isAdmin ? 'admin' : 'user' });
  return updated;
}
