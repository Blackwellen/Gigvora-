import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { getHome } from './recruiter-pro-home.service.js';

export const getHomeHandler = asyncHandler(async (req, res) => {
  const data = await getHome(req.user.sub);
  res.json({ data });
});
