import { db, ownerScope, paginationParams, logActivity } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { normalizeDomain } from '../../common/utils/normalize.js';
import { scoreRelationshipHealth } from './ai.service.js';
import { detectDuplicates } from './duplicates.service.js';

const TABLE = 'crm_accounts';

const WRITABLE_FIELDS = {
  name: 'name',
  legalName: 'legal_name',
  domain: 'domain',
  website: 'website',
  logoUrl: 'logo_url',
  description: 'description',
  industry: 'industry',
  employeeBand: 'employee_band',
  revenueBand: 'revenue_band',
  currency: 'currency',
  foundedYear: 'founded_year',
  headquartersLocation: 'headquarters_location',
  countryCode: 'country_code',
  accountTier: 'account_tier',
  lifecycleStage: 'lifecycle_stage',
  ownerUserId: 'owner_user_id',
  organisationId: 'organisation_id',
  technologyJsonb: 'technology_jsonb',
  socialLinksJsonb: 'social_links_jsonb',
  tags: 'tags',
};

const JSON_FIELDS = new Set(['technology_jsonb', 'social_links_jsonb', 'tags']);

function buildPatch(data = {}) {
  const patch = {};
  for (const [key, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[key] !== undefined) {
      patch[column] = JSON_FIELDS.has(column) ? JSON.stringify(data[key]) : data[key];
    }
  }
  if (patch.domain) patch.domain = normalizeDomain(patch.domain);
  return patch;
}

export async function list(owner, filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { industry, employeeBand, accountTier, relationshipHealthMin, ownerUserId, search, includeArchived } = filters;

  const build = () => {
    const qb = ownerScope(db(TABLE), owner);
    if (!includeArchived) qb.whereNull('archived_at');
    if (industry) qb.andWhere({ industry });
    if (employeeBand) qb.andWhere({ employee_band: employeeBand });
    if (accountTier) qb.andWhere({ account_tier: accountTier });
    if (relationshipHealthMin) qb.andWhere('relationship_health_score', '>=', Number(relationshipHealthMin));
    if (ownerUserId) qb.andWhere({ owner_user_id: ownerUserId });
    if (search) {
      qb.andWhere((inner) => {
        inner.whereILike('name', `%${search}%`).orWhereILike('domain', `%${search}%`);
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
  if (!record) throw new AppError('Account not found', 404);
  return record;
}

export async function create(owner, actorId, data) {
  return db.transaction(async (trx) => {
    const patch = buildPatch(data);
    if (!patch.name) throw new AppError('name is required', 400);

    const [record] = await trx(TABLE)
      .insert({
        owner_type: owner.ownerType,
        owner_id: owner.ownerId,
        workspace_id: owner.workspaceId ?? null,
        ...patch,
      })
      .returning('*');

    await logActivity(trx, owner, { objectType: 'account', objectId: record.id, actorId, activityType: 'system_event', summary: 'Account created' });
    await emitEvent({ aggregateType: 'account', aggregateId: record.id, eventType: 'crm.account.created', payload: { name: record.name } }, trx);
    await detectDuplicates(trx, owner, 'account', record).catch(() => []);

    return record;
  });
}

export async function update(owner, actorId, id, data) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Account not found', 404);

    const patch = buildPatch(data);
    patch.updated_at = trx.fn.now();

    const [record] = await trx(TABLE).where({ id }).update(patch).returning('*');

    await logActivity(trx, owner, { objectType: 'account', objectId: id, actorId, activityType: 'system_event', summary: 'Account updated', metadataJsonb: { fields: Object.keys(patch) } });
    await emitEvent({ aggregateType: 'account', aggregateId: id, eventType: 'crm.account.updated', payload: { fields: Object.keys(patch) } }, trx);

    return record;
  });
}

export async function remove(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Account not found', 404);

    const [record] = await trx(TABLE).where({ id }).update({ archived_at: trx.fn.now() }).returning('*');
    await logActivity(trx, owner, { objectType: 'account', objectId: id, actorId, activityType: 'system_event', summary: 'Account archived' });
    await emitEvent({ aggregateType: 'account', aggregateId: id, eventType: 'crm.account.archived', payload: {} }, trx);
    return record;
  });
}

export async function getRelated(owner, id) {
  const account = await getById(owner, id);

  const [contacts, opportunities, activities] = await Promise.all([
    ownerScope(db('crm_contacts'), owner).where({ account_id: id }).whereNull('archived_at').orderBy('created_at', 'desc'),
    db('crm_opportunities')
      .where({ account_id: id })
      .whereNot((qb) => qb.whereNotNull('closed_at'))
      .orderBy('created_at', 'desc'),
    db('crm_activities').where({ object_type: 'account', object_id: id }).orderBy('occurred_at', 'desc').limit(20),
  ]);

  return { account, contacts, opportunities, activities };
}

export async function getBuyingGroup(owner, id) {
  await getById(owner, id);
  const rows = await db('crm_account_contact_roles')
    .where({ account_id: id })
    .join('crm_contacts', 'crm_contacts.id', 'crm_account_contact_roles.contact_id')
    .select(
      'crm_account_contact_roles.*',
      'crm_contacts.first_name',
      'crm_contacts.last_name',
      'crm_contacts.display_name',
      'crm_contacts.job_title',
      'crm_contacts.email_normalized',
      'crm_contacts.avatar_url'
    );
  return rows;
}

export async function computeRelationshipHealth(owner, id, { persist = false, trx } = {}) {
  const account = await getById(owner, id);
  const [interactionRow] = await db('crm_activities').where({ object_type: 'account', object_id: id }).count({ count: '*' });
  const [openOppRow] = await db('crm_opportunities').where({ account_id: id }).whereNull('closed_at').count({ count: '*' });
  const [followupTotal] = await db('crm_followups').where({ object_type: 'account', object_id: id }).count({ count: '*' });
  const [followupDone] = await db('crm_followups').where({ object_type: 'account', object_id: id, status: 'done' }).count({ count: '*' });

  const totalFollowups = Number(followupTotal.count || 0);
  const doneFollowups = Number(followupDone.count || 0);

  const result = await scoreRelationshipHealth(
    {
      lastInteractionAt: account.last_interaction_at,
      interactionCount: Number(interactionRow.count || 0),
      openOpportunityCount: Number(openOppRow.count || 0),
      followupCompletionRate: totalFollowups > 0 ? doneFollowups / totalFollowups : 0,
    },
    { owner, objectType: 'account', objectId: id, trx: persist ? trx || db : null }
  );

  if (persist) {
    const executor = trx || db;
    await executor(TABLE).where({ id }).update({ relationship_health_score: result.score });
  }

  return result;
}
