import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { resolveOwner } from './shared.js';
import * as service from './activities.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const result = await service.list(owner, req.query);
  res.json({ data: result.data, meta: { total: result.total } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.getById(owner, req.params.id);
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.create(owner, req.user.sub, req.body);
  res.status(201).json({ data: record });
});
