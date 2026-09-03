import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { redis } from '../../cache/redis.js';

async function broadcastApplicationChange(applicationId, jobId, type, payload) {
  await redis.publish('job-events', JSON.stringify({ applicationId, jobId, type, payload })).catch(() => {});
}

export async function listQuestions(jobId) {
  return db('job_screening_questions').where({ job_id: jobId }).orderBy('order_index', 'asc');
}

export async function addQuestion(jobId, data) {
  const job = await db('jobs').where({ id: jobId }).first('id');
  if (!job) throw new AppError('job not found', 404);

  const [{ maxOrder }] = await db('job_screening_questions').where({ job_id: jobId }).max({ maxOrder: 'order_index' });
  const [record] = await db('job_screening_questions')
    .insert({
      job_id: jobId,
      question_text: data.question_text,
      question_type: data.question_type || 'text',
      is_knockout: Boolean(data.is_knockout),
      options: JSON.stringify(data.options || []),
      order_index: data.order_index ?? (Number(maxOrder || 0) + 1),
    })
    .returning('*');
  return record;
}

// Screening queue: applications not yet past the screening stage, ranked by
// match_score (a simple stand-in "auto-score" — the same signal already
// computed for the applicant elsewhere) so the highest-fit candidates surface
// first for the reviewer.
export async function listQueue(jobId, { limit = 20, offset = 0 } = {}) {
  const job = await db('jobs').where({ id: jobId }).first('id');
  if (!job) throw new AppError('job not found', 404);

  const cappedLimit = Math.min(Number(limit) || 20, 50);
  const filter = (qb) => qb.where('applications.job_id', jobId).whereIn('applications.status', ['submitted', 'reviewing']);

  const [rows, [{ count }]] = await Promise.all([
    db('applications')
      .join('users', 'users.id', 'applications.applicant_id')
      .modify(filter)
      .orderBy('applications.match_score', 'desc')
      .limit(cappedLimit)
      .offset(Number(offset) || 0)
      .select(
        'applications.id',
        'applications.status',
        'applications.match_score as auto_score',
        'applications.created_at',
        'users.id as applicant_id',
        'users.first_name',
        'users.last_name',
        'users.headline'
      ),
    db('applications').modify(filter).count({ count: '*' }),
  ]);

  return { items: rows, total: Number(count) };
}

const STATUS_BY_DECISION = { advance: 'shortlisted', pass: 'reviewing', reject: 'rejected' };

export async function reviewApplication(applicationId, reviewerId, data) {
  const application = await db('applications').where({ id: applicationId }).first();
  if (!application) throw new AppError('application not found', 404);
  if (!['pass', 'reject', 'advance'].includes(data.decision)) throw new AppError('decision must be pass, reject, or advance', 400);

  const [review] = await db('screening_reviews')
    .insert({
      application_id: applicationId,
      reviewer_id: reviewerId,
      decision: data.decision,
      notes: data.notes || null,
      auto_score: data.auto_score ?? application.match_score ?? null,
    })
    .returning('*');

  const nextStatus = STATUS_BY_DECISION[data.decision];
  const [updatedApplication] = await db('applications').where({ id: applicationId }).update({ status: nextStatus }).returning('*');

  await broadcastApplicationChange(applicationId, application.job_id, 'stage-changed', {
    status: updatedApplication.status,
    previousStatus: application.status,
  });

  return { review, application: updatedApplication };
}
