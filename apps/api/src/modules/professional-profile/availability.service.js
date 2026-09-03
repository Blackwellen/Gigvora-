import { db } from '../../db/connection.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getOwnProfileId, recomputeCompleteness } from './shared.js';

const VISIBILITY_LEVELS = ['public', 'businesses', 'connections', 'private'];
const DEFAULT_VISIBILITY = {
  availability_status: 'public',
  weekly_capacity_hours: 'public',
  rate: 'private',
  notice_period: 'connections',
  preferred_locations: 'public',
};

export async function get(userId) {
  const profileId = await getOwnProfileId(userId);
  const row = await db('profile_availability').where({ profile_id: profileId }).first();
  if (!row) return { profileId, exists: false, visibility: DEFAULT_VISIBILITY };
  return { ...row, exists: true };
}

/** Owner view is always the full record — server enforces the public/viewer-facing subset elsewhere (§37-38, §82). */
export async function upsert(userId, input) {
  const profileId = await getOwnProfileId(userId);

  const record = {
    profile_id: profileId,
    availability_status: input.availabilityStatus || 'unspecified',
    weekly_capacity_hours: input.weeklyCapacityHours ?? null,
    notice_period: input.noticePeriod || null,
    preferred_engagement_types: JSON.stringify(input.preferredEngagementTypes || []),
    work_location_modes: JSON.stringify(input.workLocationModes || []),
    location_radius_km: input.locationRadiusKm ?? null,
    preferred_locations: JSON.stringify(input.preferredLocations || []),
    minimum_rate_cents: input.minimumRateCents ?? null,
    maximum_rate_cents: input.maximumRateCents ?? null,
    currency: input.currency || 'USD',
    rate_unit: input.rateUnit || 'hour',
    industries: JSON.stringify(input.industries || []),
    contract_types: JSON.stringify(input.contractTypes || []),
    travel_willing: Boolean(input.travelWilling),
    travel_percentage: input.travelPercentage ?? null,
    timezone: input.timezone || null,
    languages: JSON.stringify(input.languages || []),
    visibility_json: JSON.stringify({ ...DEFAULT_VISIBILITY, ...(input.visibility || {}) }),
    updated_at: db.fn.now(),
  };
  for (const level of Object.values(JSON.parse(record.visibility_json))) {
    if (!VISIBILITY_LEVELS.includes(level)) throw new Error(`Invalid visibility level: ${level}`);
  }

  const [row] = await db('profile_availability')
    .insert(record)
    .onConflict('profile_id')
    .merge(record)
    .returning('*');

  await db('profiles').where({ id: profileId }).update({ availability_status: record.availability_status });
  await recomputeCompleteness(profileId);
  await emitEvent({ aggregateType: 'professional_profile', aggregateId: profileId, eventType: 'profile.availability.updated', payload: {} });
  return { ...row, exists: true };
}

/**
 * §72 match-readiness — combines completeness + skills + experience +
 * availability + rate + verification into an understandable factor list.
 * Deterministic, no employment guarantee implied.
 */
export async function getMatchReadiness(userId) {
  const profileId = await getOwnProfileId(userId);
  const [profile, skillCount, expCount, availability] = await Promise.all([
    db('profiles').where({ id: profileId }).first('completeness_score', 'verification_status'),
    db('profile_skills').where({ profile_id: profileId }).count('id as c').first(),
    db('experiences').where({ profile_id: profileId }).count('id as c').first(),
    db('profile_availability').where({ profile_id: profileId }).first(),
  ]);

  const factors = [];
  let score = 0;
  const completeness = profile?.completeness_score || 0;
  score += Math.round((completeness / 100) * 40);
  factors.push({ label: 'Profile completeness', met: completeness >= 70, detail: `${completeness}% complete` });

  const hasSkills = Number(skillCount?.c || 0) >= 3;
  if (hasSkills) score += 20;
  factors.push({ label: 'Skills listed', met: hasSkills, detail: `${skillCount?.c || 0} skills` });

  const hasExperience = Number(expCount?.c || 0) >= 1;
  if (hasExperience) score += 15;
  factors.push({ label: 'Work experience', met: hasExperience, detail: `${expCount?.c || 0} entries` });

  const hasAvailability = Boolean(availability) && availability.availability_status !== 'unspecified';
  if (hasAvailability) score += 15;
  factors.push({ label: 'Availability configured', met: hasAvailability });

  const hasRate = Boolean(availability?.minimum_rate_cents || availability?.maximum_rate_cents);
  if (hasRate) score += 5;
  factors.push({ label: 'Rate expectations set', met: hasRate });

  const verified = profile?.verification_status === 'verified';
  if (verified) score += 5;
  factors.push({ label: 'Identity verified', met: verified });

  return { score: Math.min(100, score), factors };
}
