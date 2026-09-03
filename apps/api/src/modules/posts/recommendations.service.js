import { db } from '../../db/connection.js';

/**
 * Recommendation rail candidate generation (people_recommender /
 * gig_recommender v0). Deterministic baseline: exclude anything the viewer
 * is already connected to / following / has applied to (authorization- and
 * relevance-safe filtering happens here, before any ranking), then rank by
 * mutual-connection count for people and recency for gigs.
 */
export async function getPeopleSuggestions(viewerId, limit = 5) {
  const excluded = new Set([viewerId]);
  const [connections, follows] = await Promise.all([
    db('connections')
      .where((qb) => qb.where({ requester_id: viewerId }).orWhere({ addressee_id: viewerId }))
      .select('requester_id', 'addressee_id'),
    db('follows').where({ follower_id: viewerId }).select('following_id'),
  ]);
  connections.forEach((c) => {
    excluded.add(c.requester_id);
    excluded.add(c.addressee_id);
  });
  follows.forEach((f) => excluded.add(f.following_id));

  const myConnectionIds = connections
    .filter((c) => c.requester_id === viewerId || c.addressee_id === viewerId)
    .map((c) => (c.requester_id === viewerId ? c.addressee_id : c.requester_id));

  const candidates = await db('users').whereNotIn('id', [...excluded]).orderBy('created_at', 'desc').limit(50).select('id', 'first_name', 'last_name', 'headline', 'account_type');

  if (!candidates.length) return [];

  const mutualCounts = myConnectionIds.length
    ? await db('connections')
        .where('status', 'accepted')
        .andWhere((qb) =>
          qb.whereIn('requester_id', myConnectionIds).orWhereIn('addressee_id', myConnectionIds)
        )
        .select('requester_id', 'addressee_id')
    : [];

  const mutualByUser = {};
  for (const row of mutualCounts) {
    for (const side of [row.requester_id, row.addressee_id]) {
      if (candidates.some((c) => c.id === side)) mutualByUser[side] = (mutualByUser[side] || 0) + 1;
    }
  }

  return candidates
    .map((c) => ({ ...c, mutualConnections: mutualByUser[c.id] || 0 }))
    .sort((a, b) => b.mutualConnections - a.mutualConnections)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      headline: c.headline,
      accountType: c.account_type,
      mutualConnections: c.mutualConnections,
    }));
}

export async function getGigSuggestions(viewerId, limit = 5) {
  const applied = (await db('applications').where({ applicant_id: viewerId }).select('job_id')).map((a) => a.job_id);
  const jobs = await db('jobs as j')
    .join('companies as c', 'c.id', 'j.company_id')
    .where('j.status', 'open')
    .modify((qb) => {
      if (applied.length) qb.whereNotIn('j.id', applied);
    })
    .orderBy('j.created_at', 'desc')
    .limit(limit)
    .select('j.id', 'j.title', 'j.location', 'j.work_mode', 'j.employment_type', 'j.created_at', 'c.name as company_name');

  return jobs.map((j) => ({
    id: j.id,
    title: j.title,
    location: j.location,
    workMode: j.work_mode,
    employmentType: j.employment_type,
    companyName: j.company_name,
    isNew: Date.now() - new Date(j.created_at).getTime() < 7 * 24 * 3600 * 1000,
  }));
}

const NEW_WINDOW_MS = 7 * 24 * 3600 * 1000;

// Projects, podcasts, and webinars have no interaction/exclusion tracking
// table yet (unlike applications for gigs/jobs), so there is nothing to
// exclude — suggestions are simply the most recent published/open items.
export async function getProjectSuggestions(viewerId, limit = 5) {
  const projects = await db('projects')
    .whereIn('status', ['open', 'in_progress'])
    .orderBy('created_at', 'desc')
    .limit(limit)
    .select('id', 'slug', 'title', 'category', 'location', 'is_remote', 'status', 'created_at');

  return projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    location: p.location,
    isRemote: p.is_remote,
    status: p.status,
    isNew: Date.now() - new Date(p.created_at).getTime() < NEW_WINDOW_MS,
  }));
}

export async function getPodcastSuggestions(viewerId, limit = 5) {
  const podcasts = await db('podcasts')
    .where('is_published', true)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .select('id', 'slug', 'title', 'host_name', 'category', 'cover_image_url', 'duration_seconds', 'created_at');

  return podcasts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    hostName: p.host_name,
    category: p.category,
    coverImageUrl: p.cover_image_url,
    durationSeconds: p.duration_seconds,
    isNew: Date.now() - new Date(p.created_at).getTime() < NEW_WINDOW_MS,
  }));
}

export async function getWebinarSuggestions(viewerId, limit = 5) {
  const webinars = await db('webinars')
    .where('is_published', true)
    .orderBy('scheduled_at', 'asc')
    .limit(limit)
    .select('id', 'slug', 'title', 'host_name', 'category', 'cover_image_url', 'scheduled_at', 'duration_minutes', 'created_at');

  return webinars.map((w) => ({
    id: w.id,
    slug: w.slug,
    title: w.title,
    hostName: w.host_name,
    category: w.category,
    coverImageUrl: w.cover_image_url,
    scheduledAt: w.scheduled_at,
    durationMinutes: w.duration_minutes,
    isNew: Date.now() - new Date(w.created_at).getTime() < NEW_WINDOW_MS,
  }));
}
