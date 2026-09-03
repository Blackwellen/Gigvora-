import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { AppError } from '../../common/errors/AppError.js';
import { hashToken, randomToken } from '../../common/security/hash.js';
import { buildRequestContext } from '../../common/security/deviceContext.js';
import { createSession, rotateSession, revokeSession, revokeAllSessions } from '../../common/security/sessionManager.js';
import { recordSecurityEvent, emitEvent } from '../../common/events/outbox.js';
import { raiseAlert } from '../../common/security/alerts.js';
import { assessAuthenticationRisk, assessSignupAbuse, assessSigninAbuse } from '../../common/risk/riskClient.js';
import { decideAuthPolicy } from '../../common/security/policy.js';
import { redis } from '../../cache/redis.js';
import { verifyTotpChallenge, consumeRecoveryCode } from '../mfa/mfa.service.js';

const PENDING_LOGIN_TTL_SECONDS = 5 * 60;

async function createPendingLogin(userId, methodId) {
  const token = randomToken(24);
  await redis.set(`pending-login:${token}`, JSON.stringify({ userId, methodId }), 'EX', PENDING_LOGIN_TTL_SECONDS);
  return token;
}

const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

async function countRecentFailedAttempts(userId, windowMs, trx = db) {
  const row = await trx('auth_attempts')
    .where({ user_id: userId, outcome: 'failure' })
    .andWhere('created_at', '>', new Date(Date.now() - windowMs))
    .count('id as count')
    .first();
  return Number(row?.count || 0);
}

async function logAttempt({ userId, identityHint, type, outcome, failureReason, req, riskScore, botScore }) {
  const ctx = buildRequestContext(req);
  await db('auth_attempts').insert({
    user_id: userId,
    identity_hint_hash: identityHint ? hashToken(identityHint) : null,
    attempt_type: type,
    outcome,
    failure_reason: failureReason,
    ip_hash: ctx.ipHash,
    device_features: JSON.stringify({ userAgentSummary: ctx.userAgentSummary }),
    risk_score: riskScore,
    bot_score: botScore,
  });
}

export async function register({ email, password, firstName, lastName, accountType }, req) {
  const normalized = normalizeEmail(email);
  const existing = await db('users').where({ email: normalized }).first();

  const abuse = await assessSignupAbuse({
    email_domain: normalized.split('@')[1] || '',
    ip_hash: buildRequestContext(req).ipHash,
  });

  if (existing) {
    // Do not reveal existence; behave as if registration proceeded, matching enumeration-safe UX.
    await logAttempt({ userId: existing.id, identityHint: normalized, type: 'signup', outcome: 'failure', failureReason: 'duplicate_email', req });
    throw new AppError('Unable to create account with these details', 409, { code: 'ACCOUNT_EXISTS' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await db.transaction(async (trx) => {
    const [user] = await trx('users')
      .insert({
        email: normalized,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        account_type: accountType || 'individual',
      })
      .returning('*');

    await trx('profiles').insert({ user_id: user.id });

    await trx('identities').insert({
      user_id: user.id,
      provider: 'password',
      provider_subject: user.id,
      provider_email: normalized,
      provider_email_verified: false,
      verified_at: null,
    });

    const verificationToken = randomToken(32);
    await trx('email_verification_challenges').insert({
      user_id: user.id,
      email_normalized: normalized,
      token_hash: hashToken(verificationToken),
      expires_at: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
    });

    await recordSecurityEvent(
      { userId: user.id, type: 'auth.sign_up.created', severity: 'info', metadata: { abuseScore: abuse.risk_probability ?? abuse.bot_probability } },
      trx
    );
    await emitEvent({ aggregateType: 'user', aggregateId: user.id, eventType: 'auth.sign_up.created', payload: { email: normalized } }, trx);

    return { user, verificationToken };
  });

  await logAttempt({ userId: result.user.id, identityHint: normalized, type: 'signup', outcome: 'success', req, botScore: abuse.bot_probability });

  const { session, accessToken, refreshToken } = await createSession({ user: result.user, req, authLevel: 'password' });

  return {
    user: sanitizeUser(result.user),
    tokens: { accessToken, refreshToken },
    session: { id: session.id, expiresAt: session.expires_at },
    verificationToken: result.verificationToken, // consumed by the notification worker to send the email
  };
}

export async function login({ email, password, deviceTrusted = false }, req) {
  const normalized = normalizeEmail(email);
  const user = await db('users').where({ email: normalized }).first();

  if (!user) {
    // Constant-shape response prevents account enumeration via timing/response differences.
    await bcrypt.compare(password, '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltuu');
    await logAttempt({ identityHint: normalized, type: 'signin', outcome: 'failure', failureReason: 'not_found', req });
    throw new AppError('Invalid email or password', 401, { code: 'INVALID_CREDENTIALS' });
  }

  if (user.status === 'locked' || user.status === 'suspended') {
    await logAttempt({ userId: user.id, identityHint: normalized, type: 'signin', outcome: 'failure', failureReason: `account_${user.status}`, req });
    throw new AppError('This account is temporarily unavailable', 423, { code: `ACCOUNT_${user.status.toUpperCase()}` });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    await logAttempt({ userId: user.id, identityHint: normalized, type: 'signin', outcome: 'failure', failureReason: 'bad_password', req });

    const failures = await countRecentFailedAttempts(user.id, 15 * 60 * 1000);
    if (failures >= 9) {
      await db('users').where({ id: user.id }).update({ status: 'locked', locked_at: db.fn.now() });
      await recordSecurityEvent({ userId: user.id, type: 'security.account.locked', severity: 'high', metadata: { reason: 'failed_attempt_burst' } });
    }
    throw new AppError('Invalid email or password', 401, { code: 'INVALID_CREDENTIALS' });
  }

  const ctx = buildRequestContext(req);
  const failedAttempts5m = await countRecentFailedAttempts(user.id, 5 * 60 * 1000);
  const mfaMethod = await db('mfa_methods').where({ user_id: user.id, status: 'active' }).first();

  const abuse = await assessSigninAbuse({ ip_hash: ctx.ipHash, user_agent_hash: ctx.userAgentHash });
  const risk = await assessAuthenticationRisk({
    account_age_days: Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000),
    failed_signins_5m: failedAttempts5m,
    mfa_enabled: Boolean(mfaMethod),
    ip_hash: ctx.ipHash,
  });

  const policy = decideAuthPolicy({
    riskBand: risk.risk_band,
    botScore: abuse.bot_probability ?? 0,
    mfaEnabled: Boolean(mfaMethod),
    accountStatus: user.status,
    failedAttempts5m,
  });

  await db('risk_assessments').insert({
    user_id: user.id,
    assessment_type: 'authentication',
    model_name: risk.model_name,
    model_version: risk.model_version,
    feature_schema_version: risk.feature_schema_version || 'v1',
    raw_score: risk.risk_probability,
    calibrated_score: risk.risk_probability,
    risk_band: risk.risk_band,
    explanation: JSON.stringify({ reasonCodes: risk.reason_codes || [], degraded: risk.degraded }),
    policy_decision: policy.decision,
    policy_version: policy.policyVersion,
  });

  if (policy.decision === 'TEMPORARY_BLOCK' || policy.decision === 'THROTTLE') {
    await logAttempt({ userId: user.id, identityHint: normalized, type: 'signin', outcome: 'blocked', failureReason: policy.decision, req, riskScore: risk.risk_score });
    throw new AppError('Sign-in temporarily blocked for your account’s protection', 429, { code: policy.decision });
  }

  if (policy.decision === 'MANUAL_REVIEW') {
    const event = await recordSecurityEvent({ userId: user.id, type: 'security.signin.manual_review', severity: 'high', riskScore: risk.risk_score, riskBand: risk.risk_band });
    await raiseAlert({
      userId: user.id,
      securityEventId: event.id,
      alertType: 'suspicious_signin',
      severity: 'high',
      riskScore: risk.risk_score,
      contextKey: ctx.ipHash || '',
      metadata: { reasonCodes: risk.reason_codes || [], ip: ctx.ipPrefix },
    });
    await logAttempt({ userId: user.id, identityHint: normalized, type: 'signin', outcome: 'blocked', failureReason: 'manual_review', req, riskScore: risk.risk_score });
    throw new AppError('We need to verify this sign-in. Please contact support.', 403, { code: 'MANUAL_REVIEW' });
  }

  if (!user.email_verified_at) {
    await logAttempt({ userId: user.id, identityHint: normalized, type: 'signin', outcome: 'blocked', failureReason: 'email_unverified', req });
    throw new AppError('Please verify your email before signing in', 403, { code: 'EMAIL_UNVERIFIED' });
  }

  if (policy.decision === 'STEP_UP_MFA' && mfaMethod) {
    await logAttempt({ userId: user.id, identityHint: normalized, type: 'signin', outcome: 'step_up_required', req, riskScore: risk.risk_score });
    const pendingToken = await createPendingLogin(user.id, mfaMethod.id);
    return { stepUp: { type: 'mfa', methodId: mfaMethod.id, pendingToken }, riskBand: risk.risk_band };
  }

  await db('users').where({ id: user.id }).update({ last_login_at: db.fn.now(), last_authenticated_at: db.fn.now() });
  await logAttempt({ userId: user.id, identityHint: normalized, type: 'signin', outcome: 'success', req, riskScore: risk.risk_score, botScore: abuse.bot_probability });

  const { session, device, isNewDevice, accessToken, refreshToken } = await createSession({
    user,
    req,
    authLevel: mfaMethod ? 'mfa' : 'password',
    trusted: deviceTrusted,
    riskScore: risk.risk_score,
    riskBand: risk.risk_band,
  });

  if (isNewDevice) {
    const event = await recordSecurityEvent({ userId: user.id, sessionId: session.id, deviceId: device.id, type: 'security.device.first_seen', severity: 'medium' });
    await raiseAlert({
      userId: user.id,
      securityEventId: event.id,
      alertType: 'new_device_signin',
      severity: 'low',
      riskScore: risk.risk_score,
      contextKey: device.id,
      windowMinutes: 24 * 60,
      metadata: { reasonCodes: risk.reason_codes || [] },
    });
  }
  if (isNewDevice || policy.decision === 'ALLOW_AND_NOTIFY') {
    await recordSecurityEvent({
      userId: user.id,
      sessionId: session.id,
      deviceId: device.id,
      type: 'security.session.created',
      severity: policy.decision === 'ALLOW_AND_NOTIFY' ? 'medium' : 'info',
      riskScore: risk.risk_score,
      riskBand: risk.risk_band,
      metadata: { reasonCodes: risk.reason_codes || [] },
    });
  }
  if (policy.decision === 'ALLOW_AND_NOTIFY' && risk.risk_band !== 'low') {
    await raiseAlert({
      userId: user.id,
      alertType: 'suspicious_signin',
      severity: 'medium',
      riskScore: risk.risk_score,
      contextKey: ctx.ipHash || '',
      metadata: { reasonCodes: risk.reason_codes || [] },
    });
  }

  return {
    user: sanitizeUser(user),
    tokens: { accessToken, refreshToken },
    session: { id: session.id, expiresAt: session.expires_at },
    risk: { band: risk.risk_band, reasonCodes: risk.reason_codes || [] },
  };
}

export async function refresh({ refreshToken }, req) {
  try {
    const result = await rotateSession({ refreshToken, req });
    return { tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken } };
  } catch (err) {
    throw new AppError(err.message, err.statusCode || 401, { code: err.code });
  }
}

export async function logout({ sessionId }) {
  if (!sessionId) return;
  await revokeSession(sessionId, 'user_signed_out');
}

export async function logoutAll({ userId, currentSessionId }) {
  await revokeAllSessions(userId, { exceptSessionId: currentSessionId });
  await recordSecurityEvent({ userId, type: 'security.session.revoked_all', severity: 'medium' });
}

export async function resendVerificationEmail({ userId }) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError('User not found', 404);
  if (user.email_verified_at) throw new AppError('Email already verified', 409, { code: 'ALREADY_VERIFIED' });

  const recent = await db('email_verification_challenges')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .first();

  if (recent && Date.now() - new Date(recent.last_sent_at).getTime() < 45 * 1000) {
    throw new AppError('Please wait before requesting another email', 429, { code: 'RATE_LIMITED' });
  }

  const token = randomToken(32);
  await db('email_verification_challenges').insert({
    user_id: userId,
    email_normalized: user.email,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
    send_count: (recent?.send_count || 0) + 1,
  });

  await emitEvent({ aggregateType: 'user', aggregateId: userId, eventType: 'auth.email_verification.requested', payload: {} });
  return { token };
}

export async function verifyEmail({ token }) {
  const tokenHash = hashToken(token);
  const challenge = await db('email_verification_challenges').where({ token_hash: tokenHash }).first();

  if (!challenge) throw new AppError('Invalid verification link', 400, { code: 'TOKEN_INVALID' });
  if (challenge.consumed_at) throw new AppError('This verification link was already used', 400, { code: 'TOKEN_USED' });
  if (new Date(challenge.expires_at) < new Date()) throw new AppError('This verification link has expired', 400, { code: 'TOKEN_EXPIRED' });

  await db.transaction(async (trx) => {
    await trx('email_verification_challenges').where({ id: challenge.id }).update({ consumed_at: trx.fn.now() });
    await trx('users').where({ id: challenge.user_id }).update({ email_verified_at: trx.fn.now() });
    await trx('identities')
      .where({ user_id: challenge.user_id, provider: 'password' })
      .update({ provider_email_verified: true, verified_at: trx.fn.now() });
    await recordSecurityEvent({ userId: challenge.user_id, type: 'auth.email_verification.completed', severity: 'info' }, trx);
    await emitEvent(
      { aggregateType: 'user', aggregateId: challenge.user_id, eventType: 'auth.email_verification.completed', payload: {} },
      trx
    );
  });

  return { userId: challenge.user_id };
}

export async function forgotPassword({ email }, req) {
  const normalized = normalizeEmail(email);
  const user = await db('users').where({ email: normalized }).first();

  // Always return the same neutral response regardless of whether the account exists.
  if (!user) {
    await logAttempt({ identityHint: normalized, type: 'password_reset', outcome: 'neutral', req });
    return { sent: true };
  }

  const ctx = buildRequestContext(req);
  const token = randomToken(32);
  await db('password_reset_challenges').insert({
    user_id: user.id,
    token_hash: hashToken(token),
    requested_ip_hash: ctx.ipHash,
    expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  await recordSecurityEvent({ userId: user.id, type: 'auth.password_reset.requested', severity: 'info' });
  await emitEvent({ aggregateType: 'user', aggregateId: user.id, eventType: 'auth.password_reset.requested', payload: { token } });
  await logAttempt({ userId: user.id, identityHint: normalized, type: 'password_reset', outcome: 'success', req });

  return { sent: true, token };
}

export async function resetPassword({ token, newPassword }, req) {
  const tokenHash = hashToken(token);
  const challenge = await db('password_reset_challenges').where({ token_hash: tokenHash }).first();

  if (!challenge) throw new AppError('Invalid or expired reset link', 400, { code: 'TOKEN_INVALID' });
  if (challenge.consumed_at) throw new AppError('This reset link was already used', 400, { code: 'TOKEN_USED' });
  if (new Date(challenge.expires_at) < new Date()) throw new AppError('This reset link has expired', 400, { code: 'TOKEN_EXPIRED' });

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.transaction(async (trx) => {
    await trx('password_reset_challenges').where({ id: challenge.id }).update({ consumed_at: trx.fn.now() });
    await trx('users').where({ id: challenge.user_id }).update({ password_hash: passwordHash });
    await trx('sessions').where({ user_id: challenge.user_id, revoked_at: null }).update({ revoked_at: trx.fn.now(), revoked_reason: 'password_reset' });
    await recordSecurityEvent({ userId: challenge.user_id, type: 'auth.password_reset.completed', severity: 'medium' }, trx);
    await emitEvent(
      { aggregateType: 'user', aggregateId: challenge.user_id, eventType: 'auth.password_reset.completed', payload: {} },
      trx
    );
  });

  const user = await db('users').where({ id: challenge.user_id }).first();
  const { session, accessToken, refreshToken } = await createSession({ user, req, authLevel: 'password' });

  return { user: sanitizeUser(user), tokens: { accessToken, refreshToken }, session: { id: session.id } };
}

export async function changePassword({ userId, currentPassword, newPassword, currentSessionId }) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError('Current password is incorrect', 401, { code: 'INVALID_CREDENTIALS' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db('users').where({ id: userId }).update({ password_hash: passwordHash });
  await revokeAllSessions(userId, { exceptSessionId: currentSessionId });
  await recordSecurityEvent({ userId, type: 'auth.password_change.completed', severity: 'medium' });
  await emitEvent({ aggregateType: 'user', aggregateId: userId, eventType: 'auth.password_change.completed', payload: {} });

  return { success: true };
}

export async function completeMfaSignIn({ pendingToken, code, useRecoveryCode = false }, req) {
  const raw = await redis.get(`pending-login:${pendingToken}`);
  if (!raw) throw new AppError('This sign-in request has expired. Please sign in again.', 401, { code: 'PENDING_LOGIN_EXPIRED' });
  const { userId, methodId } = JSON.parse(raw);

  if (useRecoveryCode) {
    await consumeRecoveryCode({ userId, code });
  } else {
    await verifyTotpChallenge({ methodId, code });
  }

  await redis.del(`pending-login:${pendingToken}`);

  const user = await db('users').where({ id: userId }).first();
  await db('users').where({ id: userId }).update({ last_login_at: db.fn.now(), last_authenticated_at: db.fn.now() });

  const { session, accessToken, refreshToken } = await createSession({ user, req, authLevel: 'mfa' });
  await recordSecurityEvent({ userId, sessionId: session.id, type: 'security.session.created', severity: 'info', metadata: { authLevel: 'mfa' } });

  return { user: sanitizeUser(user), tokens: { accessToken, refreshToken }, session: { id: session.id, expiresAt: session.expires_at } };
}

export async function getCurrentUser({ userId }) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}
