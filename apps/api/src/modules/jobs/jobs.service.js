import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

const TABLE = 'jobs';

const WRITABLE_FIELDS = [
  'title',
  'description',
  'requirements',
  'location',
  'employment_type',
  'work_mode',
  'salary_min',
  'salary_max',
  'salary_currency',
  'status',
  'skills',
  'expires_at',
  'seniority',
  'category',
  'application_deadline',
  'headcount',
];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pickWritableFields(body = {}) {
  const out = {};
  for (const field of WRITABLE_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

function applyFilters(query, filters) {
  const { q, location, work_mode, employment_type, category, seniority, salary_min, salary_max, status } = filters;
  if (status) query.andWhere('jobs.status', status);
  if (q) {
    query.andWhere((qb) => {
      qb.whereILike('jobs.title', `%${q}%`).orWhereILike('jobs.description', `%${q}%`);
    });
  }
  if (location) query.andWhereILike('jobs.location', `%${location}%`);
  if (work_mode) query.andWhere('jobs.work_mode', work_mode);
  if (employment_type) query.andWhere('jobs.employment_type', employment_type);
  if (category) query.andWhere('jobs.category', category);
  if (seniority) query.andWhere('jobs.seniority', seniority);
  if (salary_min) query.andWhere((qb) => qb.whereNull('jobs.salary_max').orWhere('jobs.salary_max', '>=', Number(salary_min)));
  if (salary_max) query.andWhere((qb) => qb.whereNull('jobs.salary_min').orWhere('jobs.salary_min', '<=', Number(salary_max)));
  return query;
}

async function syncJobSkills(jobId, skills) {
  await db('job_skills').where({ job_id: jobId }).del();
  const rows = (skills || [])
    .map((s) => {
      if (typeof s === 'string') return { job_id: jobId, skill_name: s, is_required: true, weight: 1 };
      if (s && s.skill_name) return { job_id: jobId, skill_name: s.skill_name, is_required: s.is_required !== false, weight: Number(s.weight || 1) };
      return null;
    })
    .filter(Boolean);
  if (rows.length) await db('job_skills').insert(rows);
}

export async function list(filters = {}) {
  const { limit = 20, offset = 0, sort = 'recent' } = filters;
  const cappedLimit = Math.min(Number(limit) || 20, 50);
  const cappedOffset = Number(offset) || 0;

  const query = applyFilters(db(TABLE).select('jobs.*'), filters);
  if (sort === 'trending') {
    query
      .select(db.raw('(select count(*) from job_views where job_views.job_id = jobs.id) as views_count'))
      .orderBy('views_count', 'desc');
  } else if (sort === 'salary_high') {
    query.orderBy('jobs.salary_max', 'desc');
  } else if (sort === 'salary_low') {
    query.orderBy('jobs.salary_min', 'asc');
  } else {
    query.orderBy('jobs.created_at', 'desc');
  }

  const countQuery = applyFilters(db(TABLE), filters).count({ count: '*' });

  const [rows, [{ count }]] = await Promise.all([
    query.limit(cappedLimit).offset(cappedOffset),
    countQuery,
  ]);

  return { items: rows, total: Number(count) };
}

// Rule-based recommendation: weighted overlap of the candidate's profile
// skills against each open job's structured job_skills (falling back to the
// jobs.skills jsonb cache for jobs that predate job_skills), with a small
// location-affinity bonus. No ML dependency — deliberately simple and
// explainable per the spec ("rule-based is fine, no ML needed").
export async function recommended(userId, { limit = 20 } = {}) {
  const profile = await db('profiles').where({ user_id: userId }).first('skills', 'location');
  const userSkills = new Set((profile?.skills || []).map((s) => String(s).toLowerCase()));

  const jobs = await db(TABLE).where('status', 'open').orderBy('created_at', 'desc').limit(200);
  const jobIds = jobs.map((j) => j.id);
  const skillRows = jobIds.length
    ? await db('job_skills').whereIn('job_id', jobIds).select('job_id', 'skill_name', 'is_required', 'weight')
    : [];

  const skillsByJob = new Map();
  for (const row of skillRows) {
    if (!skillsByJob.has(row.job_id)) skillsByJob.set(row.job_id, []);
    skillsByJob.get(row.job_id).push(row);
  }

  const scored = jobs.map((job) => {
    const structured = skillsByJob.get(job.id) || [];
    const candidates = structured.length
      ? structured
      : (Array.isArray(job.skills) ? job.skills : []).map((name) => ({ skill_name: name, weight: 1 }));

    const totalWeight = candidates.reduce((sum, s) => sum + Number(s.weight || 1), 0);
    const matchedWeight = candidates.reduce(
      (sum, s) => (userSkills.has(String(s.skill_name).toLowerCase()) ? sum + Number(s.weight || 1) : sum),
      0
    );

    let score = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
    if (profile?.location && job.location && String(job.location).toLowerCase().includes(String(profile.location).toLowerCase())) {
      score = Math.min(100, score + 10);
    }

    return { ...job, match_score: Math.round(score) };
  });

  scored.sort((a, b) => b.match_score - a.match_score);
  const cappedLimit = Math.min(Number(limit) || 20, 50);
  return { items: scored.slice(0, cappedLimit), total: scored.length };
}

export async function listSaved(userId, { limit = 20, offset = 0 } = {}) {
  const cappedLimit = Math.min(Number(limit) || 20, 50);
  const [rows, [{ count }]] = await Promise.all([
    db('job_saves')
      .where({ 'job_saves.user_id': userId })
      .join('jobs', 'jobs.id', 'job_saves.job_id')
      .orderBy('job_saves.created_at', 'desc')
      .limit(cappedLimit)
      .offset(Number(offset) || 0)
      .select('jobs.*', 'job_saves.created_at as saved_at'),
    db('job_saves').where({ user_id: userId }).count({ count: '*' }),
  ]);
  return { items: rows, total: Number(count) };
}

export async function saveJob(jobId, userId) {
  const job = await db(TABLE).where({ id: jobId }).first('id');
  if (!job) throw new AppError('jobs not found', 404);
  await db('job_saves').insert({ job_id: jobId, user_id: userId }).onConflict(['job_id', 'user_id']).ignore();
  return { saved: true };
}

export async function unsaveJob(jobId, userId) {
  await db('job_saves').where({ job_id: jobId, user_id: userId }).del();
  return { saved: false };
}

export async function getById(id, { viewerId, source } = {}) {
  const job = await db(TABLE).where({ id }).first();
  if (!job) throw new AppError('jobs not found', 404);

  const [company, skills, screeningCount, applicantCount] = await Promise.all([
    job.company_id ? db('companies').where({ id: job.company_id }).first('id', 'name', 'slug', 'logo_url', 'industry', 'size') : null,
    db('job_skills').where({ job_id: id }).orderBy('weight', 'desc'),
    db('job_screening_questions').where({ job_id: id }).count({ count: '*' }).first(),
    db('applications').where({ job_id: id }).count({ count: '*' }).first(),
  ]);

  // Best-effort view log — fire and forget, never blocks the response.
  db('job_views')
    .insert({ job_id: id, viewer_id: viewerId || null, source: source || null })
    .catch(() => {});

  return {
    ...job,
    company,
    skills: skills.length ? skills : (job.skills || []).map((name) => ({ skill_name: name, is_required: true, weight: 1 })),
    screening_question_count: Number(screeningCount?.count || 0),
    applicant_count: Number(applicantCount?.count || 0),
  };
}

export async function create(data, { companyId, userId } = {}) {
  if (!companyId) throw new AppError('Switch to a company workspace to post a job', 400, { code: 'WORKSPACE_REQUIRED' });

  const fields = pickWritableFields(data);
  const slug = `${slugify(fields.title || 'job')}-${Date.now().toString(36)}`;
  const payload = {
    ...fields,
    slug,
    company_id: companyId,
    posted_by: userId,
  };
  if (fields.requirements !== undefined) payload.requirements = JSON.stringify(fields.requirements);
  if (fields.skills !== undefined) payload.skills = JSON.stringify(fields.skills);
  if (payload.status === 'open') payload.published_at = db.fn.now();

  const [record] = await db(TABLE).insert(payload).returning('*');
  if (Array.isArray(data.skills) && data.skills.length) await syncJobSkills(record.id, data.skills);
  return record;
}

export async function update(id, data, { companyId } = {}) {
  const existing = await db(TABLE).where({ id }).first();
  if (!existing) throw new AppError('jobs not found', 404);
  if (companyId && existing.company_id !== companyId) throw new AppError('You do not have access to this job', 403);

  const fields = pickWritableFields(data);
  if (fields.requirements !== undefined) fields.requirements = JSON.stringify(fields.requirements);
  if (fields.skills !== undefined) fields.skills = JSON.stringify(fields.skills);
  if (fields.status === 'open' && existing.status !== 'open' && !existing.published_at) {
    fields.published_at = db.fn.now();
  }

  const [record] = await db(TABLE).where({ id }).update(fields).returning('*');
  if (Array.isArray(data.skills) && data.skills.length) await syncJobSkills(id, data.skills);
  return record;
}

export async function remove(id, { companyId } = {}) {
  const existing = await db(TABLE).where({ id }).first('company_id');
  if (!existing) throw new AppError('jobs not found', 404);
  if (companyId && existing.company_id !== companyId) throw new AppError('You do not have access to this job', 403);
  await db(TABLE).where({ id }).del();
}

export async function listApplicants(jobId, { stage, q, limit = 20, offset = 0 } = {}) {
  const job = await db(TABLE).where({ id: jobId }).first('id');
  if (!job) throw new AppError('jobs not found', 404);

  const cappedLimit = Math.min(Number(limit) || 20, 100);
  const build = () => {
    const qb = db('applications').where('applications.job_id', jobId).join('users', 'users.id', 'applications.applicant_id');
    if (stage) qb.andWhere('applications.status', stage);
    if (q) {
      qb.andWhere((w) =>
        w.whereILike('users.first_name', `%${q}%`).orWhereILike('users.last_name', `%${q}%`).orWhereILike('users.email', `%${q}%`)
      );
    }
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build()
      .orderBy('applications.created_at', 'desc')
      .limit(cappedLimit)
      .offset(Number(offset) || 0)
      .select(
        'applications.id',
        'applications.status',
        'applications.match_score',
        'applications.source',
        'applications.applied_at',
        'applications.created_at',
        'users.id as applicant_id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.headline'
      ),
    build().count({ count: 'applications.id' }),
  ]);

  return { items: rows, total: Number(count) };
}

export async function analytics(jobId) {
  const job = await db(TABLE).where({ id: jobId }).first();
  if (!job) throw new AppError('jobs not found', 404);

  const [viewed, applied, screened, interviewed, offered, hired, sourceRows, avgMatchScoreRow, hiredRow] = await Promise.all([
    db('job_views').where({ job_id: jobId }).count({ count: '*' }).first(),
    db('applications').where({ job_id: jobId }).count({ count: '*' }).first(),
    db('applications').where({ job_id: jobId }).whereIn('status', ['reviewing', 'shortlisted']).count({ count: '*' }).first(),
    db('applications').where({ job_id: jobId }).whereIn('status', ['interviewing', 'offered', 'hired']).count({ count: '*' }).first(),
    db('applications').where({ job_id: jobId }).whereIn('status', ['offered', 'hired']).count({ count: '*' }).first(),
    db('applications').where({ job_id: jobId, status: 'hired' }).count({ count: '*' }).first(),
    db('applications').where({ job_id: jobId }).select('source').count({ count: '*' }).groupBy('source'),
    db('applications').where({ job_id: jobId }).whereNotNull('match_score').avg({ avg: 'match_score' }).first(),
    db('applications').where({ job_id: jobId, status: 'hired' }).orderBy('updated_at', 'asc').first('applied_at', 'updated_at'),
  ]);

  const timeToFillDays = hiredRow?.applied_at
    ? Math.max(0, Math.round((new Date(hiredRow.updated_at) - new Date(hiredRow.applied_at)) / (24 * 3600 * 1000)))
    : null;

  return {
    funnel: {
      viewed: Number(viewed?.count || 0),
      applied: Number(applied?.count || 0),
      screened: Number(screened?.count || 0),
      interviewed: Number(interviewed?.count || 0),
      offered: Number(offered?.count || 0),
      hired: Number(hired?.count || 0),
    },
    sourceBreakdown: sourceRows.map((r) => ({ source: r.source || 'direct', count: Number(r.count) })),
    timeToFillDays,
    avgMatchScore: avgMatchScoreRow?.avg ? Number(Number(avgMatchScoreRow.avg).toFixed(1)) : null,
  };
}
