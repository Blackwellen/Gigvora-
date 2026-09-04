import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './recruiter-analytics.service.js';

export const getOverviewHandler = asyncHandler(async (req, res) => {
  const data = await service.getOverview(req.user.sub);
  res.json({ data });
});
