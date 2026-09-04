import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { notify } from '../../modules/notifications/notify.js';
import { recomputeReputationRollup } from './reputationRollup.service.js';

const RELATIONSHIP_TYPES = [
  'managed_them', 'reported_to_them', 'worked_together', 'client', 'service_provider',
  'project_collaborator', 'mentor', 'student', 'business_partner', 'other',
];

export async function listRecommendations({ userId, mode = 'received', status }) {
  let query = db('recommendations').select('recommendations.*');
  if (mode === 'received') query = query.where('subject_profile_id', userId);
  else if (mode === 'given') query = query.where('author_person_id', userId);
  else throw new AppError('Invalid mode', 422);

  if (status) query = query.andWhere('status', status);
  else if (mode === 'received') query = query.whereIn('status', ['published']);

  const rows = await query.orderBy('created_at', 'desc');
  const people = await db('users')
    .whereIn('id', rows.map((r) => (mode === 'received' ? r.author_person_id : r.subject_profile_id)))
    .select('id', 'first_name', 'last_name', 'avatar_url', 'headline');
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));

  return rows.map((r) => ({
    id: r.id,
    subjectProfileId: r.subject_profile_id,
    author: peopleById[r.author_person_id]
      ? { id: r.author_person_id, name: `${peopleById[r.author_person_id].first_name} ${peopleById[r.author_person_id].last_name}`, avatarUrl: peopleById[r.author_person_id].avatar_url, headline: peopleById[r.author_person_id].headline }
      : null,
    relationshipType: r.relationship_type,
    body: r.body,
    visibility: r.visibility,
    verificationStatus: r.verification_status,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function requestRecommendation(userId, { requestedPersonId, message }) {
  if (!requestedPersonId) throw new AppError('requestedPersonId is required', 422);
  if (requestedPersonId === userId) throw new AppError('You cannot request a recommendation from yourself', 422);

  const existing = await db('recommendation_requests').where({ subject_profile_id: userId, requested_person_id: requestedPersonId }).first();
  if (existing && existing.status === 'pending') throw new AppError('You already have a pending request with this person', 409);

  const [request] = await db('recommendation_requests')
    .insert({ subject_profile_id: userId, requested_person_id: requestedPersonId, message: message || null, status: 'pending' })
    .onConflict(['subject_profile_id', 'requested_person_id'])
    .merge({ message: message || null, status: 'pending', updated_at: db.fn.now() })
    .returning('*');

  await notify({ userId: requestedPersonId, actorId: userId, type: 'trust.recommendation.requested', payload: { requestId: request.id } });
  await emitEvent({ aggregateType: 'recommendation_request', aggregateId: request.id, eventType: 'trust.recommendation.requested', payload: { subjectProfileId: userId } });
  return request;
}

export async function listMyRequests(userId) {
  return db('recommendation_requests').where({ requested_person_id: userId }).andWhere('status', 'pending').orderBy('created_at', 'desc');
}

export async function writeRecommendation(authorId, { subjectProfileId, relationshipType, body, visibility = 'public', skillIds = [] }) {
  if (!subjectProfileId || !body) throw new AppError('subjectProfileId and body are required', 422);
  if (subjectProfileId === authorId) throw new AppError('You cannot write a recommendation for yourself', 422);
  if (relationshipType && !RELATIONSHIP_TYPES.includes(relationshipType)) throw new AppError('Invalid relationshipType', 422);

  let recommendation;
  await db.transaction(async (trx) => {
    [recommendation] = await trx('recommendations')
      .insert({
        subject_profile_id: subjectProfileId,
        author_person_id: authorId,
        relationship_type: relationshipType || 'other',
        body,
        visibility,
        status: 'published',
      })
      .onConflict(['subject_profile_id', 'author_person_id'])
      .merge({ relationship_type: relationshipType || 'other', body, visibility, status: 'published', updated_at: trx.fn.now() })
      .returning('*');

    if (skillIds.length) {
      await trx('recommendation_skills').where({ recommendation_id: recommendation.id }).del();
      await trx('recommendation_skills').insert(skillIds.map((skillId) => ({ recommendation_id: recommendation.id, skill_id: skillId })));
    }

    await trx('recommendation_requests').where({ subject_profile_id: subjectProfileId, requested_person_id: authorId }).update({ status: 'fulfilled' });
    await recomputeReputationRollup('profile', subjectProfileId, trx);
    await emitEvent({ aggregateType: 'recommendation', aggregateId: recommendation.id, eventType: 'trust.recommendation.created', payload: { subjectProfileId, authorId } }, trx);
  });

  await notify({ userId: subjectProfileId, actorId: authorId, type: 'trust.recommendation.received', payload: { recommendationId: recommendation.id } });
  return recommendation;
}

export async function setVisibility(recommendationId, userId, visibility) {
  const rec = await db('recommendations').where({ id: recommendationId }).first();
  if (!rec) throw new AppError('Recommendation not found', 404);
  if (rec.subject_profile_id !== userId) throw new AppError('Forbidden', 403);
  const [updated] = await db('recommendations').where({ id: recommendationId }).update({ visibility, updated_at: db.fn.now() }).returning('*');
  return updated;
}
