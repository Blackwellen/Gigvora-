import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { resolveOwner } from './shared.js';
import * as service from './accounts.service.js';

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

export const updateHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.update(owner, req.user.sub, req.params.id, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.remove(owner, req.user.sub, req.params.id);
  res.json({ data: record });
});

export const relatedHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const result = await service.getRelated(owner, req.params.id);
  res.json({ data: result });
});

export const buyingGroupHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const result = await service.getBuyingGroup(owner, req.params.id);
  res.json({ data: result });
});
