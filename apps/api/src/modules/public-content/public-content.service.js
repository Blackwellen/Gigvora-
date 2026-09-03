import { randomBytes } from 'node:crypto';
import { db } from '../../db/connection.js';
import { emailQueue } from '../../jobs/queues/index.js';
import { scoreLeadPropensity } from '../personalization/leadPropensity.js';

/**
 * Public projection of a CMS marketing page: only published rows, only the
 * fields safe to expose. Never return draft/review/scheduled/archived rows
 * to unauthenticated callers.
 */
export async function getPublishedPageBySlug(slug, locale = 'en-US') {
  const page = await db('cms_pages')
    .where({ slug, locale, status: 'published' })
    .first();
  if (!page) return null;

  const blocks = await db('cms_content_blocks').where({ page_id: page.id }).orderBy('order_index', 'asc');

  return {
    slug: page.slug,
    pageType: page.page_type,
    title: page.title,
    description: page.description,
    seo: page.seo_json,
    publishedAt: page.published_at,
    blocks: blocks.reduce((acc, b) => {
      acc[b.block_key] = { type: b.block_type, content: b.content_json };
      return acc;
    }, {}),
  };
}

export async function subscribeNewsletter({ email, source }) {
  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await db('newsletter_subscriptions').where({ email: normalizedEmail }).first();
  if (existing && existing.status !== 'unsubscribed') {
    return { status: existing.status, alreadySubscribed: true };
  }

  const confirmationToken = cryptoRandomToken();

  if (existing) {
    await db('newsletter_subscriptions')
      .where({ id: existing.id })
      .update({ status: 'pending_confirmation', confirmation_token: confirmationToken, source, updated_at: db.fn.now() });
  } else {
    await db('newsletter_subscriptions').insert({
      email: normalizedEmail,
      source,
      status: 'pending_confirmation',
      confirmation_token: confirmationToken,
    });
  }

  // Confirmation email is dispatched via the existing emailQueue worker, not
  // sent synchronously from the request — the public site must not block on
  // (or fail because of) the email provider.
  await emailQueue.add('newsletter-confirmation', { email: normalizedEmail, confirmationToken });

  return { status: 'pending_confirmation', alreadySubscribed: false };
}

export async function createMarketingLead(input) {
  const startedAt = Date.now();
  const propensity = scoreLeadPropensity({
    leadType: input.leadType,
    company: input.company,
    jobTitle: input.jobTitle,
    phone: input.phone,
    companySize: input.companySize,
    source: input.source,
    campaign: input.campaign,
    message: input.message,
  });

  const [row] = await db('marketing_leads')
    .insert({
      email: input.email,
      name: input.name || null,
      company: input.company || null,
      job_title: input.jobTitle || null,
      phone: input.phone || null,
      company_size: input.companySize || null,
      lead_type: input.leadType,
      source: input.source || 'website',
      campaign: input.campaign || null,
      consent_state: input.consentGiven ? 'given' : 'not_given',
      metadata: JSON.stringify({ topic: input.topic || null, message: input.message || null, referrer: input.referrer || null }),
      propensity_score: propensity.score,
      propensity_band: propensity.band,
      propensity_model_version: propensity.modelVersion,
      propensity_reason_codes: JSON.stringify(propensity.reasonCodes),
    })
    .returning('*');

  await db('ml_inference_log').insert({
    model_name: propensity.modelName,
    model_version: propensity.modelVersion,
    surface: 'lead_propensity',
    score: JSON.stringify({ score: propensity.score, band: propensity.band }),
    reason_codes: JSON.stringify(propensity.reasonCodes),
    latency_ms: Date.now() - startedAt,
  });

  await emailQueue.add('lead-notification', { leadId: row.id, leadType: row.lead_type, propensityBand: propensity.band });

  return row;
}

function cryptoRandomToken() {
  return randomBytes(24).toString('hex');
}
