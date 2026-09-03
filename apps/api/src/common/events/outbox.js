import { db } from '../../db/connection.js';
import { redis } from '../../cache/redis.js';

const REALTIME_AGGREGATES = new Set(['user', 'session', 'device', 'security_alert']);

export async function emitEvent({ aggregateType, aggregateId, eventType, payload = {} }, trx = db) {
  await trx('event_outbox').insert({
    aggregate_type: aggregateType,
    aggregate_id: String(aggregateId),
    event_type: eventType,
    payload: JSON.stringify(payload),
  });

  // Best-effort low-latency fan-out for the Session/Devices and Security Alerts UIs.
  // The event_outbox row above remains the durable, at-least-once source of truth;
  // a missed publish here just means the client falls back to its next poll/refresh.
  if (REALTIME_AGGREGATES.has(aggregateType)) {
    redis.publish('security-events', JSON.stringify({ aggregateType, aggregateId, eventType, payload })).catch(() => {});
  }
}

const MESSAGING_AGGREGATES = new Set(['conversation', 'message_request']);

/**
 * Same durable-outbox + best-effort Redis fan-out shape as emitEvent above,
 * but on its own 'messaging-events' channel so the messaging realtime bridge
 * (websocket/handlers/messagingBridge.js) can subscribe independently of
 * security-events. aggregate_type is a plain string column (no DB CHECK
 * constraint on event_outbox), so 'conversation'/'message_request' need no
 * migration.
 */
export async function emitMessagingEvent({ aggregateType, aggregateId, eventType, payload = {} }, trx = db) {
  await trx('event_outbox').insert({
    aggregate_type: aggregateType,
    aggregate_id: String(aggregateId),
    event_type: eventType,
    payload: JSON.stringify(payload),
  });

  if (MESSAGING_AGGREGATES.has(aggregateType)) {
    redis.publish('messaging-events', JSON.stringify({ aggregateType, aggregateId, eventType, payload })).catch(() => {});
  }
}

export async function recordSecurityEvent(
  { userId, sessionId, deviceId, type, severity = 'info', riskScore, riskBand, actorType = 'user', actorId, source = 'api', metadata = {} },
  trx = db
) {
  const [event] = await trx('security_events')
    .insert({
      user_id: userId,
      session_id: sessionId,
      device_id: deviceId,
      type,
      severity,
      risk_score: riskScore,
      risk_band: riskBand,
      actor_type: actorType,
      actor_id: actorId,
      source,
      metadata: JSON.stringify(metadata),
    })
    .returning('*');

  await emitEvent(
    {
      aggregateType: 'user',
      aggregateId: userId,
      eventType: type,
      payload: { securityEventId: event.id, severity, riskBand, metadata },
    },
    trx
  );

  return event;
}
