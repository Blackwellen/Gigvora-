import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { verifyAuditChain } from './aiGovernance.service.js';

export async function listAuditEvents(userId, { eventType, riskMin, limit = 25, offset = 0 } = {}) {
  let query = db('ai_audit_events').where({ actor_id: userId });
  if (eventType) query = query.andWhere('event_type', eventType);
  if (riskMin !== undefined) query = query.andWhere('risk_score', '>=', riskMin);

  const [rows, totalRow] = await Promise.all([
    query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
    query.clone().count('id as count').first(),
  ]);

  return {
    total: Number(totalRow.count),
    events: rows.map(mapEvent),
  };
}

export async function getAuditEvent(userId, eventId) {
  const row = await db('ai_audit_events').where({ id: eventId, actor_id: userId }).first();
  if (!row) throw new AppError('Audit event not found', 404);
  return mapEvent(row);
}

export async function getComplianceSummary(userId) {
  const rows = await db('ai_audit_events').where({ actor_id: userId });
  const total = rows.length;
  const highRisk = rows.filter((r) => Number(r.risk_score) >= 0.7).length;
  const manualReview = rows.filter((r) => r.policy_decision === 'require_approval' || r.policy_decision === 'escalate').length;
  const blocked = rows.filter((r) => r.policy_decision === 'block').length;
  const complianceScore = total === 0 ? 100 : Math.round(((total - blocked) / total) * 1000) / 10;

  const chain = await verifyAuditChain(userId);

  return { totalEvents: total, highRiskEvents: highRisk, manualReviewEvents: manualReview, blockedEvents: blocked, complianceScore, chainIntegrity: chain };
}

function mapEvent(r) {
  return {
    id: r.id,
    eventType: r.event_type,
    threadId: r.thread_id,
    messageId: r.message_id,
    actionId: r.action_id,
    taskId: r.task_id,
    model: r.model,
    modelVersion: r.model_version,
    tools: r.tools_json,
    riskScore: r.risk_score === null ? null : Number(r.risk_score),
    policyDecision: r.policy_decision,
    grounding: r.grounding_json,
    immutableHash: r.immutable_hash,
    createdAt: r.created_at,
  };
}
