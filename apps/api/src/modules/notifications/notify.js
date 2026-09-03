import { redis } from '../../cache/redis.js';
import * as notificationsService from './notifications.service.js';

/**
 * The one real entry point every feature should call to notify a user —
 * persists a durable row (source of truth, read by GET /notifications) and
 * best-effort publishes it live over Redis so an open session sees it
 * immediately without polling. A dropped publish just means the client
 * sees it on its next poll/refresh instead of instantly — the DB row is
 * never lost.
 *
 * `actorId` is not a stored column (notifications table is {user_id, type,
 * payload, is_read}) — it's used here only to skip self-notifications
 * (a user should never get notified about their own action) and is
 * otherwise expected to already be reflected in `payload` (e.g.
 * `payload.actorName`) by the caller.
 */
export async function notify({ userId, actorId, type, payload = {} }) {
  if (!userId || userId === actorId) return null;

  const notification = await notificationsService.create({ user_id: userId, type, payload: JSON.stringify(payload) });
  await redis.publish('notification-events', JSON.stringify({ userId, notification })).catch(() => {});
  return notification;
}
