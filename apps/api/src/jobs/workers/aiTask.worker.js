import { Worker } from 'bullmq';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import * as messagingAi from '../../modules/ai/messagingAi.service.js';
import * as messagingService from '../../modules/messaging/messaging.service.js';
import { publishAiEvent } from '../../modules/ai/aiRealtime.js';
import * as governance from '../../modules/ai/aiGovernance.service.js';
import { notify } from '../../modules/notifications/notify.js';

const connection = { url: config.redis.url };

async function logEvent(taskId, eventType, metadata = {}) {
  await db('ai_task_events').insert({ task_id: taskId, event_type: eventType, metadata: JSON.stringify(metadata) });
}

async function setProgress(job, taskId, userId, progress) {
  await job.updateProgress(progress);
  await db('ai_tasks').where({ id: taskId }).update({ progress, updated_at: db.fn.now() });
  await publishAiEvent(userId, 'ai.task.progress', { taskId, progress });
}

/**
 * The one registered real task type: summarizes every conversation the user
 * currently has unread messages in, persisting each summary to the existing
 * conversation_summaries table (same table the on-demand "Thread summary"
 * button writes to) — this is genuinely useful background work (running it
 * synchronously for many conversations would be slow), not a placeholder.
 */
async function runBulkConversationSummary(job, task) {
  const userId = task.requested_by;
  const conversations = await messagingService.listConversations(userId);
  const unread = conversations.filter((c) => c.unreadCount > 0);

  const results = [];
  for (let i = 0; i < unread.length; i += 1) {
    const conv = unread[i];
    // eslint-disable-next-line no-await-in-loop
    const messages = await messagingService.getMessages(userId, conv.id, { limit: 30 });
    const recent = messages.map((m) => ({ senderName: m.senderName, body: m.body, isSelf: m.senderId === userId }));
    // eslint-disable-next-line no-await-in-loop
    const summary = await messagingAi.summarizeConversation(recent);

    if (summary.ok) {
      // eslint-disable-next-line no-await-in-loop
      const [row] = await db('conversation_summaries')
        .insert({ conversation_id: conv.id, summary: summary.summary, message_range_end_id: messages.length ? messages[messages.length - 1].id : null, model: summary.model })
        .returning('*');
      results.push({ conversationId: conv.id, summaryId: row.id, ok: true });
      // eslint-disable-next-line no-await-in-loop
      await governance.recordUsage({ userId, taskId: task.id, model: summary.model, inputTokens: summary.usage?.prompt_tokens || 0, outputTokens: summary.usage?.completion_tokens || 0, success: true });
    } else {
      results.push({ conversationId: conv.id, ok: false, reason: summary.model ? 'generation_failed' : 'ai_unavailable' });
    }

    // eslint-disable-next-line no-await-in-loop
    await setProgress(job, task.id, userId, Math.round(((i + 1) / Math.max(1, unread.length)) * 100));
  }

  return { summarizedCount: results.filter((r) => r.ok).length, totalConversations: unread.length, results };
}

const TASK_EXECUTORS = {
  bulk_conversation_summary: runBulkConversationSummary,
};

export const aiTaskWorker = new Worker(
  'ai-task',
  async (job) => {
    const { taskId } = job.data;
    const task = await db('ai_tasks').where({ id: taskId }).first();
    if (!task) return; // idempotent no-op if the task row is gone (e.g. cancelled+removed)
    if (task.status === 'cancelled') return;

    await db('ai_tasks').where({ id: taskId }).update({ status: 'running', started_at: db.fn.now(), updated_at: db.fn.now() });
    await logEvent(taskId, 'started');
    await publishAiEvent(task.requested_by, 'ai.task.started', { taskId });

    const executor = TASK_EXECUTORS[task.task_type];
    if (!executor) throw new Error(`No executor registered for task_type "${task.task_type}"`);

    const output = await executor(job, task);

    await db('ai_tasks').where({ id: taskId }).update({ status: 'completed', progress: 100, output_ref: JSON.stringify(output), completed_at: db.fn.now(), updated_at: db.fn.now() });
    await logEvent(taskId, 'completed', { output });
    await publishAiEvent(task.requested_by, 'ai.task.completed', { taskId, output });
    await notify({ userId: task.requested_by, type: 'ai.task.completed', payload: { taskType: task.task_type, deepLink: '/app/ai-tasks' } });
  },
  { connection, concurrency: 2 }
);

aiTaskWorker.on('failed', async (job, err) => {
  const { taskId } = job?.data || {};
  if (!taskId) return;
  const task = await db('ai_tasks').where({ id: taskId }).first();
  if (!task) return;
  await db('ai_tasks').where({ id: taskId }).update({ status: 'failed', failed_at: db.fn.now(), updated_at: db.fn.now(), output_ref: JSON.stringify({ error: err.message }) });
  await logEvent(taskId, 'failed', { error: err.message });
  await publishAiEvent(task.requested_by, 'ai.task.failed', { taskId, reason: err.message });
  await notify({ userId: task.requested_by, type: 'ai.task.failed', payload: { taskType: task.task_type, deepLink: '/app/ai-tasks' } });
  // eslint-disable-next-line no-console
  console.error(`[worker] ai-task job ${job?.id} failed`, err.message);
});
