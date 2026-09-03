import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { redis } from '../../cache/redis.js';

const TABLE = 'applications';

// Best-effort low-latency fan-out on its own channel so
// websocket/handlers/jobs.js can push to job:${jobId} / application:${id}
// rooms without waiting on any outbox consumer — mirrors
// pm-projects/tasks.service.js#broadcastTaskChange.
async function broadcastApplicationChange(applicationId, jobId, type, payload) {
  await redis.publish('job-events', JSON.stringify({ applicationId, jobId, type, payload })).catch(() => {});
}

export async function list({ jobId, applicantId, limit = 20, offset = 0 } = {}) {
  const cappedLimit = Math.min(Number(limit) || 20, 50);
  const cappedOffset = Number(offset) || 0;

  const filter = (qb) => {
    if (jobId) qb.andWhere('job_id', jobId);
    if (applicantId) qb.andWhere('applicant_id', applicantId);
  };

  const [rows, [{ count }]] = await Promise.all([
    db(TABLE).select('*').modify(filter).orderBy('created_at', 'desc').limit(cappedLimit).offset(cappedOffset),
    db(TABLE).modify(filter).count({ count: '*' }),
  ]);

  return { items: rows, total: Number(count) };
}

function buildTimeline(application, screeningReviews, interview, offer) {
  const events = [{ stage: 'applied', at: application.applied_at || application.created_at }];
  for (const review of screeningReviews) events.push({ stage: `screening:${review.decision}`, at: review.created_at });
  if (interview) events.push({ stage: `interview:${interview.status}`, at: interview.updated_at || interview.created_at });
  if (offer) events.push({ stage: `offer:${offer.status}`, at: offer.updated_at || offer.created_at });
  if (['hired', 'rejected', 'withdrawn'].includes(application.status)) {
    events.push({ stage: application.status, at: application.updated_at });
  }
  return events.sort((a, b) => new Date(a.at) - new Date(b.at));
}

export async function getById(id) {
  const application = await db(TABLE).where({ id }).first();
  if (!application) throw new AppError('applications not found', 404);

  const [job, candidate, answers, screeningReviews, interview, offer] = await Promise.all([
    db('jobs').where({ id: application.job_id }).first('id', 'title', 'company_id', 'location', 'employment_type', 'work_mode', 'status'),
    db('users').where({ id: application.applicant_id }).first('id', 'first_name', 'last_name', 'email', 'headline'),
    db('application_answers').where({ application_id: id }).select('*'),
    db('screening_reviews').where({ application_id: id }).orderBy('created_at', 'asc'),
    db('interviews').where({ application_id: id }).orderBy('scheduled_at', 'desc').first(),
    db('offers').where({ application_id: id }).orderBy('created_at', 'desc').first(),
  ]);

  return {
    ...application,
    job,
    candidate,
    answers,
    screeningReviews,
    currentInterview: interview || null,
    currentOffer: offer || null,
    timeline: buildTimeline(application, screeningReviews, interview, offer),
  };
}

export async function create(data, userId) {
  if (!data.job_id) throw new AppError('job_id is required', 400);

  const job = await db('jobs').where({ id: data.job_id }).first('id', 'status');
  if (!job) throw new AppError('job not found', 404);

  let application;
  try {
    [application] = await db(TABLE)
      .insert({
        job_id: data.job_id,
        applicant_id: userId,
        resume_url: data.resume_url || null,
        cover_letter: data.cover_letter || null,
        source: data.source || 'direct',
        applied_at: db.fn.now(),
      })
      .returning('*');
  } catch (err) {
    if (String(err?.message || '').toLowerCase().includes('unique')) {
      throw new AppError('You have already applied to this job', 409);
    }
    throw err;
  }

  if (Array.isArray(data.answers) && data.answers.length) {
    await db('application_answers').insert(
      data.answers.map((a) => ({
        application_id: application.id,
        question_id: a.question_id || null,
        answer_text: a.answer_text ?? a.answer ?? null,
      }))
    );
  }

  await broadcastApplicationChange(application.id, application.job_id, 'stage-changed', { status: application.status });
  return application;
}

const WRITABLE_FIELDS = ['status', 'resume_url', 'cover_letter', 'match_score'];

export async function update(id, data) {
  const existing = await db(TABLE).where({ id }).first();
  if (!existing) throw new AppError('applications not found', 404);

  const fields = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) fields[field] = data[field];
  }

  const [record] = await db(TABLE).where({ id }).update(fields).returning('*');

  if (fields.status && fields.status !== existing.status) {
    await broadcastApplicationChange(record.id, record.job_id, 'stage-changed', {
      status: record.status,
      previousStatus: existing.status,
    });
  }

  return record;
}

export async function remove(id) {
  const count = await db(TABLE).where({ id }).del();
  if (!count) throw new AppError('applications not found', 404);
}
