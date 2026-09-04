import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './candidate-saves.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { status, limit, offset } = req.query;
  const result = await service.list(req.user.sub, { status, limit, offset });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const saveHandler = asyncHandler(async (req, res) => {
  const row = await service.save(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const row = await service.update(req.user.sub, req.params.id, req.body);
  res.json({ data: row });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.user.sub, req.params.id);
  res.status(204).send();
});
