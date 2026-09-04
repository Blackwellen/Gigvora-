import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { scoreCandidateMatch } from '../../common/ml/matchingClient.js';

function toRow(row) {
  return {
    ...row,
    overall_score: row.overall_score !== null ? Number(row.overall_score) : null,
    skills_score: row.skills_score !== null ? Number(row.skills_score) : null,
    experience_score: row.experience_score !== null ? Number(row.experience_score) : null,
    culture_score: row.culture_score !== null ? Number(row.culture_score) : null,
  };
}

export async function list({ jobId, projectId, limit = 50, offset = 0 } = {}) {
  const qb = db('candidate_match_scores');
  if (jobId) qb.andWhere({ job_id: jobId });
  if (projectId) qb.andWhere({ project_id: projectId });
  const cappedLimit = Math.min(Number(limit) || 50, 200);

  const countQb = qb.clone().clearSelect().clearOrder();
  const [rows, [{ count }]] = await Promise.all([
    qb.clone().orderBy('overall_score', 'desc').limit(cappedLimit).offset(Number(offset) || 0),
    countQb.count({ count: '*' }),
  ]);
  return { items: rows.map(toRow), total: Number(count) };
}

export async function override(id, reviewerUserId, { decision } = {}) {
  if (!['approved', 'rejected'].includes(decision)) throw new AppError('decision must be "approved" or "rejected"', 422);
  const [row] = await db('candidate_match_scores')
    .where({ id })
    .update({
      human_override: decision,
      human_reviewed: true,
      reviewed_by_user_id: reviewerUserId,
      reviewed_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');
  if (!row) throw new AppError('Match score not found', 404);
  return toRow(row);
}

// Deterministic, explainable heuristic used whenever the ml-service is
// unavailable (or there is no linked application/job to score against) —
// never fabricated as an "AI" result, always labelled as a heuristic.
function heuristicScore({ candidateHeadline, jobTitle }) {
  const headline = (candidateHeadline || '').toLowerCase();
  const title = (jobTitle || '').toLowerCase();
  const titleWords = title.split(/\s+/).filter((w) => w.length > 3);
  const overlap = titleWords.filter((w) => headline.includes(w)).length;
  const overlapRatio = titleWords.length ? overlap / titleWords.length : 0;
  const skills = Math.min(95, Math.round(55 + overlapRatio * 40));
  const experience = Math.min(92, Math.round(50 + overlapRatio * 35));
  const overall = Math.round((skills + experience) / 2);
  return {
    overall,
    skills,
    experience,
    culture: null,
    confidence: overlapRatio > 0.5 ? 'medium' : 'low',
    explanation: `Heuristic score (ml-service unavailable): headline/title keyword overlap of ${overlap}/${titleWords.length || 1} terms.`,
  };
}

export async function scoreOnDemand({ jobId, projectId, candidateUserId, candidateName, candidateEmail } = {}) {
  if (!jobId && !projectId) throw new AppError('jobId or projectId is required', 422);
  if (!candidateUserId && !candidateName) throw new AppError('candidateUserId or candidateName is required', 422);

  let candidate = null;
  if (candidateUserId) {
    candidate = await db('users').where({ id: candidateUserId }).first('id', 'first_name', 'last_name', 'email', 'headline');
  }
  const resolvedName = candidate ? `${candidate.first_name} ${candidate.last_name}`.trim() : candidateName;
  const resolvedEmail = candidate?.email || candidateEmail || null;
  const headline = candidate?.headline || null;

  let job = null;
  let application = null;
  if (jobId) {
    job = await db('jobs').where({ id: jobId }).first('id', 'title');
    if (!job) throw new AppError('Job not found', 404);
    if (candidateUserId) {
      application = await db('applications').where({ job_id: jobId, applicant_id: candidateUserId }).first('id');
    }
  }

  let scored = null;
  if (application) {
    const mlResult = await scoreCandidateMatch({ applicationId: application.id, jobId, applicantId: candidateUserId });
    if (mlResult) {
      scored = {
        overall: Math.round(mlResult.matchScore),
        skills: Math.round(mlResult.matchScore),
        experience: Math.round(mlResult.matchScore),
        culture: null,
        confidence: mlResult.matchScore >= 85 ? 'high' : mlResult.matchScore >= 65 ? 'medium' : 'low',
        explanation: mlResult.insights
          ? `ML match: skill overlap [${(mlResult.insights.skill_overlap || []).join(', ') || 'none'}], missing [${(mlResult.insights.missing_skills || []).join(', ') || 'none'}], seniority fit: ${mlResult.insights.seniority_fit || 'n/a'}.`
          : 'ML-service computed match score.',
      };
    }
  }
  if (!scored) {
    scored = heuristicScore({ candidateHeadline: headline, jobTitle: job?.title });
  }

  const existing = await db('candidate_match_scores')
    .where((qb) => {
      if (jobId) qb.andWhere({ job_id: jobId });
      if (projectId) qb.andWhere({ project_id: projectId });
      if (candidateUserId) qb.andWhere({ candidate_user_id: candidateUserId });
      else qb.andWhere({ candidate_email: resolvedEmail });
    })
    .first();

  const payload = {
    job_id: jobId || null,
    project_id: projectId || null,
    candidate_user_id: candidateUserId || null,
    candidate_name: resolvedName,
    candidate_email: resolvedEmail,
    overall_score: scored.overall,
    skills_score: scored.skills,
    experience_score: scored.experience,
    culture_score: scored.culture,
    explanation: scored.explanation,
    confidence: scored.confidence,
    // A fresh/re-run score always resets to pending — a human must act
    // again before it can drive any hiring decision.
    human_reviewed: false,
    human_override: 'pending',
    reviewed_by_user_id: null,
    reviewed_at: null,
  };

  let row;
  if (existing) {
    [row] = await db('candidate_match_scores').where({ id: existing.id }).update({ ...payload, updated_at: db.fn.now() }).returning('*');
  } else {
    [row] = await db('candidate_match_scores').insert(payload).returning('*');
  }
  return toRow(row);
}
