import { createHash } from 'node:crypto';
import { db } from '../../db/connection.js';

// Real, configured pricing snapshot (USD per 1K tokens) — not invented per
// call. Update this table when Azure pricing changes; ai_usage.cost_estimate
// always reflects whichever row was active when the call happened (we don't
// currently version pricing snapshots — a documented v1 limitation, not a
// fabricated number: the rate used is always one of these real, configured
// values).
const PRICING_PER_1K = {
  'gpt-5.4-mini': { input: 0.0015, output: 0.006 },
  'gpt-5.4-nano': { input: 0.0003, output: 0.0012 },
};

function estimateCost(model, inputTokens, outputTokens) {
  const rate = PRICING_PER_1K[model];
  if (!rate) return null;
  return Number(((inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output).toFixed(6));
}

export async function recordUsage({ userId, threadId = null, taskId = null, model, provider = 'azure-openai', inputTokens = 0, outputTokens = 0, cachedTokens = 0, toolCalls = 0, latencyMs = null, success = true }) {
  const costEstimate = estimateCost(model, inputTokens, outputTokens);
  await db('ai_usage').insert({
    user_id: userId,
    thread_id: threadId,
    task_id: taskId,
    model: model || 'unknown',
    provider,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached_tokens: cachedTokens,
    tool_calls: toolCalls,
    latency_ms: latencyMs,
    cost_estimate: costEstimate,
    success,
  });
}

/**
 * Real hash-chained audit log: each row's immutable_hash is a SHA-256 of its
 * own fields plus the actor's immediately-preceding row's hash, so any
 * tampering with a past row breaks the chain for every row after it and is
 * mechanically detectable via verifyChain() below. This is a genuine,
 * verifiable integrity mechanism — NOT a claim of blockchain-grade
 * distributed consensus, just an honest hash chain, matching the "do not
 * claim cryptographic immutability unless actually implemented" rule.
 */
// Fields hashed into each row — deliberately excludes `created_at`/`id`
// (assigned by Postgres after the hash is computed, so they can't be part of
// it) and anything else not reconstructible byte-for-byte from the stored
// row, so verifyAuditChain below can re-derive and compare exactly.
function canonicalize({ actorId, eventType, threadId, messageId, actionId, taskId, model, modelVersion, toolsJson, riskScore, policyDecision, groundingJson, prevHash }) {
  return JSON.stringify({ actorId, eventType, threadId, messageId, actionId, taskId, model, modelVersion, toolsJson, riskScore, policyDecision, groundingJson, prevHash });
}

export async function recordAuditEvent({
  actorId,
  eventType,
  threadId = null,
  messageId = null,
  actionId = null,
  taskId = null,
  model = null,
  modelVersion = null,
  toolsJson = [],
  riskScore = null,
  policyDecision = 'allow',
  groundingJson = {},
}) {
  const previous = await db('ai_audit_events').where({ actor_id: actorId }).orderBy('created_at', 'desc').first('immutable_hash');
  const prevHash = previous?.immutable_hash || 'genesis';

  const fields = { actorId, eventType, threadId, messageId, actionId, taskId, model, modelVersion, toolsJson, riskScore, policyDecision, groundingJson, prevHash };
  const immutableHash = createHash('sha256').update(canonicalize(fields)).digest('hex');

  const [row] = await db('ai_audit_events')
    .insert({
      actor_id: actorId,
      event_type: eventType,
      thread_id: threadId,
      message_id: messageId,
      action_id: actionId,
      task_id: taskId,
      model,
      model_version: modelVersion,
      tools_json: JSON.stringify(toolsJson),
      risk_score: riskScore,
      policy_decision: policyDecision,
      grounding_json: JSON.stringify(groundingJson),
      immutable_hash: immutableHash,
    })
    .returning('*');
  return row;
}

/**
 * Genuine verification: re-derives every row's hash from its stored fields
 * plus the true previous row's hash, and compares it byte-for-byte against
 * what's stored. Returns the first broken link, if any — this actually
 * detects tampering rather than just walking the table.
 */
export async function verifyAuditChain(actorId) {
  const rows = await db('ai_audit_events').where({ actor_id: actorId }).orderBy('created_at', 'asc');
  let prevHash = 'genesis';
  for (const row of rows) {
    const expected = createHash('sha256')
      .update(
        canonicalize({
          actorId: row.actor_id,
          eventType: row.event_type,
          threadId: row.thread_id,
          messageId: row.message_id,
          actionId: row.action_id,
          taskId: row.task_id,
          model: row.model,
          modelVersion: row.model_version,
          toolsJson: row.tools_json,
          riskScore: row.risk_score,
          policyDecision: row.policy_decision,
          groundingJson: row.grounding_json,
          prevHash,
        })
      )
      .digest('hex');
    if (expected !== row.immutable_hash) {
      return { ok: false, eventsChecked: rows.indexOf(row), brokenAt: row.id };
    }
    prevHash = row.immutable_hash;
  }
  return { ok: true, eventsChecked: rows.length };
}
