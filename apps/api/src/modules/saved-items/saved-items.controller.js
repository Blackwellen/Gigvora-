import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './saved-items.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const data = await service.list(req.user.sub, { objectType: req.query.type });
  res.json({ data });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.user.sub, req.params.id);
  res.status(204).send();
});

export const pinHandler = asyncHandler(async (req, res) => {
  await service.togglePin(req.user.sub, req.params.id, Boolean(req.body.isPinned));
  res.status(204).send();
});
