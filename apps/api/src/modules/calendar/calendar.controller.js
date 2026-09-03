import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './calendar.service.js';

export const listUpcomingHandler = asyncHandler(async (req, res) => {
  const { from, to, limit } = req.query;
  const data = await service.listUpcoming(req.user.sub, {
    from: from || undefined,
    to: to || undefined,
    limit: Number(limit) || undefined,
  });
  res.json({ data });
});
