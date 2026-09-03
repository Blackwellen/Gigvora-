import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import * as messagingAi from './messagingAi.service.js';
import * as messagingService from '../messaging/messaging.service.js';

// Real registered executable actions only — a prompt's `actionType` must
// match one of these or "Run" just inserts the template text client-side
// instead of pretending to execute something. Each of these calls an
// already-real, already-tested service function; there is no separate,
// duplicate "action" implementation here.
const ACTION_EXECUTORS = {
  summarize_conversation: async (userId, { conversationId }) => {
    if (!conversationId) throw new AppError('conversationId is required for this action', 422);
    const messages = await messagingService.getMessages(userId, conversationId, { limit: 30 });
    const recent = messages.map((m) => ({ senderName: m.senderName, body: m.body, isSelf: m.senderId === userId }));
    return messagingAi.summarizeConversation(recent);
  },
  generate_smart_replies: async (userId, { conversationId }) => {
    if (!conversationId) throw new AppError('conversationId is required for this action', 422);
    const messages = await messagingService.getMessages(userId, conversationId, { limit: 10 });
    const recent = messages.map((m) => ({ senderName: m.senderName, body: m.body, isSelf: m.senderId === userId }));
    return messagingAi.generateSmartReplies(recent);
  },
};

export const REGISTERED_ACTION_TYPES = Object.keys(ACTION_EXECUTORS);

export async function listPrompts(userId, { category } = {}) {
  let query = db('ai_prompts').where((qb) => qb.where({ is_public: true }).orWhere({ owner_user_id: userId }));
  if (category) query = query.andWhere('category', category);
  const rows = await query.orderBy('usage_count', 'desc');
  return rows.map(mapPrompt);
}

export async function createPrompt(userId, { title, description, category = 'general', promptTemplate, actionType, tags = [], isPublic = false }) {
  if (!title?.trim() || !promptTemplate?.trim()) throw new AppError('title and promptTemplate are required', 422);
  if (actionType && !REGISTERED_ACTION_TYPES.includes(actionType)) throw new AppError(`Unknown actionType "${actionType}"`, 422);

  const [row] = await db('ai_prompts')
    .insert({ owner_user_id: userId, title: title.trim(), description: description || null, category, prompt_template: promptTemplate.trim(), action_type: actionType || null, tags: JSON.stringify(tags), is_public: Boolean(isPublic) })
    .returning('*');
  return mapPrompt(row);
}

export async function runPrompt(userId, promptId, context = {}) {
  const prompt = await db('ai_prompts').where({ id: promptId }).first();
  if (!prompt) throw new AppError('Prompt not found', 404);
  if (!prompt.is_public && prompt.owner_user_id !== userId) throw new AppError('Prompt not found', 404);

  await db('ai_prompts').where({ id: promptId }).increment('usage_count', 1);

  if (prompt.action_type && ACTION_EXECUTORS[prompt.action_type]) {
    const result = await ACTION_EXECUTORS[prompt.action_type](userId, context);
    return { mode: 'executed', actionType: prompt.action_type, result };
  }

  return { mode: 'template', template: prompt.prompt_template };
}

function mapPrompt(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    promptTemplate: r.prompt_template,
    actionType: r.action_type,
    tags: r.tags,
    usageCount: r.usage_count,
    ratingAvg: r.rating_avg === null ? null : Number(r.rating_avg),
    isPublic: r.is_public,
    ownerUserId: r.owner_user_id,
    createdAt: r.created_at,
  };
}
