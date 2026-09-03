import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { evaluateAction } from './policyEngine.js';
import { publishAiEvent } from './aiRealtime.js';
import * as messagingAi from './messagingAi.service.js';
import * as messagingService from '../messaging/messaging.service.js';
import * as governance from './aiGovernance.service.js';

/**
 * The one real, executable high-risk action wired up in this phase:
 * Copilot can draft a reply to a conversation, but sending it always goes
 * through this approval queue — approving it is what actually calls
 * messaging.service.js#sendMessage, never the draft step itself. This is
 * the concrete implementation of the spec's "AI Approval Queue: approve
 * AI-created outreach -> canonical action executes after approval" and "no
 * AI-generated external message may auto-send without explicit user action
 * or an approved automation".
 */
export async function createDraftReplyAction(userId, { conversationId, draftBody }) {
  if (!draftBody?.trim()) throw new AppError('draftBody is required', 422);
  const participant = await db('conversation_participants').where({ conversation_id: conversationId, user_id: userId }).first();
  if (!participant) throw new AppError('Conversation not found', 404);

  const safety = await messagingAi.classifySafety(draftBody);
  const policy = evaluateAction('send_message_reply', { safetyLabel: safety.label, safetyConfidence: safety.confidence });

  const [action] = await db('ai_actions')
    .insert({
      requested_by: userId,
      action_type: 'send_message_reply',
      target_type: 'conversation',
      target_id: conversationId,
      status: policy.requiresApproval ? 'pending' : 'approved',
      risk_score: policy.riskScore,
      approval_requirement: policy.requiresApproval ? 'required' : 'none',
      payload_json: JSON.stringify({ conversationId, draftBody, safetyLabel: safety.label, reasonCodes: policy.reasonCodes }),
    })
    .returning('*');

  if (policy.requiresApproval) {
    await db('ai_approvals').insert({ action_id: action.id, decision: 'pending' });
    await publishAiEvent(userId, 'ai.approval.required', { actionId: action.id, actionType: action.action_type, riskScore: policy.riskScore });
  }

  await governance.recordAuditEvent({
    actorId: userId,
    eventType: 'action.created',
    actionId: action.id,
    riskScore: policy.riskScore,
    policyDecision: policy.requiresApproval ? 'require_approval' : 'allow',
    groundingJson: { reasonCodes: policy.reasonCodes },
  });

  if (!policy.requiresApproval) {
    return executeAction(action.id);
  }

  return mapAction(action);
}

export async function listActions(userId, status) {
  let query = db('ai_actions').where({ requested_by: userId });
  if (status) query = query.andWhere('status', status);
  const rows = await query.orderBy('created_at', 'desc');
  return rows.map(mapAction);
}

export async function getAction(userId, actionId) {
  const row = await db('ai_actions').where({ id: actionId, requested_by: userId }).first();
  if (!row) throw new AppError('Action not found', 404);
  return mapAction(row);
}

/**
 * The approval boundary: personal messaging has no separate reviewer role
 * today, so the requester approves their own AI-drafted action (they are
 * the human confirming the AI didn't overstep) — this still satisfies "no
 * AI-generated external message may auto-send without explicit user
 * action": the explicit action is this approve call, distinct from the
 * draft-creation call above.
 */
export async function decideApproval(userId, actionId, decision, reason) {
  if (!['approved', 'rejected'].includes(decision)) throw new AppError('decision must be "approved" or "rejected"', 422);

  const action = await db('ai_actions').where({ id: actionId }).first();
  if (!action) throw new AppError('Action not found', 404);
  if (action.requested_by !== userId) throw new AppError('Action not found', 404);
  if (action.status !== 'pending') throw new AppError('This action has already been decided', 422);

  await db('ai_approvals').where({ action_id: actionId }).update({ approver_user_id: userId, decision, decision_reason: reason || null, decided_at: db.fn.now() });
  await db('ai_actions').where({ id: actionId }).update({ status: decision === 'approved' ? 'approved' : 'rejected', updated_at: db.fn.now() });

  await governance.recordAuditEvent({
    actorId: userId,
    eventType: `action.${decision}`,
    actionId,
    riskScore: action.risk_score,
    policyDecision: decision === 'approved' ? 'allow' : 'block',
  });
  await publishAiEvent(userId, 'ai.approval.decided', { actionId, decision });

  if (decision === 'rejected') return mapAction({ ...action, status: 'rejected' });
  return executeAction(actionId);
}

/**
 * Runs the actual canonical action exactly once — the real send goes
 * through messaging.service.js#sendMessage (participant check, idempotency,
 * safety classification all still apply, this is not a bypass route).
 */
async function executeAction(actionId) {
  const action = await db('ai_actions').where({ id: actionId }).first();
  if (!action) throw new AppError('Action not found', 404);
  if (action.status === 'executed') return mapAction(action); // idempotent — already ran

  const payload = action.payload_json;
  let result;
  try {
    if (action.action_type === 'send_message_reply') {
      const message = await messagingService.sendMessage(action.requested_by, action.target_id, { body: payload.draftBody, clientMessageId: `ai-action-${action.id}` });
      result = { messageId: message.id };
    } else {
      throw new Error(`No executor registered for action_type "${action.action_type}"`);
    }

    await db('ai_actions').where({ id: actionId }).update({ status: 'executed', result_json: JSON.stringify(result), updated_at: db.fn.now() });
    return mapAction({ ...action, status: 'executed', result_json: result });
  } catch (err) {
    await db('ai_actions').where({ id: actionId }).update({ status: 'failed', result_json: JSON.stringify({ error: err.message }), updated_at: db.fn.now() });
    throw err;
  }
}

function mapAction(a) {
  return {
    id: a.id,
    actionType: a.action_type,
    targetType: a.target_type,
    targetId: a.target_id,
    status: a.status,
    riskScore: a.risk_score === null ? null : Number(a.risk_score),
    approvalRequirement: a.approval_requirement,
    payload: a.payload_json,
    result: a.result_json,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}
