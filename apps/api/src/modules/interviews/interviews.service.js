import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { redis } from '../../cache/redis.js';

async function broadcastJobEvent(applicationId, jobId, type, payload) {
  await redis.publish('job-events', JSON.stringify({ applicationId, jobId, type, payload })).catch(() => {});
}

export async function getById(id) {
  const record = await db('interviews').where({ id }).first();
  if (!record) throw new AppError('interview not found', 404);
  return record;
}

export async function listByApplication(applicationId) {
  return db('interviews').where({ application_id: applicationId }).orderBy('scheduled_at', 'desc');
}

export async function create(data) {
  if (!data.applicationId) throw new AppError('applicationId is required', 400);
  const application = await db('applications').where({ id: data.applicationId }).first('id', 'job_id');
  if (!application) throw new AppError('application not found', 404);
  if (!data.scheduledAt) throw new AppError('scheduledAt is required', 400);

  const [{ maxRound }] = await db('interviews').where({ application_id: data.applicationId }).max({ maxRound: 'round_number' });

  const [record] = await db('interviews')
    .insert({
      application_id: data.applicationId,
      job_id: application.job_id,
      type: data.type || 'phone_screen',
      scheduled_at: data.scheduledAt,
      duration_minutes: data.durationMinutes || 30,
      location_or_link: data.location || data.link || null,
      round_number: Number(maxRound || 0) + 1,
      interviewer_ids: JSON.stringify(data.interviewers || []),
    })
    .returning('*');

  await db('applications').where({ id: data.applicationId }).andWhere('status', '<>', 'interviewing').update({ status: 'interviewing' });

  await broadcastJobEvent(data.applicationId, application.job_id, 'interview:scheduled', record);
  return record;
}

const WRITABLE_FIELDS = { scheduledAt: 'scheduled_at', durationMinutes: 'duration_minutes', status: 'status', roundNumber: 'round_number' };

export async function update(id, data) {
  const existing = await db('interviews').where({ id }).first();
  if (!existing) throw new AppError('interview not found', 404);

  const fields = {};
  for (const [bodyKey, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[bodyKey] !== undefined) fields[column] = data[bodyKey];
  }
  if (data.location !== undefined || data.link !== undefined) fields.location_or_link = data.location || data.link || null;
  if (data.interviewers !== undefined) fields.interviewer_ids = JSON.stringify(data.interviewers);

  const [record] = await db('interviews').where({ id }).update(fields).returning('*');

  if (fields.status && fields.status !== existing.status) {
    await broadcastJobEvent(record.application_id, record.job_id, 'interview:status-changed', record);
  }
  return record;
}

export async function submitScorecard(interviewId, interviewerId, data) {
  const interview = await db('interviews').where({ id: interviewId }).first();
  if (!interview) throw new AppError('interview not found', 404);

  const [scorecard] = await db('interview_scorecards')
    .insert({
      interview_id: interviewId,
      interviewer_id: interviewerId,
      overall_rating: data.overall_rating ?? null,
      recommendation: data.recommendation || null,
      submitted_at: db.fn.now(),
    })
    .onConflict(['interview_id', 'interviewer_id'])
    .merge()
    .returning('*');

  if (Array.isArray(data.feedback) && data.feedback.length) {
    await db('interview_feedback').where({ scorecard_id: scorecard.id }).del();
    await db('interview_feedback').insert(
      data.feedback.map((f) => ({
        scorecard_id: scorecard.id,
        criterion: f.criterion,
        rating: f.rating ?? null,
        comments: f.comments || null,
      }))
    );
  }

  return scorecard;
}
