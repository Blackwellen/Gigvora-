import bcrypt from 'bcryptjs';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { hashToken, randomToken } from '../../common/security/hash.js';
import { buildRequestContext } from '../../common/security/deviceContext.js';
import { assessRecoveryRisk } from '../../common/risk/riskClient.js';
import { decideRecoveryPolicy } from '../../common/security/policy.js';
import { recordSecurityEvent, emitEvent } from '../../common/events/outbox.js';
import { revokeAllSessions, createSession } from '../../common/security/sessionManager.js';
import { raiseAlert } from '../../common/security/alerts.js';

const REQUEST_TTL_MS = 30 * 60 * 1000;
const CHALLENGE_TTL_MS = 15 * 60 * 1000;

async function availableMethods(userId) {
  if (!userId) return ['support'];
  const methods = ['recovery_email', 'support'];

  const hasBackupCodes = await db('mfa_recovery_codes').where({ user_id: userId }).whereNull('consumed_at').whereNull('revoked_at').first();
  if (hasBackupCodes) methods.unshift('backup_code');

  const trustedDevice = await db('devices').where({ user_id: userId }).whereNotNull('trusted_at').whereNull('revoked_at').first();
  if (trustedDevice) methods.splice(1, 0, 'trusted_device');

  const passkey = await db('passkey_credentials').where({ user_id: userId }).whereNull('revoked_at').first();
  if (passkey) methods.splice(1, 0, 'passkey');

  return methods;
}

export async function startRecovery({ email }, req) {
  const normalized = String(email).trim().toLowerCase();
  const user = await db('users').where({ email: normalized }).first();
  const ctx = buildRequestContext(req);

  const risk = await assessRecoveryRisk({ ip_hash: ctx.ipHash, account_found: Boolean(user) });
  const policy = decideRecoveryPolicy({ riskBand: risk.risk_band, hasStrongMethod: Boolean(user) });

  const [request] = await db('account_recovery_requests')
    .insert({
      user_id: user?.id || null,
      status: policy.decision === 'MANUAL_REVIEW' ? 'pending_review' : 'verifying',
      risk_score: risk.risk_score,
      risk_band: risk.risk_band,
      requested_method: null,
      step: 2,
      review_required: policy.decision === 'MANUAL_REVIEW',
      review_reason: policy.reasons.join(','),
      expires_at: new Date(Date.now() + REQUEST_TTL_MS),
    })
    .returning('*');

  if (user) {
    await recordSecurityEvent({ userId: user.id, type: 'auth.account_recovery.started', severity: 'medium', riskScore: risk.risk_score, riskBand: risk.risk_band });
    if (policy.decision === 'MANUAL_REVIEW') {
      await raiseAlert({ userId: user.id, alertType: 'risky_recovery', severity: 'high', riskScore: risk.risk_score, contextKey: ctx.ipHash || '' });
    }
  }

  const methods = policy.decision === 'MANUAL_REVIEW' ? ['support'] : await availableMethods(user?.id);

  return { requestId: request.id, status: request.status, availableMethods: methods, riskBand: risk.risk_band };
}

async function requireRequest(requestId) {
  const request = await db('account_recovery_requests').where({ id: requestId }).first();
  if (!request) throw new AppError('Recovery request not found', 404);
  if (new Date(request.expires_at) < new Date()) throw new AppError('This recovery request has expired', 400, { code: 'REQUEST_EXPIRED' });
  return request;
}

export async function getRecoveryRequest({ requestId }) {
  const request = await requireRequest(requestId);
  const challenges = await db('account_recovery_challenges').where({ recovery_request_id: requestId }).orderBy('created_at', 'desc');
  return { request, challenges };
}

export async function beginChallenge({ requestId, method }) {
  const request = await requireRequest(requestId);
  if (request.status === 'pending_review') throw new AppError('This recovery request requires manual review', 403, { code: 'MANUAL_REVIEW' });
  if (!request.user_id) throw new AppError('No verification methods are available for this request', 400);

  let challengeHash = null;
  let devSecret = null;

  if (method === 'recovery_email' || method === 'trusted_device') {
    const token = randomToken(24);
    challengeHash = hashToken(token);
    devSecret = token;
  }

  const [challenge] = await db('account_recovery_challenges')
    .insert({
      recovery_request_id: requestId,
      challenge_type: method,
      challenge_hash: challengeHash,
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS),
    })
    .returning('*');

  await db('account_recovery_requests').where({ id: requestId }).update({ selected_method: method, step: 3, updated_at: db.fn.now() });

  if (method === 'recovery_email') {
    await emitEvent({ aggregateType: 'account_recovery_request', aggregateId: requestId, eventType: 'auth.account_recovery.challenge_issued', payload: { method } });
  }

  return { challengeId: challenge.id, method, devSecret };
}

export async function verifyChallenge({ requestId, challengeId, code }) {
  const request = await requireRequest(requestId);
  const challenge = await db('account_recovery_challenges').where({ id: challengeId, recovery_request_id: requestId }).first();
  if (!challenge) throw new AppError('Challenge not found', 404);
  if (challenge.verified_at) throw new AppError('This challenge was already completed', 400);
  if (new Date(challenge.expires_at) < new Date()) throw new AppError('This verification step expired', 400, { code: 'CHALLENGE_EXPIRED' });
  if (challenge.attempt_count >= challenge.max_attempts) throw new AppError('Too many attempts', 429, { code: 'MAX_ATTEMPTS' });

  let verified = false;

  if (challenge.challenge_type === 'backup_code') {
    const candidates = await db('mfa_recovery_codes').where({ user_id: request.user_id }).whereNull('consumed_at').whereNull('revoked_at');
    const hash = hashToken(String(code).trim().toUpperCase());
    const match = candidates.find((c) => c.code_hash === hash);
    if (match) {
      await db('mfa_recovery_codes').where({ id: match.id }).update({ consumed_at: db.fn.now() });
      verified = true;
    }
  } else if (challenge.challenge_type === 'recovery_email' || challenge.challenge_type === 'trusted_device') {
    verified = challenge.challenge_hash === hashToken(String(code).trim());
  }

  await db('account_recovery_challenges')
    .where({ id: challengeId })
    .update({ attempt_count: challenge.attempt_count + 1, verified_at: verified ? db.fn.now() : null });

  if (!verified) throw new AppError('That code was not correct', 401, { code: 'CODE_INVALID' });

  await db('account_recovery_requests').where({ id: requestId }).update({ status: 'verifying', step: 4, updated_at: db.fn.now() });
  await recordSecurityEvent({ userId: request.user_id, type: 'auth.account_recovery.challenge_verified', severity: 'medium' });

  return { verified: true };
}

export async function completeRecovery({ requestId, newPassword }, req) {
  const request = await requireRequest(requestId);
  if (!request.user_id) throw new AppError('Recovery cannot be completed for this request', 400);

  const verifiedChallenge = await db('account_recovery_challenges')
    .where({ recovery_request_id: requestId })
    .whereNotNull('verified_at')
    .first();
  if (!verifiedChallenge) throw new AppError('Please complete identity verification first', 403, { code: 'NOT_VERIFIED' });

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.transaction(async (trx) => {
    await trx('users').where({ id: request.user_id }).update({ password_hash: passwordHash, status: 'active', locked_at: null });
    await trx('account_recovery_requests').where({ id: requestId }).update({ status: 'completed', completed_at: trx.fn.now(), step: 6, updated_at: trx.fn.now() });
    await recordSecurityEvent({ userId: request.user_id, type: 'auth.account_recovery.completed', severity: 'high' }, trx);
    await emitEvent({ aggregateType: 'user', aggregateId: request.user_id, eventType: 'auth.account_recovery.completed', payload: {} }, trx);
  });

  await revokeAllSessions(request.user_id);

  const user = await db('users').where({ id: request.user_id }).first();
  const { session, accessToken, refreshToken } = await createSession({ user, req, authLevel: 'password' });

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, tokens: { accessToken, refreshToken }, session: { id: session.id } };
}
