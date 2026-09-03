import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { db } from '../../db/connection.js';
import * as service from './messaging.service.js';
import * as messageRequestsService from './messageRequests.service.js';
import * as messagingAi from '../ai/messagingAi.service.js';
import * as aiGovernance from '../ai/aiGovernance.service.js';
import { config } from '../../config/index.js';

export const listHandler = asyncHandler(async (req, res) => {
  const data = await service.listConversations(req.user.sub, { contextType: req.query.context || undefined });
  res.json({ data });
});

// Context -> required plan feature. `null` means no gate (Project Messages
// is available on every plan). Sales/Enterprise stay server-enforced here
// regardless of what the client believes it's entitled to.
const CONTEXT_FEATURE_GATE = {
  project: null,
  recruiter: 'recruiter_dashboard',
  sales: 'sales_navigator',
  enterprise: 'enterprise_connect',
};

export const listByContextHandler = asyncHandler(async (req, res) => {
  const contextType = req.params.contextType;
  const requiredFeature = CONTEXT_FEATURE_GATE[contextType];
  if (requiredFeature === undefined) throw new AppError('Unknown conversation context', 404);

  if (requiredFeature) {
    const { getUserEntitlements } = await import('../billing/billing.service.js');
    const { hasFeature } = await import('../billing/entitlements.js');
    const entitlements = await getUserEntitlements(req.user.sub);
    if (!hasFeature(entitlements.features, requiredFeature)) {
      throw new AppError('This feature requires a plan upgrade', 403, { feature: requiredFeature, planKey: entitlements.planKey });
    }
  }

  const data = await service.listConversations(req.user.sub, { contextType });
  res.json({ data });
});

export const unreadCountHandler = asyncHandler(async (req, res) => {
  const count = await service.getUnreadCount(req.user.sub);
  res.json({ data: { count } });
});

export const listGroupsHandler = asyncHandler(async (req, res) => {
  const data = await service.listGroupChats(req.user.sub);
  res.json({ data });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id);
  res.json({ data: record });
});

export const startDirectHandler = asyncHandler(async (req, res) => {
  if (!req.body.userId) throw new AppError('userId is required', 422);
  const result = await messageRequestsService.createOrRouteDirectConversation(req.user.sub, req.body.userId, req.body.firstMessage);
  res.status(201).json({ data: result });
});

export const createConversationHandler = asyncHandler(async (req, res) => {
  const { type, title, topic, isPublic, participantIds } = req.body;
  const record = await service.createConversation(req.user.sub, { type, title, topic, isPublic, participantIds });
  res.status(201).json({ data: record });
});

export const listChannelsHandler = asyncHandler(async (req, res) => {
  const data = await service.listPublicChannels(req.user.sub, {
    limit: Number(req.query.limit) || undefined,
    offset: Number(req.query.offset) || undefined,
  });
  res.json({ data });
});

export const joinChannelHandler = asyncHandler(async (req, res) => {
  const record = await service.joinChannel(req.user.sub, req.params.id);
  res.json({ data: record });
});

export const getMessagesHandler = asyncHandler(async (req, res) => {
  const data = await service.getMessages(req.user.sub, req.params.id, { limit: Number(req.query.limit) || undefined });
  res.json({ data });
});

export const sendMessageHandler = asyncHandler(async (req, res) => {
  const { body, attachments, clientMessageId, replyToMessageId } = req.body;
  const data = await service.sendMessage(req.user.sub, req.params.id, { body, attachments, clientMessageId, replyToMessageId });
  res.status(201).json({ data });
});

export const markReadHandler = asyncHandler(async (req, res) => {
  await service.markConversationRead(req.user.sub, req.params.id);
  res.status(204).send();
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

export const addReactionHandler = asyncHandler(async (req, res) => {
  if (!req.body.reaction) throw new AppError('reaction is required', 422);
  const data = await service.addReaction(req.user.sub, req.params.messageId, req.body.reaction);
  res.status(201).json({ data });
});

export const removeReactionHandler = asyncHandler(async (req, res) => {
  const data = await service.removeReaction(req.user.sub, req.params.messageId, req.params.reaction);
  res.json({ data });
});

export const pinMessageHandler = asyncHandler(async (req, res) => {
  const data = await service.pinMessage(req.user.sub, req.params.id, req.params.messageId);
  res.status(201).json({ data });
});

export const unpinMessageHandler = asyncHandler(async (req, res) => {
  await service.unpinMessage(req.user.sub, req.params.id, req.params.messageId);
  res.status(204).send();
});

export const getPinsHandler = asyncHandler(async (req, res) => {
  const data = await service.getPinnedMessages(req.params.id);
  res.json({ data });
});

export const updateMembershipHandler = asyncHandler(async (req, res) => {
  const { isPinned, isMuted } = req.body;
  const data = await service.setConversationParticipantFlags(req.user.sub, req.params.id, { isPinned, isMuted });
  res.json({ data });
});

export const createPollHandler = asyncHandler(async (req, res) => {
  const { question, options, closesAt } = req.body;
  const data = await service.createPoll(req.user.sub, req.params.id, { question, options, closesAt });
  res.status(201).json({ data });
});

export const votePollHandler = asyncHandler(async (req, res) => {
  const data = await service.votePoll(req.user.sub, req.params.pollId, req.body.optionIndex);
  res.json({ data });
});

export const getPollHandler = asyncHandler(async (req, res) => {
  const data = await service.getPollResults(req.params.pollId);
  res.json({ data });
});

export const smartRepliesHandler = asyncHandler(async (req, res) => {
  const messages = await service.getMessages(req.user.sub, req.params.id, { limit: 10 });
  const recent = messages.map((m) => ({ senderName: m.senderName, body: m.body, isSelf: m.senderId === req.user.sub }));
  const result = await messagingAi.generateSmartReplies(recent);
  if (result.usage) {
    await aiGovernance.recordUsage({ userId: req.user.sub, model: result.model, inputTokens: result.usage.prompt_tokens || 0, outputTokens: result.usage.completion_tokens || 0, success: result.ok });
    await aiGovernance.recordAuditEvent({ actorId: req.user.sub, eventType: 'messaging.smart_replies', model: result.model, policyDecision: 'allow', groundingJson: { conversationId: req.params.id } });
  }
  res.json({ data: result });
});

export const summarizeHandler = asyncHandler(async (req, res) => {
  const messages = await service.getMessages(req.user.sub, req.params.id, { limit: 30 });
  const recent = messages.map((m) => ({ senderName: m.senderName, body: m.body, isSelf: m.senderId === req.user.sub }));
  const result = await messagingAi.summarizeConversation(recent);

  if (result.usage) {
    await aiGovernance.recordUsage({ userId: req.user.sub, model: result.model, inputTokens: result.usage.prompt_tokens || 0, outputTokens: result.usage.completion_tokens || 0, success: result.ok });
    await aiGovernance.recordAuditEvent({ actorId: req.user.sub, eventType: 'messaging.conversation_summary', model: result.model, policyDecision: 'allow', groundingJson: { conversationId: req.params.id } });
  }

  if (!result.ok) {
    return res.json({ data: { ok: false } });
  }

  const [row] = await db('conversation_summaries')
    .insert({
      conversation_id: req.params.id,
      summary: result.summary,
      message_range_end_id: messages.length ? messages[messages.length - 1].id : null,
      model: config.ai.deploymentDefault,
    })
    .returning('*');

  res.json({ data: { ok: true, summary: row } });
});

export const latestSummaryHandler = asyncHandler(async (req, res) => {
  await service.getMessages(req.user.sub, req.params.id, { limit: 1 }); // membership check
  const row = await db('conversation_summaries').where({ conversation_id: req.params.id }).orderBy('generated_at', 'desc').first();
  res.json({ data: row || null });
});

export const conversationDetailHandler = asyncHandler(async (req, res) => {
  const data = await service.getConversationDetail(req.user.sub, req.params.id);
  res.json({ data });
});
