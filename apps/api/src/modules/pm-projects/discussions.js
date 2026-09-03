// Domain 18 Phase B — Discussions (18.12): persistent threaded discussion,
// distinct from the realtime Project Chat (chat.js), which reuses Domain 10.
import { Router } from 'express';
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { emitEvent } from '../../common/events/outbox.js';
import { loadProjectContext } from './shared.js';
import { canManageTasks, assertPermission } from './permissions.js';

function serializeDiscussion(row, replyCount = 0) {
  return {
    id: row.id,
    projectId: row.project_id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    linkedTaskId: row.linked_task_id,
    linkedMilestoneId: row.linked_milestone_id,
    pinned: row.pinned,
    resolved: row.resolved,
    replyCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeReply(row) {
  return { id: row.id, discussionId: row.discussion_id, authorId: row.author_id, body: row.body, createdAt: row.created_at };
}

async function assertAccess(projectId, userId) {
  const { membership } = await loadProjectContext(projectId, userId);
  assertPermission(Boolean(membership), 'You do not have access to this project');
  return membership;
}

export const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const rows = await db('pm_project_discussions').where({ project_id: req.params.id }).orderBy([{ column: 'pinned', order: 'desc' }, { column: 'created_at', order: 'desc' }]);
  const ids = rows.map((r) => r.id);
  const counts = ids.length ? await db('pm_discussion_replies').whereIn('discussion_id', ids).select('discussion_id').count('id as count').groupBy('discussion_id') : [];
  const countByDiscussion = new Map(counts.map((c) => [c.discussion_id, Number(c.count)]));
  res.json({ data: rows.map((r) => serializeDiscussion(r, countByDiscussion.get(r.id) || 0)) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canManageTasks(membership), 'You do not have permission to post here');

  const { title, body, linkedTaskId, linkedMilestoneId } = req.body;
  if (!title?.trim() || !body?.trim()) throw new AppError('Title and body are required', 422);

  const [row] = await db('pm_project_discussions')
    .insert({ project_id: req.params.id, author_id: req.user.sub, title: title.trim(), body: body.trim(), linked_task_id: linkedTaskId || null, linked_milestone_id: linkedMilestoneId || null })
    .returning('*');

  await emitEvent({ aggregateType: 'pm_discussion', aggregateId: row.id, eventType: 'project.discussion_created', payload: { projectId: req.params.id, title: row.title } });
  res.status(201).json({ data: serializeDiscussion(row) });
}));

router.patch('/:discussionId', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  const existing = await db('pm_project_discussions').where({ id: req.params.discussionId, project_id: req.params.id }).first();
  if (!existing) throw new AppError('Discussion not found', 404);
  assertPermission(canManageTasks(membership) && (existing.author_id === req.user.sub || ['pinned', 'resolved'].some((f) => f in req.body)), 'You do not have permission to edit this discussion');

  const update = {};
  for (const field of ['title', 'body', 'pinned', 'resolved']) if (field in req.body) update[field] = req.body[field];
  const [updated] = await db('pm_project_discussions').where({ id: req.params.discussionId }).update(update).returning('*');
  res.json({ data: serializeDiscussion(updated) });
}));

router.get('/:discussionId/replies', asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.user.sub);
  const discussion = await db('pm_project_discussions').where({ id: req.params.discussionId, project_id: req.params.id }).first();
  if (!discussion) throw new AppError('Discussion not found', 404);
  const rows = await db('pm_discussion_replies').where({ discussion_id: req.params.discussionId }).orderBy('created_at', 'asc');
  res.json({ data: rows.map(serializeReply) });
}));

router.post('/:discussionId/replies', asyncHandler(async (req, res) => {
  const membership = await assertAccess(req.params.id, req.user.sub);
  assertPermission(canManageTasks(membership), 'You do not have permission to reply here');
  const discussion = await db('pm_project_discussions').where({ id: req.params.discussionId, project_id: req.params.id }).first();
  if (!discussion) throw new AppError('Discussion not found', 404);
  if (!req.body.body?.trim()) throw new AppError('Reply body is required', 422);

  const [row] = await db('pm_discussion_replies').insert({ discussion_id: req.params.discussionId, author_id: req.user.sub, body: req.body.body.trim() }).returning('*');
  await emitEvent({ aggregateType: 'pm_discussion', aggregateId: discussion.id, eventType: 'project.discussion_replied', payload: { projectId: req.params.id, replyId: row.id } });
  res.status(201).json({ data: serializeReply(row) });
}));

export default router;
