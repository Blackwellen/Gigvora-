import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const PLANS_TABLE = 'workforce_plans';
const SCENARIOS_TABLE = 'workforce_scenarios';

const PLAN_WRITABLE_FIELDS = [
  'name',
  'planning_period',
  'department_id',
  'current_headcount',
  'target_headcount',
  'status',
  'ai_forecast_summary',
];

const SCENARIO_WRITABLE_FIELDS = [
  'name',
  'scenario_type',
  'headcount_delta',
  'cost_delta',
  'assumptions',
  'projected_month',
  'is_selected',
];

function pickFields(body = {}, fields) {
  const out = {};
  for (const field of fields) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

export async function listPlans(companyId, { status, department_id, limit = 20, offset = 0 } = {}) {
  const cappedLimit = Math.min(Number(limit) || 20, 100);

  const build = () => {
    const qb = db(`${PLANS_TABLE} as wp`)
      .where('wp.company_id', companyId)
      .leftJoin('departments as d', 'd.id', 'wp.department_id');
    if (status) qb.andWhere('wp.status', status);
    if (department_id) qb.andWhere('wp.department_id', department_id);
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build()
      .orderBy('wp.created_at', 'desc')
      .limit(cappedLimit)
      .offset(Number(offset) || 0)
      .select('wp.*', 'd.name as department_name'),
    build().count({ count: 'wp.id' }),
  ]);

  return { items: rows, total: Number(count) };
}

export async function getPlanById(id, companyId) {
  const plan = await db(`${PLANS_TABLE} as wp`)
    .where('wp.id', id)
    .andWhere('wp.company_id', companyId)
    .leftJoin('departments as d', 'd.id', 'wp.department_id')
    .select('wp.*', 'd.name as department_name')
    .first();
  if (!plan) throw new AppError('workforce plan not found', 404, { code: 'WORKFORCE_PLAN_NOT_FOUND' });

  const scenarios = await db(SCENARIOS_TABLE)
    .where({ workforce_plan_id: id })
    .orderBy('scenario_type', 'asc');

  return { ...plan, scenarios };
}

export async function createPlan(data, { companyId, userId } = {}) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });

  const fields = pickFields(data, PLAN_WRITABLE_FIELDS);
  if (!fields.name) throw new AppError('name is required', 400, { code: 'VALIDATION_ERROR' });
  if (!fields.planning_period) throw new AppError('planning_period is required', 400, { code: 'VALIDATION_ERROR' });

  const payload = {
    ...fields,
    company_id: companyId,
    created_by: userId || null,
  };

  const [record] = await db(PLANS_TABLE).insert(payload).returning('*');
  return record;
}

export async function updatePlan(id, data, { companyId } = {}) {
  const existing = await db(PLANS_TABLE).where({ id }).first();
  if (!existing) throw new AppError('workforce plan not found', 404, { code: 'WORKFORCE_PLAN_NOT_FOUND' });
  if (companyId && existing.company_id !== companyId) throw new AppError('You do not have access to this workforce plan', 403);

  const fields = pickFields(data, PLAN_WRITABLE_FIELDS);
  const [record] = await db(PLANS_TABLE).where({ id }).update(fields).returning('*');
  return record;
}

export async function createScenario(planId, data, { companyId } = {}) {
  const plan = await db(PLANS_TABLE).where({ id: planId }).first();
  if (!plan) throw new AppError('workforce plan not found', 404, { code: 'WORKFORCE_PLAN_NOT_FOUND' });
  if (companyId && plan.company_id !== companyId) throw new AppError('You do not have access to this workforce plan', 403);

  const fields = pickFields(data, SCENARIO_WRITABLE_FIELDS);
  if (!fields.name) throw new AppError('name is required', 400, { code: 'VALIDATION_ERROR' });
  if (fields.assumptions !== undefined) fields.assumptions = JSON.stringify(fields.assumptions);

  const payload = {
    ...fields,
    workforce_plan_id: planId,
  };

  if (payload.is_selected) {
    return db.transaction(async (trx) => {
      const [record] = await trx(SCENARIOS_TABLE).insert(payload).returning('*');
      await trx(SCENARIOS_TABLE)
        .where({ workforce_plan_id: planId })
        .andWhereNot({ id: record.id })
        .update({ is_selected: false });
      return record;
    });
  }

  const [record] = await db(SCENARIOS_TABLE).insert(payload).returning('*');
  return record;
}

export async function updateScenario(id, data, { companyId } = {}) {
  const existing = await db(`${SCENARIOS_TABLE} as ws`)
    .join(`${PLANS_TABLE} as wp`, 'wp.id', 'ws.workforce_plan_id')
    .where('ws.id', id)
    .select('ws.*', 'wp.company_id as plan_company_id')
    .first();
  if (!existing) throw new AppError('workforce scenario not found', 404, { code: 'WORKFORCE_SCENARIO_NOT_FOUND' });
  if (companyId && existing.plan_company_id !== companyId) throw new AppError('You do not have access to this workforce scenario', 403);

  const fields = pickFields(data, SCENARIO_WRITABLE_FIELDS);
  if (fields.assumptions !== undefined) fields.assumptions = JSON.stringify(fields.assumptions);

  if (fields.is_selected === true) {
    return db.transaction(async (trx) => {
      const [record] = await trx(SCENARIOS_TABLE).where({ id }).update(fields).returning('*');
      await trx(SCENARIOS_TABLE)
        .where({ workforce_plan_id: existing.workforce_plan_id })
        .andWhereNot({ id })
        .update({ is_selected: false });
      return record;
    });
  }

  const [record] = await db(SCENARIOS_TABLE).where({ id }).update(fields).returning('*');
  return record;
}
