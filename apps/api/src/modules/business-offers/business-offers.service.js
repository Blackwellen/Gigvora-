import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

function baseQuery(companyId) {
  return db('offers')
    .join('applications', 'applications.id', 'offers.application_id')
    .join('jobs', 'jobs.id', 'offers.job_id')
    .join('users', 'users.id', 'applications.applicant_id')
    .where('jobs.company_id', companyId);
}

function toRow(row) {
  return {
    id: row.id,
    status: row.status,
    base_salary: row.base_salary,
    bonus: row.bonus,
    equity: row.equity,
    currency: row.currency,
    start_date: row.start_date,
    expires_at: row.expires_at,
    job_id: row.job_id,
    job_title: row.job_title,
    application_id: row.application_id,
    candidate_name: row.candidate_name,
    created_at: row.created_at,
  };
}

export async function list(companyId, filters = {}) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const { status, limit = 50, offset = 0 } = filters;
  const cappedLimit = Math.min(Number(limit) || 50, 100);

  const build = () => {
    const qb = baseQuery(companyId);
    if (status) qb.andWhere('offers.status', status);
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build()
      .orderBy('offers.created_at', 'desc')
      .limit(cappedLimit)
      .offset(Number(offset) || 0)
      .select(
        'offers.*',
        'jobs.title as job_title',
        db.raw("(users.first_name || ' ' || users.last_name) as candidate_name")
      ),
    build().count({ count: 'offers.id' }),
  ]);

  return { items: rows.map(toRow), total: Number(count) };
}

export async function getById(id, companyId) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });

  const row = await baseQuery(companyId)
    .andWhere('offers.id', id)
    .first(
      'offers.*',
      'jobs.title as job_title',
      db.raw("(users.first_name || ' ' || users.last_name) as candidate_name")
    );
  if (!row) throw new AppError('offer not found', 404);
  return toRow(row);
}
