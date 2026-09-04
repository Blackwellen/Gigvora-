import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

/**
 * Recruiter-facing READ view over the platform's existing Professional
 * Profile data (users / profiles / experiences / education tables) plus a
 * recruiter-only overlay (save status, note count, pool/shortlist
 * membership, engagement snapshot). Does NOT duplicate profile truth or let
 * a recruiter edit anything here — editing stays owned by the
 * professional-profile module ("/me" scoped to the profile's own owner).
 */
export async function getCandidateDetail(recruiterId, candidateId, { skills: requestedSkillsCsv } = {}) {
  const user = await db('users').where({ id: candidateId, account_type: 'individual' }).first('id', 'first_name', 'last_name', 'email', 'headline', 'created_at');
  if (!user) throw new AppError('Candidate not found', 404);

  const profile = await db('profiles').where({ user_id: candidateId }).first();

  const [experiences, education, savedRow, notesCount, pinnedNote, poolMemberships, shortlistMemberships, engagement] = await Promise.all([
    profile ? db('experiences').where({ profile_id: profile.id }).orderBy([{ column: 'is_current', order: 'desc' }, { column: 'start_date', order: 'desc' }]).limit(6) : [],
    profile ? db('education').where({ profile_id: profile.id }).orderBy('start_date', 'desc').limit(4) : [],
    db('candidate_saves').where({ recruiter_id: recruiterId, candidate_id: candidateId }).first(),
    db('candidate_notes').where({ recruiter_id: recruiterId, candidate_id: candidateId }).count({ c: '*' }).first(),
    db('candidate_notes').where({ recruiter_id: recruiterId, candidate_id: candidateId, is_pinned: true }).orderBy('updated_at', 'desc').first(),
    db('recruiter_talent_pool_members as m')
      .join('recruiter_talent_pools as p', 'p.id', 'm.pool_id')
      .where({ 'p.recruiter_id': recruiterId, 'm.candidate_id': candidateId })
      .select('p.id', 'p.name'),
    db('recruiter_shortlist_members as m')
      .join('recruiter_shortlists as s', 's.id', 'm.shortlist_id')
      .where({ 's.recruiter_id': recruiterId, 'm.candidate_id': candidateId })
      .select('s.id', 's.name'),
    db('candidate_engagement_snapshots').where({ candidate_id: candidateId }).orderBy('snapshot_date', 'desc').first(),
  ]);

  const requestedSkills = requestedSkillsCsv
    ? String(requestedSkillsCsv).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  const candidateSkills = profile?.skills || [];
  let match_score = null;
  let matched_skills = [];
  if (requestedSkills.length) {
    const candidateSet = new Set(candidateSkills.map((s) => String(s).toLowerCase()));
    matched_skills = candidateSkills.filter((s) => candidateSet.has(String(s).toLowerCase()) && requestedSkills.includes(String(s).toLowerCase()));
    match_score = Math.round((matched_skills.length / requestedSkills.length) * 100);
  }

  let pastApplicationsCount = 0;
  const appsRow = await db('applications').where({ applicant_id: candidateId }).count({ c: '*' }).first();
  pastApplicationsCount = Number(appsRow?.c || 0);

  return {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`.trim(),
    email: user.email,
    headline: profile?.headline || user.headline || null,
    member_since: user.created_at,
    bio: profile?.bio || null,
    location: profile?.location || null,
    industry: profile?.industry || null,
    avatar_url: profile?.avatar_url || null,
    cover_url: profile?.cover_url || null,
    skills: candidateSkills,
    links: profile?.links || {},
    open_to_work: !!profile?.open_to_work,
    trust_score: profile?.trust_score ?? null,
    trust_band: profile?.trust_band ?? null,
    completeness_score: profile?.completeness_score ?? null,
    experiences: experiences.map((e) => ({ id: e.id, title: e.title, org_name: e.org_name, location: e.location, start_date: e.start_date, end_date: e.end_date, is_current: e.is_current, description: e.description })),
    education: education.map((e) => ({ id: e.id, institution_name: e.institution_name, qualification: e.qualification, field: e.field, start_date: e.start_date, end_date: e.end_date })),
    match_score,
    matched_skills,
    past_applications_count: pastApplicationsCount,
    // Recruiter-only overlay
    is_saved: !!savedRow,
    save_status: savedRow?.status || null,
    notes_count: Number(notesCount?.c || 0),
    pinned_note: pinnedNote ? { id: pinnedNote.id, body: pinnedNote.body, updated_at: pinnedNote.updated_at } : null,
    pool_memberships: poolMemberships,
    shortlist_memberships: shortlistMemberships,
    engagement: engagement
      ? {
          profile_views_30d: engagement.profile_views_30d,
          response_rate_pct: Number(engagement.response_rate_pct),
          avg_response_time_hours: engagement.avg_response_time_hours != null ? Number(engagement.avg_response_time_hours) : null,
          last_active_at: engagement.last_active_at,
          availability_status: engagement.availability_status,
          engagement_score: Number(engagement.engagement_score),
          snapshot_date: engagement.snapshot_date,
        }
      : null,
  };
}
