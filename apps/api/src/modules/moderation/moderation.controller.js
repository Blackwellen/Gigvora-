import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './moderation.service.js';

export const listHeldHandler = asyncHandler(async (req, res) => {
  const { objectType, limit, offset } = req.query;
  const data = await service.listHeldContent({ objectType, limit: Number(limit) || undefined, offset: Number(offset) || undefined });
  res.json({ data });
});

export const approveHandler = asyncHandler(async (req, res) => {
  await service.approveContent(req.user.sub, req.params.objectId, req.body?.reason || null);
  res.status(204).send();
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.removeContent(req.user.sub, req.params.objectId, req.body?.reason || null);
  res.status(204).send();
});

export const actionsHandler = asyncHandler(async (req, res) => {
  const data = await service.listActionsForObject(req.params.objectId);
  res.json({ data });
});
