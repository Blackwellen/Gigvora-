import { db, ownerScope } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'crm_pipeline_stages';

const DEFAULT_STAGES = [
  { key: 'new', label: 'New', order_index: 0, is_won: false, is_lost: false, color: 'slate' },
  { key: 'qualified', label: 'Qualified', order_index: 1, is_won: false, is_lost: false, color: 'blue' },
  { key: 'discovery', label: 'Discovery', order_index: 2, is_won: false, is_lost: false, color: 'indigo' },
  { key: 'proposal', label: 'Proposal', order_index: 3, is_won: false, is_lost: false, color: 'violet' },
  { key: 'negotiation', label: 'Negotiation', order_index: 4, is_won: false, is_lost: false, color: 'amber' },
  { key: 'contract', label: 'Contract', order_index: 5, is_won: false, is_lost: false, color: 'orange' },
  { key: 'won', label: 'Won', order_index: 6, is_won: true, is_lost: false, color: 'green' },
  { key: 'lost', label: 'Lost', order_index: 7, is_won: false, is_lost: true, color: 'red' },
];

/**
 * Lazily seeds the 8 default stages for an owner scope the first time
 * they're needed (list read or opportunity/lead-conversion write path that
 * requires a stage to exist), matching the "seed on first read" convention
 * used elsewhere for per-tenant defaults in this repo.
 */
export async function ensureDefaultStages(trx, owner) {
  const existing = await ownerScope(trx(TABLE), owner).orderBy('order_index', 'asc');
  if (existing.length) return existing;

  const rows = DEFAULT_STAGES.map((stage) => ({
    owner_type: owner.ownerType,
    owner_id: owner.ownerId,
    workspace_id: owner.workspaceId ?? null,
    ...stage,
  }));
  const inserted = await trx(TABLE).insert(rows).returning('*');
  return inserted.sort((a, b) => a.order_index - b.order_index);
}

export async function list(owner) {
  return db.transaction(async (trx) => ensureDefaultStages(trx, owner));
}

export async function reorder(owner, items = []) {
  if (!Array.isArray(items) || !items.length) throw new AppError('items array is required', 400);

  return db.transaction(async (trx) => {
    const results = [];
    for (const item of items) {
      const [record] = await ownerScope(trx(TABLE), owner)
        .where({ id: item.id })
        .update({ order_index: item.orderIndex, updated_at: trx.fn.now() })
        .returning('*');
      if (!record) throw new AppError(`Pipeline stage not found: ${item.id}`, 404);
      results.push(record);
    }
    return results.sort((a, b) => a.order_index - b.order_index);
  });
}

export async function getById(owner, id) {
  const record = await ownerScope(db(TABLE), owner).where({ id }).first();
  if (!record) throw new AppError('Pipeline stage not found', 404);
  return record;
}
