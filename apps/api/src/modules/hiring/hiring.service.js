import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const PLANS_TABLE = 'hiring_plans';

const APPLICATION_STAGES = ['submitted', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'];

const PLAN_WRITABLE_FIELDS = [
  'department_id',
  'team_id',
  'job_id',
  'role_title',
  'target_hires',
  'filled_hires',
  'priority',
  'target_date',
  'status',
  'owner_id',
  'notes',
];

function pickWritableFields(body = {}, fields) {
  const out = {};
  for (const field of fields) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

export async function overview(companyId) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });

  const [openRolesRow, hireTotals, avgTimeRow, funnelRows] = await Promise.all([
    db('jobs').where({ company_id: companyId, status: 'open' }).count({ count: '*' }).first(),
    db(PLANS_TABLE).where({ company_id: companyId }).sum({ target: 'target_hires', filled: 'filled_hires' }).first(),
    db('applications')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.company_id', companyId)
      .andWhere('applications.status', 'hired')
      .avg({ avg_days: db.raw("EXTRACT(EPOCH FROM (applications.updated_at - COALESCE(applications.applied_at, applications.created_at))) / 86400") })
      .first(),
    db('applications')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.company_id', companyId)
      .select('applications.status')
      .count({ count: '*' })
      .groupBy('applications.status'),
  ]);

  const countsByStage = new Map(funnelRows.map((r) => [r.status, Number(r.count)]));
  const funnel = APPLICATION_STAGES.map((stage) => ({ stage, count: countsByStage.get(stage) || 0 }));

  return {
    open_roles: Number(openRolesRow?.count || 0),
    total_target_hires: Number(hireTotals?.target || 0),
    total_filled_hires: Number(hireTotals?.filled || 0),
    avg_time_to_hire_days: avgTimeRow?.avg_days ? Number(Number(avgTimeRow.avg_days).toFixed(1)) : null,
    funnel,
  };
}

function applyPlanFilters(query, filters) {
  const { status, priority, department_id } = filters;
  if (status) query.andWhere('hiring_plans.status', status);
  if (priority) query.andWhere('hiring_plans.priority', priority);
  if (department_id) query.andWhere('hiring_plans.department_id', department_id);
  return query;
}

export async function listPlans(companyId, filters = {}) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });

  const base = () =>
    applyPlanFilters(
      db(PLANS_TABLE)
        .where('hiring_plans.company_id', companyId)
        .leftJoin('jobs', 'jobs.id', 'hiring_plans.job_id')
        .leftJoin('departments', 'departments.id', 'hiring_plans.department_id')
        .leftJoin('teams', 'teams.id', 'hiring_plans.team_id'),
      filters
    );

  const [rows, [{ count }]] = await Promise.all([
    base()
      .orderBy('hiring_plans.created_at', 'desc')
      .select(
        'hiring_plans.*',
        'jobs.title as job_title',
        'departments.name as department_name',
        'teams.name as team_name'
      ),
    base().count({ count: 'hiring_plans.id' }),
  ]);

  return { items: rows, total: Number(count) };
}

export async function createPlan(companyId, data) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const fields = pickWritableFields(data, PLAN_WRITABLE_FIELDS);
  if (!fields.role_title) throw new AppError('role_title is required', 400);

  const [record] = await db(PLANS_TABLE)
    .insert({ ...fields, company_id: companyId })
    .returning('*');
  return record;
}

export async function updatePlan(id, companyId, data) {
  const existing = await db(PLANS_TABLE).where({ id }).first();
  if (!existing) throw new AppError('hiring plan not found', 404);
  if (companyId && existing.company_id !== companyId) throw new AppError('You do not have access to this hiring plan', 403);

  const fields = pickWritableFields(data, PLAN_WRITABLE_FIELDS);
  const [record] = await db(PLANS_TABLE).where({ id }).update(fields).returning('*');
  return record;
}

export async function removePlan(id, companyId) {
  const existing = await db(PLANS_TABLE).where({ id }).first('company_id');
  if (!existing) throw new AppError('hiring plan not found', 404);
  if (companyId && existing.company_id !== companyId) throw new AppError('You do not have access to this hiring plan', 403);
  await db(PLANS_TABLE).where({ id }).del();
}

// Best-effort stage-duration heuristic: average days between an
// application entering the funnel and the first event that moves it into
// the next stage (screening review, interview scheduled, offer created).
// Deliberately simple — a handful of straightforward aggregate queries
// rather than a full pipeline-state-machine model.
export async function bottlenecks(companyId) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });

  const [toReviewing, toInterviewing, toOffered] = await Promise.all([
    db('screening_reviews')
      .join('applications', 'applications.id', 'screening_reviews.application_id')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.company_id', companyId)
      .avg({ avg_days: db.raw("EXTRACT(EPOCH FROM (screening_reviews.created_at - COALESCE(applications.applied_at, applications.created_at))) / 86400") })
      .count({ application_count: 'screening_reviews.id' })
      .first(),
    db('interviews')
      .join('applications', 'applications.id', 'interviews.application_id')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.company_id', companyId)
      .avg({ avg_days: db.raw("EXTRACT(EPOCH FROM (interviews.scheduled_at - COALESCE(applications.applied_at, applications.created_at))) / 86400") })
      .count({ application_count: 'interviews.id' })
      .first(),
    db('offers')
      .join('applications', 'applications.id', 'offers.application_id')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.company_id', companyId)
      .avg({ avg_days: db.raw("EXTRACT(EPOCH FROM (offers.created_at - COALESCE(applications.applied_at, applications.created_at))) / 86400") })
      .count({ application_count: 'offers.id' })
      .first(),
  ]);

  const toStat = (stage, row) => ({
    stage,
    avg_days: row?.avg_days ? Number(Number(row.avg_days).toFixed(1)) : null,
    application_count: Number(row?.application_count || 0),
  });

  return [
    toStat('reviewing', toReviewing),
    toStat('interviewing', toInterviewing),
    toStat('offered', toOffered),
  ];
}
