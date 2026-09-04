import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { notify } from '../../modules/notifications/notify.js';
import { generateCaseNumber } from './refNumbers.js';
import { scoreSubjectRisk } from '../../common/ml/trustRiskClient.js';

// §55/§201 — server-enforced case status machine.
const ALLOWED_TRANSITIONS = {
  new: ['triaged', 'closed'],
  triaged: ['in_review', 'escalated', 'closed'],
  in_review: ['awaiting_information', 'escalated', 'action_pending', 'resolved_no_action', 'resolved_actioned'],
  awaiting_information: ['in_review', 'closed'],
  escalated: ['in_review', 'action_pending', 'resolved_no_action', 'resolved_actioned'],
  action_pending: ['resolved_actioned', 'in_review'],
  resolved_no_action: ['closed', 'reopened'],
  resolved_actioned: ['closed', 'appealed', 'reopened'],
  appealed: ['resolved_actioned', 'resolved_no_action'],
  reopened: ['in_review'],
  closed: ['reopened'],
};

// §66 — actions requiring a second, distinct approver before execution.
const DUAL_CONTROL_ACTIONS = new Set(['ACCOUNT_TERMINATION', 'VERIFICATION_REVOKED', 'PAYOUT_DELAY']);

function assertTransition(from, to) {
  if (!(ALLOWED_TRANSITIONS[from] || []).includes(to)) throw new AppError(`Cannot transition case from ${from} to ${to}`, 409);
}

export async function listCases({ status, severity, assigneeId, caseType, viewerId, queue, limit = 25, cursor }) {
  let query = db('safety_cases').select('safety_cases.*');
  if (status) query = query.andWhere('status', status);
  if (severity) query = query.andWhere('severity', severity);
  if (caseType) query = query.andWhere('case_type', caseType);
  if (queue === 'unassigned') query = query.whereNull('assignee_id');
  if (queue === 'mine') query = query.andWhere('assignee_id', viewerId);
  else if (assigneeId) query = query.andWhere('assignee_id', assigneeId);
  if (cursor) query = query.andWhere('safety_cases.created_at', '<', cursor);

  const rows = await query.orderBy('created_at', 'desc').limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const reportCounts = page.length
    ? await db('reports').whereIn('case_id', page.map((c) => c.id)).select('case_id').count({ count: '*' }).groupBy('case_id')
    : [];
  const countByCase = Object.fromEntries(reportCounts.map((r) => [r.case_id, Number(r.count)]));

  return {
    data: page.map((c) => ({ ...c, reportCount: countByCase[c.id] || 0 })),
    pageInfo: { hasMore, nextCursor: hasMore ? page[page.length - 1].created_at : null },
  };
}

export async function getCaseKpis(viewerId) {
  const [byStatus, highPriority, slaAtRisk] = await Promise.all([
    db('safety_cases').select('status').count({ count: '*' }).groupBy('status'),
    db('safety_cases').whereIn('severity', ['high', 'critical']).whereNotIn('status', ['closed']).count({ count: '*' }).first(),
    db('safety_cases').whereNotNull('target_resolution_at').andWhere('target_resolution_at', '<', db.fn.now()).whereNotIn('status', ['closed']).count({ count: '*' }).first(),
  ]);
  return {
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.count)])),
    highPriority: Number(highPriority?.count || 0),
    slaAtRisk: Number(slaAtRisk?.count || 0),
  };
}

export async function createCase({ caseType, policyCategory, severity = 'medium', subjectType, subjectId, reportIds = [] }) {
  const targetHours = { low: 72, medium: 24, high: 8, critical: 2 }[severity] || 24;
  let safetyCase;
  await db.transaction(async (trx) => {
    [safetyCase] = await trx('safety_cases')
      .insert({
        case_number: generateCaseNumber(),
        case_type: caseType,
        policy_category: policyCategory || null,
        severity,
        subject_type: subjectType,
        subject_id: subjectId,
        target_first_review_at: trx.raw(`now() + interval '${Math.min(targetHours, 4)} hours'`),
        target_resolution_at: trx.raw(`now() + interval '${targetHours} hours'`),
      })
      .returning('*');

    if (reportIds.length) await trx('reports').whereIn('id', reportIds).update({ status: 'linked', case_id: safetyCase.id });
    await trx('case_status_history').insert({ case_id: safetyCase.id, from_status: null, to_status: 'new' });
    await emitEvent({ aggregateType: 'safety_case', aggregateId: safetyCase.id, eventType: 'trust.case.created', payload: { caseType, severity } }, trx);
  });

  scoreSubjectRisk({ subjectType, subjectId }).then(async (result) => {
    if (result) await db('safety_cases').where({ id: safetyCase.id }).update({ risk_score: result.riskScore });
  }).catch(() => {});

  return safetyCase;
}

export async function getCase(caseId) {
  const safetyCase = await db('safety_cases').where({ id: caseId }).first();
  if (!safetyCase) throw new AppError('Case not found', 404);
  const [reports, history, notes, decisions, appeals] = await Promise.all([
    db('reports').where({ case_id: caseId }).select('id', 'report_number', 'reason_code', 'urgency', 'created_at'), // reporter_id intentionally excluded
    db('case_status_history').where({ case_id: caseId }).orderBy('created_at', 'desc'),
    db('case_notes').where({ case_id: caseId }).orderBy('created_at', 'desc'),
    db('case_decisions').where({ case_id: caseId }).orderBy('created_at', 'desc'),
    db('appeals').where({ case_id: caseId }),
  ]);
  return { ...safetyCase, reports, history, notes, decisions, appeals };
}

export async function transitionCase(caseId, actorId, toStatus, reason) {
  const safetyCase = await db('safety_cases').where({ id: caseId }).first();
  if (!safetyCase) throw new AppError('Case not found', 404);
  assertTransition(safetyCase.status, toStatus);

  await db.transaction(async (trx) => {
    await trx('safety_cases').where({ id: caseId }).update({
      status: toStatus,
      resolved_at: toStatus.startsWith('resolved_') ? trx.fn.now() : safetyCase.resolved_at,
      closed_at: toStatus === 'closed' ? trx.fn.now() : null,
      updated_at: trx.fn.now(),
    });
    await trx('case_status_history').insert({ case_id: caseId, from_status: safetyCase.status, to_status: toStatus, actor_id: actorId, reason: reason || null });
    await trx('trust_audit_log').insert({ actor_id: actorId, action: 'case.status_changed', object_type: 'safety_case', object_id: caseId, before: JSON.stringify({ status: safetyCase.status }), after: JSON.stringify({ status: toStatus }), reason });
    await emitEvent({ aggregateType: 'safety_case', aggregateId: caseId, eventType: 'trust.case.resolved', payload: { status: toStatus } }, trx);
  });
}

export async function assignCase(caseId, actorId, { assigneeId, team }) {
  await db('safety_cases').where({ id: caseId }).update({ assignee_id: assigneeId || null, team: team || null, updated_at: db.fn.now() });
  await emitEvent({ aggregateType: 'safety_case', aggregateId: caseId, eventType: 'trust.case.assigned', payload: { assigneeId } });
}

export async function addNote(caseId, authorId, body) {
  const [note] = await db('case_notes').insert({ case_id: caseId, author_id: authorId, body, visibility: 'internal' }).returning('*');
  return note;
}

export async function mergeCase(secondaryCaseId, primaryCaseId, actorId) {
  if (secondaryCaseId === primaryCaseId) throw new AppError('Cannot merge a case into itself', 422);
  await db.transaction(async (trx) => {
    await trx('safety_cases').where({ id: secondaryCaseId }).update({ primary_case_id: primaryCaseId, status: 'closed', closed_at: trx.fn.now() });
    await trx('reports').where({ case_id: secondaryCaseId }).update({ case_id: primaryCaseId });
    await trx('trust_audit_log').insert({ actor_id: actorId, action: 'case.merged', object_type: 'safety_case', object_id: secondaryCaseId, after: JSON.stringify({ primaryCaseId }) });
  });
}

/** §58/§59/§66 — structured decision; high-impact actions land PENDING_APPROVAL, not executed. */
const DURATION_PATTERN = /^\d+ (hours?|days?|weeks?|months?)$/;

export async function recordDecision(caseId, reviewerId, { policy, rule, finding, confidence, actionType, duration, scope, reasonCode, userExplanation, appealEligible = true }) {
  if (duration && duration !== 'permanent' && !DURATION_PATTERN.test(duration)) {
    throw new AppError("duration must be 'permanent' or match '<n> hours|days|weeks|months'", 422);
  }
  const requiresApproval = DUAL_CONTROL_ACTIONS.has(actionType);
  const [decision] = await db('case_decisions')
    .insert({
      case_id: caseId, policy, rule, finding, confidence, action_type: actionType, duration, scope,
      reviewer_id: reviewerId, reason_code: reasonCode || null, user_explanation: userExplanation || null,
      appeal_eligible: appealEligible, status: requiresApproval ? 'pending_approval' : 'approved',
    })
    .returning('*');

  if (!requiresApproval) await executeEnforcement(decision, reviewerId);
  return decision;
}

export async function approveDecision(decisionId, approverId) {
  const decision = await db('case_decisions').where({ id: decisionId }).first();
  if (!decision) throw new AppError('Decision not found', 404);
  if (decision.status !== 'pending_approval') throw new AppError('Decision is not pending approval', 409);
  if (decision.reviewer_id === approverId) throw new AppError('The approver must be different from the original reviewer (dual control)', 403);

  const [updated] = await db('case_decisions').where({ id: decisionId }).update({ approver_id: approverId, status: 'approved', updated_at: db.fn.now() }).returning('*');
  await executeEnforcement(updated, approverId);
  return updated;
}

async function executeEnforcement(decision, actorId) {
  const safetyCase = await db('safety_cases').where({ id: decision.case_id }).first();
  await db.transaction(async (trx) => {
    const [action] = await trx('enforcement_actions')
      .insert({
        decision_id: decision.id,
        subject_type: safetyCase.subject_type,
        subject_id: safetyCase.subject_id,
        action_type: decision.action_type,
        scope: decision.scope || 'account',
        ends_at: decision.duration && decision.duration !== 'permanent' ? trx.raw(`now() + interval '${decision.duration}'`) : null,
        status: 'active',
        executed_at: trx.fn.now(),
      })
      .returning('*');
    await trx('case_decisions').where({ id: decision.id }).update({ status: 'executed', updated_at: trx.fn.now() });
    await trx('trust_audit_log').insert({ actor_id: actorId, action: 'enforcement.executed', object_type: 'enforcement_action', object_id: action.id, after: JSON.stringify(action) });
    await emitEvent({ aggregateType: 'enforcement_action', aggregateId: action.id, eventType: 'trust.enforcement.executed', payload: { actionType: decision.action_type, scope: decision.scope } }, trx);
  });

  await notify({
    userId: safetyCase.subject_id,
    actorId: null,
    type: 'trust.enforcement.action',
    payload: { actionType: decision.action_type, reasonCode: decision.reason_code, userExplanation: decision.user_explanation, appealEligible: decision.appeal_eligible },
  });
}

export async function reverseEnforcement(actionId, actorId, reason) {
  const [action] = await db('enforcement_actions').where({ id: actionId }).update({ status: 'reversed', reversed_at: db.fn.now(), reversal_reason: reason }).returning('*');
  await emitEvent({ aggregateType: 'enforcement_action', aggregateId: actionId, eventType: 'trust.enforcement.reversed', payload: { reason } });
  await db('trust_audit_log').insert({ actor_id: actorId, action: 'enforcement.reversed', object_type: 'enforcement_action', object_id: actionId, reason });
  return action;
}
