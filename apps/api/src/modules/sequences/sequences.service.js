import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { resolveRecruiterCompanyId } from '../../common/utils/resolveRecruiterCompany.js';
import { emitRecruiterProEvent } from '../../websocket/handlers/recruiterPro.js';

async function assertOwnedSequence(companyId, id) {
  const sequence = await db('recruiter_sequences').where({ id, company_id: companyId }).first();
  if (!sequence) throw new AppError('Sequence not found', 404);
  return sequence;
}

function toSequence(row, steps, enrollmentCount) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    steps: (steps || []).map(toStep),
    enrollment_count: enrollmentCount ?? row.enrolled_count ?? 0,
    completed_count: row.completed_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toStep(row) {
  return {
    id: row.id,
    step_order: row.step_order,
    type: row.step_type,
    subject: row.subject,
    body: row.body,
    template_id: row.template_id ?? null,
    wait_days: row.wait_days,
    branch_condition: row.branch_condition,
  };
}

async function replaceSteps(sequenceId, steps) {
  await db('sequence_steps').where({ sequence_id: sequenceId }).del();
  if (!steps?.length) return [];
  const rows = steps.map((step, index) => ({
    sequence_id: sequenceId,
    step_order: step.step_order ?? index,
    step_type: step.type || step.stepType || 'email',
    subject: step.subject ?? null,
    body: step.body ?? null,
    wait_days: step.wait_days ?? step.waitDays ?? null,
    branch_condition: step.branch_condition ?? step.branchCondition ?? null,
  }));
  return db('sequence_steps').insert(rows).returning('*').orderBy('step_order', 'asc');
}

export async function list(userId, { status } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const qb = db('recruiter_sequences').where({ company_id: companyId });
  if (status) qb.andWhere({ status });
  const rows = await qb.orderBy('updated_at', 'desc');
  const ids = rows.map((r) => r.id);
  const steps = ids.length ? await db('sequence_steps').whereIn('sequence_id', ids).orderBy('step_order', 'asc') : [];
  return rows.map((row) => toSequence(row, steps.filter((s) => s.sequence_id === row.id)));
}

export async function getById(userId, id) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const sequence = await assertOwnedSequence(companyId, id);
  const steps = await db('sequence_steps').where({ sequence_id: id }).orderBy('step_order', 'asc');
  return toSequence(sequence, steps);
}

export async function create(userId, { name, description, steps } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  if (!name?.trim()) throw new AppError('name is required', 422);
  const [row] = await db('recruiter_sequences')
    .insert({ company_id: companyId, name: name.trim(), description: description || null, created_by_user_id: userId })
    .returning('*');
  const savedSteps = await replaceSteps(row.id, steps);
  return toSequence(row, savedSteps);
}

export async function update(userId, id, { name, description, status, steps } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedSequence(companyId, id);
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (status !== undefined) {
    if (!['draft', 'active', 'paused', 'archived'].includes(status)) throw new AppError('Invalid status', 422);
    patch.status = status;
  }
  let row;
  if (Object.keys(patch).length) {
    patch.updated_at = db.fn.now();
    [row] = await db('recruiter_sequences').where({ id }).update(patch).returning('*');
  } else {
    row = await db('recruiter_sequences').where({ id }).first();
  }
  const savedSteps = steps !== undefined ? await replaceSteps(id, steps) : await db('sequence_steps').where({ sequence_id: id }).orderBy('step_order', 'asc');
  return toSequence(row, savedSteps);
}

export async function remove(userId, id) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedSequence(companyId, id);
  await db('recruiter_sequences').where({ id }).del();
}

// --- Steps -------------------------------------------------------------------

export async function addStep(userId, sequenceId, { stepType, type, subject, body, waitDays, wait_days, branchCondition, branch_condition, stepOrder, step_order } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedSequence(companyId, sequenceId);

  let order = stepOrder ?? step_order;
  if (order === undefined) {
    const [{ max }] = await db('sequence_steps').where({ sequence_id: sequenceId }).max('step_order as max');
    order = (max ?? -1) + 1;
  }

  const [row] = await db('sequence_steps')
    .insert({
      sequence_id: sequenceId,
      step_order: order,
      step_type: stepType || type || 'email',
      subject: subject || null,
      body: body || null,
      wait_days: waitDays ?? wait_days ?? null,
      branch_condition: branchCondition ?? branch_condition ?? null,
    })
    .returning('*');
  return toStep(row);
}

export async function reorderStep(userId, sequenceId, stepId, { stepOrder, step_order } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedSequence(companyId, sequenceId);
  const order = stepOrder ?? step_order;
  if (order === undefined) throw new AppError('stepOrder is required', 422);
  const [row] = await db('sequence_steps').where({ id: stepId, sequence_id: sequenceId }).update({ step_order: order, updated_at: db.fn.now() }).returning('*');
  if (!row) throw new AppError('Step not found', 404);
  return toStep(row);
}

export async function removeStep(userId, sequenceId, stepId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedSequence(companyId, sequenceId);
  const count = await db('sequence_steps').where({ id: stepId, sequence_id: sequenceId }).del();
  if (!count) throw new AppError('Step not found', 404);
}

// --- Enrollments ---------------------------------------------------------------

function toEnrollment(row, totalSteps) {
  return {
    id: row.id,
    sequence_id: row.sequence_id,
    candidate_id: row.candidate_user_id,
    candidate_name: row.candidate_name,
    candidate_email: row.candidate_email,
    current_step_order: row.current_step_order,
    total_steps: totalSteps ?? 0,
    status: row.status,
    enrolled_at: row.enrolled_at,
  };
}

export async function enroll(userId, sequenceId, { candidateUserId, candidate_id, candidateName, candidate_name, candidateEmail, candidate_email } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedSequence(companyId, sequenceId);

  const resolvedCandidateId = candidateUserId || candidate_id || null;
  let resolvedName = candidateName || candidate_name || null;
  let resolvedEmail = candidateEmail || candidate_email || null;

  if (!resolvedName && resolvedCandidateId) {
    const user = await db('users').where({ id: resolvedCandidateId }).first('first_name', 'last_name', 'email');
    if (user) {
      resolvedName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Candidate';
      resolvedEmail = resolvedEmail || user.email;
    }
  }
  if (!resolvedName?.trim()) throw new AppError('candidateName is required', 422);

  const [row] = await db('sequence_enrollments')
    .insert({
      sequence_id: sequenceId,
      candidate_user_id: resolvedCandidateId,
      candidate_name: resolvedName.trim(),
      candidate_email: resolvedEmail || null,
      current_step_order: 0,
      status: 'active',
    })
    .returning('*');

  await db('recruiter_sequences').where({ id: sequenceId }).increment('enrolled_count', 1);
  const [{ count }] = await db('sequence_steps').where({ sequence_id: sequenceId }).count('id as count');
  return toEnrollment(row, Number(count));
}

export async function listEnrollments(userId, sequenceId, { status } = {}) {
  const companyId = await resolveRecruiterCompanyId(userId);
  await assertOwnedSequence(companyId, sequenceId);
  const qb = db('sequence_enrollments').where({ sequence_id: sequenceId });
  if (status) qb.andWhere({ status });
  const rows = await qb.orderBy('enrolled_at', 'desc');
  const [{ count }] = await db('sequence_steps').where({ sequence_id: sequenceId }).count('id as count');
  return rows.map((row) => toEnrollment(row, Number(count)));
}

export async function advanceEnrollment(userId, enrollmentId) {
  const companyId = await resolveRecruiterCompanyId(userId);
  const enrollment = await db('sequence_enrollments').where({ id: enrollmentId }).first();
  if (!enrollment) throw new AppError('Enrollment not found', 404);
  const sequence = await assertOwnedSequence(companyId, enrollment.sequence_id);

  if (enrollment.status !== 'active') throw new AppError(`Enrollment is not active (status: ${enrollment.status})`, 422);

  const steps = await db('sequence_steps').where({ sequence_id: sequence.id }).orderBy('step_order', 'asc');
  const lastStepOrder = steps.length ? steps[steps.length - 1].step_order : 0;
  const nextStepOrder = enrollment.current_step_order + 1;
  const isComplete = nextStepOrder >= lastStepOrder;

  const patch = {
    current_step_order: nextStepOrder,
    updated_at: db.fn.now(),
  };
  if (isComplete) {
    patch.status = 'completed';
    patch.completed_at = db.fn.now();
  }

  const [row] = await db('sequence_enrollments').where({ id: enrollmentId }).update(patch).returning('*');

  const currentStep = steps.find((s) => s.step_order === nextStepOrder);
  await db('outreach_events').insert({
    enrollment_id: enrollmentId,
    campaign_id: null,
    candidate_user_id: enrollment.candidate_user_id,
    event_type: 'sent',
    channel: currentStep?.step_type === 'linkedin' ? 'linkedin' : 'email',
    metadata: JSON.stringify({ step_order: nextStepOrder }),
  });

  if (isComplete) {
    await db('recruiter_sequences').where({ id: sequence.id }).increment('completed_count', 1);
    await emitRecruiterProEvent(`sequence:${sequence.id}`, 'sequence:step_completed', {
      enrollmentId,
      sequenceId: sequence.id,
      finalStepOrder: nextStepOrder,
      status: 'completed',
    });
  } else {
    await emitRecruiterProEvent(`sequence:${sequence.id}`, 'sequence:step_completed', {
      enrollmentId,
      sequenceId: sequence.id,
      stepOrder: nextStepOrder,
      status: 'active',
    });
  }

  return toEnrollment(row, steps.length);
}
