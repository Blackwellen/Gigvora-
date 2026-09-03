import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const DEFAULT_CHECKLIST = [
  { key: 'offer_accepted', label: 'Offer accepted', done: true },
  { key: 'background_check', label: 'Background check completed', done: false },
  { key: 'paperwork', label: 'Employment paperwork signed', done: false },
  { key: 'equipment', label: 'Equipment & accounts provisioned', done: false },
  { key: 'welcome', label: 'Welcome email & first-day info sent', done: false },
];

export async function getByApplication(applicationId) {
  const record = await db('hire_handoffs').where({ application_id: applicationId }).first();
  if (!record) throw new AppError('hire handoff not found', 404);
  return record;
}

export async function create(data) {
  if (!data.applicationId) throw new AppError('applicationId is required', 400);
  const application = await db('applications').where({ id: data.applicationId }).first('id', 'job_id', 'applicant_id');
  if (!application) throw new AppError('application not found', 404);

  const existing = await db('hire_handoffs').where({ application_id: data.applicationId }).first();
  if (existing) return existing;

  const [record] = await db('hire_handoffs')
    .insert({
      application_id: data.applicationId,
      job_id: application.job_id,
      candidate_id: application.applicant_id,
      status: 'pending',
      start_date: data.startDate || null,
      onboarding_owner_id: data.onboardingOwnerId || null,
      checklist: JSON.stringify(data.checklist || DEFAULT_CHECKLIST),
      notes: data.notes || null,
    })
    .returning('*');

  await db('applications').where({ id: data.applicationId }).update({ status: 'hired' });

  return record;
}

export async function update(id, data) {
  const existing = await db('hire_handoffs').where({ id }).first();
  if (!existing) throw new AppError('hire handoff not found', 404);

  const fields = {};
  if (data.startDate !== undefined) fields.start_date = data.startDate;
  if (data.onboardingOwnerId !== undefined) fields.onboarding_owner_id = data.onboardingOwnerId;
  if (data.notes !== undefined) fields.notes = data.notes;
  if (data.status !== undefined) fields.status = data.status;

  if (data.checklist !== undefined) {
    fields.checklist = JSON.stringify(data.checklist);
  } else if (data.toggleKey) {
    const checklist = Array.isArray(existing.checklist) ? existing.checklist : [];
    fields.checklist = JSON.stringify(checklist.map((item) => (item.key === data.toggleKey ? { ...item, done: !item.done } : item)));
  }

  if (fields.checklist && fields.status === undefined) {
    const parsed = JSON.parse(fields.checklist);
    const allDone = parsed.length > 0 && parsed.every((item) => item.done);
    fields.status = allDone ? 'completed' : 'in_progress';
  }

  const [record] = await db('hire_handoffs').where({ id }).update(fields).returning('*');
  return record;
}
