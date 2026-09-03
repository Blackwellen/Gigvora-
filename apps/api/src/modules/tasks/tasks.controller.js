import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './tasks.service.js';

export const listUpcomingHandler = asyncHandler(async (req, res) => {
  const { status, limit } = req.query;
  const data = await service.listUpcoming(req.user.sub, {
    status: status || undefined,
    limit: Number(limit) || undefined,
  });
  res.json({ data });
});

export const updateStatusHandler = asyncHandler(async (req, res) => {
  const data = await service.updateStatus(req.user.sub, req.params.id, req.body.status);
  res.json({ data });
});
