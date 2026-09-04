import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './candidate-activity.service.js';

export const listActivityHandler = asyncHandler(async (req, res) => {
  const rows = await service.listActivity(req.user.sub, req.query.candidateId);
  res.json({ data: rows, meta: { total: rows.length } });
});
