import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

// `pm_budget_lines.planned_amount` is the planned allocation, not actual
// spend, so "spent" is computed from paid/approved `pm_expenses` — the
// table that actually tracks money that has gone out the door.
const SPENT_STATUSES = ['approved', 'paid'];

function computeUtilisation(totalBudget, spent) {
  const budget = Number(totalBudget || 0);
  if (!budget) return null;
  return Number(((Number(spent || 0) / budget) * 100).toFixed(1));
}

function toRow(row) {
  const total_budget = row.total_budget !== undefined ? Number(row.total_budget || 0) : 0;
  const spent = Number(row.spent || 0);
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    project_type: row.project_type,
    progress_pct: row.progress_pct,
    start_date: row.start_date,
    target_end_date: row.target_end_date,
    total_budget,
    spent,
    budget_utilisation_pct: computeUtilisation(total_budget, spent),
    member_count: Number(row.member_count || 0),
  };
}

function baseQuery(companyId) {
  return db('pm_projects')
    .where('pm_projects.company_id', companyId)
    .leftJoin('pm_project_budgets', 'pm_project_budgets.project_id', 'pm_projects.id')
    .select(
      'pm_projects.*',
      'pm_project_budgets.total_budget as total_budget',
      db
        .raw(
          `(select coalesce(sum(pm_expenses.amount), 0) from pm_expenses where pm_expenses.project_id = pm_projects.id and pm_expenses.status in (?, ?)) as spent`,
          SPENT_STATUSES
        ),
      db.raw('(select count(*) from pm_project_members where pm_project_members.project_id = pm_projects.id) as member_count')
    );
}

export async function list(companyId, filters = {}) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const { status, limit = 50, offset = 0 } = filters;
  const cappedLimit = Math.min(Number(limit) || 50, 100);

  const build = () => {
    const qb = baseQuery(companyId);
    if (status) qb.andWhere('pm_projects.status', status);
    return qb;
  };

  const countQuery = db('pm_projects').where('company_id', companyId);
  if (status) countQuery.andWhere('status', status);

  const [rows, [{ count }]] = await Promise.all([
    build().orderBy('pm_projects.updated_at', 'desc').limit(cappedLimit).offset(Number(offset) || 0),
    countQuery.count({ count: '*' }),
  ]);

  return { items: rows.map(toRow), total: Number(count) };
}

export async function getById(id, companyId) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const row = await baseQuery(companyId).andWhere('pm_projects.id', id).first();
  if (!row) throw new AppError('project not found', 404);
  return toRow(row);
}
