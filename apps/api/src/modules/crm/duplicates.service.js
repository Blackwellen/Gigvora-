import { db, ownerScope, paginationParams, logActivity } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { normalizeEmail, normalizePhone } from '../../common/utils/normalize.js';
import { scoreDuplicateMatch } from './ai.service.js';

const OBJECT_TABLE = { contact: 'crm_contacts', lead: 'crm_leads', account: 'crm_accounts' };
const ARCHIVABLE = { contact: true, account: true, lead: false };

function nameSimilarity(a = '', b = '') {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.7;
  const setX = new Set(x.split(/\s+/));
  const setY = new Set(y.split(/\s+/));
  const overlap = [...setX].filter((tok) => setY.has(tok)).length;
  const union = new Set([...setX, ...setY]).size;
  return union ? overlap / union : 0;
}

export async function list(owner, { objectType, status = 'pending', limit, offset } = {}) {
  const { limit: lim, offset: off } = paginationParams({ limit, offset });
  const build = () => {
    const qb = ownerScope(db('crm_duplicate_candidates'), owner);
    if (objectType) qb.andWhere({ object_type: objectType });
    if (status) qb.andWhere({ resolution_status: status });
    return qb;
  };
  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('created_at', 'desc').limit(lim).offset(off),
    build().count({ count: '*' }),
  ]);
  return { data: rows, total: Number(count) };
}

/**
 * detectDuplicates — opportunistic sweep run from contacts/leads/accounts
 * create-flows. Compares `record` (the just-created row) against existing
 * rows of the same object type in the same owner scope; any pairing that
 * scores > 70 via scoreDuplicateMatch is inserted into
 * crm_duplicate_candidates (resolution_status='pending').
 */
export async function detectDuplicates(trx, owner, objectType, record) {
  const table = OBJECT_TABLE[objectType];
  if (!table || !record?.id) return [];

  const emailNorm = record.email_normalized || null;
  const phoneNorm = record.phone_normalized || null;
  const nameA = record.display_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.name || record.company_name || '';
  const companyA = record.company_name || record.account_id || null;

  if (!emailNorm && !phoneNorm && !nameA) return [];

  let candidatesQuery = ownerScope(trx(table), owner).andWhereNot({ id: record.id });
  candidatesQuery = candidatesQuery.andWhere((qb) => {
    if (emailNorm) qb.orWhere('email_normalized', emailNorm);
    if (phoneNorm) qb.orWhere('phone_normalized', phoneNorm);
  });
  if (!emailNorm && !phoneNorm) {
    candidatesQuery = ownerScope(trx(table), owner).andWhereNot({ id: record.id }).limit(50);
  }

  const candidates = await candidatesQuery.limit(50);
  const inserted = [];

  for (const other of candidates) {
    const nameB = other.display_name || `${other.first_name || ''} ${other.last_name || ''}`.trim() || other.name || other.company_name || '';
    const emailExact = Boolean(emailNorm && other.email_normalized && emailNorm === other.email_normalized);
    const phoneExact = Boolean(phoneNorm && other.phone_normalized && phoneNorm === other.phone_normalized);
    const companyB = other.company_name || other.account_id || null;
    const companyMatch = Boolean(companyA && companyB && String(companyA) === String(companyB));

    const { score, explanation } = await scoreDuplicateMatch(
      { emailExact, phoneExact, nameSimilarity: nameSimilarity(nameA, nameB), companyMatch },
      { owner, objectType, trx: null }
    );

    if (score > 70) {
      const [recordAId, recordBId] = [record.id, other.id].sort();
      const existing = await trx('crm_duplicate_candidates')
        .where({ object_type: objectType, record_a_id: recordAId, record_b_id: recordBId })
        .first();
      if (!existing) {
        const [row] = await trx('crm_duplicate_candidates')
          .insert({
            owner_type: owner.ownerType,
            owner_id: owner.ownerId,
            workspace_id: owner.workspaceId ?? null,
            object_type: objectType,
            record_a_id: recordAId,
            record_b_id: recordBId,
            match_score: score,
            match_features_jsonb: JSON.stringify(explanation),
            model_version: 'heuristic-v1',
          })
          .returning('*');
        inserted.push(row);
      }
    }
  }

  return inserted;
}

async function reassignContactFks(trx, fromId, toId) {
  await trx('crm_opportunities').where({ primary_contact_id: fromId }).update({ primary_contact_id: toId });
  await trx('crm_opportunities').where({ champion_contact_id: fromId }).update({ champion_contact_id: toId });
  await trx('crm_opportunities').where({ decision_maker_contact_id: fromId }).update({ decision_maker_contact_id: toId });
  await trx('crm_opportunities').where({ economic_buyer_contact_id: fromId }).update({ economic_buyer_contact_id: toId });
  await trx('crm_leads').where({ contact_id: fromId }).update({ contact_id: toId });
  await trx('crm_leads').where({ converted_contact_id: fromId }).update({ converted_contact_id: toId });
  await trx('crm_activities').where({ object_type: 'contact', object_id: fromId }).update({ object_id: toId });
  await trx('crm_followups').where({ object_type: 'contact', object_id: fromId }).update({ object_id: toId });
  // account_contact_roles has a unique (account_id, contact_id) — drop the loser's row where it collides.
  const winnerRoles = await trx('crm_account_contact_roles').where({ contact_id: toId }).select('account_id');
  const winnerAccountIds = new Set(winnerRoles.map((r) => r.account_id));
  const loserRoles = await trx('crm_account_contact_roles').where({ contact_id: fromId });
  for (const role of loserRoles) {
    if (winnerAccountIds.has(role.account_id)) {
      await trx('crm_account_contact_roles').where({ id: role.id }).del();
    } else {
      await trx('crm_account_contact_roles').where({ id: role.id }).update({ contact_id: toId });
    }
  }
}

async function reassignAccountFks(trx, fromId, toId) {
  await trx('crm_contacts').where({ account_id: fromId }).update({ account_id: toId });
  await trx('crm_opportunities').where({ account_id: fromId }).update({ account_id: toId });
  await trx('crm_leads').where({ account_id: fromId }).update({ account_id: toId });
  await trx('crm_leads').where({ converted_account_id: fromId }).update({ converted_account_id: toId });
  await trx('crm_activities').where({ object_type: 'account', object_id: fromId }).update({ object_id: toId });
  await trx('crm_followups').where({ object_type: 'account', object_id: fromId }).update({ object_id: toId });
  const winnerRoles = await trx('crm_account_contact_roles').where({ account_id: toId }).select('contact_id');
  const winnerContactIds = new Set(winnerRoles.map((r) => r.contact_id));
  const loserRoles = await trx('crm_account_contact_roles').where({ account_id: fromId });
  for (const role of loserRoles) {
    if (winnerContactIds.has(role.contact_id)) {
      await trx('crm_account_contact_roles').where({ id: role.id }).del();
    } else {
      await trx('crm_account_contact_roles').where({ id: role.id }).update({ account_id: toId });
    }
  }
}

async function reassignLeadFks(trx, fromId, toId) {
  await trx('crm_activities').where({ object_type: 'lead', object_id: fromId }).update({ object_id: toId });
  await trx('crm_followups').where({ object_type: 'lead', object_id: fromId }).update({ object_id: toId });
}

export async function resolve(req, owner, id, { action, mergeInto } = {}) {
  const VALID_ACTIONS = ['merge', 'kept_separate', 'linked', 'ignored'];
  if (!VALID_ACTIONS.includes(action)) throw new AppError('Invalid resolution action', 400);

  return db.transaction(async (trx) => {
    const candidate = await ownerScope(trx('crm_duplicate_candidates'), owner).where({ id }).first();
    if (!candidate) throw new AppError('Duplicate candidate not found', 404);

    const patch = {
      resolution_status: action,
      resolution_action: action,
      resolved_by: req.user.sub,
      resolved_at: trx.fn.now(),
    };

    if (action === 'merge') {
      const winnerId = mergeInto === candidate.record_b_id ? candidate.record_b_id : candidate.record_a_id;
      const loserId = winnerId === candidate.record_a_id ? candidate.record_b_id : candidate.record_a_id;
      const table = OBJECT_TABLE[candidate.object_type];

      if (candidate.object_type === 'contact') await reassignContactFks(trx, loserId, winnerId);
      else if (candidate.object_type === 'account') await reassignAccountFks(trx, loserId, winnerId);
      else if (candidate.object_type === 'lead') await reassignLeadFks(trx, loserId, winnerId);

      if (ARCHIVABLE[candidate.object_type]) {
        await trx(table).where({ id: loserId }).update({ archived_at: trx.fn.now() });
      }

      await logActivity(trx, owner, {
        objectType: candidate.object_type,
        objectId: winnerId,
        actorId: req.user.sub,
        activityType: 'system_event',
        summary: `Merged duplicate ${candidate.object_type} record`,
        metadataJsonb: { action: 'merge', mergedFrom: loserId, mergedInto: winnerId },
      });

      await emitEvent(
        { aggregateType: candidate.object_type, aggregateId: winnerId, eventType: `crm.${candidate.object_type}.merged`, payload: { mergedFrom: loserId, mergedInto: winnerId } },
        trx
      );
    }

    const [updated] = await trx('crm_duplicate_candidates').where({ id }).update(patch).returning('*');
    return updated;
  });
}
