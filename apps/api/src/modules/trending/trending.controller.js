import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './trending.service.js';

export const getTrendingHandler = asyncHandler(async (req, res) => {
  const { window, type } = req.query;
  const data = await service.getTrending(req.user.sub, { window, type });
  res.json({ data });
});

export const getFeaturedCreatorsHandler = asyncHandler(async (req, res) => {
  const { window } = req.query;
  const data = await service.getFeaturedCreators(window);
  res.json({ data });
});

// Manual-trigger recompute (used by verification/ops; also runs on the
// BullMQ repeatable job in jobs/workers/trendRecompute.worker.js, run by the
// dedicated worker process).
export const recomputeTrendingHandler = asyncHandler(async (req, res) => {
  const data = await service.recomputeTrendScores();
  res.json({ data });
});
