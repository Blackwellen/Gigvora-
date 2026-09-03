import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

function normaliseSkills(skills) {
  return (Array.isArray(skills) ? skills : []).map((s) => String(s).toLowerCase());
}

function toCard(row, requestedSkills) {
  const candidateSkills = Array.isArray(row.skills) ? row.skills : [];
  let match_score = null;
  let matched_skills = [];
  if (requestedSkills.length) {
    const candidateSet = new Set(normaliseSkills(candidateSkills));
    matched_skills = candidateSkills.filter((s) => candidateSet.has(String(s).toLowerCase()) && requestedSkills.includes(String(s).toLowerCase()));
    match_score = Math.round((matched_skills.length / requestedSkills.length) * 100);
  }

  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    headline: row.headline || null,
    location: row.location || null,
    skills: candidateSkills,
    open_to_work: !!row.open_to_work,
    avatar_url: row.avatar_url || null,
    match_score,
    matched_skills,
  };
}

export async function search(filters = {}) {
  const { q, skills, location, open_to_work, limit = 20, offset = 0 } = filters;
  const cappedLimit = Math.min(Number(limit) || 20, 50);
  const cappedOffset = Number(offset) || 0;

  const requestedSkills = skills
    ? String(skills)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const build = () => {
    const qb = db('users')
      .join('profiles', 'profiles.user_id', 'users.id')
      .where('users.account_type', 'individual');
    if (q) {
      qb.andWhere((w) =>
        w
          .whereILike('users.first_name', `%${q}%`)
          .orWhereILike('users.last_name', `%${q}%`)
          .orWhereILike('users.headline', `%${q}%`)
      );
    }
    if (location) qb.andWhereILike('profiles.location', `%${location}%`);
    if (open_to_work !== undefined) qb.andWhere('profiles.open_to_work', open_to_work === 'true' || open_to_work === true);
    if (requestedSkills.length) {
      qb.andWhere((w) => {
        for (const skill of requestedSkills) {
          w.orWhereRaw('profiles.skills @> ?::jsonb', [JSON.stringify([skill])]);
        }
      });
    }
    return qb;
  };

  const [rows, [{ count }]] = await Promise.all([
    build()
      .orderBy('users.created_at', 'desc')
      .limit(cappedLimit)
      .offset(cappedOffset)
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.headline',
        'profiles.location',
        'profiles.skills',
        'profiles.open_to_work',
        'profiles.avatar_url'
      ),
    build().count({ count: 'users.id' }),
  ]);

  return { items: rows.map((r) => toCard(r, requestedSkills)), total: Number(count) };
}

export async function getById(userId, { companyId } = {}) {
  const user = await db('users').where({ id: userId, account_type: 'individual' }).first(
    'id',
    'first_name',
    'last_name',
    'email',
    'headline',
    'created_at'
  );
  if (!user) throw new AppError('candidate not found', 404);

  const profile = await db('profiles').where({ user_id: userId }).first();

  let pastApplicationsToCompany = 0;
  if (companyId) {
    const row = await db('applications')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('applications.applicant_id', userId)
      .andWhere('jobs.company_id', companyId)
      .count({ count: '*' })
      .first();
    pastApplicationsToCompany = Number(row?.count || 0);
  }

  return {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    headline: user.headline || null,
    created_at: user.created_at,
    bio: profile?.bio || null,
    location: profile?.location || null,
    industry: profile?.industry || null,
    avatar_url: profile?.avatar_url || null,
    cover_url: profile?.cover_url || null,
    skills: profile?.skills || [],
    experience: profile?.experience || [],
    education: profile?.education || [],
    links: profile?.links || {},
    open_to_work: !!profile?.open_to_work,
    past_applications_to_company: pastApplicationsToCompany,
  };
}
