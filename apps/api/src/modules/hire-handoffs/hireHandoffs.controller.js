import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './hireHandoffs.service.js';

export const byApplicationHandler = asyncHandler(async (req, res) => {
  const record = await service.getByApplication(req.params.applicationId);
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
