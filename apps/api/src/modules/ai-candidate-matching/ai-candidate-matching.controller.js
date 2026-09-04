import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './ai-candidate-matching.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { jobId, projectId, limit, offset } = req.query;
  const result = await service.list({ jobId, projectId, limit, offset });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const overrideHandler = asyncHandler(async (req, res) => {
  const row = await service.override(req.params.id, req.user.sub, req.body);
  res.json({ data: row });
});

export const scoreOnDemandHandler = asyncHandler(async (req, res) => {
  const row = await service.scoreOnDemand(req.body);
  res.status(201).json({ data: row });
});
