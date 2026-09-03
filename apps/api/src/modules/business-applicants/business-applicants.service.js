import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'applications';

const BASE_SELECT = [
  'applications.id',
  'applications.status',
  'applications.match_score',
  'applications.source',
  'applications.applied_at',
  'applications.created_at',
  'applications.job_id',
  'jobs.title as job_title',
  'users.id as applicant_id',
  'users.first_name',
  'users.last_name',
  'users.email',
  'users.headline as applicant_headline',
  'profiles.avatar_url as applicant_avatar_url',
];

function baseQuery(companyId, { job_id, status, q, department_id } = {}) {
  const qb = db(TABLE)
    .join('jobs', 'jobs.id', 'applications.job_id')
    .join('users', 'users.id', 'applications.applicant_id')
    .leftJoin('profiles', 'profiles.user_id', 'users.id')
    .where('jobs.company_id', companyId);

  if (job_id) qb.andWhere('applications.job_id', job_id);
  if (status) qb.andWhere('applications.status', status);
  if (q) {
    qb.andWhere((w) =>
      w
        .whereILike('users.first_name', `%${q}%`)
        .orWhereILike('users.last_name', `%${q}%`)
        .orWhereILike('users.email', `%${q}%`)
    );
  }
  if (department_id) {
    qb.andWhere(
      'applications.job_id',
      'in',
      db('hiring_plans').select('job_id').where({ department_id }).whereNotNull('job_id')
    );
  }

  return qb;
}

function mapRow(row) {
  return {
    id: row.id,
    status: row.status,
    match_score: row.match_score,
    applied_at: row.applied_at || row.created_at,
    created_at: row.created_at,
    job_id: row.job_id,
    job_title: row.job_title,
    applicant_id: row.applicant_id,
    applicant_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    applicant_email: row.email,
    applicant_headline: row.applicant_headline,
    applicant_avatar_url: row.applicant_avatar_url,
  };
}

export async function list(companyId, { job_id, status, q, department_id, limit = 20, offset = 0 } = {}) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const cappedLimit = Math.min(Number(limit) || 20, 100);

  const [rows, [{ count }]] = await Promise.all([
    baseQuery(companyId, { job_id, status, q, department_id })
      .clone()
      .select(BASE_SELECT)
      .orderBy('applications.created_at', 'desc')
      .limit(cappedLimit)
      .offset(Number(offset) || 0),
    baseQuery(companyId, { job_id, status, q, department_id }).clone().count({ count: 'applications.id' }),
  ]);

  return { items: rows.map(mapRow), total: Number(count) };
}

export async function getById(id, companyId) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });

  const row = await db(TABLE)
    .join('jobs', 'jobs.id', 'applications.job_id')
    .join('users', 'users.id', 'applications.applicant_id')
    .leftJoin('profiles', 'profiles.user_id', 'users.id')
    .where('applications.id', id)
    .andWhere('jobs.company_id', companyId)
    .select(...BASE_SELECT, 'applications.resume_url', 'applications.cover_letter', 'applications.ml_insights', 'applications.updated_at')
    .first();

  if (!row) throw new AppError('applicant not found', 404, { code: 'APPLICANT_NOT_FOUND' });

  // Best-effort stage-history reconstruction from what we actually have —
  // created_at (submitted) and, when the record has since moved past
  // "submitted", updated_at as the most recent stage transition. This is
  // not a full audit trail (none exists on `applications`), just a small
  // two-point timeline for the detail view.
  const stage_history = [{ status: 'submitted', at: row.created_at }];
  if (row.status !== 'submitted' && row.updated_at) {
    stage_history.push({ status: row.status, at: row.updated_at });
  }

  return { ...mapRow(row), resume_url: row.resume_url, cover_letter: row.cover_letter, stage_history };
}

export async function summary(companyId) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });

  const rows = await db(TABLE)
    .join('jobs', 'jobs.id', 'applications.job_id')
    .where('jobs.company_id', companyId)
    .select('applications.status')
    .count({ count: 'applications.id' })
    .groupBy('applications.status');

  const by_status = rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  const total = by_status.reduce((sum, r) => sum + r.count, 0);

  return { by_status, total };
}
