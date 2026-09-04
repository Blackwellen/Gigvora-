import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { resolveRecruiterCompanyId } from '../../common/utils/resolveRecruiterCompany.js';
import { incrementUsage } from '../outreach-templates/outreach-templates.service.js';

async function assertOwnedCampaign(companyId, campaignId) {
  const campaign = await db('outreach_campaigns').where({ id: campaignId, company_id: companyId }).first();
  if (!campaign) throw new AppError('Campaign not found', 404);
  return campaign;
}

export async function list(userId, { status } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const qb = db('outreach_campaigns').where({ company_id: companyId });
  if (status) qb.andWhere({ status });
  return qb.orderBy('updated_at', 'desc');
}

export async function getById(userId, id) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const campaign = await assertOwnedCampaign(companyId, id);
  const [audience, variants] = await Promise.all([
    db('campaign_audiences').where({ campaign_id: id }).orderBy('created_at', 'asc'),
    db('campaign_variants').where({ campaign_id: id }).orderBy('variant_label', 'asc'),
  ]);
  return { ...campaign, audience, variants };
}

export async function create(userId, { name, channel, templateId, scheduledAt } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  if (!name?.trim()) throw new AppError('name is required', 422);
  const [row] = await db('outreach_campaigns')
    .insert({
      company_id: companyId,
      name: name.trim(),
      channel: channel || 'email',
      template_id: templateId || null,
      scheduled_at: scheduledAt || null,
      created_by_user_id: userId,
    })
    .returning('*');
  return row;
}

export async function update(userId, id, { name, status, channel, templateId, scheduledAt } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedCampaign(companyId, id);
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (channel !== undefined) patch.channel = channel;
  if (templateId !== undefined) patch.template_id = templateId;
  if (scheduledAt !== undefined) patch.scheduled_at = scheduledAt;
  if (status !== undefined) {
    if (!['draft', 'scheduled', 'sending', 'completed', 'paused'].includes(status)) throw new AppError('Invalid status', 422);
    patch.status = status;
  }
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);
  const [row] = await db('outreach_campaigns').where({ id }).update(patch).returning('*');
  return row;
}

export async function remove(userId, id) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedCampaign(companyId, id);
  await db('outreach_campaigns').where({ id }).del();
}

// --- Audience --------------------------------------------------------------

export async function listAudience(userId, campaignId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedCampaign(companyId, campaignId);
  return db('campaign_audiences').where({ campaign_id: campaignId }).orderBy('created_at', 'asc');
}

export async function addAudienceMember(userId, campaignId, { candidateUserId, candidateName, candidateEmail } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedCampaign(companyId, campaignId);
  if (!candidateName?.trim()) throw new AppError('candidateName is required', 422);
  const [row] = await db('campaign_audiences')
    .insert({
      campaign_id: campaignId,
      candidate_user_id: candidateUserId || null,
      candidate_name: candidateName.trim(),
      candidate_email: candidateEmail || null,
      status: 'pending',
    })
    .returning('*');
  return row;
}

export async function removeAudienceMember(userId, campaignId, audienceId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedCampaign(companyId, campaignId);
  const count = await db('campaign_audiences').where({ id: audienceId, campaign_id: campaignId }).del();
  if (!count) throw new AppError('Audience member not found', 404);
}

// --- Variants (A/B) ----------------------------------------------------------

export async function listVariants(userId, campaignId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedCampaign(companyId, campaignId);
  return db('campaign_variants').where({ campaign_id: campaignId }).orderBy('variant_label', 'asc');
}

export async function addVariant(userId, campaignId, { variantLabel, subject, body, sendPct } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedCampaign(companyId, campaignId);
  if (!variantLabel?.trim()) throw new AppError('variantLabel is required', 422);
  if (!body?.trim()) throw new AppError('body is required', 422);
  const [row] = await db('campaign_variants')
    .insert({
      campaign_id: campaignId,
      variant_label: variantLabel.trim(),
      subject: subject || null,
      body: body.trim(),
      send_pct: sendPct ?? null,
    })
    .returning('*');
  return row;
}

export async function removeVariant(userId, campaignId, variantId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedCampaign(companyId, campaignId);
  const count = await db('campaign_variants').where({ id: variantId, campaign_id: campaignId }).del();
  if (!count) throw new AppError('Variant not found', 404);
}

// --- Send (simulated — no real email/LinkedIn provider is wired here, but
// the state transitions and persisted rows are real) ------------------------

export async function send(userId, campaignId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const campaign = await assertOwnedCampaign(companyId, campaignId);
  if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
    throw new AppError(`Campaign cannot be sent from status "${campaign.status}"`, 422);
  }

  await db('outreach_campaigns').where({ id: campaignId }).update({ status: 'sending', updated_at: db.fn.now() });

  const audience = await db('campaign_audiences').where({ campaign_id: campaignId, status: 'pending' });
  const now = db.fn.now();

  if (audience.length) {
    await db('campaign_audiences')
      .whereIn('id', audience.map((a) => a.id))
      .update({ status: 'sent', sent_at: now, updated_at: now });

    await db('outreach_events').insert(
      audience.map((a) => ({
        enrollment_id: null,
        campaign_id: campaignId,
        candidate_user_id: a.candidate_user_id,
        event_type: 'sent',
        channel: campaign.channel === 'multi' ? 'email' : campaign.channel,
        metadata: JSON.stringify({ candidate_name: a.candidate_name }),
      }))
    );
  }

  const [totalSentRow] = await db('campaign_audiences').where({ campaign_id: campaignId }).whereIn('status', ['sent', 'opened', 'replied', 'bounced']).count({ count: '*' });

  const [row] = await db('outreach_campaigns')
    .where({ id: campaignId })
    .update({ status: 'completed', sent_count: Number(totalSentRow.count), updated_at: db.fn.now() })
    .returning('*');

  if (campaign.template_id) {
    await incrementUsage(campaign.template_id).catch(() => {});
  }

  return row;
}
