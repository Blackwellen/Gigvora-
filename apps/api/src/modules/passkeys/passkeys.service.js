import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { redis } from '../../cache/redis.js';
import { AppError } from '../../common/errors/AppError.js';
import { createSession } from '../../common/security/sessionManager.js';
import { recordSecurityEvent, emitEvent } from '../../common/events/outbox.js';

const CHALLENGE_TTL_SECONDS = 5 * 60;
const { webauthnRpId: rpID, webauthnRpName: rpName, webauthnOrigin: origin } = config.security;

function regChallengeKey(userId) {
  return `webauthn:reg:${userId}`;
}
function authChallengeKey(token) {
  return `webauthn:auth:${token}`;
}

export async function getRegistrationOptions({ userId }) {
  const user = await db('users').where({ id: userId }).first();
  const existing = await db('passkey_credentials').where({ user_id: userId }).whereNull('revoked_at');

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(userId),
    userName: user.email,
    userDisplayName: `${user.first_name} ${user.last_name}`,
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.credential_id, transports: c.transports })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });

  await redis.set(regChallengeKey(userId), options.challenge, 'EX', CHALLENGE_TTL_SECONDS);
  return options;
}

export async function verifyRegistration({ userId, response, label }) {
  const expectedChallenge = await redis.get(regChallengeKey(userId));
  if (!expectedChallenge) throw new AppError('Registration challenge expired. Please try again.', 400, { code: 'CHALLENGE_EXPIRED' });

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new AppError('We could not verify this passkey. Please try again.', 400, { code: 'VERIFICATION_FAILED' });
  }

  const { credential, credentialDeviceType, credentialBackedUp, aaguid } = verification.registrationInfo;

  const [saved] = await db('passkey_credentials')
    .insert({
      user_id: userId,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString('base64'),
      sign_count: credential.counter,
      aaguid,
      transports: JSON.stringify(credential.transports || []),
      user_handle_ref: userId,
      backup_eligible: credentialDeviceType === 'multiDevice',
      backup_state: credentialBackedUp,
      label: label || 'Passkey',
    })
    .returning('*');

  await redis.del(regChallengeKey(userId));
  await recordSecurityEvent({ userId, type: 'auth.passkey.registered', severity: 'medium' });
  await emitEvent({ aggregateType: 'user', aggregateId: userId, eventType: 'auth.passkey.registered', payload: { credentialId: saved.id } });

  return { credential: saved };
}

export async function getAuthenticationOptions({ email } = {}) {
  let allowCredentials;
  if (email) {
    const user = await db('users').where({ email: String(email).toLowerCase() }).first();
    if (user) {
      const creds = await db('passkey_credentials').where({ user_id: user.id }).whereNull('revoked_at');
      allowCredentials = creds.map((c) => ({ id: c.credential_id, transports: c.transports }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials,
  });

  const token = options.challenge;
  await redis.set(authChallengeKey(token), options.challenge, 'EX', CHALLENGE_TTL_SECONDS);
  return options;
}

function extractClientChallenge(response) {
  const clientDataJSON = response.response?.clientDataJSON;
  if (!clientDataJSON) return null;
  const decoded = JSON.parse(Buffer.from(clientDataJSON, 'base64').toString());
  return decoded.challenge;
}

export async function verifyAuthentication({ response }, req) {
  const credentialId = response.id;
  const credential = await db('passkey_credentials').where({ credential_id: credentialId }).whereNull('revoked_at').first();
  if (!credential) throw new AppError('Passkey not recognized', 401, { code: 'CREDENTIAL_UNKNOWN' });

  const clientChallenge = extractClientChallenge(response);
  const expectedChallenge = clientChallenge && (await redis.get(authChallengeKey(clientChallenge)));
  if (!expectedChallenge) throw new AppError('Sign-in challenge expired. Please try again.', 400, { code: 'CHALLENGE_EXPIRED' });
  await redis.del(authChallengeKey(clientChallenge));

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credential_id,
      publicKey: Buffer.from(credential.public_key, 'base64'),
      counter: Number(credential.sign_count),
      transports: credential.transports,
    },
  });

  if (!verification.verified) throw new AppError('Passkey verification failed', 401, { code: 'VERIFICATION_FAILED' });

  await db('passkey_credentials')
    .where({ id: credential.id })
    .update({ sign_count: verification.authenticationInfo.newCounter, last_used_at: db.fn.now() });

  const user = await db('users').where({ id: credential.user_id }).first();
  const { session, accessToken, refreshToken } = await createSession({ user, req, authLevel: 'passkey' });

  await recordSecurityEvent({ userId: user.id, sessionId: session.id, type: 'auth.passkey.used', severity: 'info' });

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, tokens: { accessToken, refreshToken }, session: { id: session.id, expiresAt: session.expires_at } };
}

export async function listPasskeys({ userId }) {
  return db('passkey_credentials').where({ user_id: userId }).whereNull('revoked_at').orderBy('created_at', 'desc');
}

export async function renamePasskey({ userId, credentialRowId, label }) {
  const [updated] = await db('passkey_credentials')
    .where({ id: credentialRowId, user_id: userId })
    .update({ label })
    .returning('*');
  if (!updated) throw new AppError('Passkey not found', 404);
  return updated;
}

export async function removePasskey({ userId, credentialRowId }) {
  const [updated] = await db('passkey_credentials')
    .where({ id: credentialRowId, user_id: userId })
    .update({ revoked_at: db.fn.now() })
    .returning('*');
  if (!updated) throw new AppError('Passkey not found', 404);
  await recordSecurityEvent({ userId, type: 'auth.passkey.revoked', severity: 'medium' });
  await emitEvent({ aggregateType: 'user', aggregateId: userId, eventType: 'auth.passkey.revoked', payload: { credentialId: updated.id } });
  return { success: true };
}
