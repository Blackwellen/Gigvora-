import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './interviews.service.js';

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id);
  res.json({ data: record });
});

export const byApplicationHandler = asyncHandler(async (req, res) => {
  const records = await service.listByApplication(req.params.applicationId);
  res.json({ data: records });
});

export const createHandler = asyncHandler(async (req, res) => {
  const record = await service.create(req.body);
  res.status(201).json({ data: record });
});

export const updateHandler = asyncHandler(async (req, res) => {
  const record = await service.update(req.params.id, req.body);
  res.json({ data: record });
});

export const scorecardHandler = asyncHandler(async (req, res) => {
  const record = await service.submitScorecard(req.params.id, req.user.sub, req.body);
  res.status(201).json({ data: record });
});
