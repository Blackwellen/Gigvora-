import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { AppError } from '../../common/errors/AppError.js';
import { encryptSecret, decryptSecret } from '../../common/security/secretCrypto.js';
import { hashToken, randomRecoveryCode } from '../../common/security/hash.js';
import { recordSecurityEvent, emitEvent } from '../../common/events/outbox.js';

async function requireStepUp(userId, currentPassword) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError('User not found', 404);
  const valid = await bcrypt.compare(currentPassword || '', user.password_hash);
  if (!valid) throw new AppError('Please confirm your password to continue', 401, { code: 'STEP_UP_REQUIRED' });
  return user;
}

export async function beginTotpSetup({ userId, label }) {
  const user = await db('users').where({ id: userId }).first();
  const secret = authenticator.generateSecret();

  const [method] = await db('mfa_methods')
    .insert({
      user_id: userId,
      method_type: 'totp',
      label: label || 'Authenticator app',
      secret_ref: encryptSecret(secret),
      status: 'pending',
    })
    .returning('*');

  const otpauthUrl = authenticator.keyuri(user.email, config.security.webauthnRpName, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { methodId: method.id, otpauthUrl, qrCodeDataUrl };
}

export async function verifyTotpSetup({ userId, methodId, code, deviceLabel }) {
  const method = await db('mfa_methods').where({ id: methodId, user_id: userId, method_type: 'totp' }).first();
  if (!method) throw new AppError('MFA setup not found', 404);
  if (method.status === 'active') throw new AppError('This method is already active', 409);

  const secret = decryptSecret(method.secret_ref);
  const isValid = authenticator.verify({ token: code, secret });
  if (!isValid) throw new AppError('Incorrect code. Please try again.', 400, { code: 'CODE_INVALID' });

  const codes = Array.from({ length: 10 }, () => randomRecoveryCode());

  await db.transaction(async (trx) => {
    await trx('mfa_methods')
      .where({ id: methodId })
      .update({ status: 'active', verified_at: trx.fn.now(), label: deviceLabel || method.label, last_used_at: trx.fn.now() });

    await trx('mfa_recovery_codes').insert(
      codes.map((code) => ({ user_id: userId, mfa_method_id: methodId, code_hash: hashToken(code) }))
    );

    await recordSecurityEvent({ userId, type: 'auth.mfa.enabled', severity: 'medium' }, trx);
    await emitEvent({ aggregateType: 'user', aggregateId: userId, eventType: 'auth.mfa.enabled', payload: { methodId } }, trx);
  });

  return { recoveryCodes: codes };
}

export async function verifyTotpChallenge({ methodId, code }) {
  const method = await db('mfa_methods').where({ id: methodId, method_type: 'totp', status: 'active' }).first();
  if (!method) throw new AppError('MFA method not found', 404);

  const secret = decryptSecret(method.secret_ref);
  const isValid = authenticator.verify({ token: code, secret });
  if (!isValid) {
    await recordSecurityEvent({ userId: method.user_id, type: 'auth.mfa.verification_failed', severity: 'medium' });
    throw new AppError('Incorrect code', 401, { code: 'CODE_INVALID' });
  }

  await db('mfa_methods').where({ id: methodId }).update({ last_used_at: db.fn.now() });
  return { userId: method.user_id };
}

export async function consumeRecoveryCode({ userId, code }) {
  const candidates = await db('mfa_recovery_codes').where({ user_id: userId }).whereNull('consumed_at').whereNull('revoked_at');
  const hash = hashToken(code.trim().toUpperCase());
  const match = candidates.find((c) => c.code_hash === hash);
  if (!match) throw new AppError('Invalid or already used recovery code', 401, { code: 'CODE_INVALID' });

  await db('mfa_recovery_codes').where({ id: match.id }).update({ consumed_at: db.fn.now() });
  await recordSecurityEvent({ userId, type: 'auth.mfa.recovery_code_consumed', severity: 'medium' });
  return { userId };
}

export async function regenerateRecoveryCodes({ userId, currentPassword }) {
  await requireStepUp(userId, currentPassword);

  const activeMethod = await db('mfa_methods').where({ user_id: userId, status: 'active' }).first();
  if (!activeMethod) throw new AppError('No active MFA method found', 400);

  const codes = Array.from({ length: 10 }, () => randomRecoveryCode());

  await db.transaction(async (trx) => {
    await trx('mfa_recovery_codes').where({ user_id: userId }).whereNull('consumed_at').update({ revoked_at: trx.fn.now() });
    await trx('mfa_recovery_codes').insert(
      codes.map((code) => ({ user_id: userId, mfa_method_id: activeMethod.id, code_hash: hashToken(code) }))
    );
    await recordSecurityEvent({ userId, type: 'auth.mfa.recovery_codes_regenerated', severity: 'medium' }, trx);
  });

  return { recoveryCodes: codes };
}

export async function removeMfaMethod({ userId, methodId, currentPassword }) {
  await requireStepUp(userId, currentPassword);
  const method = await db('mfa_methods').where({ id: methodId, user_id: userId }).first();
  if (!method) throw new AppError('MFA method not found', 404);

  await db.transaction(async (trx) => {
    await trx('mfa_methods').where({ id: methodId }).update({ status: 'revoked', revoked_at: trx.fn.now() });
    await recordSecurityEvent({ userId, type: 'auth.mfa.disabled', severity: 'high' }, trx);
    await emitEvent({ aggregateType: 'user', aggregateId: userId, eventType: 'auth.mfa.disabled', payload: { methodId } }, trx);
  });

  return { success: true };
}

export async function listMfaMethods({ userId }) {
  return db('mfa_methods').where({ user_id: userId }).whereNot({ status: 'revoked' }).orderBy('created_at', 'desc');
}
