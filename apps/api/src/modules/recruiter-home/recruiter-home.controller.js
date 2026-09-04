import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './recruiter-home.service.js';

export const getHomeHandler = asyncHandler(async (req, res) => {
  const data = await service.getHome(req.user.sub);
  res.json({ data });
});
