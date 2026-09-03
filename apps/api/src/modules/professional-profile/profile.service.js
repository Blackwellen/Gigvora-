import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getProfileRow, recomputeCompleteness } from './shared.js';

function toHero(user, profile) {
  return {
    profileId: profile.id,
    userId: user.id,
    displayName: `${user.first_name} ${user.last_name}`.trim(),
    headline: profile.headline || null,
    summary: profile.bio || null,
    avatarUrl: profile.avatar_url || null,
    coverUrl: profile.cover_url || null,
    location: profile.location || null,
    timezone: profile.timezone || null,
    industry: profile.industry || null,
    availabilityStatus: profile.availability_status,
    verificationStatus: profile.verification_status,
    trustScore: profile.trust_score,
    trustBand: profile.trust_band,
    trustReasonCodes: profile.trust_reason_codes || [],
    trustAlgorithmVersion: profile.trust_algorithm_version,
    completenessScore: profile.completeness_score,
    completenessMissingSections: profile.completeness_missing_sections || [],
    isPublic: profile.is_public,
    slug: profile.slug,
    rate:
      profile.rate_min || profile.rate_max
        ? { type: profile.rate_type, min: profile.rate_min, max: profile.rate_max, currency: profile.rate_currency }
        : null,
  };
}

export async function getHero(userId) {
  const [user, profile] = await Promise.all([
    db('users').where({ id: userId }).first('id', 'first_name', 'last_name', 'account_type', 'is_verified'),
    getProfileRow(userId),
  ]);
  if (!user) throw new AppError('User not found', 404);

  const [connectionCount, followerCount, followingCount] = await Promise.all([
    db('connections')
      .where('status', 'accepted')
      .andWhere((qb) => qb.where({ requester_id: userId }).orWhere({ addressee_id: userId }))
      .count('id as count')
      .first(),
    db('follows').where({ following_id: userId }).count('id as count').first(),
    db('follows').where({ follower_id: userId }).count('id as count').first(),
  ]);

  const profileViews = await db('profile_metrics_daily').where({ profile_id: profile.id }).sum('profile_views as total').first();

  return {
    ...toHero(user, profile),
    connectionCount: Number(connectionCount?.count || 0),
    followerCount: Number(followerCount?.count || 0),
    followingCount: Number(followingCount?.count || 0),
    profileViewsTotal: Number(profileViews?.total || 0),
  };
}

const ABOUT_FIELDS = ['headline', 'bio', 'location', 'industry', 'timezone'];

export async function updateAbout(userId, patch) {
  const profile = await getProfileRow(userId);
  const update = {};
  for (const field of ABOUT_FIELDS) {
    if (field in patch) update[field === 'bio' ? 'bio' : field] = patch[field];
  }
  if ('links' in patch && patch.links && typeof patch.links === 'object') {
    update.links = JSON.stringify(patch.links);
  }
  if (Object.keys(update).length === 0) throw new AppError('No editable fields provided', 422);

  await db('profiles').where({ id: profile.id }).update(update);
  await recomputeCompleteness(profile.id);
  await emitEvent({ aggregateType: 'professional_profile', aggregateId: profile.id, eventType: 'professional_profile.updated', payload: { fields: Object.keys(update) } });

  return getHero(userId);
}

export async function updateAvailabilitySummary(userId, { availabilityStatus }) {
  const profile = await getProfileRow(userId);
  const allowed = ['open_to_work', 'open_to_projects', 'not_available', 'unspecified'];
  if (!allowed.includes(availabilityStatus)) throw new AppError('Invalid availability status', 422);
  await db('profiles').where({ id: profile.id }).update({ availability_status: availabilityStatus });
  await emitEvent({ aggregateType: 'professional_profile', aggregateId: profile.id, eventType: 'profile.availability.updated', payload: { availabilityStatus } });
  return getHero(userId);
}

export async function setCoverUrl(userId, url) {
  const profile = await getProfileRow(userId);
  await db('profiles').where({ id: profile.id }).update({ cover_url: url });
  await recomputeCompleteness(profile.id);
  await emitEvent({ aggregateType: 'professional_profile', aggregateId: profile.id, eventType: 'profile.cover.updated', payload: {} });
  return getHero(userId);
}

export async function setAvatarUrl(userId, url) {
  const profile = await getProfileRow(userId);
  await db('profiles').where({ id: profile.id }).update({ avatar_url: url });
  await recomputeCompleteness(profile.id);
  await emitEvent({ aggregateType: 'professional_profile', aggregateId: profile.id, eventType: 'profile.avatar.updated', payload: {} });
  return getHero(userId);
}

export async function removeCover(userId) {
  const profile = await getProfileRow(userId);
  await db('profiles').where({ id: profile.id }).update({ cover_url: null });
  await recomputeCompleteness(profile.id);
  return getHero(userId);
}

/** Qualified profile-view recorder — deduped by viewer+session within a rolling window (§43). */
export async function recordProfileView(profileId, { viewerId, sessionHash, source }) {
  if (viewerId) {
    const recent = await db('profile_view_events')
      .where({ profile_id: profileId, viewer_id: viewerId })
      .andWhere('viewed_at', '>=', db.raw("now() - interval '30 minutes'"))
      .first('id');
    if (recent) return { recorded: false };
  } else if (sessionHash) {
    const recent = await db('profile_view_events')
      .where({ profile_id: profileId, viewer_session_hash: sessionHash })
      .andWhere('viewed_at', '>=', db.raw("now() - interval '30 minutes'"))
      .first('id');
    if (recent) return { recorded: false };
  }

  await db('profile_view_events').insert({ profile_id: profileId, viewer_id: viewerId || null, viewer_session_hash: sessionHash || null, source: source || 'direct' });

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db('profile_metrics_daily').where({ profile_id: profileId, metric_date: today }).first('id');
  if (existing) {
    await db('profile_metrics_daily').where({ id: existing.id }).increment('profile_views', 1);
  } else {
    await db('profile_metrics_daily').insert({ profile_id: profileId, metric_date: today, profile_views: 1 });
  }
  return { recorded: true };
}
