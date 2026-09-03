import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './jobAlerts.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const records = await service.list(req.user.sub);
  res.json({ data: records });
});

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create(req.user.sub, req.body);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, req.user.sub, req.body);
  res.json({ data: record });
});

export const removeHandler = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.sub);
  res.status(204).send();
});
