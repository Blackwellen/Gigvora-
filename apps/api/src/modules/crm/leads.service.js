import { db, ownerScope, paginationParams, logActivity } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { normalizeEmail, normalizePhone } from '../../common/utils/normalize.js';
import { scoreLeadFit, scoreLeadIntent } from './ai.service.js';
import { detectDuplicates } from './duplicates.service.js';

const TABLE = 'crm_leads';

const WRITABLE_FIELDS = {
  contactId: 'contact_id',
  accountId: 'account_id',
  professionalId: 'professional_id',
  firstName: 'first_name',
  lastName: 'last_name',
  displayName: 'display_name',
  jobTitle: 'job_title',
  companyName: 'company_name',
  location: 'location',
  leadStatus: 'lead_status',
  leadSource: 'lead_source',
  utmSource: 'utm_source',
  utmMedium: 'utm_medium',
  utmCampaign: 'utm_campaign',
  referrer: 'referrer',
  ownerUserId: 'owner_user_id',
  leadTemperature: 'lead_temperature',
  nextFollowupAt: 'next_followup_at',
};

function buildPatch(data = {}) {
  const patch = {};
  for (const [key, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[key] !== undefined) patch[column] = data[key];
  }
  if (data.email !== undefined) patch.email_normalized = normalizeEmail(data.email);
  if (data.phone !== undefined) patch.phone_normalized = normalizePhone(data.phone);
  return patch;
}

async function applyScores(trx, owner, lead) {
  const fit = await scoreLeadFit(
    { jobTitle: lead.job_title, seniority: lead.job_title, companyName: lead.company_name, leadSource: lead.lead_source },
    { owner, objectId: lead.id, trx }
  );
  const [activityCountRow] = await trx('crm_activities').where({ object_type: 'lead', object_id: lead.id }).count({ count: '*' });
  const intent = await scoreLeadIntent(
    { interactionCount: Number(activityCountRow.count || 0), lastActivityAt: lead.last_activity_at },
    { owner, objectId: lead.id, trx }
  );
  await trx(TABLE).where({ id: lead.id }).update({ fit_score: fit.score, intent_score: intent.score });
  return { fit, intent };
}

export async function list(owner, filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { leadStatus, leadSource, ownerUserId, fitScoreMin, fitScoreMax, intentScoreMin, intentScoreMax, search } = filters;

  const build = () => {
    const qb = ownerScope(db(TABLE), owner);
    if (leadStatus) qb.andWhere({ lead_status: leadStatus });
    if (leadSource) qb.andWhere({ lead_source: leadSource });
    if (ownerUserId) qb.andWhere({ owner_user_id: ownerUserId });
    if (fitScoreMin) qb.andWhere('fit_score', '>=', Number(fitScoreMin));
    if (fitScoreMax) qb.andWhere('fit_score', '<=', Number(fitScoreMax));
    if (intentScoreMin) qb.andWhere('intent_score', '>=', Number(intentScoreMin));
    if (intentScoreMax) qb.andWhere('intent_score', '<=', Number(intentScoreMax));
    if (search) {
      qb.andWhere((inner) => {
        inner
          .whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('display_name', `%${search}%`)
          .orWhereILike('company_name', `%${search}%`)
          .orWhereILike('email_normalized', `%${search.toLowerCase()}%`);
      });
    }
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('updated_at', 'desc').limit(limit).offset(offset),
    build().count({ count: '*' }),
  ]);

  return { data: rows, total: Number(count) };
}

export async function getById(owner, id) {
  const record = await ownerScope(db(TABLE), owner).where({ id }).first();
  if (!record) throw new AppError('Lead not found', 404);
  return record;
}

export async function create(owner, actorId, data) {
  return db.transaction(async (trx) => {
    const patch = buildPatch(data);
    if (!patch.first_name && !patch.last_name && !patch.display_name && !patch.company_name) {
      throw new AppError('At least one of firstName, lastName, displayName, or companyName is required', 400);
    }

    const [record] = await trx(TABLE)
      .insert({
        owner_type: owner.ownerType,
        owner_id: owner.ownerId,
        workspace_id: owner.workspaceId ?? null,
        last_activity_at: trx.fn.now(),
        ...patch,
      })
      .returning('*');

    await logActivity(trx, owner, { objectType: 'lead', objectId: record.id, actorId, activityType: 'system_event', summary: 'Lead created' });
    await emitEvent({ aggregateType: 'lead', aggregateId: record.id, eventType: 'crm.lead.created', payload: { name: record.display_name || record.first_name } }, trx);
    await applyScores(trx, owner, record);
    await detectDuplicates(trx, owner, 'lead', record).catch(() => []);

    return trx(TABLE).where({ id: record.id }).first();
  });
}

export async function update(owner, actorId, id, data) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Lead not found', 404);

    const patch = buildPatch(data);
    patch.updated_at = trx.fn.now();

    const [record] = await trx(TABLE).where({ id }).update(patch).returning('*');

    await logActivity(trx, owner, { objectType: 'lead', objectId: id, actorId, activityType: 'system_event', summary: 'Lead updated', metadataJsonb: { fields: Object.keys(patch) } });
    await emitEvent({ aggregateType: 'lead', aggregateId: id, eventType: 'crm.lead.updated', payload: { fields: Object.keys(patch) } }, trx);
    await applyScores(trx, owner, record);

    return trx(TABLE).where({ id }).first();
  });
}

export async function remove(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const count = await ownerScope(trx(TABLE), owner).where({ id }).del();
    if (!count) throw new AppError('Lead not found', 404);
    await emitEvent({ aggregateType: 'lead', aggregateId: id, eventType: 'crm.lead.deleted', payload: {} }, trx);
  });
}

async function findOrCreateContactFromLead(trx, owner, actorId, lead, accountId) {
  if (lead.contact_id) {
    return trx('crm_contacts').where({ id: lead.contact_id }).first();
  }

  const emailNorm = lead.email_normalized || null;
  const phoneNorm = lead.phone_normalized || null;
  let match = null;
  if (emailNorm || phoneNorm) {
    match = await trx('crm_contacts')
      .where({ owner_type: owner.ownerType, owner_id: owner.ownerId })
      .whereNull('archived_at')
      .andWhere((qb) => {
        if (emailNorm) qb.orWhere('email_normalized', emailNorm);
        if (phoneNorm) qb.orWhere('phone_normalized', phoneNorm);
      })
      .first();
  }
  if (match) return match;

  const [contact] = await trx('crm_contacts')
    .insert({
      owner_type: owner.ownerType,
      owner_id: owner.ownerId,
      workspace_id: owner.workspaceId ?? null,
      account_id: accountId,
      professional_id: lead.professional_id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      display_name: lead.display_name,
      job_title: lead.job_title,
      emails_jsonb: JSON.stringify(emailNorm ? [{ value: emailNorm, primary: true }] : []),
      email_normalized: emailNorm,
      phones_jsonb: JSON.stringify(phoneNorm ? [{ value: phoneNorm, primary: true }] : []),
      phone_normalized: phoneNorm,
      lifecycle_stage: 'contact',
      owner_user_id: lead.owner_user_id,
      source: lead.lead_source || 'lead_conversion',
      tags: JSON.stringify([]),
    })
    .returning('*');

  await logActivity(trx, owner, { objectType: 'contact', objectId: contact.id, actorId, activityType: 'system_event', summary: 'Contact created from lead conversion', metadataJsonb: { leadId: lead.id } });
  await emitEvent({ aggregateType: 'contact', aggregateId: contact.id, eventType: 'crm.contact.created', payload: { fromLeadId: lead.id } }, trx);

  return contact;
}

async function findOrCreateAccountFromLead(trx, owner, actorId, lead) {
  if (lead.account_id) {
    return trx('crm_accounts').where({ id: lead.account_id }).first();
  }
  if (!lead.company_name) return null;

  const match = await trx('crm_accounts')
    .where({ owner_type: owner.ownerType, owner_id: owner.ownerId })
    .whereNull('archived_at')
    .whereRaw('lower(name) = ?', [lead.company_name.toLowerCase()])
    .first();
  if (match) return match;

  const [account] = await trx('crm_accounts')
    .insert({
      owner_type: owner.ownerType,
      owner_id: owner.ownerId,
      workspace_id: owner.workspaceId ?? null,
      name: lead.company_name,
      account_tier: 'prospect',
      lifecycle_stage: 'prospect',
      owner_user_id: lead.owner_user_id,
      technology_jsonb: JSON.stringify([]),
      social_links_jsonb: JSON.stringify({}),
      tags: JSON.stringify([]),
    })
    .returning('*');

  await logActivity(trx, owner, { objectType: 'account', objectId: account.id, actorId, activityType: 'system_event', summary: 'Account created from lead conversion', metadataJsonb: { leadId: lead.id } });
  await emitEvent({ aggregateType: 'account', aggregateId: account.id, eventType: 'crm.account.created', payload: { fromLeadId: lead.id } }, trx);

  return account;
}

export async function convert(owner, actorId, id, body = {}) {
  return db.transaction(async (trx) => {
    const lead = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!lead) throw new AppError('Lead not found', 404);
    if (lead.lead_status === 'converted') throw new AppError('Lead has already been converted', 400);

    const account = await findOrCreateAccountFromLead(trx, owner, actorId, lead);
    const contact = await findOrCreateContactFromLead(trx, owner, actorId, lead, account?.id ?? null);

    let opportunity = null;
    if (body.createOpportunity) {
      if (!body.opportunityName) throw new AppError('opportunityName is required when createOpportunity is true', 400);
      if (!account) throw new AppError('An account is required to create an opportunity', 400);

      let stage = await trx('crm_pipeline_stages')
        .where({ owner_type: owner.ownerType, owner_id: owner.ownerId })
        .orderBy('order_index', 'asc')
        .first();
      if (!stage) {
        const { ensureDefaultStages } = await import('./pipeline-stages.service.js');
        const stages = await ensureDefaultStages(trx, owner);
        stage = stages[0];
      }

      const [oppRecord] = await trx('crm_opportunities')
        .insert({
          owner_type: owner.ownerType,
          owner_id: owner.ownerId,
          workspace_id: owner.workspaceId ?? null,
          account_id: account.id,
          stage_id: stage.id,
          owner_user_id: lead.owner_user_id,
          name: body.opportunityName,
          value: body.value ?? 0,
          primary_contact_id: contact?.id ?? null,
        })
        .returning('*');
      opportunity = oppRecord;

      await logActivity(trx, owner, { objectType: 'opportunity', objectId: opportunity.id, actorId, activityType: 'system_event', summary: 'Opportunity created from lead conversion', metadataJsonb: { leadId: lead.id } });
      await emitEvent({ aggregateType: 'opportunity', aggregateId: opportunity.id, eventType: 'crm.opportunity.created', payload: { fromLeadId: lead.id } }, trx);
    }

    const [updatedLead] = await trx(TABLE)
      .where({ id })
      .update({
        lead_status: 'converted',
        converted_at: trx.fn.now(),
        converted_contact_id: contact?.id ?? null,
        converted_account_id: account?.id ?? null,
        converted_opportunity_id: opportunity?.id ?? null,
      })
      .returning('*');

    if (contact) {
      await trx('crm_activities').where({ object_type: 'lead', object_id: id }).update({ object_type: 'contact', object_id: contact.id });
    }

    await logActivity(trx, owner, { objectType: 'contact', objectId: contact?.id ?? id, actorId, activityType: 'system_event', summary: 'Lead converted', metadataJsonb: { leadId: id } });
    await emitEvent(
      { aggregateType: 'lead', aggregateId: id, eventType: 'crm.lead.converted', payload: { contactId: contact?.id ?? null, accountId: account?.id ?? null, opportunityId: opportunity?.id ?? null } },
      trx
    );

    return { lead: updatedLead, contact, account, opportunity };
  });
}

export async function disqualify(owner, actorId, id, { reason } = {}) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Lead not found', 404);

    const [record] = await trx(TABLE)
      .where({ id })
      .update({ lead_status: 'disqualified', disqualified_at: trx.fn.now(), disqualification_reason: reason ?? null })
      .returning('*');

    await logActivity(trx, owner, { objectType: 'lead', objectId: id, actorId, activityType: 'system_event', summary: 'Lead disqualified', metadataJsonb: { reason } });
    await emitEvent({ aggregateType: 'lead', aggregateId: id, eventType: 'crm.lead.disqualified', payload: { reason } }, trx);

    return record;
  });
}
