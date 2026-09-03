import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './copilot.service.js';
import * as orchestrator from '../ai/copilotOrchestrator.service.js';

export const summaryHandler = asyncHandler(async (req, res) => {
  const data = await service.getContextSummary(req.user.sub);
  res.json({ data });
});

// Legacy deterministic v0 endpoint — kept for any existing caller, but new
// UI (Copilot Workspace, Chat Sessions, the upgraded bubble) uses the real
// LLM-backed thread endpoints below instead.
export const askHandler = asyncHandler(async (req, res) => {
  const data = await service.ask(req.user.sub, req.body.message || '');
  res.json({ data });
});

export const listThreadsHandler = asyncHandler(async (req, res) => {
  const data = await orchestrator.listThreads(req.user.sub);
  res.json({ data });
});

export const createThreadHandler = asyncHandler(async (req, res) => {
  const data = await orchestrator.createThread(req.user.sub, req.body?.title, req.body?.context);
  res.status(201).json({ data });
});

export const getThreadHandler = asyncHandler(async (req, res) => {
  const data = await orchestrator.getThread(req.user.sub, req.params.id);
  res.json({ data });
});

export const postThreadMessageHandler = asyncHandler(async (req, res) => {
  if (!req.body?.message) throw new AppError('message is required', 422);
  const data = await orchestrator.postMessage(req.user.sub, req.params.id, req.body.message);
  res.json({ data });
});

export const cancelThreadGenerationHandler = asyncHandler(async (req, res) => {
  await orchestrator.cancelGeneration(req.user.sub, req.params.id);
  res.status(204).send();
});
