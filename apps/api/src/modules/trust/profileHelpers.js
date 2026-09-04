import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

/**
 * `reviews.subject_profile_id` / `recommendations.subject_profile_id` /
 * `endorsements.subject_profile_id` all reference `profiles.id` (see
 * 20260101000062_create_professional_profile_domain.js), which is its own UUID distinct from
 * `profiles.user_id` (the actual account). Every place in this module that compares a subject
 * against "the acting user", or notifies "the subject", must go through these helpers rather
 * than comparing a profile id to a user id directly — they are different id spaces and a naive
 * `subjectProfileId === userId` comparison silently never matches, defeating self-action checks.
 */
export async function getProfileOwner(profileId, trx = db) {
  const profile = await trx('profiles').where({ id: profileId }).first('id', 'user_id', 'avatar_url');
  if (!profile) throw new AppError('Profile not found', 404);
  return profile;
}

export async function getOrCreateOwnProfileId(userId, trx = db) {
  const existing = await trx('profiles').where({ user_id: userId }).first('id');
  if (existing) return existing.id;
  const [created] = await trx('profiles').insert({ user_id: userId }).returning('id');
  return created.id;
}

export async function isOwnProfile(profileId, userId, trx = db) {
  const profile = await trx('profiles').where({ id: profileId }).first('user_id');
  return Boolean(profile) && profile.user_id === userId;
}
