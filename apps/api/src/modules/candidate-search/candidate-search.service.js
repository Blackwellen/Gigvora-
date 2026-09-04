import { db } from '../../db/connection.js';

/**
 * Domain 20 Candidate Search (20.02). Deliberately the SAME kind of
 * keyword/skills/location search as Domain 19's Talent Discovery
 * (talent-discovery.service.js) — Recruiter Standard does not get boolean or
 * natural-language search, that is a Recruiter Pro / Domain 21 feature. This
 * module adds the recruiter-only overlay (is_saved) on top.
 */
function normaliseSkills(skills) {
  return (Array.isArray(skills) ? skills : []).map((s) => String(s).toLowerCase());
}

function toCard(row, requestedSkills, savedSet) {
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
    is_saved: savedSet.has(row.id),
  };
}

export async function search(recruiterId, filters = {}) {
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
      .select('users.id', 'users.first_name', 'users.last_name', 'users.headline', 'profiles.location', 'profiles.skills', 'profiles.open_to_work', 'profiles.avatar_url'),
    build().count({ count: 'users.id' }),
  ]);

  const savedRows = rows.length
    ? await db('candidate_saves')
        .where({ recruiter_id: recruiterId })
        .whereIn('candidate_id', rows.map((r) => r.id))
        .select('candidate_id')
    : [];
  const savedSet = new Set(savedRows.map((r) => r.candidate_id));

  return { items: rows.map((r) => toCard(r, requestedSkills, savedSet)), total: Number(count) };
}
