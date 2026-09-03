import { db } from '../../db/connection.js';

function defaults() {
  return {
    communicationStyle: 'balanced', // 'concise' | 'balanced' | 'detailed'
    tone: 'professional', // 'professional' | 'friendly' | 'direct'
    responseFormat: 'auto', // 'auto' | 'bullet_points' | 'prose'
    focusAreas: [],
    language: 'en',
  };
}

export async function getProfile(userId) {
  const row = await db('ai_personalisation_profiles').where({ owner_user_id: userId }).first();
  if (!row) return { ...defaults(), version: 0 };
  return { ...defaults(), ...row.config_json, version: row.version };
}

export async function updateProfile(userId, patch) {
  const existing = await db('ai_personalisation_profiles').where({ owner_user_id: userId }).first();
  const merged = { ...defaults(), ...(existing?.config_json || {}), ...patch };

  if (existing) {
    await db('ai_personalisation_profiles')
      .where({ owner_user_id: userId })
      .update({ config_json: JSON.stringify(merged), version: existing.version + 1, updated_at: db.fn.now() });
  } else {
    await db('ai_personalisation_profiles').insert({ owner_user_id: userId, config_json: JSON.stringify(merged), version: 1 });
  }
  return getProfile(userId);
}

/**
 * Real effect on generation: copilotOrchestrator appends this to the system
 * prompt on every turn, so a saved communication-style/tone preference
 * genuinely changes Copilot's responses rather than being a decorative
 * settings page with no downstream consumer.
 */
export async function buildSystemPromptAddendum(userId) {
  const profile = await getProfile(userId);
  if (profile.version === 0) return '';

  const parts = [];
  if (profile.communicationStyle === 'concise') parts.push('Keep responses very brief.');
  if (profile.communicationStyle === 'detailed') parts.push('Provide thorough, detailed responses.');
  if (profile.tone === 'friendly') parts.push('Use a warm, friendly tone.');
  if (profile.tone === 'direct') parts.push('Be direct and to the point, minimal pleasantries.');
  if (profile.responseFormat === 'bullet_points') parts.push('Prefer bullet points over long paragraphs.');
  if (profile.focusAreas?.length) parts.push(`The user has flagged these focus areas as especially relevant: ${profile.focusAreas.join(', ')}.`);

  return parts.length ? `\n\nUser personalisation preferences: ${parts.join(' ')}` : '';
}
