import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { resolveOwner } from './shared.js';
import * as service from './duplicates.service.js';

export const listHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const { objectType, object_type, status, limit, offset } = req.query;
  const result = await service.list(owner, { objectType: objectType || object_type, status, limit, offset });
  res.json({ data: result.data, meta: { total: result.total } });
});

export const resolveHandler = asyncHandler(async (req, res) => {
  const owner = resolveOwner(req);
  const record = await service.resolve(req, owner, req.params.id, req.body);
  res.json({ data: record });
});
