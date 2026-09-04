import { db } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';

const TABLE = 'crm_account_contact_roles';

const WRITABLE_FIELDS = {
  relationshipType: 'relationship_type',
  jobTitleAtAccount: 'job_title_at_account',
  department: 'department',
  seniority: 'seniority',
  isPrimary: 'is_primary',
  startedAt: 'started_at',
  endedAt: 'ended_at',
  buyingRole: 'buying_role',
  influenceLevel: 'influence_level',
  relationshipStrength: 'relationship_strength',
};

function buildPatch(data = {}) {
  const patch = {};
  for (const [key, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[key] !== undefined) patch[column] = data[key];
  }
  return patch;
}

async function assertAccountOwned(owner, accountId) {
  const account = await db('crm_accounts')
    .where({ id: accountId, owner_type: owner.ownerType, owner_id: owner.ownerId })
    .whereNull('archived_at')
    .first();
  if (!account) throw new AppError('Account not found', 404);
  return account;
}

export async function list(owner, accountId) {
  await assertAccountOwned(owner, accountId);
  return db(TABLE)
    .where({ account_id: accountId })
    .join('crm_contacts', 'crm_contacts.id', `${TABLE}.contact_id`)
    .select(`${TABLE}.*`, 'crm_contacts.first_name', 'crm_contacts.last_name', 'crm_contacts.display_name', 'crm_contacts.job_title', 'crm_contacts.avatar_url')
    .orderBy(`${TABLE}.is_primary`, 'desc');
}

export async function create(owner, actorId, accountId, data) {
  await assertAccountOwned(owner, accountId);
  if (!data.contactId) throw new AppError('contactId is required', 400);

  const contact = await db('crm_contacts').where({ id: data.contactId, owner_type: owner.ownerType, owner_id: owner.ownerId }).first();
  if (!contact) throw new AppError('Contact not found', 404);

  const patch = buildPatch(data);
  const [record] = await db(TABLE)
    .insert({ account_id: accountId, contact_id: data.contactId, ...patch })
    .onConflict(['account_id', 'contact_id'])
    .merge({ ...patch, updated_at: db.fn.now() })
    .returning('*');

  await emitEvent({ aggregateType: 'account', aggregateId: accountId, eventType: 'crm.account.buying_group_updated', payload: { contactId: data.contactId } });
  return record;
}

export async function update(owner, actorId, accountId, roleId, data) {
  await assertAccountOwned(owner, accountId);
  const patch = buildPatch(data);
  patch.updated_at = db.fn.now();

  const [record] = await db(TABLE).where({ id: roleId, account_id: accountId }).update(patch).returning('*');
  if (!record) throw new AppError('Buying-group role not found', 404);
  return record;
}

export async function remove(owner, actorId, accountId, roleId) {
  await assertAccountOwned(owner, accountId);
  const count = await db(TABLE).where({ id: roleId, account_id: accountId }).del();
  if (!count) throw new AppError('Buying-group role not found', 404);
}
