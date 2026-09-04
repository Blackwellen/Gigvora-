import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { notify } from '../../modules/notifications/notify.js';
import { generateAppealNumber } from './refNumbers.js';

const ALLOWED_TRANSITIONS = {
  submitted: ['screening', 'withdrawn'],
  screening: ['in_review', 'denied'],
  in_review: ['awaiting_information', 'upheld', 'partially_upheld', 'denied'],
  awaiting_information: ['in_review', 'closed'],
  upheld: ['closed'],
  partially_upheld: ['closed'],
  denied: ['closed'],
  withdrawn: [],
  closed: [],
};

function assertTransition(from, to) {
  if (!(ALLOWED_TRANSITIONS[from] || []).includes(to)) throw new AppError(`Cannot transition appeal from ${from} to ${to}`, 409);
}

export async function submitAppeal(appellantId, { caseId, decisionId, reason, evidenceReference = [] }) {
  if (!reason) throw new AppError('reason is required', 422);

  if (decisionId) {
    const decision = await db('case_decisions').where({ id: decisionId }).first();
    if (!decision) throw new AppError('Decision not found', 404);
    if (!decision.appeal_eligible) throw new AppError('This decision is not eligible for appeal', 422);
    const existing = await db('appeals').where({ decision_id: decisionId, appellant_id: appellantId }).whereNotIn('status', ['closed', 'withdrawn']).first();
    if (existing) throw new AppError('An appeal is already in progress for this decision', 409);
  }

  const [appeal] = await db('appeals')
    .insert({ appeal_number: generateAppealNumber(), case_id: caseId || null, decision_id: decisionId || null, appellant_id: appellantId, reason, evidence_reference: JSON.stringify(evidenceReference) })
    .returning('*');

  if (caseId) await db('safety_cases').where({ id: caseId }).update({ status: 'appealed', updated_at: db.fn.now() });
  await emitEvent({ aggregateType: 'appeal', aggregateId: appeal.id, eventType: 'trust.appeal.created', payload: { caseId, decisionId } });
  return appeal;
}

export async function listMyAppeals(appellantId) {
  return db('appeals').where({ appellant_id: appellantId }).orderBy('submitted_at', 'desc');
}

export async function listQueue({ status, limit = 25, cursor }) {
  let query = db('appeals').select('*');
  if (status) query = query.andWhere('status', status);
  if (cursor) query = query.andWhere('submitted_at', '<', cursor);
  const rows = await query.orderBy('submitted_at', 'desc').limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  return { data: page, pageInfo: { hasMore, nextCursor: hasMore ? page[page.length - 1].submitted_at : null } };
}

export async function getAppeal(appealId, viewerId, isPlatformStaff) {
  const appeal = await db('appeals').where({ id: appealId }).first();
  if (!appeal) throw new AppError('Appeal not found', 404);
  if (!isPlatformStaff && appeal.appellant_id !== viewerId) throw new AppError('Forbidden', 403);
  return appeal;
}

export async function assignReviewer(appealId, reviewerId) {
  const appeal = await db('appeals').where({ id: appealId }).first();
  if (!appeal) throw new AppError('Appeal not found', 404);
  // §69 — independent reviewer: must differ from the original case decider.
  if (appeal.decision_id) {
    const decision = await db('case_decisions').where({ id: appeal.decision_id }).first();
    if (decision && (decision.reviewer_id === reviewerId || decision.approver_id === reviewerId)) {
      throw new AppError('The appeal reviewer must be independent of the original decision reviewer/approver', 403);
    }
  }
  await db('appeals').where({ id: appealId }).update({ assigned_reviewer_id: reviewerId, status: 'screening', review_started_at: db.fn.now(), updated_at: db.fn.now() });
}

export async function decideAppeal(appealId, reviewerId, { toStatus, outcome, outcomeReason }) {
  const appeal = await db('appeals').where({ id: appealId }).first();
  if (!appeal) throw new AppError('Appeal not found', 404);
  assertTransition(appeal.status, toStatus);

  await db.transaction(async (trx) => {
    await trx('appeals').where({ id: appealId }).update({ status: toStatus, outcome: outcome || null, outcome_reason: outcomeReason || null, decided_at: trx.fn.now(), updated_at: trx.fn.now() });
    await trx('trust_audit_log').insert({ actor_id: reviewerId, action: `appeal.${toStatus}`, object_type: 'appeal', object_id: appealId, reason: outcomeReason || null });

    if (toStatus === 'upheld' || toStatus === 'partially_upheld') {
      // §71 — corrective event other systems consume to restore capability.
      if (appeal.decision_id) {
        const decision = await trx('case_decisions').where({ id: appeal.decision_id }).first();
        if (decision) {
          const action = await trx('enforcement_actions').where({ decision_id: decision.id }).first();
          if (action && action.status === 'active') {
            await trx('enforcement_actions').where({ id: action.id }).update({ status: 'reversed', reversed_at: trx.fn.now(), reversal_reason: 'Appeal upheld' });
          }
        }
      }
      await emitEvent({ aggregateType: 'appeal', aggregateId: appealId, eventType: 'trust.appeal.upheld', payload: { decisionId: appeal.decision_id, outcome } }, trx);
    } else {
      await emitEvent({ aggregateType: 'appeal', aggregateId: appealId, eventType: 'trust.appeal.denied', payload: { outcome } }, trx);
    }
  });

  await notify({ userId: appeal.appellant_id, actorId: reviewerId, type: 'trust.appeal.decided', payload: { appealId, status: toStatus, outcome } });
  return db('appeals').where({ id: appealId }).first();
}
