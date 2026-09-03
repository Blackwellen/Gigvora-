import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './onboarding.service.js';
import * as checklistService from '../setup-checklist/setup-checklist.service.js';

export const getOrCreateSessionHandler = asyncHandler(async (req, res) => {
  const companyId = req.workspaceContext?.type === 'organization' ? req.workspaceContext.companyId : null;
  const session = await service.getOrCreateSession(req.user.sub, req.params.track, companyId);
  res.json({ data: session });
});

export const getSessionHandler = asyncHandler(async (req, res) => {
  const session = await service.getSession(req.user.sub, req.params.sessionId);
  res.json({ data: session });
});

export const saveStepHandler = asyncHandler(async (req, res) => {
  const result = await service.saveStep(req.user.sub, req.params.sessionId, req.params.stepKey, req.body);
  res.json({ data: result });
});

export const completeSessionHandler = asyncHandler(async (req, res) => {
  const session = await service.completeSession(req.user.sub, req.params.sessionId);
  res.json({ data: session });
});

export const abandonSessionHandler = asyncHandler(async (req, res) => {
  const session = await service.abandonSession(req.user.sub, req.params.sessionId);
  res.json({ data: session });
});

export const getTrackConfigHandler = asyncHandler(async (req, res) => {
  const config = await service.getTrackConfig(req.params.track);
  res.json({ data: config });
});

export const getRecommendationsHandler = asyncHandler(async (req, res) => {
  const owner = checklistService.resolveOwner(req);
  const items = await checklistService.getChecklist(owner, req.user.sub);
  const statusByKey = Object.fromEntries(items.map((i) => [i.itemKey, i.status]));
  const result = await service.getRecommendations(req.user.sub, statusByKey);
  res.json({ data: result });
});
