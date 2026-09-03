import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './activity.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const { tab, limit, offset } = req.query;
  const data = await service.listActivity(req.user.sub, { tab, limit: Number(limit) || undefined, offset: Number(offset) || undefined });
  res.json({ data });
});
