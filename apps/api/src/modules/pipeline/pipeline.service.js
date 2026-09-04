import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitRecruiterProEvent } from '../../websocket/handlers/recruiterPro.js';

async function assertOwnedProject(userId, projectId) {
  if (!projectId) return null;
  const project = await db('recruiter_projects').where({ id: projectId, recruiter_id: userId }).first();
  if (!project) throw new AppError('Project not found', 404);
  return project;
}

function pipelineRoom(projectId, jobId) {
  return projectId ? `pipeline:${projectId}` : `pipeline:job:${jobId}`;
}

export async function listStages(userId, { projectId, jobId } = {}) {
  if (!projectId && !jobId) throw new AppError('projectId or jobId is required', 422);
  if (projectId) await assertOwnedProject(userId, projectId);
  const qb = db('pipeline_stages');
  if (projectId) qb.andWhere({ project_id: projectId });
  if (jobId) qb.andWhere({ job_id: jobId });
  return qb.orderBy('sort_order', 'asc');
}

export async function listCandidates(userId, { projectId, jobId, stageId } = {}) {
  if (!projectId && !jobId && !stageId) throw new AppError('projectId, jobId or stageId is required', 422);
  if (projectId) await assertOwnedProject(userId, projectId);
  const qb = db('pipeline_candidates');
  if (projectId) qb.andWhere({ project_id: projectId });
  if (jobId) qb.andWhere({ job_id: jobId });
  if (stageId) qb.andWhere({ stage_id: stageId });
  return qb.orderBy('sort_order', 'asc');
}

export async function createStage(userId, { projectId, jobId, name, stageType, color, sortOrder } = {}) {
  if (!name?.trim()) throw new AppError('name is required', 422);
  if (!projectId && !jobId) throw new AppError('projectId or jobId is required', 422);
  if (projectId) await assertOwnedProject(userId, projectId);

  let nextSort = sortOrder;
  if (nextSort === undefined) {
    const [{ max }] = await db('pipeline_stages')
      .where((qb) => {
        if (projectId) qb.andWhere({ project_id: projectId });
        if (jobId) qb.andWhere({ job_id: jobId });
      })
      .max('sort_order as max');
    nextSort = (max ?? -1) + 1;
  }

  const [row] = await db('pipeline_stages')
    .insert({
      project_id: projectId || null,
      job_id: jobId || null,
      name: name.trim(),
      sort_order: nextSort,
      stage_type: stageType || 'sourced',
      color: color || 'blue',
      is_default: false,
    })
    .returning('*');
  return row;
}

export async function updateStage(userId, stageId, { name, sortOrder, color, stageType } = {}) {
  const stage = await db('pipeline_stages').where({ id: stageId }).first();
  if (!stage) throw new AppError('Stage not found', 404);
  if (stage.project_id) await assertOwnedProject(userId, stage.project_id);

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (sortOrder !== undefined) patch.sort_order = sortOrder;
  if (color !== undefined) patch.color = color;
  if (stageType !== undefined) patch.stage_type = stageType;
  if (!Object.keys(patch).length) throw new AppError('Nothing to update', 422);

  const [row] = await db('pipeline_stages').where({ id: stageId }).update(patch).returning('*');
  return row;
}

export async function addCandidate(userId, { stageId, projectId, jobId, candidateUserId, candidateName, candidateEmail, candidateHeadline, source, matchScore, notes } = {}) {
  if (!stageId) throw new AppError('stageId is required', 422);
  if (!candidateName?.trim()) throw new AppError('candidateName is required', 422);
  const stage = await db('pipeline_stages').where({ id: stageId }).first();
  if (!stage) throw new AppError('Stage not found', 404);
  if (stage.project_id) await assertOwnedProject(userId, stage.project_id);

  const [{ max }] = await db('pipeline_candidates').where({ stage_id: stageId }).max('sort_order as max');

  const [row] = await db('pipeline_candidates')
    .insert({
      stage_id: stageId,
      project_id: projectId || stage.project_id || null,
      job_id: jobId || stage.job_id || null,
      candidate_user_id: candidateUserId || null,
      candidate_name: candidateName.trim(),
      candidate_email: candidateEmail || null,
      candidate_headline: candidateHeadline || null,
      source: source || null,
      match_score: matchScore ?? null,
      sort_order: (max ?? -1) + 1,
      added_by_user_id: userId,
      notes: notes || null,
    })
    .returning('*');
  return row;
}

export async function moveCandidate(userId, candidateId, { stageId, sortOrder } = {}) {
  if (!stageId) throw new AppError('stageId is required', 422);
  const candidate = await db('pipeline_candidates').where({ id: candidateId }).first();
  if (!candidate) throw new AppError('Candidate not found', 404);
  if (candidate.project_id) await assertOwnedProject(userId, candidate.project_id);

  const targetStage = await db('pipeline_stages').where({ id: stageId }).first();
  if (!targetStage) throw new AppError('Target stage not found', 404);

  let nextSort = sortOrder;
  if (nextSort === undefined) {
    const [{ max }] = await db('pipeline_candidates').where({ stage_id: stageId }).max('sort_order as max');
    nextSort = (max ?? -1) + 1;
  }

  const [row] = await db('pipeline_candidates')
    .where({ id: candidateId })
    .update({ stage_id: stageId, sort_order: nextSort, moved_at: db.fn.now(), updated_at: db.fn.now() })
    .returning('*');

  await db('recruiter_collaboration_events').insert({
    company_id: (await resolveCompanyId(candidate)) || null,
    project_id: candidate.project_id || null,
    pipeline_candidate_id: candidateId,
    actor_user_id: userId,
    event_type: 'stage_move',
    body: `Moved ${candidate.candidate_name} from stage ${candidate.stage_id} to ${targetStage.name}.`,
  });

  const room = pipelineRoom(candidate.project_id, candidate.job_id);
  await emitRecruiterProEvent(room, 'pipeline:candidate_moved', {
    candidateId,
    fromStageId: candidate.stage_id,
    toStageId: stageId,
    sortOrder: nextSort,
  });

  return row;
}

// recruiter_collaboration_events.company_id is NOT NULL, but pipeline
// candidates carry no direct company reference — resolve it via the
// candidate's job (jobs.company_id) when available, falling back to the
// seeded demo company so the insert never violates the NOT NULL constraint
// for candidates that only belong to a (company-less) recruiter_project.
async function resolveCompanyId(candidate) {
  if (candidate.job_id) {
    const job = await db('jobs').where({ id: candidate.job_id }).first('company_id');
    if (job?.company_id) return job.company_id;
  }
  const fallback = await db('companies').orderBy('created_at', 'asc').first('id');
  return fallback?.id || null;
}
