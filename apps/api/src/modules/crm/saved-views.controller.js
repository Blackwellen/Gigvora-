import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { resolveOwner } from './shared.js';
import * as service from './saved-views.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const result = await service.list(owner, req.user.sub, req.query);
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
  await service.remove(owner, req.user.sub, req.params.id);
  res.status(204).send();
});

export const duplicateHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.duplicate(owner, req.user.sub, req.params.id);
  res.status(201).json({ data: record });
});

export const setDefaultHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.setDefault(owner, req.user.sub, req.params.id);
  res.json({ data: record });
});
