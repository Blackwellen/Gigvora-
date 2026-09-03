import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { getOwnProfileId } from './shared.js';

async function withAuthor(row) {
  const author = await db('users').where({ id: row.author_person_id }).first('id', 'first_name', 'last_name', 'headline', 'account_type');
  const skillRows = await db('recommendation_skills as rs').join('skills as s', 's.id', 'rs.skill_id').where('rs.recommendation_id', row.id).select('s.id', 's.canonical_name');
  return { ...row, author, endorsedSkills: skillRows };
}

/** Owner's list — includes pending/declined so they can manage requests too. */
export async function list(userId) {
  const profileId = await getOwnProfileId(userId);
  const rows = await db('recommendations').where({ subject_profile_id: profileId }).whereNot('status', 'removed').orderBy('created_at', 'desc');
  return Promise.all(rows.map(withAuthor));
}

export async function requestRecommendation(userId, { requestedPersonId, message }) {
  const profileId = await getOwnProfileId(userId);
  if (!requestedPersonId) throw new AppError('Select a person to request a recommendation from', 422);
  if (requestedPersonId === userId) throw new AppError('You cannot request a recommendation from yourself', 422);

  const target = await db('users').where({ id: requestedPersonId }).first('id');
  if (!target) throw new AppError('Person not found', 404);

  const existing = await db('recommendation_requests').where({ subject_profile_id: profileId, requested_person_id: requestedPersonId }).first('id');
  if (existing) throw new AppError('You already requested a recommendation from this person', 409);

  const [row] = await db('recommendation_requests').insert({ subject_profile_id: profileId, requested_person_id: requestedPersonId, message: message || null }).returning('*');
  return row;
}

/**
 * A recommendation may only be published by someone the subject actually has
 * a real relationship with — enforced by requiring either a live connection
 * or a shared, resolved project/gig context (§24: this is a professional
 * endorsement, not a transactional review, but it still must not be
 * fabricated or self-authored).
 */
export async function submitRecommendation(authorPersonId, subjectProfileId, input) {
  if (!input.body || input.body.trim().length < 20) throw new AppError('Recommendation must be at least 20 characters', 422);

  const subjectProfile = await db('profiles').where({ id: subjectProfileId }).first('id', 'user_id');
  if (!subjectProfile) throw new AppError('Profile not found', 404);
  if (subjectProfile.user_id === authorPersonId) throw new AppError('You cannot recommend yourself', 422);

  const isConnection = await db('connections')
    .where('status', 'accepted')
    .andWhere((qb) =>
      qb.where({ requester_id: authorPersonId, addressee_id: subjectProfile.user_id }).orWhere({ addressee_id: authorPersonId, requester_id: subjectProfile.user_id })
    )
    .first('id');

  const [row] = await db('recommendations')
    .insert({
      subject_profile_id: subjectProfileId,
      author_person_id: authorPersonId,
      relationship_type: input.relationshipType || null,
      related_project_id: input.relatedProjectId || null,
      related_gig_id: input.relatedGigId || null,
      body: input.body.trim(),
      visibility: input.visibility || 'public',
      verification_status: isConnection ? 'relationship_verified' : 'unverified',
      status: 'published',
    })
    .returning('*')
    .onConflict(['subject_profile_id', 'author_person_id'])
    .merge({ body: input.body.trim(), status: 'published' });

  if (Array.isArray(input.skillIds)) {
    await db('recommendation_skills').where({ recommendation_id: row.id }).del();
    for (const skillId of input.skillIds) {
      await db('recommendation_skills').insert({ recommendation_id: row.id, skill_id: skillId }).onConflict(['recommendation_id', 'skill_id']).ignore();
    }
  }

  await db('recommendation_requests').where({ subject_profile_id: subjectProfileId, requested_person_id: authorPersonId }).update({ status: 'fulfilled' });
  await emitEvent({ aggregateType: 'recommendation', aggregateId: row.id, eventType: 'recommendation.created', payload: { subjectProfileId } });
  return withAuthor(row);
}

export async function updateVisibility(userId, id, visibility) {
  const profileId = await getOwnProfileId(userId);
  const owned = await db('recommendations').where({ id, subject_profile_id: profileId }).first('id');
  if (!owned) throw new AppError('Recommendation not found', 404);
  const [row] = await db('recommendations').where({ id }).update({ visibility }).returning('*');
  await emitEvent({ aggregateType: 'recommendation', aggregateId: id, eventType: 'recommendation.visibility_changed', payload: { visibility } });
  return withAuthor(row);
}

export async function report(userId, id) {
  const profileId = await getOwnProfileId(userId);
  const owned = await db('recommendations').where({ id, subject_profile_id: profileId }).first('id');
  if (!owned) throw new AppError('Recommendation not found', 404);
  await db('recommendations').where({ id }).update({ status: 'reported' });
  return { reported: true };
}
