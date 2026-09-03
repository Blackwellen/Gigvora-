import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../../config/index.js';

export function isConfigured() {
  return config.livekit.configured;
}

let roomServiceClient = null;
function getRoomServiceClient() {
  if (!roomServiceClient) {
    // RoomServiceClient talks to LiveKit's server-side HTTP/Twirp API using
    // the ws:// LIVEKIT_URL — the SDK internally rewrites ws(s):// to
    // http(s):// for its own REST calls, the browser is the one that needs
    // the raw ws:// URL for the realtime media connection.
    roomServiceClient = new RoomServiceClient(config.livekit.url, config.livekit.apiKey, config.livekit.apiSecret);
  }
  return roomServiceClient;
}

/**
 * Ensures a LiveKit room exists (idempotent — LiveKit also auto-creates a
 * room on first participant join, but pre-creating lets us set
 * `emptyTimeout`/`maxParticipants` up front and never silently no-ops if
 * the server is briefly unreachable during scheduling rather than at join
 * time). Never throws — a scheduling flow must not fail because the media
 * server is temporarily down; the room still gets created lazily on join.
 */
export async function ensureRoom(roomName, { maxParticipants = 50 } = {}) {
  if (!isConfigured()) return { ok: false, reason: 'not_configured' };
  try {
    await getRoomServiceClient().createRoom({ name: roomName, emptyTimeout: 10 * 60, maxParticipants });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

export async function endRoom(roomName) {
  if (!isConfigured()) return { ok: false, reason: 'not_configured' };
  try {
    await getRoomServiceClient().deleteRoom(roomName);
    return { ok: true };
  } catch (err) {
    // Deleting a room that's already gone (e.g. emptied out and LiveKit
    // reaped it via emptyTimeout) is not a real failure for our purposes.
    return { ok: true, reason: err.message };
  }
}

export async function listParticipants(roomName) {
  if (!isConfigured()) return [];
  try {
    const participants = await getRoomServiceClient().listParticipants(roomName);
    return participants.map((p) => ({ identity: p.identity, name: p.name, joinedAt: p.joinedAt, isPublisher: p.permission?.canPublish }));
  } catch {
    return [];
  }
}

/**
 * Mints a join token scoped to exactly one room and one identity — never a
 * wildcard/room-admin grant for an ordinary participant. `role: 'host'` gets
 * roomAdmin (mute/remove others, needed for "End call for host"); everyone
 * else gets publish+subscribe only.
 */
export async function createJoinToken({ roomName, userId, userName, role = 'participant' }) {
  if (!isConfigured()) throw new Error('LiveKit is not configured');

  const token = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity: userId,
    name: userName,
    ttl: '4h',
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: role === 'host',
  });

  return token.toJwt();
}
