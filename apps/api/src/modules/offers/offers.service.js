import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { redis } from '../../cache/redis.js';

async function broadcastJobEvent(applicationId, jobId, type, payload) {
  await redis.publish('job-events', JSON.stringify({ applicationId, jobId, type, payload })).catch(() => {});
}

export async function getById(id) {
  const record = await db('offers').where({ id }).first();
  if (!record) throw new AppError('offer not found', 404);
  return record;
}

export async function listByApplication(applicationId) {
  return db('offers').where({ application_id: applicationId }).orderBy('created_at', 'desc');
}

export async function create(data, userId) {
  if (!data.applicationId) throw new AppError('applicationId is required', 400);
  const application = await db('applications').where({ id: data.applicationId }).first('id', 'job_id', 'status');
  if (!application) throw new AppError('application not found', 404);

  const [record] = await db('offers')
    .insert({
      application_id: data.applicationId,
      job_id: application.job_id,
      base_salary: data.baseSalary ?? null,
      bonus: data.bonus ?? null,
      equity: data.equity ?? null,
      currency: data.currency || 'USD',
      start_date: data.startDate || null,
      benefits: JSON.stringify(data.benefits || []),
      status: 'draft',
      created_by: userId,
      expires_at: data.expiresAt || null,
    })
    .returning('*');

  await db('offer_versions').insert({
    offer_id: record.id,
    version_number: 1,
    changes: JSON.stringify(record),
    created_by: userId,
  });

  if (!['offered', 'hired'].includes(application.status)) {
    await db('applications').where({ id: data.applicationId }).update({ status: 'offered' });
  }

  return record;
}

const WRITABLE_FIELDS = {
  baseSalary: 'base_salary',
  bonus: 'bonus',
  equity: 'equity',
  currency: 'currency',
  startDate: 'start_date',
  status: 'status',
  expiresAt: 'expires_at',
};

export async function update(id, data, userId) {
  const existing = await db('offers').where({ id }).first();
  if (!existing) throw new AppError('offer not found', 404);

  const fields = {};
  for (const [bodyKey, column] of Object.entries(WRITABLE_FIELDS)) {
    if (data[bodyKey] !== undefined) fields[column] = data[bodyKey];
  }
  if (data.benefits !== undefined) fields.benefits = JSON.stringify(data.benefits);

  if (Object.keys(fields).length === 0) return existing;

  const [record] = await db('offers').where({ id }).update(fields).returning('*');

  const [{ maxVersion }] = await db('offer_versions').where({ offer_id: id }).max({ maxVersion: 'version_number' });
  await db('offer_versions').insert({
    offer_id: id,
    version_number: Number(maxVersion || 0) + 1,
    changes: JSON.stringify(fields),
    created_by: userId,
  });

  if (fields.status && fields.status !== existing.status) {
    await broadcastJobEvent(record.application_id, record.job_id, 'offer:status-changed', record);
  }

  return record;
}

export async function approve(offerId, approverId, data) {
  const offer = await db('offers').where({ id: offerId }).first('id');
  if (!offer) throw new AppError('offer not found', 404);

  const [record] = await db('offer_approvals')
    .insert({
      offer_id: offerId,
      approver_id: approverId,
      decision: data.decision || 'pending',
      notes: data.notes || null,
    })
    .returning('*');
  return record;
}
