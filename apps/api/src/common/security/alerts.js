import { sha256Hex } from './hash.js';
import { emitEvent } from '../events/outbox.js';
import { db } from '../../db/connection.js';

const TITLES = {
  'suspicious_signin': 'Suspicious sign-in from new location',
  'impossible_travel': 'Impossible travel detected',
  'unfamiliar_device': 'Unusual device login',
  'mfa_failure_burst': 'Excessive failed MFA attempts',
  'risky_recovery': 'Risky account recovery attempt',
  'risky_password_reset': 'Password reset from risky network',
  'credential_stuffing': 'Credential stuffing signal detected',
  'bot_abuse': 'Automated/bot abuse signal detected',
  'new_device_signin': 'New device sign-in',
  'geo_velocity': 'Multiple geo-location changes',
};

/**
 * Groups related low-level security signals into a single alert instead of one row per event,
 * using a time-bounded fingerprint so a burst of the same signal for the same user/context collapses.
 */
export async function raiseAlert({ userId, securityEventId, alertType, severity = 'medium', riskScore, contextKey = '', windowMinutes = 60, metadata = {} }, trx = db) {
  const bucket = Math.floor(Date.now() / (windowMinutes * 60 * 1000));
  const fingerprint = sha256Hex(`${userId}|${alertType}|${contextKey}|${bucket}`);

  const existing = await trx('security_alerts').where({ fingerprint }).first();

  if (existing) {
    // A resolved/dismissed alert re-triggering within the same time bucket means the signal
    // recurred — reopen it rather than erroring on the fingerprint's unique constraint.
    const [updated] = await trx('security_alerts')
      .where({ id: existing.id })
      .update({
        status: 'open',
        occurrence_count: existing.occurrence_count + 1,
        last_seen_at: trx.fn.now(),
        risk_score: riskScore ?? existing.risk_score,
        resolved_at: null,
        resolved_by: null,
        resolution_reason: null,
        updated_at: trx.fn.now(),
      })
      .returning('*');
    await emitEvent({ aggregateType: 'security_alert', aggregateId: updated.id, eventType: 'security.alert.updated', payload: { alertType, userId: updated.user_id } }, trx);
    return updated;
  }

  const [alert] = await trx('security_alerts')
    .insert({
      user_id: userId,
      security_event_id: securityEventId,
      alert_type: alertType,
      fingerprint,
      severity,
      risk_score: riskScore,
      title: TITLES[alertType] || alertType,
      summary: metadata.summary || null,
      metadata: JSON.stringify(metadata),
    })
    .returning('*');

  await emitEvent({ aggregateType: 'security_alert', aggregateId: alert.id, eventType: 'security.alert.created', payload: { alertType, severity, userId } }, trx);
  return alert;
}
