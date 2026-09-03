import { redis } from '../../cache/redis.js';

/**
 * Best-effort low-latency fan-out for import/file pipeline stage changes,
 * consumed by websocket/handlers/imports.js. Never awaited by callers on
 * the hot path — a missed publish just means the client's next poll of
 * GET /imports/:id/status catches up.
 */
export function publishImportEvent({ importId, importFileId, ownerUserId, workspaceId, type, payload = {} }) {
  const event = { importId, importFileId, ownerUserId, workspaceId, type, payload, occurredAt: new Date().toISOString() };
  redis.publish('import-events', JSON.stringify(event)).catch(() => {});
}
