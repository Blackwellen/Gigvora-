import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './workspaces.service.js';

export const listContextsHandler = asyncHandler(async (req, res) => {
  const data = await service.listContexts(req.user.sub);
  res.json({ data });
});

export const switchContextHandler = asyncHandler(async (req, res) => {
  const data = await service.switchContext(req.user.sub, req.body.companyId);
  res.json({ data });
});

export const starContextHandler = asyncHandler(async (req, res) => {
  await service.starContext(req.user.sub, req.params.companyId, Boolean(req.body.isStarred));
  res.status(204).send();
});

export const createWorkspaceHandler = asyncHandler(async (req, res) => {
  const data = await service.createWorkspace(req.user.sub, req.body);
  res.status(201).json({ data });
});
