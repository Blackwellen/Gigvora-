import { redis } from '../../cache/redis.js';

/**
 * Ephemeral, per-user AI event transport (streaming deltas, generation
 * lifecycle, task progress). Unlike common/events/outbox.js's emitEvent,
 * this does NOT write to a durable table — ai_threads/ai_messages in
 * Postgres are already the durable record for anything worth keeping
 * (matching the "Redis is for ephemeral/hot state, not a system of record"
 * rule). A dropped delta just means the client's next reconnect re-reads
 * the persisted message instead of having seen every token live.
 */
export async function publishAiEvent(userId, eventType, payload = {}) {
  await redis.publish('ai-events', JSON.stringify({ userId, eventType, payload })).catch(() => {});
}
