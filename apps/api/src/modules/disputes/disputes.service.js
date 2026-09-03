// Generic disputes engine — domain-agnostic. See registry.js for how it
// learns who the parties/resolver are for a given object_type without
// importing anything domain-specific itself.
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { uploadObject } from '../../storage/s3.js';
import { scanBuffer } from '../../security/malwareScanner.js';
import { getDisputeHandler } from './registry.js';

const VALID_TRANSITIONS = {
  opened: ['evidence_submitted', 'under_review', 'closed'],
  evidence_submitted: ['evidence_submitted', 'under_review', 'closed'],
  under_review: ['resolved_client', 'resolved_professional', 'resolved_split'],
  resolved_client: ['closed'],
  resolved_professional: ['closed'],
  resolved_split: ['closed'],
  closed: [],
};
const RESOLUTION_STAGES = new Set(['resolved_client', 'resolved_professional', 'resolved_split']);

function serialize(row) {
  return {
    id: row.id,
    objectType: row.object_type,
    objectId: row.object_id,
    raisedBy: row.raised_by,
    againstUserId: row.against_user_id,
    reason: row.reason,
    stage: row.stage,
    resolvedSplitPct: row.resolved_split_pct !== null ? Number(row.resolved_split_pct) : null,
    resolutionNote: row.resolution_note,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertParty(objectType, objectId, userId) {
  const handler = getDisputeHandler(objectType);
  const parties = await handler.getParties(objectId);
  if (userId !== parties.payerUserId && userId !== parties.payeeUserId) {
    throw new AppError('You are not a party to this dispute', 403);
  }
  return parties;
}

export async function openDispute(userId, { objectType, objectId, reason }) {
  if (!objectType || !objectId || !reason?.trim()) throw new AppError('objectType, objectId, and reason are required', 422);

  const parties = await assertParty(objectType, objectId, userId);
  const againstUserId = userId === parties.payerUserId ? parties.payeeUserId : parties.payerUserId;

  return db.transaction(async (trx) => {
    const existing = await trx('disputes').where({ object_type: objectType, object_id: objectId }).whereNotIn('stage', ['resolved_client', 'resolved_professional', 'resolved_split', 'closed']).first();
    if (existing) throw new AppError('There is already an open dispute for this item', 409, { disputeId: existing.id });

    const [dispute] = await trx('disputes').insert({ object_type: objectType, object_id: objectId, raised_by: userId, against_user_id: againstUserId, reason: reason.trim() }).returning('*');

    // A disputed payment milestone must not be releasable while contested —
    // flip it to 'disputed' in the same transaction rather than relying on
    // a caller to remember to.
    if (objectType === 'payment_milestone') {
      await trx('pm_payment_milestones').where({ id: objectId }).update({ status: 'disputed' });
    }

    await emitEvent({ aggregateType: 'dispute', aggregateId: dispute.id, eventType: 'dispute.opened', payload: { objectType, objectId, raisedBy: userId } }, trx);
    return serialize(dispute);
  });
}

export async function getDispute(disputeId, userId) {
  const dispute = await db('disputes').where({ id: disputeId }).first();
  if (!dispute) throw new AppError('Dispute not found', 404);
  const canResolve = await getDisputeHandler(dispute.object_type).canResolve(dispute.object_id, userId);
  if (userId !== dispute.raised_by && userId !== dispute.against_user_id && !canResolve) {
    throw new AppError('You do not have access to this dispute', 403);
  }
  return { ...serialize(dispute), canResolve };
}

export async function listDisputesForObject(objectType, objectId, userId) {
  await assertParty(objectType, objectId, userId).catch(async (err) => {
    const canResolve = await getDisputeHandler(objectType).canResolve(objectId, userId);
    if (!canResolve) throw err;
  });
  const rows = await db('disputes').where({ object_type: objectType, object_id: objectId }).orderBy('created_at', 'desc');
  return rows.map(serialize);
}

export async function submitEvidence(disputeId, userId, { description, file }) {
  const dispute = await db('disputes').where({ id: disputeId }).first();
  if (!dispute) throw new AppError('Dispute not found', 404);
  if (userId !== dispute.raised_by && userId !== dispute.against_user_id) throw new AppError('You are not a party to this dispute', 403);
  if (!['opened', 'evidence_submitted', 'under_review'].includes(dispute.stage)) throw new AppError('This dispute is no longer accepting evidence', 422);
  if (!description?.trim()) throw new AppError('A description is required', 422);

  let uploaded = null;
  if (file) {
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected) throw new AppError('Could not verify file signature', 422, { code: 'SIGNATURE_NOT_ALLOWED' });
    const scanResult = await scanBuffer(file.buffer, { declaredAsDocument: true });
    if (scanResult.result !== 'clean') throw new AppError('This file failed a security scan', 422, { code: 'MALWARE_SCAN_FAILED' });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `disputes/${disputeId}/${userId}/${randomUUID()}-${safeName}`;
    await uploadObject({ key, body: file.buffer, contentType: file.mimetype });
    uploaded = { key, filename: safeName, mimeType: file.mimetype, sizeBytes: file.size };
  }

  return db.transaction(async (trx) => {
    const [evidence] = await trx('dispute_evidence')
      .insert({ dispute_id: disputeId, submitted_by: userId, description: description.trim(), object_key: uploaded?.key || null, filename: uploaded?.filename || null, mime_type: uploaded?.mimeType || null, size_bytes: uploaded?.sizeBytes || null })
      .returning('*');

    if (dispute.stage === 'opened') await trx('disputes').where({ id: disputeId }).update({ stage: 'evidence_submitted' });

    await emitEvent({ aggregateType: 'dispute', aggregateId: disputeId, eventType: 'dispute.evidence_submitted', payload: { userId } }, trx);
    return { id: evidence.id, description: evidence.description, filename: evidence.filename, createdAt: evidence.created_at };
  });
}

export async function listEvidence(disputeId, userId) {
  const dispute = await db('disputes').where({ id: disputeId }).first();
  if (!dispute) throw new AppError('Dispute not found', 404);
  const canResolve = await getDisputeHandler(dispute.object_type).canResolve(dispute.object_id, userId);
  if (userId !== dispute.raised_by && userId !== dispute.against_user_id && !canResolve) throw new AppError('You do not have access to this dispute', 403);

  const rows = await db('dispute_evidence').where({ dispute_id: disputeId }).orderBy('created_at', 'asc');
  return rows.map((r) => ({ id: r.id, submittedBy: r.submitted_by, description: r.description, filename: r.filename, objectKey: r.object_key, createdAt: r.created_at }));
}

export async function postMessage(disputeId, userId, body) {
  const dispute = await db('disputes').where({ id: disputeId }).first();
  if (!dispute) throw new AppError('Dispute not found', 404);
  const canResolve = await getDisputeHandler(dispute.object_type).canResolve(dispute.object_id, userId);
  if (userId !== dispute.raised_by && userId !== dispute.against_user_id && !canResolve) throw new AppError('You do not have access to this dispute', 403);
  if (!body?.trim()) throw new AppError('Message body is required', 422);

  const [message] = await db('dispute_messages').insert({ dispute_id: disputeId, author_id: userId, body: body.trim() }).returning('*');
  return { id: message.id, authorId: message.author_id, body: message.body, createdAt: message.created_at };
}

export async function listMessages(disputeId, userId) {
  const dispute = await db('disputes').where({ id: disputeId }).first();
  if (!dispute) throw new AppError('Dispute not found', 404);
  const canResolve = await getDisputeHandler(dispute.object_type).canResolve(dispute.object_id, userId);
  if (userId !== dispute.raised_by && userId !== dispute.against_user_id && !canResolve) throw new AppError('You do not have access to this dispute', 403);

  const rows = await db('dispute_messages').where({ dispute_id: disputeId }).orderBy('created_at', 'asc');
  return rows.map((r) => ({ id: r.id, authorId: r.author_id, body: r.body, createdAt: r.created_at }));
}

/** Either party may request escalation to review; only the registered resolver may finalize a resolution or close. */
export async function transitionDispute(disputeId, userId, { stage, resolutionNote, resolvedSplitPct }) {
  return db.transaction(async (trx) => {
    const dispute = await trx('disputes').where({ id: disputeId }).forUpdate().first();
    if (!dispute) throw new AppError('Dispute not found', 404);

    const allowed = VALID_TRANSITIONS[dispute.stage] || [];
    if (!allowed.includes(stage)) throw new AppError(`Cannot move a dispute from "${dispute.stage}" to "${stage}"`, 422, { code: 'INVALID_TRANSITION', allowed });

    const isParty = userId === dispute.raised_by || userId === dispute.against_user_id;
    const canResolve = await getDisputeHandler(dispute.object_type).canResolve(dispute.object_id, userId);

    if (RESOLUTION_STAGES.has(stage) || stage === 'closed') {
      if (!canResolve) throw new AppError('Only a project manager can resolve or close this dispute', 403);
    } else if (!isParty) {
      throw new AppError('You are not a party to this dispute', 403);
    }

    if (stage === 'resolved_split' && !Number.isFinite(Number(resolvedSplitPct))) {
      throw new AppError('resolvedSplitPct is required when resolving with a split', 422);
    }

    const update = { stage };
    if (RESOLUTION_STAGES.has(stage)) {
      update.resolved_by = userId;
      update.resolved_at = trx.fn.now();
      update.resolution_note = resolutionNote || null;
      if (stage === 'resolved_split') update.resolved_split_pct = resolvedSplitPct;
    }

    const [updated] = await trx('disputes').where({ id: disputeId }).update(update).returning('*');

    // A dispute over a payment milestone resolving does NOT automatically
    // move money — it hands the outcome back to the normal release
    // workflow (payments.js), which still requires its own explicit
    // permission/idempotency/ledger steps. Only the milestone's status is
    // unblocked here so the payments.js state machine can proceed.
    if (dispute.object_type === 'payment_milestone' && RESOLUTION_STAGES.has(stage)) {
      const nextStatus = stage === 'resolved_professional' ? 'release_pending' : stage === 'resolved_client' ? 'refunded' : 'release_pending';
      await trx('pm_payment_milestones').where({ id: dispute.object_id }).update({ status: nextStatus });
    }

    await emitEvent({ aggregateType: 'dispute', aggregateId: disputeId, eventType: `dispute.${stage}`, payload: { objectType: dispute.object_type, objectId: dispute.object_id } }, trx);
    return serialize(updated);
  });
}
