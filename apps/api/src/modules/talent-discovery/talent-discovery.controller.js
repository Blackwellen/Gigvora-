import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './talent-discovery.service.js';

export const searchHandler = asyncHandler(async (req, res) => {
  const { q, skills, location, open_to_work, limit, offset } = req.query;
  const result = await service.search({ q, skills, location, open_to_work, limit, offset });
  res.json({ data: result.items, meta: { total: result.total } });
});

export const getHandler = asyncHandler(async (req, res) => {
  const record = await service.getById(req.params.userId, { companyId: req.workspaceContext?.companyId });
  res.json({ data: record });
});
