import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './sessions.service.js';

export const createHandler = asyncHandler(async (req, res) => {
  const row = await service.create(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const row = await service.update(req.user.sub, req.params.id, req.body);
  res.json({ data: row });
});

export const getHandler = asyncHandler(async (req, res) => {
  const row = await service.getById(req.user.sub, req.params.id);
  res.json({ data: row });
});

export const listMineHandler = asyncHandler(async (req, res) => {
  const rows = await service.listMine(req.user.sub);
  res.json({ data: rows });
});

export const publishHandler = asyncHandler(async (req, res) => {
  const row = await service.publish(req.user.sub, req.params.id);
  res.json({ data: row });
});

export const removeHandler = asyncHandler(async (req, res) => {
  const row = await service.remove(req.user.sub, req.params.id);
  res.json({ data: row });
});
