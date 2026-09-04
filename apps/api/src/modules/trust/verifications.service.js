import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { notify } from '../../modules/notifications/notify.js';
import { config } from '../../config/index.js';

const VERIFICATION_TYPES = ['identity', 'professional', 'business', 'qualification', 'employment', 'email', 'phone'];

// §200 — server-enforced state machine; a client can never jump straight to VERIFIED.
const ALLOWED_TRANSITIONS = {
  not_started: ['draft'],
  draft: ['submitted', 'cancelled'],
  submitted: ['processing', 'cancelled'],
  processing: ['action_required', 'needs_review', 'verified', 'rejected'],
  action_required: ['submitted', 'cancelled'],
  needs_review: ['verified', 'rejected'],
  verified: ['expired', 'revoked'],
  partially_verified: ['verified', 'expired', 'revoked'],
  rejected: ['draft'],
  expired: ['draft'],
  revoked: [],
  cancelled: ['draft'],
};

function assertTransition(from, to) {
  if (!(ALLOWED_TRANSITIONS[from] || []).includes(to)) {
    throw new AppError(`Cannot transition verification from ${from} to ${to}`, 409);
  }
}

export async function getOverview(subjectType, subjectId) {
  const rows = await db('verifications').where({ subject_type: subjectType, subject_id: subjectId }).orderBy('created_at', 'desc');
  const latestByType = {};
  for (const row of rows) {
    if (!latestByType[row.verification_type]) latestByType[row.verification_type] = row;
  }
  return VERIFICATION_TYPES.map((type) => {
    const row = latestByType[type];
    return row
      ? { id: row.id, verificationType: type, status: row.status, method: row.method, submittedAt: row.submitted_at, verifiedAt: row.verified_at, expiresAt: row.expires_at, reasonCode: row.reason_code }
      : { id: null, verificationType: type, status: 'not_started' };
  });
}

export async function startVerification(subjectType, subjectId, verificationType, claimData = {}) {
  if (!VERIFICATION_TYPES.includes(verificationType)) throw new AppError('Unknown verification type', 422);
  const [row] = await db('verifications')
    .insert({ subject_type: subjectType, subject_id: subjectId, verification_type: verificationType, status: 'draft', claim_data: JSON.stringify(claimData) })
    .returning('*');
  return row;
}

export async function submitVerification(verificationId, actorId, { method, provider, evidenceReference = [], claimData }) {
  const verification = await db('verifications').where({ id: verificationId }).first();
  if (!verification) throw new AppError('Verification not found', 404);
  assertTransition(verification.status, 'submitted');

  const [updated] = await db('verifications')
    .where({ id: verificationId })
    .update({
      status: 'submitted',
      method: method || verification.method,
      provider: provider || verification.provider,
      evidence_reference: JSON.stringify(evidenceReference),
      claim_data: claimData ? JSON.stringify(claimData) : verification.claim_data,
      submitted_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  await emitEvent({ aggregateType: 'verification', aggregateId: verificationId, eventType: 'trust.verification.started', payload: { verificationType: verification.verification_type } });

  // Provider handoff: real providers are not connected in this environment. Transition to
  // 'processing' immediately so the UI shows correct state; a real integration would instead
  // call the provider here and let its webhook drive the next transition (see handleWebhook).
  await db('verifications').where({ id: verificationId }).update({ status: 'processing', updated_at: db.fn.now() });
  await emitEvent({ aggregateType: 'verification', aggregateId: verificationId, eventType: 'trust.verification.submitted', payload: {} });

  return updated;
}

export async function reviewVerification(verificationId, reviewerId, { decision, reasonCode, expiresAt }) {
  const verification = await db('verifications').where({ id: verificationId }).first();
  if (!verification) throw new AppError('Verification not found', 404);
  const targetStatus = decision === 'approve' ? 'verified' : 'rejected';
  assertTransition(verification.status, targetStatus);

  await db.transaction(async (trx) => {
    await trx('verifications').where({ id: verificationId }).update({
      status: targetStatus,
      reviewer_id: reviewerId,
      reason_code: reasonCode || null,
      verified_at: targetStatus === 'verified' ? trx.fn.now() : null,
      expires_at: expiresAt || null,
      updated_at: trx.fn.now(),
    });

    if (targetStatus === 'verified') {
      await trx('trust_signals')
        .insert({
          subject_type: verification.subject_type,
          subject_id: verification.subject_id,
          signal_key: `${verification.verification_type}_verified`,
          signal_type: 'boolean',
          value: JSON.stringify(true),
          source_type: 'verification',
          source_id: verificationId,
          public_visibility: true,
          valid_until: expiresAt || null,
          computed_at: trx.fn.now(),
        })
        .onConflict(['subject_type', 'subject_id', 'signal_key'])
        .merge();
    }

    await trx('trust_audit_log').insert({ actor_id: reviewerId, action: `verification.${decision}`, object_type: 'verification', object_id: verificationId, reason: reasonCode || null });
    await emitEvent({ aggregateType: 'verification', aggregateId: verificationId, eventType: targetStatus === 'verified' ? 'trust.verification.verified' : 'trust.verification.rejected', payload: { reasonCode } }, trx);
  });

  await notify({ userId: verification.subject_id, actorId: reviewerId, type: `trust.verification.${targetStatus}`, payload: { verificationType: verification.verification_type } });
  return db('verifications').where({ id: verificationId }).first();
}

/** §199 — idempotent provider webhook: dedup by (provider, provider_event_id), signature-checked. */
export async function handleProviderWebhook({ provider, eventId, signature, rawBody, verificationId, eventType, payload }) {
  const secret = config.trustVerificationWebhookSecret || process.env.TRUST_VERIFICATION_WEBHOOK_SECRET;
  if (secret) {
    const expected = crypto.createHmac('sha256', secret).update(rawBody || '').digest('hex');
    if (!signature || signature !== expected) throw new AppError('Invalid webhook signature', 401);
  }

  const existing = eventId ? await db('verification_events').where({ provider, provider_event_id: eventId }).first() : null;
  if (existing) return { deduped: true };

  await db('verification_events').insert({ verification_id: verificationId, event_type: eventType, provider, provider_event_id: eventId || null, payload: JSON.stringify(payload || {}) });

  if (eventType === 'verification.completed') {
    const verification = await db('verifications').where({ id: verificationId }).first();
    if (verification && verification.status === 'processing') {
      const nextStatus = payload?.result === 'pass' ? 'verified' : payload?.result === 'review' ? 'needs_review' : 'rejected';
      assertTransition(verification.status, nextStatus === 'verified' ? 'needs_review' : nextStatus);
      await db('verifications').where({ id: verificationId }).update({ status: nextStatus === 'verified' ? 'needs_review' : nextStatus, updated_at: db.fn.now() });
    }
  }
  return { deduped: false };
}

/** §38 — real DNS TXT domain verification, no external provider account needed. */
export async function requestDomainVerification(subjectType, subjectId, domain) {
  const token = crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [row] = await db('domain_verifications')
    .insert({ subject_type: subjectType, subject_id: subjectId, domain, method: 'dns_txt', token_hash: tokenHash, status: 'pending_dns' })
    .returning('*');
  return { ...row, dnsRecord: { type: 'TXT', name: `_gigvora-verify.${domain}`, value: `gigvora-verify=${token}` }, token };
}

export async function checkDomainVerification(domainVerificationId, expectedToken) {
  const row = await db('domain_verifications').where({ id: domainVerificationId }).first();
  if (!row) throw new AppError('Domain verification not found', 404);

  let verified = false;
  try {
    const records = await dns.resolveTxt(`_gigvora-verify.${row.domain}`);
    const flat = records.map((r) => r.join(''));
    const expectedHash = crypto.createHash('sha256').update(expectedToken).digest('hex');
    verified = flat.some((v) => v === `gigvora-verify=${expectedToken}`) && expectedHash === row.token_hash;
  } catch {
    verified = false; // NXDOMAIN or no TXT record yet — stays pending_dns, not failed.
  }

  const [updated] = await db('domain_verifications')
    .where({ id: domainVerificationId })
    .update({ status: verified ? 'verified' : row.status, verified_at: verified ? db.fn.now() : row.verified_at, last_checked_at: db.fn.now() })
    .returning('*');

  if (verified) {
    await db('trust_signals')
      .insert({ subject_type: row.subject_type, subject_id: row.subject_id, signal_key: 'domain_verified', signal_type: 'boolean', value: JSON.stringify(true), source_type: 'verification', source_id: domainVerificationId, public_visibility: true, computed_at: db.fn.now() })
      .onConflict(['subject_type', 'subject_id', 'signal_key'])
      .merge();
    await emitEvent({ aggregateType: 'domain_verification', aggregateId: domainVerificationId, eventType: 'trust.verification.verified', payload: { domain: row.domain } });
  }

  return updated;
}
