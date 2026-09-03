import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './contacts.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const { limit, offset, search } = req.query;
  const records = await service.list(owner, { limit: Number(limit) || undefined, offset: Number(offset) || undefined, search });
  res.json({ data: records });
});

export const getHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.getById(owner, req.params.id);
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.create(owner, req.body);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const record = await service.update(owner, req.params.id, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  await service.remove(owner, req.params.id);
  res.status(204).send();
});

export const searchDuplicatesHandler = asyncHandler(async (req, res) => {
  const owner = service.resolveOwner(req);
  const records = await service.searchDuplicates(owner, req.query);
  res.json({ data: records });
});
