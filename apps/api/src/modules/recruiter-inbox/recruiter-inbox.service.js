import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { listConversations, getOrCreateDirectConversation } from '../messaging/messaging.service.js';

/**
 * Thin recruiter-context filter over the existing messaging system
 * (conversations/messages) — not a parallel inbox. `recruiter_inbox_threads`
 * only tags which conversations belong in a recruiter's candidate inbox and
 * carries recruiter-only status (active/snoozed/archived); the actual
 * conversation/message data always comes from the messaging module.
 */
export async function list(recruiterId, { status = 'active' } = {}) {
  const [threads, conversations] = await Promise.all([
    db('recruiter_inbox_threads as t')
      .leftJoin('users as u', 'u.id', 't.candidate_id')
      .leftJoin('recruiter_projects as p', 'p.id', 't.project_id')
      .where('t.recruiter_id', recruiterId)
      .modify((qb) => {
        if (status && status !== 'all') qb.andWhere('t.status', status);
      })
      .select('t.id', 't.conversation_id', 't.candidate_id', 't.project_id', 't.status', 'u.first_name', 'u.last_name', 'p.name as project_name'),
    listConversations(recruiterId),
  ]);

  const convById = Object.fromEntries(conversations.map((c) => [c.id, c]));

  return threads
    .map((t) => {
      const conv = convById[t.conversation_id];
      if (!conv) return null;
      return {
        thread_id: t.id,
        conversation_id: t.conversation_id,
        candidate_id: t.candidate_id,
        candidate_name: t.first_name ? `${t.first_name} ${t.last_name}`.trim() : conv.title,
        project_id: t.project_id,
        project_name: t.project_name || null,
        status: t.status,
        last_message: conv.lastMessage,
        unread_count: conv.unreadCount,
        updated_at: conv.updatedAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function startThread(recruiterId, { candidate_id, project_id } = {}) {
  if (!candidate_id) throw new AppError('candidate_id is required', 422);
  const candidate = await db('users').where({ id: candidate_id, account_type: 'individual' }).first('id');
  if (!candidate) throw new AppError('Candidate not found', 404);
  if (project_id) {
    const project = await db('recruiter_projects').where({ id: project_id, recruiter_id: recruiterId }).first('id');
    if (!project) throw new AppError('Project not found', 404);
  }

  const conversationId = await getOrCreateDirectConversation(recruiterId, candidate_id);

  const [thread] = await db('recruiter_inbox_threads')
    .insert({ recruiter_id: recruiterId, candidate_id, conversation_id: conversationId, project_id: project_id || null })
    .onConflict(['recruiter_id', 'conversation_id'])
    .merge({ status: 'active', project_id: project_id || null, updated_at: db.fn.now() })
    .returning('*');

  return thread;
}

export async function updateStatus(recruiterId, threadId, status) {
  if (!['active', 'snoozed', 'archived'].includes(status)) throw new AppError('Invalid status', 422);
  const [row] = await db('recruiter_inbox_threads').where({ id: threadId, recruiter_id: recruiterId }).update({ status }).returning('*');
  if (!row) throw new AppError('Thread not found', 404);
  return row;
}
