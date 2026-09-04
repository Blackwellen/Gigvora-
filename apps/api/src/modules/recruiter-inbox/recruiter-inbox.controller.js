import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './recruiter-inbox.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const rows = await service.list(req.user.sub, { status: req.query.status });
  res.json({ data: rows, meta: { total: rows.length } });
});

export const startThreadHandler = asyncHandler(async (req, res) => {
  const row = await service.startThread(req.user.sub, req.body);
  res.status(201).json({ data: row });
});

export const updateStatusHandler = asyncHandler(async (req, res) => {
  const row = await service.updateStatus(req.user.sub, req.params.id, req.body.status);
  res.json({ data: row });
});
