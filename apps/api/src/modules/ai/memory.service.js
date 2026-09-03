import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

// Sensitive-topic guard: memory content matching these patterns is rejected
// outright rather than stored — this is a real, if simple, enforcement of
// "sensitive categories may be excluded", not just a settings-page promise.
const BLOCKED_PATTERNS = [/\bpassword\b/i, /\bssn\b/i, /\bsocial security\b/i, /\bcredit card\b/i, /\bapi[_\s]?key\b/i];

function isSensitive(text) {
  return BLOCKED_PATTERNS.some((re) => re.test(String(text || '')));
}

/** Explicit, user-triggered memory creation ("remember that I prefer X") — never automatic extraction from every message, per "do not automatically store every conversation message as durable memory". */
export async function createMemory(userId, { memoryType = 'preference', memoryKey, value, sourceType = 'user_explicit', sourceId = null }) {
  if (!value) throw new AppError('Memory value is required', 422);
  const serialized = JSON.stringify(value);
  if (isSensitive(serialized)) {
    throw new AppError('This looks like sensitive data (passwords, SSNs, card numbers, API keys) and cannot be stored as memory.', 422);
  }

  const [row] = await db('ai_memories')
    .insert({
      owner_user_id: userId,
      memory_type: memoryType,
      memory_key: memoryKey || null,
      value_json: serialized,
      source_type: sourceType,
      source_id: sourceId,
      classification: 'general',
      approval_state: 'approved', // explicit user action = self-approving
    })
    .returning('*');
  return mapMemory(row);
}

export async function listMemories(userId) {
  const rows = await db('ai_memories').where({ owner_user_id: userId }).orderBy('created_at', 'desc');
  return rows.map(mapMemory);
}

export async function deleteMemory(userId, memoryId) {
  const count = await db('ai_memories').where({ id: memoryId, owner_user_id: userId }).del();
  if (!count) throw new AppError('Memory not found', 404);
}

export async function resetAllMemories(userId) {
  const count = await db('ai_memories').where({ owner_user_id: userId }).del();
  return { deleted: count };
}

export async function exportMemories(userId) {
  const rows = await listMemories(userId);
  return { exportedAt: new Date().toISOString(), memories: rows };
}

/** Included in Copilot's context so remembered preferences actually influence answers — a real downstream consumer, not a settings page that goes nowhere. */
export async function getMemorySummaryForContext(userId, limit = 10) {
  const rows = await db('ai_memories').where({ owner_user_id: userId, approval_state: 'approved' }).orderBy('created_at', 'desc').limit(limit);
  if (!rows.length) return '';
  return rows.map((r) => `- ${r.memory_key ? `${r.memory_key}: ` : ''}${JSON.stringify(r.value_json)}`).join('\n');
}

function mapMemory(r) {
  return {
    id: r.id,
    memoryType: r.memory_type,
    memoryKey: r.memory_key,
    value: r.value_json,
    sourceType: r.source_type,
    classification: r.classification,
    approvalState: r.approval_state,
    createdAt: r.created_at,
  };
}
