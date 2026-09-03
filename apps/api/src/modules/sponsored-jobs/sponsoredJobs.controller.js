import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './sponsoredJobs.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const result = await service.list({ companyId: req.workspaceContext?.companyId, limit, offset });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.id);
  res.json({ data: record });
});

export const byJobHandler = asyncHandler(async (req, res) => {
  const records = await service.listByJob(req.params.jobId);
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

export const eventsHandler = asyncHandler(async (req, res) => {
  const result = await service.events(req.params.id);
  res.json({ data: result });
});
