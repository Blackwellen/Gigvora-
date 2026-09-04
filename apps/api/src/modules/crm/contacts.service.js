import { db, ownerScope, paginationParams, logActivity } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { normalizeEmail, normalizePhone } from '../../common/utils/normalize.js';
import { scoreRelationshipHealth } from './ai.service.js';
import { detectDuplicates } from './duplicates.service.js';

const TABLE = 'crm_contacts';

const WRITABLE_FIELDS = {
  accountId: 'account_id',
  professionalId: 'professional_id',
  firstName: 'first_name',
  lastName: 'last_name',
  displayName: 'display_name',
  jobTitle: 'job_title',
  department: 'department',
  seniority: 'seniority',
  emailsJsonb: 'emails_jsonb',
  phonesJsonb: 'phones_jsonb',
  locationText: 'location_text',
  countryCode: 'country_code',
  city: 'city',
  timezone: 'timezone',
  relationshipType: 'relationship_type',
  lifecycleStage: 'lifecycle_stage',
  ownerUserId: 'owner_user_id',
  source: 'source',
  sourceDetail: 'source_detail',
  preferredChannel: 'preferred_channel',
  avatarUrl: 'avatar_url',
  consentStatus: 'consent_status',
  doNotContact: 'do_not_contact',
  nextFollowupAt: 'next_followup_at',
  tags: 'tags',
};

const JSON_FIELDS = new Set(['emails_jsonb', 'phones_jsonb', 'tags']);

function buildPatch(data = {}) {
  const patch = {};
  for (const [key, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[key] !== undefined) {
      patch[column] = JSON_FIELDS.has(column) ? JSON.stringify(data[key]) : data[key];
    }
  }

  if (data.emailsJsonb !== undefined) {
    const primary = Array.isArray(data.emailsJsonb) ? data.emailsJsonb.find((e) => e?.primary) || data.emailsJsonb[0] : null;
    patch.email_normalized = normalizeEmail(primary?.value || primary?.email || primary);
  }
  if (data.phonesJsonb !== undefined) {
    const primary = Array.isArray(data.phonesJsonb) ? data.phonesJsonb.find((p) => p?.primary) || data.phonesJsonb[0] : null;
    patch.phone_normalized = normalizePhone(primary?.value || primary?.phone || primary);
  }
  // Allow direct override too (used by lead-conversion which only has a bare email/phone string).
  if (data.email !== undefined) patch.email_normalized = normalizeEmail(data.email);
  if (data.phone !== undefined) patch.phone_normalized = normalizePhone(data.phone);

  return patch;
}

export async function list(owner, filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { lifecycleStage, accountId, ownerUserId, relationshipType, tag, search, includeArchived } = filters;

  const build = () => {
    const qb = ownerScope(db(TABLE), owner);
    if (!includeArchived) qb.whereNull('archived_at');
    if (lifecycleStage) qb.andWhere({ lifecycle_stage: lifecycleStage });
    if (accountId) qb.andWhere({ account_id: accountId });
    if (ownerUserId) qb.andWhere({ owner_user_id: ownerUserId });
    if (relationshipType) qb.andWhere({ relationship_type: relationshipType });
    if (tag) qb.andWhereRaw('tags @> ?::jsonb', [JSON.stringify([tag])]);
    if (search) {
      qb.andWhere((inner) => {
        inner
          .whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('display_name', `%${search}%`)
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
  if (!record) throw new AppError('Contact not found', 404);
  return record;
}

export async function create(owner, actorId, data) {
  return db.transaction(async (trx) => {
    const patch = buildPatch(data);
    if (!patch.first_name && !patch.last_name && !patch.display_name) {
      throw new AppError('At least one of firstName, lastName, or displayName is required', 400);
    }

    const [record] = await trx(TABLE)
      .insert({
        owner_type: owner.ownerType,
        owner_id: owner.ownerId,
        workspace_id: owner.workspaceId ?? null,
        emails_jsonb: JSON.stringify(data.emailsJsonb ?? []),
        phones_jsonb: JSON.stringify(data.phonesJsonb ?? []),
        tags: JSON.stringify(data.tags ?? []),
        ...patch,
      })
      .returning('*');

    await logActivity(trx, owner, { objectType: 'contact', objectId: record.id, actorId, activityType: 'system_event', summary: 'Contact created' });
    await emitEvent({ aggregateType: 'contact', aggregateId: record.id, eventType: 'crm.contact.created', payload: { name: record.display_name || record.first_name } }, trx);
    await detectDuplicates(trx, owner, 'contact', record).catch(() => []);

    return record;
  });
}

export async function update(owner, actorId, id, data) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Contact not found', 404);

    const patch = buildPatch(data);
    patch.updated_at = trx.fn.now();

    const [record] = await trx(TABLE).where({ id }).update(patch).returning('*');

    await logActivity(trx, owner, { objectType: 'contact', objectId: id, actorId, activityType: 'system_event', summary: 'Contact updated', metadataJsonb: { fields: Object.keys(patch) } });
    await emitEvent({ aggregateType: 'contact', aggregateId: id, eventType: 'crm.contact.updated', payload: { fields: Object.keys(patch) } }, trx);

    return record;
  });
}

export async function remove(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Contact not found', 404);

    const [record] = await trx(TABLE).where({ id }).update({ archived_at: trx.fn.now() }).returning('*');
    await logActivity(trx, owner, { objectType: 'contact', objectId: id, actorId, activityType: 'system_event', summary: 'Contact archived' });
    await emitEvent({ aggregateType: 'contact', aggregateId: id, eventType: 'crm.contact.archived', payload: {} }, trx);
    return record;
  });
}

/**
 * Normalized exact-match duplicate search — mirrors
 * modules/contacts/contacts.service.js#searchDuplicates.
 */
export async function searchDuplicates(owner, { email, phone, firstName, lastName } = {}) {
  const emailNorm = normalizeEmail(email);
  const phoneNorm = normalizePhone(phone);

  if (!emailNorm && !phoneNorm && !(firstName && lastName)) return [];

  let query = ownerScope(db(TABLE), owner).whereNull('archived_at');
  query = query.andWhere((qb) => {
    let any = false;
    if (emailNorm) {
      qb.orWhere('email_normalized', emailNorm);
      any = true;
    }
    if (phoneNorm) {
      qb.orWhere('phone_normalized', phoneNorm);
      any = true;
    }
    if (!any && firstName && lastName) {
      qb.orWhere((inner) => inner.whereRaw('lower(first_name) = ?', [firstName.toLowerCase()]).andWhereRaw('lower(last_name) = ?', [lastName.toLowerCase()]));
    }
  });

  return query.limit(20);
}

export async function computeRelationshipHealth(owner, id, { persist = false, trx } = {}) {
  const contact = await getById(owner, id);
  const [interactionRow] = await db('crm_activities').where({ object_type: 'contact', object_id: id }).count({ count: '*' });
  const [openOppRow] = await db('crm_opportunities')
    .where({ primary_contact_id: id })
    .whereNull('closed_at')
    .count({ count: '*' });
  const [followupTotal] = await db('crm_followups').where({ object_type: 'contact', object_id: id }).count({ count: '*' });
  const [followupDone] = await db('crm_followups').where({ object_type: 'contact', object_id: id, status: 'done' }).count({ count: '*' });

  const totalFollowups = Number(followupTotal.count || 0);
  const doneFollowups = Number(followupDone.count || 0);

  const result = await scoreRelationshipHealth(
    {
      lastInteractionAt: contact.last_interaction_at,
      interactionCount: Number(interactionRow.count || 0) || contact.interaction_count || 0,
      openOpportunityCount: Number(openOppRow.count || 0),
      followupCompletionRate: totalFollowups > 0 ? doneFollowups / totalFollowups : 0,
    },
    { owner, objectType: 'contact', objectId: id, trx: persist ? trx || db : null }
  );

  if (persist) {
    const executor = trx || db;
    await executor(TABLE).where({ id }).update({ relationship_health_score: result.score });
  }

  return result;
}
