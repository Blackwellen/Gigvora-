import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { hashToken, randomToken } from './hash.js';
import { buildRequestContext, upsertDevice } from './deviceContext.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, matches refresh token lifetime

function signAccessToken(user, sessionId) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, sid: sessionId }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

export async function createSession({ user, req, authLevel = 'password', trusted = false, riskScore = null, riskBand = null }, trx = db) {
  const { device, isNew: isNewDevice } = await upsertDevice({ userId: user.id, req }, trx);
  const ctx = buildRequestContext(req);
  const refreshToken = randomToken(48);
  const sessionFamilyId = randomUUID();

  const [session] = await trx('sessions')
    .insert({
      user_id: user.id,
      session_family_id: sessionFamilyId,
      refresh_token_hash: hashToken(refreshToken),
      device_id: device.id,
      ip_hash: ctx.ipHash,
      ip_prefix: ctx.ipPrefix,
      user_agent_hash: ctx.userAgentHash,
      user_agent_summary: ctx.userAgentSummary,
      auth_level: authLevel,
      risk_score: riskScore,
      risk_band: riskBand,
      trusted,
      expires_at: new Date(Date.now() + SESSION_TTL_MS),
    })
    .returning('*');

  const accessToken = signAccessToken(user, session.id);
  return { session, device, isNewDevice, accessToken, refreshToken };
}

/** Rotates a refresh token within its session family; detects reuse of an already-rotated token. */
export async function rotateSession({ refreshToken, req }, trx = db) {
  const tokenHash = hashToken(refreshToken);
  const session = await trx('sessions').where({ refresh_token_hash: tokenHash }).first();

  if (!session) {
    throw Object.assign(new Error('Invalid or reused refresh token'), { statusCode: 401, code: 'REFRESH_INVALID' });
  }
  if (session.revoked_at) {
    // Reuse of a revoked/rotated token: treat as compromise, kill the whole session family.
    await trx('sessions')
      .where({ session_family_id: session.session_family_id, revoked_at: null })
      .update({ revoked_at: trx.fn.now(), revoked_reason: 'refresh_reuse_detected' });
    throw Object.assign(new Error('Refresh token reuse detected'), { statusCode: 401, code: 'REFRESH_REUSED' });
  }
  if (new Date(session.expires_at) < new Date()) {
    throw Object.assign(new Error('Session expired'), { statusCode: 401, code: 'SESSION_EXPIRED' });
  }

  const user = await trx('users').where({ id: session.user_id }).first();
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const newRefreshToken = randomToken(48);
  const ctx = buildRequestContext(req);

  await trx('sessions').where({ id: session.id }).update({ revoked_at: trx.fn.now(), revoked_reason: 'rotated' });

  const [newSession] = await trx('sessions')
    .insert({
      user_id: user.id,
      session_family_id: session.session_family_id,
      refresh_token_hash: hashToken(newRefreshToken),
      device_id: session.device_id,
      ip_hash: ctx.ipHash,
      ip_prefix: ctx.ipPrefix,
      user_agent_hash: ctx.userAgentHash,
      user_agent_summary: ctx.userAgentSummary,
      auth_level: session.auth_level,
      trusted: session.trusted,
      expires_at: session.expires_at,
      rotated_from_session_id: session.id,
    })
    .returning('*');

  const accessToken = signAccessToken(user, newSession.id);
  return { session: newSession, user, accessToken, refreshToken: newRefreshToken };
}

export async function revokeSession(sessionId, reason = 'user_signed_out', trx = db) {
  const [session] = await trx('sessions')
    .where({ id: sessionId, revoked_at: null })
    .update({ revoked_at: trx.fn.now(), revoked_reason: reason })
    .returning('*');
  return session;
}

export async function revokeAllSessions(userId, { exceptSessionId } = {}, trx = db) {
  const query = trx('sessions').where({ user_id: userId, revoked_at: null });
  if (exceptSessionId) query.andWhereNot({ id: exceptSessionId });
  return query.update({ revoked_at: trx.fn.now(), revoked_reason: 'revoke_all' }).returning('id');
}
