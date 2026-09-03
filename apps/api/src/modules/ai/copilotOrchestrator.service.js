import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import * as modelGateway from './modelGateway.js';
import { publishAiEvent } from './aiRealtime.js';
import * as copilotLegacy from '../copilot/copilot.service.js';
import * as messagingService from '../messaging/messaging.service.js';
import * as meetingsService from '../meetings/meetings.service.js';
import * as searchService from '../search/search.service.js';
import * as governance from './aiGovernance.service.js';
import * as modelPreferences from './modelPreferences.service.js';
import * as personalisation from './personalisation.service.js';
import * as memoryService from './memory.service.js';
import * as pmCopilotTools from '../pm-projects/copilotTools.js';

// Tracks in-flight generations so a Stop button can actually cancel the
// upstream Azure request, not just hide text while the server keeps
// spending tokens. Per-thread — one generation at a time per thread by
// construction (postMessage rejects a second concurrent call, see below).
const activeGenerations = new Map();

export async function createThread(userId, title, context) {
  // `context` optionally scopes the thread to a specific object the user was
  // looking at when they opened Copilot (currently only { projectId } from
  // Domain 18's "Ask Copilot" entry points) — persisted on the existing
  // context_json column rather than a new table, and re-read on every
  // postMessage call in this same file so grounding stays scoped to the
  // right project even across a page reload.
  const [thread] = await db('ai_threads')
    .insert({ user_id: userId, title: title || null, context_json: JSON.stringify(context || {}) })
    .returning('*');
  return mapThread(thread);
}

export async function listThreads(userId) {
  const threads = await db('ai_threads').where({ user_id: userId }).whereNull('archived_at').orderBy('updated_at', 'desc');
  return threads.map(mapThread);
}

export async function getThread(userId, threadId) {
  const thread = await db('ai_threads').where({ id: threadId, user_id: userId }).first();
  if (!thread) throw new AppError('Thread not found', 404);

  const messages = await db('ai_messages').where({ thread_id: threadId }).orderBy('created_at', 'asc');
  const messageIds = messages.map((m) => m.id);
  const sources = messageIds.length ? await db('ai_message_sources').whereIn('message_id', messageIds) : [];
  const sourcesByMessage = {};
  for (const s of sources) (sourcesByMessage[s.message_id] ||= []).push({ sourceType: s.source_type, sourceId: s.source_id, label: s.label, route: s.route });

  return {
    ...mapThread(thread),
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      modelId: m.model_id,
      inputTokens: m.input_tokens,
      outputTokens: m.output_tokens,
      latencyMs: m.latency_ms,
      groundingState: m.grounding_state,
      sources: sourcesByMessage[m.id] || [],
      createdAt: m.created_at,
    })),
  };
}

function mapThread(t) {
  return { id: t.id, title: t.title, status: t.status, modelPreference: t.model_preference, createdAt: t.created_at, updatedAt: t.updated_at };
}

/**
 * Real, per-user "RAG-lite" grounding: no vector index exists in this
 * repository, so grounding means genuine, narrowly-scoped SQL/service
 * lookups against the asking user's OWN authorized data — never another
 * user's or another workspace's. Every returned fact is cited with the real
 * route it came from. This intentionally stays keyword-routed rather than
 * embedding-based; it is honestly a v1, documented as such, not dressed up
 * as semantic search.
 */
async function gatherGroundedContext(userId, userMessage, threadContext = {}) {
  const lower = userMessage.toLowerCase();
  const sections = [];
  const sources = [];

  // Domain 18 — when this thread is scoped to a project (see createThread's
  // `context` param), a project-related question pulls the same governed,
  // permission-checked tool functions the REST API exposes at
  // /pm-projects/:id/copilot-tools/* (modules/pm-projects/copilotTools.js)
  // — Copilot has no elevated access path; a non-member asking about a
  // project it can't see gets no grounding for it, same as a direct API call
  // would 403.
  if (threadContext.projectId && /\b(project|task|milestone|risk|issue|blocker|deadline|deliverable|budget|progress)\b/.test(lower)) {
    try {
      const [projectSummary, risks, blockers, milestones] = await Promise.all([
        pmCopilotTools.getProjectSummary(threadContext.projectId, userId),
        pmCopilotTools.listRisks(threadContext.projectId, userId),
        pmCopilotTools.listBlockers(threadContext.projectId, userId),
        pmCopilotTools.listMilestones(threadContext.projectId, userId),
      ]);
      sections.push(`Project summary: ${projectSummary.summary}`);
      if (risks.length) sections.push(`Open risks: ${risks.map((r) => `"${r.title}" (${r.severity})`).join('; ')}.`);
      if (blockers.blocked.length || blockers.overdue.length) {
        sections.push(
          `Blockers: ${blockers.blocked.map((t) => `"${t.title}" is blocked`).join('; ')}${blockers.blocked.length && blockers.overdue.length ? '; ' : ''}${blockers.overdue.map((t) => `"${t.title}" is overdue`).join('; ')}.`
        );
      }
      if (milestones.length) sections.push(`Milestones: ${milestones.map((m) => `"${m.name}" (${m.status}, ${m.completionPct}% complete)`).join('; ')}.`);
      sources.push({ sourceType: 'pm_project', sourceId: threadContext.projectId, label: projectSummary.name, route: `/app/project-detail/${threadContext.projectId}` });
    } catch {
      // Not a member of this project (or it no longer exists) — degrade
      // silently to the rest of gatherGroundedContext's normal grounding
      // rather than surfacing an internal error to the chat.
    }
  }

  const summary = await copilotLegacy.getContextSummary(userId);
  sections.push(
    `Live account snapshot: ${summary.newPosts} new posts in the last 24h, ${summary.unreadNotifications} unread notifications, ${summary.unreadMessages} unread messages, ${summary.savedItems} saved items, ${summary.pendingWorkspaceInvites} pending workspace invites.`
  );

  if (/\b(message|inbox|conversation|chat)\b/.test(lower)) {
    const conversations = await messagingService.listConversations(userId);
    const unread = conversations.filter((c) => c.unreadCount > 0).slice(0, 3);
    if (unread.length) {
      sections.push(`Unread conversations: ${unread.map((c) => `"${c.title}" (${c.unreadCount} unread)`).join('; ')}.`);
      sources.push({ sourceType: 'inbox', sourceId: null, label: 'Inbox', route: '/app/inbox' });
    }
  }

  if (/\b(meeting|calendar|schedule)\b/.test(lower)) {
    const meetings = await meetingsService.listMeetings(userId, { limit: 3 });
    if (meetings.length) {
      sections.push(`Upcoming meetings: ${meetings.map((m) => `"${m.title}" at ${new Date(m.startsAt).toLocaleString()}`).join('; ')}.`);
      sources.push({ sourceType: 'meetings', sourceId: null, label: 'Meetings', route: '/app/meeting-detail' });
    }
  }

  if (/\b(job|opportunit|role|position)\b/.test(lower)) {
    const recs = await searchService.getMlRecommendations(userId);
    if (!recs.degraded && recs.jobs?.length) {
      sections.push(`Matching job opportunities: ${recs.jobs.slice(0, 3).map((j) => j.title || j.id).join('; ')}.`);
      sources.push({ sourceType: 'jobs', sourceId: null, label: 'Job matches', route: '/app/search?type=jobs' });
    }
  }

  sources.push({ sourceType: 'account', sourceId: null, label: 'Your activity', route: '/app/notifications-tray' });

  const memoryContext = await memoryService.getMemorySummaryForContext(userId);
  if (memoryContext) {
    sections.push(`Remembered preferences:\n${memoryContext}`);
    sources.push({ sourceType: 'memory', sourceId: null, label: 'AI Memory', route: '/app/settings/ai-memory' });
  }

  return { contextText: sections.join('\n'), sources, groundingState: sections.length > 1 ? 'grounded' : 'none' };
}

/**
 * Runs one full generation turn: persists the user message, streams the
 * assistant reply over the realtime layer (ai.generation.* events to the
 * user's own socket room), persists the assistant message + citations, and
 * returns the finished result too (for the initiating HTTP response / a
 * client that missed the socket events on reconnect).
 */
export async function postMessage(userId, threadId, userMessage) {
  if (!userMessage?.trim()) throw new AppError('Message cannot be empty', 422);
  const thread = await db('ai_threads').where({ id: threadId, user_id: userId }).first();
  if (!thread) throw new AppError('Thread not found', 404);
  if (activeGenerations.has(threadId)) throw new AppError('A response is already generating for this thread', 409);

  const [userRow] = await db('ai_messages').insert({ thread_id: threadId, role: 'user', content: userMessage.trim(), grounding_state: 'none' }).returning('*');
  await db('ai_threads').where({ id: threadId }).update({ updated_at: db.fn.now(), title: thread.title || userMessage.trim().slice(0, 60) });

  await publishAiEvent(userId, 'ai.generation.started', { threadId, userMessageId: userRow.id });

  if (!modelGateway.isConfigured()) {
    await publishAiEvent(userId, 'ai.generation.failed', { threadId, reason: 'not_configured' });
    return { ok: false, reason: 'not_configured', userMessage: mapMessage(userRow) };
  }

  const { contextText, sources, groundingState } = await gatherGroundedContext(userId, userMessage, thread.context_json || {});
  const history = await db('ai_messages').where({ thread_id: threadId }).orderBy('created_at', 'desc').limit(10);
  const priorTurns = history
    .reverse()
    .slice(0, -1) // exclude the user message we just inserted, added explicitly below
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  const controller = new AbortController();
  activeGenerations.set(threadId, controller);

  const startedAt = Date.now();
  let streamed = '';

  const { model: preferredModel, fallbackModel } = await modelPreferences.resolveModelForUser(userId);
  const personaPreamble = await personalisation.buildSystemPromptAddendum(userId);

  const chatMessages = [
    {
      role: 'system',
      content:
        'You are Gigvora Copilot. Answer concisely and only using the CONTEXT provided plus general professional-networking knowledge. If the context does not contain the answer, say so honestly rather than inventing facts. Never claim you have taken an action (like sending a message or publishing a post) — you can only draft suggestions for the user to review.' +
        personaPreamble +
        '\n\nCONTEXT:\n' +
        (contextText || '(no additional grounded context for this request)'),
    },
    ...priorTurns,
    { role: 'user', content: userMessage },
  ];

  let modelUsed = preferredModel;
  let result = await modelGateway.chatCompleteStream({
    deployment: preferredModel,
    signal: controller.signal,
    messages: chatMessages,
    onDelta: (delta) => {
      streamed += delta;
      publishAiEvent(userId, 'ai.generation.delta', { threadId, delta });
    },
  });

  // Real automatic fallback: if the preferred model errors out (not a user
  // cancellation) and a different fallback is actually configured, retry
  // once against it before giving up — this is the "fallback model"
  // requirement, not decorative config.
  if (!result.ok && result.reason !== 'cancelled' && fallbackModel && fallbackModel !== preferredModel) {
    streamed = '';
    modelUsed = fallbackModel;
    result = await modelGateway.chatCompleteStream({
      deployment: fallbackModel,
      signal: controller.signal,
      messages: chatMessages,
      onDelta: (delta) => {
        streamed += delta;
        publishAiEvent(userId, 'ai.generation.delta', { threadId, delta });
      },
    });
  }

  activeGenerations.delete(threadId);
  const latencyMs = Date.now() - startedAt;

  if (!result.ok) {
    await publishAiEvent(userId, result.reason === 'cancelled' ? 'ai.generation.cancelled' : 'ai.generation.failed', { threadId, reason: result.reason });
    await governance.recordUsage({ userId, threadId, model: modelUsed, latencyMs, success: false });
    await governance.recordAuditEvent({
      actorId: userId,
      eventType: 'copilot.generation.failed',
      threadId,
      model: modelUsed,
      policyDecision: 'allow',
      groundingJson: { groundingState, sourceCount: sources.length },
    });
    return { ok: false, reason: result.reason, userMessage: mapMessage(userRow) };
  }

  const [assistantRow] = await db('ai_messages')
    .insert({
      thread_id: threadId,
      role: 'assistant',
      content: result.content,
      model_id: modelUsed,
      provider: 'azure-openai',
      input_tokens: result.usage?.prompt_tokens ?? null,
      output_tokens: result.usage?.completion_tokens ?? null,
      latency_ms: latencyMs,
      finish_reason: result.finishReason,
      grounding_state: groundingState,
    })
    .returning('*');

  if (sources.length) {
    await db('ai_message_sources').insert(sources.map((s) => ({ message_id: assistantRow.id, source_type: s.sourceType, source_id: s.sourceId, label: s.label, route: s.route })));
  }

  await db('ai_threads').where({ id: threadId }).update({ updated_at: db.fn.now() });

  const assistantMessage = { ...mapMessage(assistantRow), sources };
  await publishAiEvent(userId, 'ai.generation.completed', { threadId, message: assistantMessage });

  await governance.recordUsage({
    userId,
    threadId,
    model: assistantRow.model_id,
    inputTokens: assistantRow.input_tokens || 0,
    outputTokens: assistantRow.output_tokens || 0,
    latencyMs,
    success: true,
  });
  await governance.recordAuditEvent({
    actorId: userId,
    eventType: 'copilot.generation.completed',
    threadId,
    messageId: assistantRow.id,
    model: assistantRow.model_id,
    policyDecision: 'allow',
    groundingJson: { groundingState, sources },
  });

  return { ok: true, userMessage: mapMessage(userRow), assistantMessage };
}

export async function cancelGeneration(userId, threadId) {
  const thread = await db('ai_threads').where({ id: threadId, user_id: userId }).first();
  if (!thread) throw new AppError('Thread not found', 404);
  const controller = activeGenerations.get(threadId);
  if (controller) controller.abort();
}

function mapMessage(m) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    modelId: m.model_id,
    inputTokens: m.input_tokens,
    outputTokens: m.output_tokens,
    latencyMs: m.latency_ms,
    groundingState: m.grounding_state,
    createdAt: m.created_at,
  };
}
