import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './recruiter-upgrade.service.js';

export const getComparisonHandler = asyncHandler(async (req, res) => {
  const data = await service.getComparison(req.user.sub);
  res.json({ data });
});

export const listMyRequestsHandler = asyncHandler(async (req, res) => {
  const rows = await service.listMyRequests(req.user.sub);
  res.json({ data: rows, meta: { total: rows.length } });
});

export const createRequestHandler = asyncHandler(async (req, res) => {
  const row = await service.createRequest(req.user.sub, req.body);
  res.status(201).json({ data: row });
});
