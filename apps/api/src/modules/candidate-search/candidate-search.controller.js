import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './candidate-search.service.js';

export const searchHandler = asyncHandler(async (req, res) => {
  const { q, skills, location, open_to_work, limit, offset } = req.query;
  const result = await service.search(req.user.sub, { q, skills, location, open_to_work, limit, offset });
  res.json({ data: result.items, meta: { total: result.total } });
});
