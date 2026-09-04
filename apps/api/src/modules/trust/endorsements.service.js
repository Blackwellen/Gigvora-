import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';
import { notify } from '../../modules/notifications/notify.js';
import { recomputeReputationRollup } from './reputationRollup.service.js';

export async function listEndorsementsForSubject(subjectProfileId) {
  const rows = await db('endorsements')
    .where({ subject_profile_id: subjectProfileId })
    .join('skills', 'skills.id', 'endorsements.skill_id')
    .select('endorsements.*', 'skills.name as skill_name');

  const bySkill = new Map();
  for (const row of rows) {
    if (!bySkill.has(row.skill_id)) {
      bySkill.set(row.skill_id, { skillId: row.skill_id, skillName: row.skill_name, endorsementCount: 0, verifiedCount: 0, endorserIds: [] });
    }
    const bucket = bySkill.get(row.skill_id);
    bucket.endorsementCount += 1;
    if (row.relationship_verified) bucket.verifiedCount += 1;
    bucket.endorserIds.push(row.endorser_person_id);
  }

  return [...bySkill.values()].sort((a, b) => b.endorsementCount - a.endorsementCount);
}

export async function endorseSkill(endorserId, { subjectProfileId, skillId, relationshipContext }) {
  if (!subjectProfileId || !skillId) throw new AppError('subjectProfileId and skillId are required', 422);
  if (subjectProfileId === endorserId) throw new AppError('You cannot endorse yourself', 422);

  const skill = await db('skills').where({ id: skillId }).first();
  if (!skill) throw new AppError('Unknown skill', 404);

  // A relationship is only ever marked verified if backed by a real shared-employment/project
  // record — never inferred purely from the endorser's say-so (§27).
  const sharedEmployment = await db('employment_history')
    .where({ profile_id: subjectProfileId })
    .whereExists(
      db('employment_history as eh2').whereRaw('eh2.profile_id = ? and eh2.company_name = employment_history.company_name', [endorserId])
    )
    .first()
    .catch(() => null);

  let endorsement;
  await db.transaction(async (trx) => {
    [endorsement] = await trx('endorsements')
      .insert({
        subject_profile_id: subjectProfileId,
        endorser_person_id: endorserId,
        skill_id: skillId,
        relationship_verified: Boolean(sharedEmployment),
        relationship_context: relationshipContext || (sharedEmployment ? 'shared_employment' : null),
      })
      .onConflict(['subject_profile_id', 'endorser_person_id', 'skill_id'])
      .ignore()
      .returning('*');

    if (!endorsement) throw new AppError('You have already endorsed this skill', 409);

    await recomputeReputationRollup('profile', subjectProfileId, trx);
    await emitEvent({ aggregateType: 'endorsement', aggregateId: endorsement.id, eventType: 'trust.endorsement.created', payload: { subjectProfileId, skillId } }, trx);
  });

  await notify({ userId: subjectProfileId, actorId: endorserId, type: 'trust.endorsement.received', payload: { skillId } });
  return endorsement;
}

export async function removeEndorsement(endorsementId, userId) {
  const endorsement = await db('endorsements').where({ id: endorsementId }).first();
  if (!endorsement) throw new AppError('Endorsement not found', 404);
  if (endorsement.endorser_person_id !== userId) throw new AppError('Forbidden', 403);
  await db.transaction(async (trx) => {
    await trx('endorsements').where({ id: endorsementId }).del();
    await recomputeReputationRollup('profile', endorsement.subject_profile_id, trx);
  });
}
