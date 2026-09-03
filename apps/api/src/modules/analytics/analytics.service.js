import { db } from '../../db/connection.js';

const ALLOWED_EVENTS = new Set([
  'public_page_viewed',
  'hero_cta_clicked',
  'product_card_opened',
  'pricing_plan_viewed',
  'pricing_cta_clicked',
  'marketplace_search',
  'marketplace_filter_applied',
  'marketplace_result_opened',
  'profile_opened',
  'company_opened',
  'job_opened',
  'gig_opened',
  'group_opened',
  'video_opened',
  'video_started',
  'video_completed',
  'resource_opened',
  'resource_downloaded',
  'help_search',
  'contact_started',
  'contact_submitted',
  'demo_requested',
  'signup_started',
  'newsletter_subscribed',
]);

export async function recordConversionEvent(input) {
  if (!ALLOWED_EVENTS.has(input.eventName)) return null;

  // Never persist free-text form bodies or other sensitive payloads into
  // analytics — only structured, allow-listed properties.
  const safeProperties = sanitizeProperties(input.properties);

  const [row] = await db('conversion_events')
    .insert({
      anonymous_session_id: input.anonymousSessionId,
      user_id: input.userId || null,
      event_name: input.eventName,
      surface: input.surface || 'web',
      object_type: input.objectType || null,
      object_id: input.objectId || null,
      source: input.source || null,
      referrer: input.referrer || null,
      utm_source: input.utmSource || null,
      utm_medium: input.utmMedium || null,
      utm_campaign: input.utmCampaign || null,
      utm_content: input.utmContent || null,
      utm_term: input.utmTerm || null,
      properties: JSON.stringify(safeProperties),
    })
    .returning('id');

  return row;
}

const MAX_PROPERTY_VALUE_LENGTH = 200;

function sanitizeProperties(properties) {
  if (!properties || typeof properties !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') {
      out[key] = value.slice(0, MAX_PROPERTY_VALUE_LENGTH);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
    // Objects/arrays/message bodies are intentionally dropped.
  }
  return out;
}
