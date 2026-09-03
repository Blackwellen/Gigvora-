import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const SPEND_TABLE = 'business_spend';
const BUDGETS_TABLE = 'business_budgets';

const WRITABLE_SPEND_FIELDS = ['category', 'vendor', 'description', 'amount', 'currency', 'spend_date', 'department_id', 'team_id'];
const UPDATABLE_SPEND_FIELDS = ['status', 'is_anomaly', 'anomaly_reason', 'category', 'vendor', 'description', 'amount', 'department_id', 'team_id'];
const WRITABLE_BUDGET_FIELDS = ['department_id', 'team_id', 'period', 'category', 'allocated_amount', 'spent_amount', 'currency', 'status'];

function pickFields(body = {}, allowed) {
  const out = {};
  for (const field of allowed) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

async function assertSpendInCompany(id, companyId) {
  const row = await db(SPEND_TABLE).where({ id }).first();
  if (!row || row.company_id !== companyId) throw new AppError('Spend record not found', 404);
  return row;
}

async function assertBudgetInCompany(id, companyId) {
  const row = await db(BUDGETS_TABLE).where({ id }).first();
  if (!row || row.company_id !== companyId) throw new AppError('Budget not found', 404);
  return row;
}

export async function list(companyId, filters = {}) {
  const { category, department_id, team_id, status, from, to, limit = 20, offset = 0 } = filters;
  const cappedLimit = Math.min(Number(limit) || 20, 100);
  const cappedOffset = Number(offset) || 0;

  const build = () => {
    const query = db(SPEND_TABLE)
      .where('business_spend.company_id', companyId)
      .leftJoin('departments', 'departments.id', 'business_spend.department_id')
      .leftJoin('teams', 'teams.id', 'business_spend.team_id');
    if (category) query.andWhere('business_spend.category', category);
    if (department_id) query.andWhere('business_spend.department_id', department_id);
    if (team_id) query.andWhere('business_spend.team_id', team_id);
    if (status) query.andWhere('business_spend.status', status);
    if (from) query.andWhere('business_spend.spend_date', '>=', from);
    if (to) query.andWhere('business_spend.spend_date', '<=', to);
    return query;
  };

  const [rows, [{ count }]] = await Promise.all([
    build()
      .orderBy('business_spend.spend_date', 'desc')
      .limit(cappedLimit)
      .offset(cappedOffset)
      .select('business_spend.*', 'departments.name as department_name', 'teams.name as team_name'),
    build().count({ count: 'business_spend.id' }),
  ]);

  return { items: rows, total: Number(count) };
}

export async function summary(companyId) {
  const [byCategory, byDepartment, monthlyTrend, anomalyRow, mtdRow, flaggedRow] = await Promise.all([
    db(SPEND_TABLE).where({ company_id: companyId }).select('category').sum({ total: 'amount' }).groupBy('category'),
    db(SPEND_TABLE)
      .where('business_spend.company_id', companyId)
      .leftJoin('departments', 'departments.id', 'business_spend.department_id')
      .whereNotNull('business_spend.department_id')
      .select('business_spend.department_id', 'departments.name as department_name')
      .sum({ total: 'business_spend.amount' })
      .groupBy('business_spend.department_id', 'departments.name'),
    db(SPEND_TABLE)
      .where('company_id', companyId)
      .andWhere('spend_date', '>=', db.raw("date_trunc('month', current_date) - interval '11 months'"))
      .select(db.raw("to_char(date_trunc('month', spend_date), 'YYYY-MM') as month"))
      .sum({ total: 'amount' })
      .groupBy(db.raw("date_trunc('month', spend_date)"))
      .orderBy(db.raw("date_trunc('month', spend_date)"), 'asc'),
    db(SPEND_TABLE).where({ company_id: companyId, is_anomaly: true }).count({ count: '*' }).first(),
    db(SPEND_TABLE)
      .where('company_id', companyId)
      .andWhere('spend_date', '>=', db.raw("date_trunc('month', current_date)"))
      .sum({ total: 'amount' })
      .first(),
    db(SPEND_TABLE).where({ company_id: companyId, status: 'flagged' }).sum({ total: 'amount' }).first(),
  ]);

  return {
    by_category: byCategory.map((r) => ({ category: r.category, total: Number(r.total || 0) })),
    by_department: byDepartment.map((r) => ({ department_id: r.department_id, department_name: r.department_name, total: Number(r.total || 0) })),
    monthly_trend: monthlyTrend.map((r) => ({ month: r.month, total: Number(r.total || 0) })),
    anomaly_count: Number(anomalyRow?.count || 0),
    total_mtd: Number(mtdRow?.total || 0),
    total_flagged: Number(flaggedRow?.total || 0),
  };
}

export async function create(companyId, data, userId) {
  const fields = pickFields(data, WRITABLE_SPEND_FIELDS);
  if (!fields.description) throw new AppError('A spend description is required', 400);
  if (fields.amount === undefined) throw new AppError('A spend amount is required', 400);
  if (!fields.spend_date) throw new AppError('A spend date is required', 400);

  const payload = {
    ...fields,
    company_id: companyId,
    created_by: userId || null,
    status: 'pending_approval',
  };

  const [record] = await db(SPEND_TABLE).insert(payload).returning('*');
  return record;
}

export async function update(companyId, id, data) {
  await assertSpendInCompany(id, companyId);
  const fields = pickFields(data, UPDATABLE_SPEND_FIELDS);
  const [record] = await db(SPEND_TABLE).where({ id }).update(fields).returning('*');
  return record;
}

export async function listBudgets(companyId, { period } = {}) {
  const query = db(BUDGETS_TABLE)
    .where('business_budgets.company_id', companyId)
    .leftJoin('departments', 'departments.id', 'business_budgets.department_id')
    .leftJoin('teams', 'teams.id', 'business_budgets.team_id');
  if (period) query.andWhere('business_budgets.period', period);

  const rows = await query
    .orderBy('business_budgets.period', 'desc')
    .select('business_budgets.*', 'departments.name as department_name', 'teams.name as team_name');

  const items = rows.map((row) => ({
    ...row,
    utilisation_pct: Number(row.allocated_amount) > 0 ? Number(((Number(row.spent_amount) / Number(row.allocated_amount)) * 100).toFixed(1)) : 0,
  }));

  return { items, total: items.length };
}

export async function createBudget(companyId, data) {
  const fields = pickFields(data, WRITABLE_BUDGET_FIELDS);
  if (!fields.period) throw new AppError('A budget period is required', 400);

  const payload = { ...fields, company_id: companyId };
  const [record] = await db(BUDGETS_TABLE).insert(payload).returning('*');
  return record;
}

export async function updateBudget(companyId, id, data) {
  await assertBudgetInCompany(id, companyId);
  const fields = pickFields(data, WRITABLE_BUDGET_FIELDS);
  const [record] = await db(BUDGETS_TABLE).where({ id }).update(fields).returning('*');
  return record;
}
