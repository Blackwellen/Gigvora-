import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { resolveOwner } from './shared.js';
import * as service from './pipeline-stages.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const records = await service.list(owner);
  res.json({ data: records });
});

export const reorderHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const records = await service.reorder(owner, req.body);
  res.json({ data: records });
});
