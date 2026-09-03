import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as actions from './actions.service.js';
import * as tasks from './tasks.service.js';
import * as memory from './memory.service.js';
import * as personalisation from './personalisation.service.js';
import * as modelPreferences from './modelPreferences.service.js';
import * as usage from './aiUsage.service.js';
import * as audit from './aiAudit.service.js';
import * as prompts from './prompts.service.js';

// --- Actions / Approval Queue ---
export const createDraftReplyActionHandler = asyncHandler(async (req, res) => {
  const data = await actions.createDraftReplyAction(req.user.sub, req.body);
  res.status(201).json({ data });
});
export const listActionsHandler = asyncHandler(async (req, res) => {
  const data = await actions.listActions(req.user.sub, req.query.status);
  res.json({ data });
});
export const getActionHandler = asyncHandler(async (req, res) => {
  const data = await actions.getAction(req.user.sub, req.params.id);
  res.json({ data });
});
export const decideActionHandler = asyncHandler(async (req, res) => {
  if (!req.body.decision) throw new AppError('decision is required', 422);
  const data = await actions.decideApproval(req.user.sub, req.params.id, req.body.decision, req.body.reason);
  res.json({ data });
});

// --- AI Tasks ---
export const createTaskHandler = asyncHandler(async (req, res) => {
  const data = await tasks.createTask(req.user.sub, req.body);
  res.status(201).json({ data });
});
export const listTasksHandler = asyncHandler(async (req, res) => {
  const data = await tasks.listTasks(req.user.sub, { status: req.query.status, limit: Number(req.query.limit) || undefined, offset: Number(req.query.offset) || undefined });
  res.json({ data });
});
export const getTaskHandler = asyncHandler(async (req, res) => {
  const data = await tasks.getTask(req.user.sub, req.params.id);
  res.json({ data });
});
export const cancelTaskHandler = asyncHandler(async (req, res) => {
  const data = await tasks.cancelTask(req.user.sub, req.params.id);
  res.json({ data });
});

// --- Memory ---
export const listMemoriesHandler = asyncHandler(async (req, res) => {
  const data = await memory.listMemories(req.user.sub);
  res.json({ data });
});
export const createMemoryHandler = asyncHandler(async (req, res) => {
  const data = await memory.createMemory(req.user.sub, req.body);
  res.status(201).json({ data });
});
export const deleteMemoryHandler = asyncHandler(async (req, res) => {
  await memory.deleteMemory(req.user.sub, req.params.id);
  res.status(204).send();
});
export const resetMemoriesHandler = asyncHandler(async (req, res) => {
  const data = await memory.resetAllMemories(req.user.sub);
  res.json({ data });
});
export const exportMemoriesHandler = asyncHandler(async (req, res) => {
  const data = await memory.exportMemories(req.user.sub);
  res.json({ data });
});

// --- Personalisation ---
export const getPersonalisationHandler = asyncHandler(async (req, res) => {
  const data = await personalisation.getProfile(req.user.sub);
  res.json({ data });
});
export const updatePersonalisationHandler = asyncHandler(async (req, res) => {
  const data = await personalisation.updateProfile(req.user.sub, req.body || {});
  res.json({ data });
});

// --- Model preferences ---
export const listAvailableModelsHandler = asyncHandler(async (req, res) => {
  res.json({ data: modelPreferences.AVAILABLE_MODELS });
});
export const getModelPreferencesHandler = asyncHandler(async (req, res) => {
  const data = await modelPreferences.getPreferences(req.user.sub);
  res.json({ data });
});
export const updateModelPreferencesHandler = asyncHandler(async (req, res) => {
  const data = await modelPreferences.updatePreferences(req.user.sub, req.body || {});
  res.json({ data });
});

// --- Usage ---
export const getUsageOverviewHandler = asyncHandler(async (req, res) => {
  const data = await usage.getOverview(req.user.sub, { from: req.query.from, to: req.query.to });
  res.json({ data });
});

// --- Audit ---
export const listAuditEventsHandler = asyncHandler(async (req, res) => {
  const data = await audit.listAuditEvents(req.user.sub, {
    eventType: req.query.eventType,
    riskMin: req.query.riskMin ? Number(req.query.riskMin) : undefined,
    limit: Number(req.query.limit) || undefined,
    offset: Number(req.query.offset) || undefined,
  });
  res.json({ data });
});
export const getAuditEventHandler = asyncHandler(async (req, res) => {
  const data = await audit.getAuditEvent(req.user.sub, req.params.id);
  res.json({ data });
});
export const getComplianceSummaryHandler = asyncHandler(async (req, res) => {
  const data = await audit.getComplianceSummary(req.user.sub);
  res.json({ data });
});

// --- Prompt / Action Library ---
export const listPromptsHandler = asyncHandler(async (req, res) => {
  const data = await prompts.listPrompts(req.user.sub, { category: req.query.category });
  res.json({ data });
});
export const createPromptHandler = asyncHandler(async (req, res) => {
  const data = await prompts.createPrompt(req.user.sub, req.body);
  res.status(201).json({ data });
});
export const runPromptHandler = asyncHandler(async (req, res) => {
  const data = await prompts.runPrompt(req.user.sub, req.params.id, req.body?.context || {});
  res.json({ data });
});
