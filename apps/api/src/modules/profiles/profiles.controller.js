import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './profiles.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const records = await service.list({ limit: Number(limit) || undefined, offset: Number(offset) || undefined });
  res.json({ data: records });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id);
  res.json({ data: record });
});

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create(req.body);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});
