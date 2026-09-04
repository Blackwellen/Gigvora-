import { db, ownerScope, paginationParams, logActivity } from './shared.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';

const TABLE = 'crm_segments';
const RULES_TABLE = 'crm_segment_rules';
const OBJECT_TABLE = { contact: 'crm_contacts', lead: 'crm_leads', account: 'crm_accounts' };
const VALID_OPERATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']);

const WRITABLE_FIELDS = {
  name: 'name',
  description: 'description',
  objectType: 'object_type',
  segmentType: 'segment_type',
  ownerUserId: 'owner_user_id',
};

function buildPatch(data = {}) {
  const patch = {};
  for (const [key, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[key] !== undefined) patch[column] = data[key];
  }
  return patch;
}

/**
 * Applies one rule to a knex query builder. Only the allow-listed operator
 * set is honored — anything else is rejected by callers (create/update/
 * preview) before this is ever reached.
 */
function applyRule(qb, rule) {
  const { field, operator, value } = rule;
  switch (operator) {
    case 'eq':
      qb.andWhere(field, '=', value);
      break;
    case 'neq':
      qb.andWhere(field, '!=', value);
      break;
    case 'gt':
      qb.andWhere(field, '>', value);
      break;
    case 'gte':
      qb.andWhere(field, '>=', value);
      break;
    case 'lt':
      qb.andWhere(field, '<', value);
      break;
    case 'lte':
      qb.andWhere(field, '<=', value);
      break;
    case 'contains':
      qb.andWhereILike(field, `%${value}%`);
      break;
    case 'in':
      qb.andWhere(field, 'in', Array.isArray(value) ? value : [value]);
      break;
    default:
      throw new AppError(`Unsupported operator: ${operator}`, 400);
  }
}

/**
 * Builds a dynamic knex query for `objectType` from a flat rule list. Rules
 * sharing a groupIndex are AND-ed together (group_logic on the first rule of
 * a later group decides how that group joins the running total — 'or' opens
 * a new top-level OR branch, anything else ANDs it in). Kept intentionally
 * simple: this is a filter builder, not a full expression parser.
 */
function buildSegmentQuery(owner, objectType, rules = []) {
  const table = OBJECT_TABLE[objectType];
  if (!table) throw new AppError('objectType must be one of contact, lead, account', 400);

  for (const rule of rules) {
    if (!rule?.field || typeof rule.field !== 'string' || !/^[a-z_][a-z0-9_]*$/i.test(rule.field)) {
      throw new AppError(`Invalid field: ${rule?.field}`, 400);
    }
    if (!VALID_OPERATORS.has(rule.operator)) {
      throw new AppError(`Unsupported operator: ${rule.operator}`, 400);
    }
  }

  const groups = new Map();
  for (const rule of rules) {
    const idx = rule.groupIndex ?? 0;
    if (!groups.has(idx)) groups.set(idx, []);
    groups.get(idx).push(rule);
  }

  const qb = ownerScope(db(table), owner);
  if (table === 'crm_contacts' || table === 'crm_accounts') qb.whereNull('archived_at');

  if (groups.size <= 1) {
    for (const rule of rules) applyRule(qb, rule);
    return qb;
  }

  qb.andWhere((outer) => {
    for (const groupRules of groups.values()) {
      const useOr = groupRules[0]?.groupLogic === 'or';
      outer[useOr ? 'orWhere' : 'andWhere']((inner) => {
        for (const rule of groupRules) applyRule(inner, rule);
      });
    }
  });

  return qb;
}

async function replaceRules(trx, segmentId, rules = []) {
  await trx(RULES_TABLE).where({ segment_id: segmentId }).del();
  if (!rules.length) return [];

  const rows = rules.map((rule, index) => ({
    segment_id: segmentId,
    field: rule.field,
    operator: rule.operator,
    value: JSON.stringify(rule.value ?? null),
    group_logic: rule.groupLogic || 'and',
    group_index: rule.groupIndex ?? 0,
    order_index: rule.orderIndex ?? index,
  }));
  return trx(RULES_TABLE).insert(rows).returning('*');
}

async function withRules(record) {
  if (!record) return record;
  const rules = await db(RULES_TABLE).where({ segment_id: record.id }).orderBy('order_index', 'asc');
  return { ...record, rules };
}

export async function list(owner, filters = {}) {
  const { limit, offset } = paginationParams(filters);
  const { objectType } = filters;

  const build = () => {
    const qb = ownerScope(db(TABLE), owner);
    if (objectType) qb.andWhere({ object_type: objectType });
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
  if (!record) throw new AppError('Segment not found', 404);
  return withRules(record);
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

    const rules = await replaceRules(trx, record.id, data.rules || []);
    await emitEvent({ aggregateType: 'segment', aggregateId: record.id, eventType: 'crm.segment.created', payload: { name: record.name } }, trx);

    return { ...record, rules };
  });
}

export async function update(owner, actorId, id, data) {
  return db.transaction(async (trx) => {
    const existing = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!existing) throw new AppError('Segment not found', 404);

    const patch = buildPatch(data);
    patch.updated_at = trx.fn.now();

    const [record] = await trx(TABLE).where({ id }).update(patch).returning('*');
    const rules = data.rules !== undefined ? await replaceRules(trx, id, data.rules) : await trx(RULES_TABLE).where({ segment_id: id }).orderBy('order_index', 'asc');

    await emitEvent({ aggregateType: 'segment', aggregateId: id, eventType: 'crm.segment.updated', payload: { fields: Object.keys(patch) } }, trx);

    return { ...record, rules };
  });
}

export async function remove(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const count = await ownerScope(trx(TABLE), owner).where({ id }).del();
    if (!count) throw new AppError('Segment not found', 404);
    await emitEvent({ aggregateType: 'segment', aggregateId: id, eventType: 'crm.segment.deleted', payload: {} }, trx);
  });
}

export async function preview(owner, { objectType, rules = [] } = {}) {
  const qb = buildSegmentQuery(owner, objectType, rules);
  const countQb = buildSegmentQuery(owner, objectType, rules);

  const [sample, [{ count }]] = await Promise.all([
    qb.orderBy('updated_at', 'desc').limit(10),
    countQb.count({ count: '*' }),
  ]);

  return { count: Number(count), sample };
}

export async function recalculate(owner, actorId, id) {
  return db.transaction(async (trx) => {
    const segment = await ownerScope(trx(TABLE), owner).where({ id }).first();
    if (!segment) throw new AppError('Segment not found', 404);

    const rules = await trx(RULES_TABLE).where({ segment_id: id }).orderBy('order_index', 'asc');
    const parsedRules = rules.map((r) => ({ ...r, value: typeof r.value === 'string' ? JSON.parse(r.value) : r.value, groupIndex: r.group_index, groupLogic: r.group_logic }));
    const qb = buildSegmentQuery(owner, segment.object_type, parsedRules);
    const [{ count }] = await qb.count({ count: '*' });

    const [record] = await trx(TABLE)
      .where({ id })
      .update({ member_count_cached: Number(count), last_recalculated_at: trx.fn.now(), updated_at: trx.fn.now() })
      .returning('*');

    return record;
  });
}
