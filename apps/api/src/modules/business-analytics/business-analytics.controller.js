import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './business-analytics.service.js';

export const overviewHandler = asyncHandler(async (req, res) => {
  const result = await service.overview(req.workspaceContext?.companyId);
  res.json({ data: result });
});

export const trendsHandler = asyncHandler(async (req, res) => {
  const { metric, months } = req.query;
  const result = await service.trends(req.workspaceContext?.companyId, {
    metric,
    months: months ? Number(months) : undefined,
  });
  res.json({ data: result });
});
