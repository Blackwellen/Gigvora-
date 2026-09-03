import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

function toCalendarRow(row) {
  return {
    id: row.id,
    scheduled_at: row.scheduled_at,
    duration_minutes: row.duration_minutes,
    type: row.type,
    status: row.status,
    round_number: row.round_number,
    job_id: row.job_id,
    job_title: row.job_title,
    application_id: row.application_id,
    candidate_name: row.candidate_name,
    location_or_link: row.location_or_link,
    interviewer_ids: row.interviewer_ids || [],
  };
}

function baseQuery(companyId) {
  return db('interviews')
    .join('applications', 'applications.id', 'interviews.application_id')
    .join('jobs', 'jobs.id', 'interviews.job_id')
    .join('users', 'users.id', 'applications.applicant_id')
    .where('jobs.company_id', companyId);
}

export async function list(companyId, filters = {}) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });
  const { from, to, status, interviewer_id, limit = 100, offset = 0 } = filters;
  const cappedLimit = Math.min(Number(limit) || 100, 200);

  const build = () => {
    const qb = baseQuery(companyId);
    if (from) qb.andWhere('interviews.scheduled_at', '>=', from);
    if (to) qb.andWhere('interviews.scheduled_at', '<=', to);
    if (status) qb.andWhere('interviews.status', status);
    if (interviewer_id) qb.andWhereRaw('interviews.interviewer_ids @> ?::jsonb', [JSON.stringify([interviewer_id])]);
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build()
      .orderBy('interviews.scheduled_at', 'asc')
      .limit(cappedLimit)
      .offset(Number(offset) || 0)
      .select(
        'interviews.*',
        'jobs.title as job_title',
        db.raw("(users.first_name || ' ' || users.last_name) as candidate_name")
      ),
    build().count({ count: 'interviews.id' }),
  ]);

  return { items: rows.map(toCalendarRow), total: Number(count) };
}

export async function getById(id, companyId) {
  if (!companyId) throw new AppError('Select a business workspace to continue', 400, { code: 'WORKSPACE_REQUIRED' });

  const row = await baseQuery(companyId)
    .andWhere('interviews.id', id)
    .first(
      'interviews.*',
      'jobs.title as job_title',
      db.raw("(users.first_name || ' ' || users.last_name) as candidate_name")
    );
  if (!row) throw new AppError('interview not found', 404);

  const scorecards = await db('interview_scorecards')
    .leftJoin('users', 'users.id', 'interview_scorecards.interviewer_id')
    .where('interview_scorecards.interview_id', id)
    .select(
      'interview_scorecards.id',
      'interview_scorecards.overall_rating',
      'interview_scorecards.recommendation',
      'interview_scorecards.submitted_at',
      'interview_scorecards.interviewer_id',
      db.raw("(users.first_name || ' ' || users.last_name) as interviewer_name")
    );

  return { ...toCalendarRow(row), scorecards };
}
