import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './outreach-templates.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const rows = await service.list(req.user.sub, { channel: req.query.channel, category: req.query.category });
  res.json({ data: rows, meta: { total: rows.length } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const row = await service.getById(req.user.sub, req.params.id);
  res.json({ data: row });
});

export const createHandler = asyncHandler(async (req, res) => {
  const row = await service.create(req.user.sub, req.body);
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

export const useHandler = asyncHandler(async (req, res) => {
  const row = await service.use(req.user.sub, req.params.id);
  res.json({ data: row });
});
