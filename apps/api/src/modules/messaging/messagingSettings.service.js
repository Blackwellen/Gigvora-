import { db } from '../../db/connection.js';

// Every switch on the Messaging Settings page persists into this single
// jsonb blob keyed by section (notifications, availability, readReceipts,
// ...) rather than one column per toggle — the settings shape is UI-owned
// and will keep growing; a normalized column per field would mean a
// migration for every new toggle. Server never validates the shape beyond
// "is an object", since these are all soft user preferences, not
// authorization-relevant data.
const DEFAULT_SETTINGS = Object.freeze({});

export async function getMessagingSettings(userId) {
  const row = await db('messaging_settings').where({ user_id: userId }).first();
  return row?.settings || DEFAULT_SETTINGS;
}

export async function updateMessagingSettings(userId, patch) {
  const existing = await db('messaging_settings').where({ user_id: userId }).first();
  const merged = { ...(existing?.settings || {}), ...patch };

  if (existing) {
    await db('messaging_settings').where({ user_id: userId }).update({ settings: JSON.stringify(merged), updated_at: db.fn.now() });
  } else {
    await db('messaging_settings').insert({ user_id: userId, settings: JSON.stringify(merged) });
  }

  return merged;
}
