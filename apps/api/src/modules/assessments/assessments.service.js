import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

export async function getById(id) {
  const record = await db('assessments').where({ id }).first();
  if (!record) throw new AppError('assessment not found', 404);
  return record;
}

export async function create(data, userId) {
  if (!data.job_id) throw new AppError('job_id is required', 400);
  const job = await db('jobs').where({ id: data.job_id }).first('id');
  if (!job) throw new AppError('job not found', 404);

  const [record] = await db('assessments')
    .insert({
      job_id: data.job_id,
      title: data.title,
      description: data.description || null,
      assessment_type: data.assessment_type || 'custom',
      passing_score: data.passing_score ?? null,
      time_limit_minutes: data.time_limit_minutes ?? null,
      created_by: userId,
    })
    .returning('*');
  return record;
}

export async function assign(assessmentId, data) {
  const assessment = await db('assessments').where({ id: assessmentId }).first('id');
  if (!assessment) throw new AppError('assessment not found', 404);
  if (!data.application_id) throw new AppError('application_id is required', 400);

  const application = await db('applications').where({ id: data.application_id }).first('id');
  if (!application) throw new AppError('application not found', 404);

  const [record] = await db('assessment_assignments')
    .insert({
      assessment_id: assessmentId,
      application_id: data.application_id,
      status: 'assigned',
      due_at: data.due_at || null,
    })
    .returning('*');
  return record;
}

export async function submit(assignmentId, data) {
  const assignment = await db('assessment_assignments').where({ id: assignmentId }).first();
  if (!assignment) throw new AppError('assessment assignment not found', 404);

  const assessment = await db('assessments').where({ id: assignment.assessment_id }).first('passing_score');
  const score = data.score ?? null;
  const passed = score != null && assessment?.passing_score != null ? Number(score) >= Number(assessment.passing_score) : data.passed ?? null;

  const [result] = await db('assessment_results')
    .insert({
      assignment_id: assignmentId,
      score,
      breakdown: JSON.stringify(data.breakdown || {}),
      passed,
      submitted_at: db.fn.now(),
    })
    .returning('*');

  await db('assessment_assignments').where({ id: assignmentId }).update({ status: 'submitted' });
  return result;
}

export async function listByApplication(applicationId) {
  return db('assessment_assignments')
    .where({ application_id: applicationId })
    .join('assessments', 'assessments.id', 'assessment_assignments.assessment_id')
    .leftJoin('assessment_results', 'assessment_results.assignment_id', 'assessment_assignments.id')
    .select(
      'assessment_assignments.id as assignment_id',
      'assessment_assignments.status',
      'assessment_assignments.assigned_at',
      'assessment_assignments.due_at',
      'assessments.id as assessment_id',
      'assessments.title',
      'assessments.assessment_type',
      'assessments.passing_score',
      'assessments.time_limit_minutes',
      'assessment_results.id as result_id',
      'assessment_results.score',
      'assessment_results.breakdown',
      'assessment_results.passed',
      'assessment_results.submitted_at'
    )
    .orderBy('assessment_assignments.assigned_at', 'desc');
}
