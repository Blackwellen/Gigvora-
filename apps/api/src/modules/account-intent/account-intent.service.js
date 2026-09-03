import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { emitEvent } from '../../common/events/outbox.js';

export async function getDraft({ userId }) {
  const draft = await db('account_intent_drafts').where({ user_id: userId }).first();
  return draft || null;
}

export async function saveDraft({ userId, intentType, draft, step }) {
  const existing = await db('account_intent_drafts').where({ user_id: userId }).first();

  if (existing) {
    const [updated] = await db('account_intent_drafts')
      .where({ user_id: userId })
      .update({
        intent_type: intentType || existing.intent_type,
        draft: JSON.stringify({ ...existing.draft, ...draft }),
        step: step ?? existing.step,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return updated;
  }

  const [created] = await db('account_intent_drafts')
    .insert({ user_id: userId, intent_type: intentType, draft: JSON.stringify(draft || {}), step: step || 1 })
    .returning('*');
  return created;
}

export async function completeIntent({ userId }) {
  const draft = await db('account_intent_drafts').where({ user_id: userId }).first();
  if (!draft) throw new AppError('No account intent draft found', 404);

  const [updated] = await db('account_intent_drafts')
    .where({ user_id: userId })
    .update({ status: 'completed', completed_at: db.fn.now(), updated_at: db.fn.now() })
    .returning('*');

  await db('users').where({ id: userId }).update({ account_type: mapIntentToAccountType(updated.intent_type) });

  await emitEvent({ aggregateType: 'user', aggregateId: userId, eventType: 'account_intent.completed', payload: { intentType: updated.intent_type } });
  return updated;
}

function mapIntentToAccountType(intentType) {
  if (intentType === 'client' || intentType === 'business') return 'company';
  if (intentType === 'recruiter' || intentType === 'agency') return 'recruiter';
  return 'individual';
}
