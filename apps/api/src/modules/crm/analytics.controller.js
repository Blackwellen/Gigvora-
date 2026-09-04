import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { resolveOwner } from './shared.js';
import * as service from './analytics.service.js';

export const overviewHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const data = await service.overview(owner);
  res.json({ data });
});

export const pipelineFunnelHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const data = await service.pipelineFunnel(owner);
  res.json({ data });
});

export const winLossTrendHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const data = await service.winLossTrend(owner, req.query);
  res.json({ data });
});

export const leadSourcesHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const data = await service.leadSources(owner);
  res.json({ data });
});

export const topAccountsHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const data = await service.topAccounts(owner, req.query);
  res.json({ data });
});

export const stalePipelineHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const data = await service.stalePipeline(owner, req.query);
  res.json({ data });
});
